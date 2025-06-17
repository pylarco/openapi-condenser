import { Elysia, t } from 'elysia';
import { swagger } from '@elysiajs/swagger';
import { extractOpenAPI } from './extractor';
import type { ExtractorConfig, SpecStats } from './types';
import { resolve } from 'node:dns/promises';

// Basic SSRF protection. For production, a more robust solution like an allow-list or a proxy is recommended.
const isPrivateIP = (ip: string) => {
  // IPv6 loopback and private ranges
  if (ip === '::1' || ip.startsWith('fc00:') || ip.startsWith('fd00:')) {
    return true;
  }
  
  // Check for IPv4-mapped IPv6 addresses (e.g., ::ffff:127.0.0.1)
  if (ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }

  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return false; // Not a valid IPv4 address

  const [p1, p2, p3, p4] = parts;
  if (p1 === undefined || p2 === undefined || p3 === undefined || p4 === undefined) {
    return false; // Should not happen due to the length check, but satisfies TS
  }

  return (
    p1 === 10 || // 10.0.0.0/8
    (p1 === 172 && p2 >= 16 && p2 <= 31) || // 172.16.0.0/12
    (p1 === 192 && p2 === 168) || // 192.168.0.0/16
    p1 === 127 || // 127.0.0.0/8
    (p1 === 169 && p2 === 254) // 169.254.0.0/16 (APIPA)
  );
};

export const app = new Elysia()
  .use(swagger())
  .get('/api/fetch-spec', async ({ query: { url }, set }) => {
    if (!url) {
      set.status = 400;
      return { error: 'URL parameter is required' };
    }

    try {
      const urlObj = new URL(url);
      if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
        set.status = 400;
        return { error: 'URL parameter must use http or https protocol' };
      }

      // SSRF Protection: Resolve hostname to IP and check against private ranges
      const addresses = await resolve(urlObj.hostname);
      if (!addresses || addresses.length === 0) {
        set.status = 400;
        return { error: 'Could not resolve hostname.' };
      }
      if (addresses.some(isPrivateIP)) {
        set.status = 403;
        return { error: 'Fetching specs from private or local network addresses is forbidden.' };
      }
    } catch (e) {
      set.status = 400;
      const message = e instanceof Error ? e.message : String(e);
      return { error: `Invalid URL provided: ${message}` };
    }

    try {
      const response = await fetch(url, { headers: { 'User-Agent': 'OpenAPI-Condenser/1.0' } });
      if (!response.ok) {
        const errorText = await response.text();
        set.status = response.status;
        return { error: `Failed to fetch spec from ${url}: ${response.statusText}. ${errorText}` };
      }
      const content = await response.text();
      return { content };
    } catch (e) {
      set.status = 500;
      const message = e instanceof Error ? e.message : String(e);
      return { error: `Failed to fetch spec from URL: ${message}` };
    }
  }, {
    query: t.Object({
      url: t.String({
        format: 'uri',
        description: 'A public URL to an OpenAPI specification file.'
      })
    }),
    response: {
      200: t.Object({ content: t.String() }),
      400: t.Object({ error: t.String() }),
      403: t.Object({ error: t.String() }),
      500: t.Object({ error: t.String() })
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
        transform: body.transform,
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
      const defaultStats: SpecStats = { paths: 0, operations: 0, schemas: 0 };
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
            ]))),
            includeDeprecated: t.Optional(t.Boolean()),
          })
        ),
        transform: t.Optional(
          t.Object({
            removeExamples: t.Optional(t.Boolean()),
            removeDescriptions: t.Optional(t.Boolean()),
            includeServers: t.Optional(t.Boolean()),
            includeInfo: t.Optional(t.Boolean()),
          })
        ),
      }),
      response: {
        200: t.Object({
          success: t.Literal(true),
          data: t.String(),
          stats: t.Object({
            before: t.Object({ paths: t.Number(), operations: t.Number(), schemas: t.Number() }),
            after: t.Object({ paths: t.Number(), operations: t.Number(), schemas: t.Number() }),
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
  app.listen(3000);
  console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);
}