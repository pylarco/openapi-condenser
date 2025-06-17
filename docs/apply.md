An analysis of your "OpenAPI Condenser" codebase reveals several areas for improvement to enhance its functionality, security, and developer experience, moving it closer to a production-ready state. The key issues identified are the lack of a crucial "condensing" feature (removing unused schemas), a significant security vulnerability (SSRF), and an incomplete integration of `eden-treaty` for end-to-end type safety in the frontend.

Here are the code changes to address these points:

### 1. Implement True Condensing by Removing Unused Components

The core purpose of a "condenser" is to shrink the specification. After filtering paths and operations, the definitions in `components` (like schemas, parameters, etc.) that are no longer referenced should be removed. The following changes introduce this logic.

```typescript // src/backend/transformer.ts
import type { FilterOptions, TransformOptions, SchemaTransformer, FilterPatterns } from './types';
import micromatch from 'micromatch';

/**
 * Checks if an endpoint's tags match the provided patterns.
 */
function matchesTags(endpointTags: string[] = [], tagPatterns: FilterPatterns): boolean {
  const { include, exclude } = tagPatterns;

  if (!include?.length && !exclude?.length) {
    return true; // No tag filter, always matches
  }
  
  // If endpoint has no tags, it cannot match an include filter.
  if (!endpointTags.length) {
    return !include?.length;
  }
  
  const matchesInclude = include?.length ? micromatch.some(endpointTags, include) : true;
  const matchesExclude = exclude?.length ? micromatch.some(endpointTags, exclude) : false;

  return matchesInclude && !matchesExclude;
}


/**
 * Filter paths based on configuration
 */
export const filterPaths = (
  paths: Record<string, any>, 
  filterOptions: FilterOptions
): Record<string, any> => {
  if (!filterOptions) return paths;
  
  const pathKeys = Object.keys(paths);
  let filteredPathKeys = pathKeys;

  if (filterOptions.paths?.include?.length) {
    filteredPathKeys = micromatch(filteredPathKeys, filterOptions.paths.include, { dot: true });
  }
  if (filterOptions.paths?.exclude?.length) {
    filteredPathKeys = micromatch.not(filteredPathKeys, filterOptions.paths.exclude, { dot: true });
  }

  return filteredPathKeys.reduce((acc, path) => {
    const methods = paths[path];
    const filteredMethods = filterMethods(methods, filterOptions);
    
    if (Object.keys(filteredMethods).length > 0) {
      acc[path] = filteredMethods;
    }
    
    return acc;
  }, {} as Record<string, any>);
};

/**
 * Filter HTTP methods based on configuration
 */
export const filterMethods = (
  methods: Record<string, any>,
  filterOptions: FilterOptions
): Record<string, any> => {
  return Object.entries(methods).reduce((acc, [method, definition]) => {
    // Skip if method is not in the filter list
    if (filterOptions.methods && !filterOptions.methods.includes(method as any)) {
      return acc;
    }
    
    // Skip deprecated endpoints if configured
    if (!filterOptions.includeDeprecated && definition.deprecated) {
      return acc;
    }
    
    // Filter by tags
    if (filterOptions.tags && !matchesTags(definition.tags, filterOptions.tags)) {
      return acc;
    }
    
    acc[method] = definition;
    return acc;
  }, {} as Record<string, any>);
};

/**
 * Recursively find all $ref values in a given object.
 */
const findRefsRecursive = (obj: any, refs: Set<string>): void => {
  if (!obj || typeof obj !== 'object') {
    return;
  }
  if (Array.isArray(obj)) {
    for (const item of obj) {
      findRefsRecursive(item, refs);
    }
    return;
  }
  for (const key in obj) {
    if (key === '$ref' && typeof obj[key] === 'string') {
      refs.add(obj[key]);
    } else {
      findRefsRecursive(obj[key], refs);
    }
  }
};

/**
 * Parses a component reference string.
 */
const getComponentNameFromRef = (ref: string): { type: string; name: string } | null => {
  const prefix = '#/components/';
  if (!ref.startsWith(prefix)) {
    return null;
  }
  const parts = ref.substring(prefix.length).split('/');
  if (parts.length !== 2) {
    return null;
  }
  return { type: parts[0], name: parts[1] };
};

/**
 * Removes all components (schemas, parameters, etc.) that are not referenced
 * in the remaining parts of the specification.
 */
const removeUnusedComponents = (spec: any): any => {
  if (!spec.components) return spec;

  // 1. Find all initial references from outside the components section
  const initialRefs = new Set<string>();
  findRefsRecursive(spec.paths, initialRefs);
  findRefsRecursive(spec.tags, initialRefs);
  findRefsRecursive(spec.security, initialRefs);
  findRefsRecursive(spec.info, initialRefs);
  findRefsRecursive(spec.servers, initialRefs);
  if (spec.webhooks) findRefsRecursive(spec.webhooks, initialRefs);

  // 2. Transitively discover all dependencies within components
  const allRefs = new Set<string>(initialRefs);
  let lastSize = -1;
  while (allRefs.size > lastSize) {
    lastSize = allRefs.size;
    allRefs.forEach(ref => {
      const componentInfo = getComponentNameFromRef(ref);
      if (componentInfo && spec.components[componentInfo.type]?.[componentInfo.name]) {
        const component = spec.components[componentInfo.type][componentInfo.name];
        findRefsRecursive(component, allRefs);
      }
    });
  }

  // 3. Build a new components object with only the referenced items
  const newComponents: Record<string, any> = {};
  for (const componentType in spec.components) {
    const newComponentGroup: Record<string, any> = {};
    const componentGroup = spec.components[componentType];
    for (const componentName in componentGroup) {
      const ref = `#/components/${componentType}/${componentName}`;
      if (allRefs.has(ref)) {
        newComponentGroup[componentName] = componentGroup[componentName];
      }
    }
    if (Object.keys(newComponentGroup).length > 0) {
      newComponents[componentType] = newComponentGroup;
    }
  }

  // 4. Replace the old components object
  if (Object.keys(newComponents).length > 0) {
    spec.components = newComponents;
  } else {
    delete spec.components;
  }

  return spec;
};

/**
 * Transform OpenAPI schema based on configuration
 */
export const transformSchema = (
  schema: any,
  transformOptions: TransformOptions,
  currentDepth = 0
): any => {
  if (!schema || typeof schema !== 'object') {
    return schema;
  }
  
  // Handle maximum depth
  if (transformOptions.maxDepth !== undefined && currentDepth >= transformOptions.maxDepth) {
    if (Array.isArray(schema)) {
      return schema.length > 0 ? ['...'] : [];
    }
    return { truncated: true, reason: `Max depth of ${transformOptions.maxDepth} reached` };
  }
  
  // Handle arrays
  if (Array.isArray(schema)) {
    return schema.map(item => transformSchema(item, transformOptions, currentDepth + 1));
  }
  
  // Handle objects
  const result = { ...schema };
  
  // Remove examples if configured
  if (transformOptions.removeExamples && 'example' in result) {
    delete result.example;
  }
  if (transformOptions.removeExamples && 'examples' in result) {
    delete result.examples;
  }
  
  // Remove descriptions if configured
  if (transformOptions.removeDescriptions && 'description' in result) {
    delete result.description;
  }
  
  // Process all properties recursively
  Object.keys(result).forEach(key => {
    if (typeof result[key] === 'object' && result[key] !== null) {
      result[key] = transformSchema(result[key], transformOptions, currentDepth + 1);
    }
  });
  
  return result;
};

/**
 * Transform the entire OpenAPI document based on configuration
 */
export const transformOpenAPI = (
  openapi: any,
  filterOpts?: FilterOptions,
  transformOpts?: TransformOptions
): any => {
  // Create a deep copy to avoid mutating the original object
  let result = JSON.parse(JSON.stringify(openapi));
  
  // Filter paths first
  if (result.paths && filterOpts) {
    result.paths = filterPaths(result.paths, filterOpts);
  }
  
  // After filtering, remove components that are no longer referenced.
  result = removeUnusedComponents(result);
  
  // Then apply transformations on the filtered spec
  if (transformOpts) {
    if (!transformOpts.includeServers) {
      delete result.servers;
    }
    if (!transformOpts.includeInfo) {
      delete result.info;
    }
    // Apply recursive transformations to the entire document
    result = transformSchema(result, transformOpts);
  }
  
  return result;
};

/**
 * Higher-order function for composing transformers
 */
export const composeTransformers = 
  (...transformers: SchemaTransformer[]): SchemaTransformer => 
  (schema: any) => 
    transformers.reduce((result, transformer) => transformer(result), schema);
```

### 2. Patch Server-Side Request Forgery (SSRF) Vulnerability

The `/api/fetch-spec` endpoint could be tricked into making requests to internal network services. The following change adds a security check to prevent this by resolving the requested URL's hostname and ensuring it does not point to a private or local IP address.

```typescript // src/server.ts
import { Elysia, t } from 'elysia';
import { swagger } from '@elysiajs/swagger';
import { extractOpenAPI } from './backend/extractor';
import type { ExtractorConfig, SpecStats } from './backend/types';
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

  return (
    parts[0] === 10 || // 10.0.0.0/8
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || // 172.16.0.0/12
    (parts[0] === 192 && parts[1] === 168) || // 192.168.0.0/16
    parts[0] === 127 || // 127.0.0.0/8
    (parts[0] === 169 && parts[1] === 254) // 169.254.0.0/16 (APIPA)
  );
};

const app = new Elysia()
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
        filter: body.filter,
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
  )
  .listen(3000);

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);

export type App = typeof app;
```

### 3. Implement `eden-treaty` for True E2E Type Safety

Your frontend included `eden-treaty` but was making raw `fetch` calls, missing out on its primary benefit. The following changes refactor the API calls in the frontend to use the typed Eden client, ensuring the requests and responses are type-safe from the server to the client.

```typescript // src/frontend/App.tsx
import { useState, useCallback } from 'react';
import type { FilterOptions, TransformOptions, OutputFormat, SpecStats } from '../backend/types';
import { ConfigPanel } from './components/ConfigPanel';
import { InputPanel } from './components/InputPanel';
import { OutputPanel } from './components/OutputPanel';
import { StatsPanel } from './components/StatsPanel';
import { client } from './client';

const defaultConfig: { filter: FilterOptions, transform: TransformOptions } = {
  filter: {
    paths: { include: [], exclude: [] },
    tags: { include: [], exclude: [] },
    methods: [],
    includeDeprecated: false,
  },
  transform: {
    removeExamples: false,
    removeDescriptions: false,
    includeServers: true,
    includeInfo: true,
  },
};

type Stats = {
  before: SpecStats;
  after: SpecStats;
}

export default function App() {
  const [specContent, setSpecContent] = useState('');
  const [fileName, setFileName] = useState('spec.json');
  const [config, setConfig] = useState(defaultConfig);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('markdown');
  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);

  const handleCondense = useCallback(async () => {
    if (!specContent) {
      setError('Please provide an OpenAPI specification.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setOutput('');
    setStats(null);

    const payload = {
      source: {
        content: specContent,
        path: fileName,
        type: 'memory' as const
      },
      output: {
        format: outputFormat,
      },
      filter: config.filter,
      transform: config.transform,
    };

    try {
      const { data, error } = await client.api.condense.post(payload);
      
      if (error) {
        setError(error.value.errors?.join('\n') || 'An unknown error occurred');
      } else if (data) {
        setOutput(data.data);
        setStats(data.stats);
      }
    } catch (err) {
      setError(`Failed to process request: ${err instanceof Error ? err.message : String(err)}`);
    }

    setIsLoading(false);
  }, [specContent, fileName, config, outputFormat]);
  
  return (
    <div className="min-h-screen bg-slate-900 font-sans text-slate-300">
      <header className="fixed top-0 left-0 right-0 bg-slate-900/50 backdrop-blur-sm border-b border-slate-700/50 z-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">
            <span className="text-cyan-400">OpenAPI</span> Condenser
          </h1>
          <div className="flex items-center gap-4">
            <a href="/swagger" target="_blank" rel="noopener noreferrer" className="text-sm text-slate-400 hover:text-cyan-400 transition-colors">
              API Docs
            </a>
            <a href="https://github.com/repomix/openapi-condenser" target="_blank" rel="noopener noreferrer" className="text-sm text-slate-400 hover:text-cyan-400 transition-colors">
              GitHub
            </a>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 xl:col-span-3">
            <ConfigPanel 
              config={config} 
              setConfig={setConfig} 
              outputFormat={outputFormat}
              setOutputFormat={setOutputFormat}
              onCondense={handleCondense}
              isLoading={isLoading}
            />
          </div>

          <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-8">
            <InputPanel 
              setSpecContent={setSpecContent}
              setFileName={setFileName}
            />
            <StatsPanel stats={stats} />
            <OutputPanel 
              output={output}
              isLoading={isLoading}
              error={error}
              format={outputFormat}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
```

```typescript // src/frontend/components/InputPanel.tsx
import React, { useState, useCallback, useRef } from 'react';
import { client } from '../client';

interface InputPanelProps {
  setSpecContent: (content: string) => void;
  setFileName: (name: string) => void;
}

export const InputPanel: React.FC<InputPanelProps> = ({ setSpecContent, setFileName }) => {
  const [activeTab, setActiveTab] = useState<'paste' | 'upload' | 'url'>('paste');
  const [url, setUrl] = useState('');
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        setSpecContent(e.target?.result as string);
        setFileName(file.name);
        setFetchError(null);
      };
      reader.readAsText(file);
    }
  }, [setSpecContent, setFileName]);

  const handlePaste = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSpecContent(event.target.value);
    setFileName('spec.json'); // Assume json for pasted content
    setFetchError(null);
    setUploadedFileName(null);
  }, [setSpecContent, setFileName]);

  const handleFetchFromUrl = useCallback(async () => {
    if (!url) {
      setFetchError('Please enter a URL.');
      return;
    }
    setIsFetching(true);
    setFetchError(null);
    setUploadedFileName(null);
    
    try {
      const { data, error } = await client.api['fetch-spec'].get({ query: { url } });

      if (error) {
        setFetchError(error.value.error || 'Failed to fetch the spec.');
      } else if (data) {
        setSpecContent(data.content);
        try {
          const urlObject = new URL(url);
          setFileName(urlObject.pathname.split('/').pop() || 'spec.json');
        } catch {
          setFileName('spec.from.url');
        }
      }
    } catch (err) {
      setFetchError(`Failed to fetch: ${err instanceof Error ? err.message : String(err)}`);
    }
    
    setIsFetching(false);
  }, [url, setSpecContent, setFileName]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const TabButton: React.FC<{tab: 'paste' | 'upload' | 'url', children: React.ReactNode}> = ({ tab, children }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`px-4 py-2 text-sm font-medium transition ${activeTab === tab ? 'text-white bg-slate-700/50' : 'text-slate-400 hover:bg-slate-800/60'}`}
    >
      {children}
    </button>
  )

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg overflow-hidden">
      <div className="flex border-b border-slate-700/50">
        <TabButton tab="paste">Paste Spec</TabButton>
        <TabButton tab="upload">Upload File</TabButton>
        <TabButton tab="url">From URL</TabButton>
      </div>
      <div className="p-1">
        {activeTab === 'paste' && (
          <textarea
            onChange={handlePaste}
            placeholder="Paste your OpenAPI (JSON or YAML) spec here..."
            className="w-full h-64 bg-transparent text-slate-300 p-4 resize-none focus:outline-none placeholder-slate-500 font-mono text-sm"
          />
        )}
        {activeTab === 'upload' && (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json,.yaml,.yml" />
            <button onClick={handleUploadClick} className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-6 rounded-lg transition-colors">
              Select OpenAPI File
            </button>
            {uploadedFileName && <p className="mt-4 text-sm text-slate-300">Selected: <span className="font-medium">{uploadedFileName}</span></p>}
            {!uploadedFileName && <p className="mt-4 text-sm">Supports .json, .yaml, and .yml</p>}
          </div>
        )}
        {activeTab === 'url' && (
          <div className="h-64 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md">
              <label htmlFor="url-input" className="block text-sm font-medium text-slate-300 mb-2">
                Enter public URL to an OpenAPI spec
              </label>
              <div className="flex gap-2">
                <input
                  id="url-input"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://petstore3.swagger.io/api/v3/openapi.json"
                  className="flex-grow bg-slate-700/50 border border-slate-600 rounded-md px-3 py-2 text-sm text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition"
                />
                <button onClick={handleFetchFromUrl} disabled={isFetching} className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-600 text-white font-bold py-2 px-4 rounded-md transition-colors flex items-center">
                  {isFetching ? (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  ) : 'Fetch'}
                </button>
              </div>
              {fetchError && <p className="mt-2 text-sm text-red-400">{fetchError}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
```

### 4. Improve CLI Quality of Life

A minor change in the CLI improves robustness by properly validating the output format argument.

```typescript // src/cli.ts
#!/usr/bin/env bun
import { parse } from 'cmd-ts';
import { command, option, string, optional, flag } from 'cmd-ts';
import { loadConfig, mergeWithCommandLineArgs, extractOpenAPI } from './backend/extractor';
import type { ExtractorConfig, OutputFormat } from './backend/types';

const validFormats: OutputFormat[] = ['json', 'yaml', 'xml', 'markdown'];

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
      description: `Output format (${validFormats.join(', ')})`,
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
    verbose: flag({
      long: 'verbose',
      short: 'v',
      description: 'Show verbose output',
    }),
  },
  handler: async (args) => {
    try {
      // Load configuration
      const configPath = args.config || './openapi-condenser.config.ts';
      let config: ExtractorConfig;
      
      try {
        config = await loadConfig(configPath);
      } catch (error) {
        if (args.source) {
          const format = args.format || 'json';
          if (!validFormats.includes(format as OutputFormat)) {
            console.error(`Error: Invalid format '${format}'. Must be one of ${validFormats.join(', ')}.`);
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

These changes collectively make your OpenAPI Condenser more powerful, secure, and robust, aligning it with best practices and addressing the core concerns about its production-readiness.