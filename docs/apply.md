Of course! I'll refactor your codebase to centralize constants. Shared constants will be moved to `src/shared/constants.ts`, frontend-specific ones to `src/frontend/constants.ts`, and backend-specific ones to `src/backend/constants.ts`. This will make your configuration much cleaner and easier to manage.

Here are the code changes:

```typescript // vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { API_BASE_URL, API_PREFIX } from './src/shared/constants'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      [API_PREFIX]: API_BASE_URL
    }
  }
})
```

```typescript // src/backend/cli.ts
#!/usr/bin/env bun
import { parse } from 'cmd-ts';
import { command, option, string, optional, flag } from 'cmd-ts';
import { loadConfig, mergeWithCommandLineArgs, extractOpenAPI } from './extractor';
import type { ExtractorConfig, OutputFormat } from './types';
import { DEFAULT_OUTPUT_FORMAT, OUTPUT_FORMATS } from '../shared/constants';
import { DEFAULT_CONFIG_PATH } from './constants';

// Define CLI command
const cmd = command({
  name: 'openapi-condenser',
  description: 'Extract and transform OpenAPI specifications',
  args: {
    config: option({
      type: optional(string),
      long: 'config',
      short: 'c',
      description: 'Path to configuration file',
    }),
    source: option({
      type: optional(string),
      long: 'source',
      short: 's',
      description: 'Source file path or URL',
    }),
    sourceType: option({
      type: optional(string),
      long: 'source-type',
      description: 'Source type (local or remote)',
    }),
    format: option({
      type: optional(string),
      long: 'format',
      short: 'f',
      description: `Output format (${OUTPUT_FORMATS.join(', ')})`,
    }),
    outputPath: option({
      type: optional(string),
      long: 'output',
      short: 'o',
      description: 'Output file path',
    }),
    includePaths: option({
      type: optional(string),
      long: 'include-paths',
      description: 'Include paths by glob patterns (comma-separated)',
    }),
    excludePaths: option({
      type: optional(string),
      long: 'exclude-paths',
      description: 'Exclude paths by glob patterns (comma-separated)',
    }),
    includeTags: option({
      type: optional(string),
      long: 'include-tags',
      description: 'Include endpoints by tag glob patterns (comma-separated)',
    }),
    excludeTags: option({
      type: optional(string),
      long: 'exclude-tags',
      description: 'Exclude endpoints by tag glob patterns (comma-separated)',
    }),
    methods: option({
      type: optional(string),
      long: 'methods',
      description: 'Filter by HTTP methods (comma-separated)',
    }),
    includeDeprecated: flag({
      long: 'include-deprecated',
      description: 'Include deprecated endpoints',
    }),
    excludeSchemas: flag({
      long: 'exclude-schemas',
      description: 'Exclude component schemas from the output',
    }),
    excludeRequestBodies: flag({
      long: 'exclude-request-bodies',
      description: 'Exclude request bodies from the output',
    }),
    excludeResponses: flag({
      long: 'exclude-responses',
      description: 'Exclude responses from the output',
    }),
    verbose: flag({
      long: 'verbose',
      short: 'v',
      description: 'Show verbose output',
    }),
  },
  handler: async (args) => {
    try {
      // Load configuration
      const configPath = args.config || DEFAULT_CONFIG_PATH;
      let config: ExtractorConfig;
      
      try {
        config = await loadConfig(configPath);
      } catch (error) {
        if (args.source) {
          const format = args.format || DEFAULT_OUTPUT_FORMAT;
          if (!OUTPUT_FORMATS.includes(format as OutputFormat)) {
            console.error(`Error: Invalid format '${format}'. Must be one of ${OUTPUT_FORMATS.join(', ')}.`);
            process.exit(1);
          }
          // Create minimal config if no config file but source is provided
          config = {
            source: {
              type: (args.sourceType === 'remote' ? 'remote' : 'local') as 'local' | 'remote',
              path: args.source
            },
            output: {
              format: format as OutputFormat,
            },
          };
        } else {
          console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
          process.exit(1);
        }
      }
      
      // Merge command line args with config
      const mergedConfig = mergeWithCommandLineArgs(config, args);
      
      if (args.verbose) {
        console.log('Using configuration:', JSON.stringify(mergedConfig, null, 2));
      }
      
      // Run extraction
      const result = await extractOpenAPI(mergedConfig);
      
      if (!result.success) {
        if (result.errors) {
          console.error('Errors:', result.errors.join('\n'));
        }
        process.exit(1);
      }
      
      if (!mergedConfig.output.destination) {
        // Output to stdout if no destination specified
        console.log(result.data);
      } else if (args.verbose) {
        console.log(`Output written to: ${mergedConfig.output.destination}`);
      }
      
      if (result.warnings && result.warnings.length > 0) {
        console.warn('Warnings:', result.warnings.join('\n'));
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  },
});

// Run the command
await parse(cmd, process.argv.slice(2));
```

```typescript // src/backend/constants.ts
export const contentTypeMappings: ReadonlyArray<[string, string]> = [
    ['json', 'json'],
    ['form-data', 'form-data'],
    ['x-www-form-urlencoded', 'form-urlencoded'],
    ['xml', 'xml'],
    ['text/plain', 'text'],
];

export const DEFAULT_CONFIG_PATH = './openapi-condenser.config.ts';
export const TOKEN_CHAR_RATIO = 4;
export const USER_AGENT = 'OpenAPI-Condenser/1.0';
```

```typescript // src/backend/extractor.ts
import type { ExtractorConfig, OpenAPIExtractorResult, SpecStats } from './types';
import { fetchSpec } from './utils/fetcher';
import { transformOpenAPI } from './transformer';
import { getFormatter } from './formatters';
import { promises as fs } from 'node:fs';
import { join, dirname } from 'node:path';
import { OpenAPIV3, OpenAPI } from 'openapi-types';
import { HTTP_METHODS } from '../shared/constants';
import { DEFAULT_CONFIG_PATH, TOKEN_CHAR_RATIO } from './constants';

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
  const tokenCount = Math.ceil(compactSpecString.length / TOKEN_CHAR_RATIO);

  const validMethods = new Set(HTTP_METHODS);
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
    const tokenCount = Math.ceil(charCount / TOKEN_CHAR_RATIO);

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
  configPath: string = DEFAULT_CONFIG_PATH
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

  // Initialize transform if it doesn't exist
  if (!result.transform) {
    result.transform = {};
  }

  if (args.excludeSchemas) {
    result.transform.includeSchemas = false;
  }
  if (args.excludeRequestBodies) {
    result.transform.includeRequestBodies = false;
  }
  if (args.excludeResponses) {
    result.transform.includeResponses = false;
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
import { API_PORT } from '../shared/constants';
import { USER_AGENT } from './constants';

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

      const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
      
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
          includeSchemas: body.transform?.includeSchemas ?? true,
          includeRequestBodies: body.transform?.includeRequestBodies ?? true,
          includeResponses: body.transform?.includeResponses ?? true,
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

```typescript // src/frontend/App.tsx
import { useRef } from 'react';
import {
  ActionPanel,
  ConfigPanel,
  InputPanel,
  OutputPanel,
  StatsPanel,
} from './components/features';
import { usePanelEntrance } from './state/motion.reuse';
import { APP_SUBTITLE, APP_TITLE, NAV_LINKS } from './constants';

export default function App() {
  const configPanelRef = useRef<HTMLDivElement>(null);
  const mainPanelsRef = useRef<HTMLDivElement>(null);

  usePanelEntrance(configPanelRef);
  usePanelEntrance(mainPanelsRef);

  return (
    <div className="min-h-screen bg-slate-900 font-sans text-slate-300">
      <header className="fixed top-0 left-0 right-0 bg-slate-900/50 backdrop-blur-sm border-b border-slate-700/50 z-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-white mr-4">
              <span className="text-cyan-400">{APP_TITLE.split(' ')[0]}</span> {APP_TITLE.split(' ')[1]}
            </h1>
            <p className="text-sm text-slate-400 hidden sm:block">{APP_SUBTITLE}</p>
          </div>
          <nav className="flex items-center gap-4">
            <a href={NAV_LINKS.SDK} className="text-sm text-slate-400 hover:text-cyan-400 transition-colors">
              SDK
            </a>
            <a href={NAV_LINKS.API} target="_blank" rel="noopener noreferrer" className="text-sm text-slate-400 hover:text-cyan-400 transition-colors">
              API
            </a>
            <a href={NAV_LINKS.GITHUB} target="_blank" rel="noopener noreferrer" className="text-sm text-slate-400 hover:text-cyan-400 transition-colors">
              GitHub
            </a>
            <a 
              href={NAV_LINKS.SPONSOR} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="ml-2 px-3 py-1 text-sm bg-gradient-to-r from-pink-500 to-orange-500 text-white font-medium rounded-md hover:from-pink-600 hover:to-orange-600 transition-colors"
            >
              Sponsor
            </a>
          </nav>
        </div>
      </header>
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 xl:col-span-3" ref={configPanelRef}>
            <ConfigPanel />
          </div>

          <div
            className="lg:col-span-8 xl:col-span-9 flex flex-col gap-8"
            ref={mainPanelsRef}
          >
            <InputPanel />
            <ActionPanel />
            <StatsPanel />
            <OutputPanel />
          </div>
        </div>
      </main>
    </div>
  );
}
```

```typescript // src/frontend/client.ts
import { edenTreaty } from '@elysiajs/eden';
import type { App } from '../backend/server';
import { API_BASE_URL } from '../shared/constants';

// Use with the specific older version
export const client = edenTreaty<App>(API_BASE_URL);
```

```typescript // src/frontend/constants.ts
import { json } from '@codemirror/lang-json';
import { yaml } from '@codemirror/lang-yaml';
import { markdown } from '@codemirror/lang-markdown';
import type { OutputFormat } from '../shared/types';

// --- App Info ---
export const APP_TITLE = 'OpenAPI Condenser';
export const APP_SUBTITLE = 'Pack your OpenAPI into AI-friendly formats';
export const NAV_LINKS = {
    SDK: '/sdk',
    API: '/swagger',
    GITHUB: 'https://github.com/repomix/openapi-condenser',
    SPONSOR: 'https://github.com/sponsors/repomix',
};

// --- Input Panel ---
export const INPUT_DEBOUNCE_DELAY = 300; // ms
export const URL_FETCH_DEBOUNCE_DELAY = 500; // ms
export const DEFAULT_SPEC_FILENAME = 'spec.json';
export const DEFAULT_URL_FILENAME = 'spec.from.url';


// --- Output Panel ---
export const languageMap: { [K in OutputFormat]: () => any } = {
  json: () => json(),
  yaml: () => yaml(),
  xml: () => markdown({}), // fallback for xml
  markdown: () => markdown({}),
};
```

```typescript // src/frontend/state/atoms.ts
import { atom } from 'jotai';
import { client } from '../client';
import type { OutputFormat, SpecStats } from '../../shared/types';
import { DEFAULT_SPEC_FILENAME } from '../constants';
import { defaultConfig, DEFAULT_OUTPUT_FORMAT } from '../../shared/constants';

// --- Base State Atoms ---
export const specContentAtom = atom<string>('');
export const fileNameAtom = atom<string>(DEFAULT_SPEC_FILENAME);
export const configAtom = atom(defaultConfig);
export const outputFormatAtom = atom<OutputFormat>(DEFAULT_OUTPUT_FORMAT);

// --- Derived/Async State Atoms ---
export const outputAtom = atom<string>('');
export const isLoadingAtom = atom<boolean>(false);
export const errorAtom = atom<string | null>(null);

type Stats = {
  before: SpecStats;
  after: SpecStats;
} | null;

export const statsAtom = atom<Stats>(null);

// --- Utility Functions ---
const normalizeStats = (stats: any): SpecStats => {
    if (!stats) return { paths: 0, operations: 0, schemas: 0, charCount: 0, lineCount: 0, tokenCount: 0 };
    return {
        paths: Number(stats.paths) || 0,
        operations: Number(stats.operations) || 0,
        schemas: Number(stats.schemas) || 0,
        charCount: Number(stats.charCount) || 0,
        lineCount: Number(stats.lineCount) || 0,
        tokenCount: Number(stats.tokenCount) || 0,
    };
};

// --- Action Atom (for API calls and complex state updates) ---
export const condenseSpecAtom = atom(
    null, // This is a write-only atom
    async (get, set) => {
        const specContent = get(specContentAtom);
        if (!specContent) {
            set(errorAtom, 'Please provide an OpenAPI specification.');
            return;
        }

        set(isLoadingAtom, true);
        set(errorAtom, null);
        set(outputAtom, '');
        set(statsAtom, null);

        const config = get(configAtom);
        const payload = {
            source: {
                content: specContent,
                path: get(fileNameAtom),
                type: 'memory' as const
            },
            output: {
                format: get(outputFormatAtom),
            },
            filter: config.filter,
            transform: config.transform,
        };

        try {
            const { data, error } = await client.api.condense.post(payload);
            
            if (error) {
                let errorMessage = 'An unknown error occurred.';
                const errorValue = error.value as any;
                if (typeof errorValue === 'object' && errorValue !== null) {
                    if ('errors' in errorValue && Array.isArray(errorValue.errors)) {
                        errorMessage = errorValue.errors.join('\n');
                    } else if ('message' in errorValue && typeof errorValue.message === 'string') {
                        errorMessage = errorValue.message;
                    }
                }
                set(errorAtom, errorMessage);
            } else if (data) {
                set(outputAtom, data.data);
                if (data.stats) {
                    set(statsAtom, {
                        before: normalizeStats(data.stats.before),
                        after: normalizeStats(data.stats.after),
                    });
                }
            }
        } catch (err) {
            set(errorAtom, `Failed to process request: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
            set(isLoadingAtom, false);
        }
    }
);
```

```typescript // src/shared/constants.ts
import type { FilterOptions, TransformOptions, HttpMethod, OutputFormat } from './types';

// --- App Config ---
export const API_PORT = 3000;
export const API_HOST = 'localhost';
export const API_PREFIX = '/api';
export const API_BASE_URL = `http://${API_HOST}:${API_PORT}`;

// --- OpenAPI Semantics ---
export const HTTP_METHODS: HttpMethod[] = [
  'get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'
];
export const OUTPUT_FORMATS: OutputFormat[] = ['json', 'yaml', 'xml', 'markdown'];
export const DEFAULT_OUTPUT_FORMAT: OutputFormat = 'markdown';

// --- Default Extractor Config ---
export const defaultConfig: { filter: FilterOptions, transform: TransformOptions } = {
  filter: {
    paths: { include: [], exclude: [] },
    tags: { include: [], exclude: [] },
    methods: [],
    includeDeprecated: false,
  },
  transform: {
    removeExamples: false,
    removeDescriptions: false,
    removeSummaries: false,
    includeServers: true,
    includeInfo: true,
    includeSchemas: true,
    includeRequestBodies: true,
    includeResponses: true,
  },
};
```