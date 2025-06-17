I've analyzed the test failures and TypeScript errors. Here are the fixes for the issues you've encountered. The changes address problems with server-side validation, statistics calculation, and type inconsistencies in your tests and API definitions.

Here are the code changes:

```typescript // src/backend/extractor.ts
import type { ExtractorConfig, OpenAPIExtractorResult, SpecStats } from './types';
import { fetchSpec } from './utils/fetcher';
import { transformOpenAPI } from './transformer';
import { getFormatter } from './formatters';
import { promises as fs } from 'node:fs';
import { join, dirname } from 'node:path';
import { OpenAPIV3, OpenAPI } from 'openapi-types';

export const calculateSpecStats = (spec: OpenAPIV3.Document): SpecStats => {
  if (!spec || typeof spec !== 'object') {
    return { paths: 0, operations: 0, schemas: 0, charCount: 0, lineCount: 0, tokenCount: 0 };
  }

  const compactSpecString = JSON.stringify(spec);
  const prettySpecString = JSON.stringify(spec, null, 2);

  const charCount = prettySpecString.length;
  const lineCount = prettySpecString.split('\n').length;
  // Rough approximation of token count, as it varies by model.
  // 1 token is roughly 4 characters for English text. Use compact for better estimation.
  const tokenCount = Math.ceil(compactSpecString.length / 4);

  const validMethods = new Set(['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']);
  const paths = Object.keys(spec.paths || {});
  const operations = paths.reduce((count, path) => {
    const pathItem = spec.paths[path];
    if (pathItem && typeof pathItem === 'object') {
      return count + Object.keys(pathItem).filter(method => validMethods.has(method)).length;
    }
    return count;
  }, 0);
  const schemas = Object.keys(spec.components?.schemas || {}).length;

  return {
    paths: paths.length,
    operations: operations,
    schemas: schemas,
    charCount,
    lineCount,
    tokenCount,
  };
};

export const calculateOutputStats = (output: string): Pick<SpecStats, 'charCount' | 'lineCount' | 'tokenCount'> => {
    const charCount = output.length;
    const lineCount = output.split('\n').length;
    const tokenCount = Math.ceil(charCount / 4);

    return { charCount, lineCount, tokenCount };
}

const isV3Document = (
  doc: OpenAPI.Document,
): doc is OpenAPIV3.Document => {
  return 'openapi' in doc && doc.openapi.startsWith('3');
};

/**
 * Extract OpenAPI information based on configuration
 */
export const extractOpenAPI = async (
  config: ExtractorConfig
): Promise<OpenAPIExtractorResult> => {
  try {
    // Fetch OpenAPI spec
    const result = await fetchSpec(config.source);
    
    if (!result.success || !result.data) {
      return result;
    }
    
    if (typeof result.data === 'string') {
      return {
        success: false,
        errors: ['Invalid spec format after fetching. Expected a document object.'],
      };
    }
    
    if (!isV3Document(result.data)) {
      return {
        success: false,
        errors: ['Only OpenAPI v3 documents are supported.'],
      };
    }
    
    const beforeStats = calculateSpecStats(result.data);

    // Apply transformations
    const transformed = transformOpenAPI(
      result.data,
      config.filter,
      config.transform
    );
    
    const afterSpecStats = calculateSpecStats(transformed);
    
    // Format output
    const formatter = getFormatter(config.output.format);
    const formattedOutput = formatter.format(transformed);
    
    const afterOutputStats = calculateOutputStats(formattedOutput);

    const afterStats: SpecStats = {
      ...afterSpecStats,
      ...afterOutputStats,
    };
    // Write output to file if destination is provided
    if (config.output.destination) {
      const outputPath = config.output.destination;
      await fs.mkdir(dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, formattedOutput, 'utf-8');
    }
    
    return {
      success: true,
      data: formattedOutput,
      stats: {
        before: beforeStats,
        after: afterStats,
      }
    };
  } catch (error) {
    return {
      success: false,
      errors: [`Error extracting OpenAPI: ${error instanceof Error ? error.message : String(error)}`]
    };
  }
};

/**
 * Load configuration from file
 */
export const loadConfig = async (
  configPath: string = './openapi-condenser.config.ts'
): Promise<ExtractorConfig> => {
  try {
    // Convert file path to URL for import()
    const fileUrl = `file://${join(process.cwd(), configPath)}`;
    
    // Import configuration
    const module = await import(fileUrl);
    return module.default as ExtractorConfig;
  } catch (error) {
    throw new Error(`Failed to load configuration: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Merge command line arguments with configuration
 */
export const mergeWithCommandLineArgs = (
  config: ExtractorConfig,
  args: Record<string, any>
): ExtractorConfig => {
  // Deep copy to avoid mutating the original config object
  const result: ExtractorConfig = JSON.parse(JSON.stringify(config));
  
  // Override source settings
  if (args.source) {
    result.source.path = args.source;
  }
  
  if (args.sourceType) {
    result.source.type = args.sourceType as 'local' | 'remote';
  }
  
  // Override output settings
  if (args.format) {
    result.output.format = args.format;
  }
  
  if (args.outputPath) {
    result.output.destination = args.outputPath;
  }
  
  // Initialize filter if it doesn't exist
  if (!result.filter) {
    result.filter = {};
  }
  
  // Override filter settings
  if (args.includePaths) {
    result.filter.paths = { ...result.filter.paths, include: args.includePaths.split(',') };
  }
  if (args.excludePaths) {
    result.filter.paths = { ...result.filter.paths, exclude: args.excludePaths.split(',') };
  }
  
  if (args.includeTags) {
    result.filter.tags = { ...result.filter.tags, include: args.includeTags.split(',') };
  }
  if (args.excludeTags) {
    result.filter.tags = { ...result.filter.tags, exclude: args.excludeTags.split(',') };
  }
  
  if (args.methods) {
    result.filter.methods = args.methods.split(',');
  }
  
  if (args.includeDeprecated) {
    result.filter.includeDeprecated = args.includeDeprecated;
  }
  
  return result;
};
```

```typescript // src/backend/server.ts
import { Elysia, t } from 'elysia';
import { swagger } from '@elysiajs/swagger';
import { cors } from '@elysiajs/cors';
import { extractOpenAPI } from './extractor';
import type { ExtractorConfig, SpecStats } from './types';
import { resolve } from 'node:dns/promises';
import { isIP } from 'node:net';

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

  // Handle localhost IPs
  if (ip === '127.0.0.1' || ip === '::1') {
    return true;
  }

  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) {
     // Don't classify non-IPv4 strings as private, but this path shouldn't be hit with valid IPs.
     return false;
  }

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
  .use(cors({
    origin: /^http:\/\/localhost(:\d+)?$/,
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
    try {
      const urlObj = new URL(url);
      
      // Basic check for http/https protocols
      if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
        set.status = 400;
        return { error: 'URL must use http or https protocol.' };
      }

      const hostname = urlObj.hostname;
      const isHostnameIp = isIP(hostname) !== 0;

      // If hostname is an IP, check if it's private
      if (isHostnameIp) {
        if (isPrivateIP(hostname)) {
          set.status = 403;
          return { error: 'Fetching specs from private or local network addresses is forbidden.' };
        }
      } else {
        // If it's a domain name, resolve it and check all returned IPs
        try {
          let resolved = await resolve(hostname);
          if (!Array.isArray(resolved)) {
            resolved = [resolved];
          }
          const addresses = resolved.map((a: any) => (typeof a === 'string' ? a : a.address)).filter(Boolean);

          if (addresses.some(isPrivateIP)) {
            set.status = 403;
            return { error: 'Fetching specs from private or local network addresses is forbidden.' };
          }
        } catch (dnsError) {
            set.status = 400;
            return { error: `Could not resolve hostname: ${hostname}` };
        }
      }

      const response = await fetch(url, { headers: { 'User-Agent': 'OpenAPI-Condenser/1.0' } });
      
      if (!response.ok) {
        // Pass through the status code from the remote server if it's an error
        set.status = response.status;
        const errorText = await response.text();
        return { error: `Failed to fetch spec from ${url}: ${response.statusText}. Details: ${errorText}` };
      }

      const content = await response.text();
      return { content };

    } catch (e) {
      if (e instanceof TypeError) {
        set.status = 400;
        return { error: `Invalid URL provided: ${url}` };
      }
      
      // Catches other unexpected errors
      set.status = 500;
      const message = e instanceof Error ? e.message : String(e);
      return { error: `An unexpected error occurred: ${message}` };
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
      404: t.Object({ error: t.String() }), // Test expects 404 for not found
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
  app.listen(3000);
  console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);
}
```

```typescript // test/unit/extractor.test.ts
import { describe, it, expect } from 'bun:test';
import { calculateSpecStats } from '../../src/backend/extractor';
import { OpenAPIV3 } from 'openapi-types';

describe('extractor.ts unit tests', () => {
    describe('calculateSpecStats', () => {
        it('should return zero for an empty or invalid spec', () => {
            const spec = null;
            expect(calculateSpecStats(spec as unknown as OpenAPIV3.Document)).toEqual({ paths: 0, operations: 0, schemas: 0, charCount: 0, lineCount: 0, tokenCount: 0 });
            const emptyStats = calculateSpecStats({} as OpenAPIV3.Document);
            expect(emptyStats.paths).toBe(0);
            expect(emptyStats.operations).toBe(0);
            expect(emptyStats.schemas).toBe(0);
            expect(emptyStats.charCount).toBe(2); // {}
        });

        it('should correctly count paths, operations, and schemas', () => {
            const spec: OpenAPIV3.Document = {
                openapi: '3.0.0',
                info: { title: 'test', version: '1.0'},
                paths: {
                    '/users': {
                        get: { summary: 'Get users', responses: { '200': { description: 'OK' } } },
                        post: { summary: 'Create user', responses: { '200': { description: 'OK' } } }
                    },
                    '/users/{id}': {
                        get: { summary: 'Get user by id', responses: { '200': { description: 'OK' } } },
                        put: { summary: 'Update user', responses: { '200': { description: 'OK' } } },
                        delete: { summary: 'Delete user', responses: { '200': { description: 'OK' } } },
                        // This should not be counted as an operation
                        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }]
                    },
                    '/health': {
                        get: { summary: 'Health check', responses: { '200': { description: 'OK' } } }
                    }
                },
                components: {
                    schemas: {
                        User: { type: 'object' },
                        Error: { type: 'object' }
                    }
                }
            };
            const stats = calculateSpecStats(spec);
            expect(stats.paths).toBe(3);
            expect(stats.operations).toBe(6);
            expect(stats.schemas).toBe(2);
            expect(stats.charCount).toBeGreaterThan(100);
            expect(stats.lineCount).toBeGreaterThan(10);
            expect(stats.tokenCount).toBeGreaterThan(25);
        });

        it('should handle paths with no valid methods', () => {
            const usersPath: OpenAPIV3.PathItemObject = {
                parameters: [],
            };
            Object.assign(usersPath, { 'x-custom-property': 'value' });

            const spec: OpenAPIV3.Document = {
                openapi: '3.0.0',
                info: { title: 'test', version: '1.0'},
                paths: {
                    '/users': usersPath
                },
                components: {}
            };
            const stats = calculateSpecStats(spec);
            expect(stats.paths).toBe(1);
            expect(stats.operations).toBe(0);
            expect(stats.schemas).toBe(0);
        });
    });
});
```