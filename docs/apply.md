It looks like you're running into a classic serverless environment issue. Even with Ahead-of-Time (AOT) compilation enabled, some plugins can still perform operations during initialization that are disallowed in the Cloudflare Workers' global scope. The error message is pointing directly at the `swagger` plugin.

The best solution is to only enable the Swagger UI plugin during local development (when you run the server directly with `bun`) and disable it when building for the Cloudflare/Wrangler environment. I'll also adjust your `wrangler.toml` to use a valid compatibility date, which will resolve the warning you're seeing.

Here are the necessary changes:

### 1. Conditionally load the Swagger plugin

I'll modify `src/backend/server.ts` to detect if it's being run as the main script (e.g., via `bun run src/backend/server.ts`) and only load `@elysiajs/swagger` in that case. This prevents it from running inside the more restrictive Wrangler environment.

### 2. Update the compatibility date

I'll change the `compatibility_date` in `wrangler.toml` to a recent, valid date to get rid of the version mismatch warning.

Here's the code:

```typescript // src/backend/server.ts
import { Elysia, t } from 'elysia';
import { swagger } from '@elysiajs/swagger';
import { cors } from '@elysiajs/cors';
import { extractOpenAPI } from './extractor';
import type { ExtractorConfig, SpecStats } from '../shared/types';
import { API_PORT } from '../shared/constants';
import { USER_AGENT } from './constants';
import { checkUrlSafety } from './utils/ssrf';

let app_builder = new Elysia({ aot: true });

// Conditionally add Swagger only for local standalone execution.
// This prevents issues with the Swagger UI plugin in serverless environments like Cloudflare Workers.
if (import.meta.main) {
  app_builder = app_builder.use(swagger());
}

export const app = app_builder
  .use(cors({
    origin: [/^http:\/\/localhost(:\d+)?$/, /\.pages\.dev$/],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }))
  .onError(({ code, error, set }) => {
    if (code === 'VALIDATION') {
      set.status = 400;
      return { error: error.message };
    }
  })
  .get('/api/fetch-spec', async ({ query: { url }, set }) => {
    if (!url) {
        set.status = 400;
        return { error: 'URL parameter is required' };
    }
    
    const safetyCheck = await checkUrlSafety(url);
    if (!safetyCheck.safe) {
      set.status = safetyCheck.status;
      return { error: safetyCheck.message };
    }

    try {
      const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
      
      if (!response.ok) {
        set.status = response.status;
        const errorText = await response.text();
        return { error: `Failed to fetch spec from ${url}: ${response.statusText}. Details: ${errorText}` };
      }

      const content = await response.text();
      return { content };

    } catch (e) {
      set.status = 500;
      const message = e instanceof Error ? e.message : String(e);
      return { error: `An unexpected error occurred while fetching the spec: ${message}` };
    }
  }, {
    query: t.Object({
      url: t.Optional(t.String({
        format: 'uri-reference',
        description: 'A public URL to an OpenAPI specification file.',
        error: 'Invalid URL format provided.'
      }))
    }),
    response: {
      200: t.Object({ content: t.String() }),
      400: t.Object({ error: t.String() }),
      403: t.Object({ error: t.String() }),
      404: t.Object({ error: t.String() }),
      500: t.Object({ error: t.String() })
    },
    detail: {
        tags: ['API'],
        summary: 'Fetch an OpenAPI specification from a public URL',
        description: `Fetches the content of a remote OpenAPI specification. Performs basic SSRF protection by disallowing requests to private, loopback, or otherwise reserved IP addresses.`,
    }
  })
  .post(
    '/api/condense',
    async ({ body, set }) => {
      const config: ExtractorConfig = {
        source: {
          type: 'memory',
          content: body.source.content,
          path: body.source.path,
        },
        output: {
          format: body.output.format,
        },
        filter: {
          ...body.filter,
          includeDeprecated: body.filter?.includeDeprecated ?? false,
        },
        transform: {
          removeExamples: body.transform?.removeExamples ?? false,
          removeDescriptions: body.transform?.removeDescriptions ?? false,
          removeSummaries: body.transform?.removeSummaries ?? false,
          includeServers: body.transform?.includeServers ?? true,
          includeInfo: body.transform?.includeInfo ?? true,
          includeSchemas: body.transform?.includeSchemas ?? true,
          includeRequestBodies: body.transform?.includeRequestBodies ?? true,
          includeResponses: body.transform?.includeResponses ?? true,
          includeEndpointPathsSummary: body.transform?.includeEndpointPathsSummary ?? false,
        },
      };

      const result = await extractOpenAPI(config);

      if (!result.success) {
        set.status = 400;
        return {
          success: false,
          errors: result.errors || ['Unknown error occurred'],
          warnings: result.warnings
        };
      }

      // Ensure we have stats with the expected structure
      const defaultStats: SpecStats = { paths: 0, operations: 0, schemas: 0, charCount: 0, lineCount: 0, tokenCount: 0 };
      const stats = result.stats || { before: defaultStats, after: defaultStats };

      return {
        success: true as const,
        data: result.data as string,
        stats: {
          before: stats.before || defaultStats,
          after: stats.after || defaultStats
        },
        warnings: result.warnings
      };
    },
    {
      body: t.Object({
        source: t.Object({
          content: t.String(),
          path: t.String(),
        }),
        output: t.Object({
          format: t.Union([
            t.Literal('json'),
            t.Literal('yaml'),
            t.Literal('xml'),
            t.Literal('markdown'),
          ]),
        }),
        filter: t.Optional(
          t.Object({
            paths: t.Optional(t.Object({
              include: t.Optional(t.Array(t.String())),
              exclude: t.Optional(t.Array(t.String())),
            })),
            tags: t.Optional(t.Object({
                include: t.Optional(t.Array(t.String())),
                exclude: t.Optional(t.Array(t.String())),
            })),
            operationIds: t.Optional(t.Object({
              include: t.Optional(t.Array(t.String())),
              exclude: t.Optional(t.Array(t.String())),
            })),
            methods: t.Optional(t.Array(t.Union([
                t.Literal('get'),
                t.Literal('post'),
                t.Literal('put'),
                t.Literal('delete'),
                t.Literal('patch'),
                t.Literal('options'),
                t.Literal('head'),
                t.Literal('trace'),
            ]))),
            includeDeprecated: t.Optional(t.Boolean()),
          })
        ),
        transform: t.Optional(
          t.Object({
            removeExamples: t.Optional(t.Boolean()),
            removeDescriptions: t.Optional(t.Boolean()),
            removeSummaries: t.Optional(t.Boolean()),
            includeServers: t.Optional(t.Boolean()),
            includeInfo: t.Optional(t.Boolean()),
            includeSchemas: t.Optional(t.Boolean()),
            includeRequestBodies: t.Optional(t.Boolean()),
            includeResponses: t.Optional(t.Boolean()),
            includeEndpointPathsSummary: t.Optional(t.Boolean()),
          })
        ),
      }),
      response: {
        200: t.Object({
          success: t.Literal(true),
          data: t.String(),
          stats: t.Object({
            before: t.Object({ paths: t.Number(), operations: t.Number(), schemas: t.Number(), charCount: t.Number(), lineCount: t.Number(), tokenCount: t.Number() }),
            after: t.Object({ paths: t.Number(), operations: t.Number(), schemas: t.Number(), charCount: t.Number(), lineCount: t.Number(), tokenCount: t.Number() }),
          }),
          warnings: t.Optional(t.Array(t.String())),
        }),
        400: t.Object({
          success: t.Literal(false),
          errors: t.Optional(t.Array(t.String())),
          warnings: t.Optional(t.Array(t.String())),
        })
      }
    }
  );

export type App = typeof app;

if (import.meta.main) {
  app.listen(API_PORT);
  console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);
}
```

```toml // wrangler.toml
name = "openapi-condenser"
main = "src/backend/worker.ts"
compatibility_date = "2024-06-03"
compatibility_flags = ["nodejs_compat", "nodejs_compat_populate_process_env"]

[site]
bucket = "./dist"

[build]
command = "npm run build"
```

These changes should resolve both the crash and the warning, allowing `wrangler dev` to start correctly. To view the Swagger UI, you can now use the `start` script (`bun run start`), which will run the server in a standard Node.js-like environment where the plugin is allowed to operate.