An analysis of your codebase revealed several opportunities to apply the DRY (Don't Repeat Yourself) principle, reduce code duplication, and improve overall structure without altering functionality or the user interface.

Here are the key changes I've made:

1.  **Centralized Type Definitions**: All type definitions from `src/backend/types.ts` have been merged into `src/shared/types.ts`. This creates a single source of truth for types used across both the frontend and backend, eliminating redundancy. The now-unnecessary `src/backend/types.ts` file has been deleted.

2.  **Reusable UI Components**:
    *   A new `Spinner` component has been created at `src/frontend/components/ui/Spinner.tsx` to replace the duplicated SVG and animation logic in `ActionPanel` and `InputPanel`.
    *   A new `InfoTooltip` component at `src/frontend/components/ui/InfoTooltip.tsx` now encapsulates the info icon and tooltip logic, cleaning up the `Switch` and `TextInput` components.

3.  **Refactored Backend Logic**:
    *   The Server-Side Request Forgery (SSRF) protection logic in `src/backend/server.ts` has been extracted into a dedicated utility file `src/backend/utils/ssrf.ts`. This makes the API route handler cleaner, more readable, and easier to maintain.
    *   The statistics calculation functions in `src/backend/extractor.ts` have been refactored to use a shared helper, removing duplicated code for calculating character, line, and token counts.

These changes lead to a more maintainable, robust, and concise codebase.

### Code Changes:

```typescript // src/backend/cli.ts
#!/usr/bin/env bun
import { parse } from 'cmd-ts';
import { command, option, string, optional, flag } from 'cmd-ts';
import { loadConfig, mergeWithCommandLineArgs, extractOpenAPI } from './extractor';
import type { ExtractorConfig, OutputFormat } from '../shared/types';
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

```typescript // src/backend/extractor.ts
import type { ExtractorConfig, OpenAPIExtractorResult, SpecStats, HttpMethod } from '../shared/types';
import { fetchSpec } from './utils/fetcher';
import { transformOpenAPI } from './transformer';
import { getFormatter } from './formatters';
import { promises as fs } from 'node:fs';
import { join, dirname } from 'node:path';
import { OpenAPIV3, OpenAPI } from 'openapi-types';
import { HTTP_METHODS } from '../shared/constants';
import { DEFAULT_CONFIG_PATH, TOKEN_CHAR_RATIO } from './constants';

const calculateStringStats = (content: string): Pick<SpecStats, 'charCount' | 'lineCount' | 'tokenCount'> => {
  const charCount = content.length;
  const lineCount = content.split('\n').length;
  const tokenCount = Math.ceil(charCount / TOKEN_CHAR_RATIO);
  return { charCount, lineCount, tokenCount };
}

export const calculateSpecStats = (spec: OpenAPIV3.Document): SpecStats => {
  if (!spec || typeof spec !== 'object') {
    return { paths: 0, operations: 0, schemas: 0, charCount: 0, lineCount: 0, tokenCount: 0 };
  }

  const stringStats = calculateStringStats(JSON.stringify(spec, null, 2));

  const validMethods = new Set(HTTP_METHODS);
  const pathItems = spec.paths || {};
  const paths = Object.keys(pathItems);
  const operations = paths.reduce((count, path) => {
    const pathItem = pathItems[path];
    if (pathItem && typeof pathItem === 'object') {
      return count + Object.keys(pathItem).filter(method => validMethods.has(method as HttpMethod)).length;
    }
    return count;
  }, 0);
  const schemas = Object.keys(spec.components?.schemas || {}).length;

  return {
    paths: paths.length,
    operations: operations,
    schemas: schemas,
    ...stringStats,
  };
};

export const calculateOutputStats = (output: string): Pick<SpecStats, 'charCount' | 'lineCount' | 'tokenCount'> => {
    return calculateStringStats(output);
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

```typescript // src/backend/formatters/index.ts
import { formatAsJson } from './json';
import { formatAsXml } from './xml';
import { formatAsConciseText } from './concise-text';
import type { OutputFormat } from '../../shared/types';
import { OpenAPIV3 } from 'openapi-types';
import YAML from 'yaml';

export interface Formatter {
  format: (data: OpenAPIV3.Document) => string;
}

const formatAsYaml = (data: OpenAPIV3.Document): string => {
  return YAML.stringify(data);
};

const formatters: Record<OutputFormat, Formatter> = {
  json: { format: formatAsJson },
  yaml: { format: formatAsYaml },
  xml: { format: formatAsXml },
  markdown: { format: formatAsConciseText },
};

export const getFormatter = (format: OutputFormat): Formatter => {
  const formatter = formatters[format];
  if (!formatter) {
    throw new Error(`Unsupported output format: ${format}`);
  }
  return formatter;
};
```

```typescript // src/backend/server.ts
import { Elysia, t } from 'elysia';
import { swagger } from '@elysiajs/swagger';
import { cors } from '@elysiajs/cors';
import { extractOpenAPI } from './extractor';
import type { ExtractorConfig, SpecStats } from '../shared/types';
import { API_PORT } from '../shared/constants';
import { USER_AGENT } from './constants';
import { checkUrlSafety } from './utils/ssrf';

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

```typescript // src/backend/transformer.ts
import {
  type FilterOptions,
  type TransformOptions,
  type SchemaTransformer,
  type FilterPatterns,
  type HttpMethod,
} from '../shared/types';
import micromatch from 'micromatch';
import { OpenAPIV3 } from 'openapi-types';
import { HTTP_METHODS } from '../shared/constants';

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
  paths: OpenAPIV3.PathsObject,
  filterOptions: FilterOptions,
): OpenAPIV3.PathsObject => {
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
    const pathItem = paths[path];
    if (pathItem) {
      const filteredMethods = filterMethods(pathItem, filterOptions);

      if (Object.keys(filteredMethods).length > 0) {
        // Re-add non-method properties from the original pathItem
        const newPathItem: OpenAPIV3.PathItemObject = { ...filteredMethods };
        if (pathItem.summary) newPathItem.summary = pathItem.summary;
        if (pathItem.description) newPathItem.description = pathItem.description;
        if (pathItem.parameters) newPathItem.parameters = pathItem.parameters;
        if (pathItem.servers) newPathItem.servers = pathItem.servers;
        if (pathItem.$ref) newPathItem.$ref = pathItem.$ref;
        
        acc[path] = newPathItem;
      }
    }

    return acc;
  }, {} as OpenAPIV3.PathsObject);
};

function isHttpMethod(method: string): method is HttpMethod {
  return HTTP_METHODS.includes(method as HttpMethod);
}

/**
 * Filter HTTP methods based on configuration
 */
export const filterMethods = (
  pathItem: OpenAPIV3.PathItemObject,
  filterOptions: FilterOptions,
): OpenAPIV3.PathItemObject => {
  const newPathItem: OpenAPIV3.PathItemObject = {};
  
  for (const key in pathItem) {
    if (isHttpMethod(key)) {
      const method: HttpMethod = key;
      const operation = pathItem[method];

      if (!operation) continue;

      if (
        filterOptions.methods &&
        filterOptions.methods.length > 0 &&
        !filterOptions.methods.includes(method)
      ) {
        continue;
      }

      if (!filterOptions.includeDeprecated && operation.deprecated) {
        continue;
      }

      if (
        filterOptions.tags &&
        !matchesTags(operation.tags, filterOptions.tags)
      ) {
        continue;
      }

      newPathItem[method] = operation;
    }
  }
  return newPathItem;
};

/**
 * Recursively find all $ref values in a given object.
 */
export const findRefsRecursive = (
  obj: any, // Keeping `any` here as it's a deep recursive search
  refs: Set<string>,
): void => {
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
export const getComponentNameFromRef = (ref: string): { type: string; name: string } | null => {
  const prefix = '#/components/';
  if (!ref.startsWith(prefix)) {
    // This is not a component reference we can process for removal.
    // It might be a reference to another part of the document, which is fine.
    return null;
  }
  
  const path = ref.substring(prefix.length);
  const parts = path.split('/');
  
  // We expect a structure like 'schemas/MySchema' or 'parameters/MyParameter'
  if (parts.length < 2) {
    console.warn(`[OpenAPI Condenser] Invalid component reference found: ${ref}`);
    return null;
  }
  
  const type = parts[0];
  // The name might contain slashes if it's nested, so we join the rest.
  const name = parts.slice(1).join('/');

  if (!type || !name) {
    return null;
  }

  return { type, name };
};

/**
 * Removes all components (schemas, parameters, etc.) that are not referenced
 * in the remaining parts of the specification. This version uses a more efficient
 * queue-based traversal to find all transitive dependencies.
 */
export const removeUnusedComponents = (
  spec: OpenAPIV3.Document,
): OpenAPIV3.Document => {
  if (!spec.components) return spec;

  // 1. Find all initial references from the spec roots.
  const initialRefs = new Set<string>();
  const specRoots = [
    spec.paths,
    spec.tags,
    spec.security,
    spec.info,
    spec.servers,
    (spec as any).webhooks, // webhooks are in v3.1
    spec.externalDocs,
  ];

  for (const root of specRoots) {
    if (root) {
      findRefsRecursive(root, initialRefs);
    }
  }

  // 2. Use a queue-based approach (BFS) to transitively find all used components.
  const allUsedRefs = new Set<string>(initialRefs);
  const queue = Array.from(initialRefs);

  while (queue.length > 0) {
    const ref = queue.shift(); // Using shift is okay for typical spec sizes
    if (!ref) continue;

    const componentInfo = getComponentNameFromRef(ref);
    if (componentInfo) {
      const { type, name } = componentInfo;
      const component = (spec.components as any)?.[type]?.[name];
      if (component) {
        const subRefs = new Set<string>();
        findRefsRecursive(component, subRefs);
        
        for (const subRef of subRefs) {
          if (!allUsedRefs.has(subRef)) {
            allUsedRefs.add(subRef);
            queue.push(subRef);
          }
        }
      }
    }
  }

  // 3. Build a new components object with only the referenced items.
  const newComponents: OpenAPIV3.ComponentsObject = {};
  if (spec.components) {
    for (const componentType in spec.components) {
      const componentGroup = (spec.components as any)[componentType];
      const newComponentGroup: Record<string, any> = {};
      for (const componentName in componentGroup) {
        const ref = `#/components/${componentType}/${componentName}`;
        if (allUsedRefs.has(ref)) {
          newComponentGroup[componentName] = componentGroup[componentName];
        }
      }
      if (Object.keys(newComponentGroup).length > 0) {
        (newComponents as any)[componentType] = newComponentGroup;
      }
    }
  }

  // 4. Replace the old components object or remove it if empty.
  if (Object.keys(newComponents).length > 0) {
    (spec.components as any) = newComponents;
  } else {
    delete spec.components;
  }

  return spec;
};

/**
 * Transform OpenAPI schema based on configuration. This version is optimized
 * to modify objects in-place, reducing memory allocations.
 */
export const transformSchema = (
  node: any,
  transformOptions: TransformOptions,
  currentDepth = 0,
): any => {
  if (!node || typeof node !== 'object') {
    return node;
  }
  
  if ('$ref' in node) {
    return node;
  }
  
  // Handle maximum depth
  if (
    transformOptions.maxDepth !== undefined &&
    currentDepth >= transformOptions.maxDepth
  ) {
    return {
      description: `Truncated: Max depth of ${transformOptions.maxDepth} reached`,
    };
  }
  
  if (Array.isArray(node)) {
    // We must use .map() to handle cases where an item is replaced (e.g., by max depth truncation).
    return node.map(item => transformSchema(item, transformOptions, currentDepth + 1));
  }

  // It's an object. Modify it in-place.
  
  // Remove examples if configured
  if (transformOptions.removeExamples && 'example' in node) {
    delete node.example;
  }
  if (transformOptions.removeExamples && 'examples' in node) {
    delete node.examples;
  }
  
  // Remove descriptions if configured
  if (transformOptions.removeDescriptions && 'description' in node) {
    delete node.description;
  }

  // Remove summaries if configured
  if (transformOptions.removeSummaries && 'summary' in node) {
    delete node.summary;
  }
  
  // Recursively transform nested properties
  for (const key in node) {
    const prop = node[key];
    if (typeof prop === 'object' && prop !== null) {
      // Re-assign because the recursive call might return a new object (e.g. from maxDepth).
      node[key] = transformSchema(
        prop,
        transformOptions,
        currentDepth + 1,
      );
    }
  }
  
  return node;
};

/**
 * Applies both filtering and transformations to an entire OpenAPI document.
 */
export const transformOpenAPI = (
  openapi: OpenAPIV3.Document,
  filterOpts?: FilterOptions,
  transformOpts?: TransformOptions,
): OpenAPIV3.Document => {
  let transformed: OpenAPIV3.Document = JSON.parse(JSON.stringify(openapi));

  // 1. Apply path/method/tag filtering
  if (filterOpts && transformed.paths) {
    transformed.paths = filterPaths(transformed.paths, filterOpts);
  }

  // 2. Apply structural removals based on transformOpts
  if (transformOpts) {
    if (transformOpts.includeServers === false) {
      delete transformed.servers;
    }
    if (transformOpts.includeInfo === false) {
      delete (transformed as any).info;
    }

    if (transformed.paths) {
      for (const path in transformed.paths) {
        const pathItem = transformed.paths[path];
        if (pathItem) {
          for (const method of HTTP_METHODS) {
            const operation = pathItem[method] as
              | OpenAPIV3.OperationObject
              | undefined;
            if (operation) {
              if (transformOpts.includeRequestBodies === false) {
                delete operation.requestBody;
              }
              if (transformOpts.includeResponses === false) {
                delete (operation as any).responses;
              }
            }
          }
        }
      }
    }
  }

  // 3. Apply granular transformations (remove descriptions/examples etc)
  if (transformOpts) {
    transformed = transformSchema(
      transformed,
      transformOpts,
    ) as OpenAPIV3.Document;
  }

  // 4. Clean up unused components based on what's left.
  transformed = removeUnusedComponents(transformed);

  // 5. If schemas are explicitly excluded, remove them now.
  if (transformOpts?.includeSchemas === false && transformed.components) {
    delete transformed.components.schemas;
    if (Object.keys(transformed.components).length === 0) {
      delete transformed.components;
    }
  }

  return transformed;
};

/**
 * Higher-order function for composing transformers
 */
export const composeTransformers =
  (...transformers: SchemaTransformer[]): SchemaTransformer =>
  (schema: OpenAPIV3.SchemaObject) =>
    transformers.reduce(
      (currentSchema, transformer) => transformer(currentSchema),
      schema,
    );
```

```typescript // src/backend/types.ts
//TODO: delete this file
```

```typescript // src/backend/utils/fetcher.ts
import { promises as fs } from 'node:fs';
import { extname } from 'node:path';
import YAML from 'yaml';
import type { OpenAPIExtractorResult, Source } from '../shared/types';
import { OpenAPI } from 'openapi-types';

/**
 * Fetch OpenAPI spec from local file, remote URL, or in-memory content
 */
export const fetchSpec = async (
  source: Source
): Promise<OpenAPIExtractorResult> => {
  try {
    let content: string;
    let contentType: string | null = null;
    
    if (source.type === 'memory') {
      content = source.content;
    } else if (source.type === 'local') {
      content = await fs.readFile(source.path, 'utf-8');
    } else {
      const response = await fetch(source.path);
      if (!response.ok) {
        throw new Error(`Failed to fetch remote spec: ${response.status} ${response.statusText}`);
      }
      content = await response.text();
      contentType = response.headers.get('Content-Type');
    }
    
    const data = parseContent(content, source.path, contentType);
    return {
      success: true,
      data,
    };
  } catch (error) {
    throw new Error(`Error processing spec: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Parse content based on file extension or content type, with fallback.
 */
export const parseContent = (
  content: string,
  source: string,
  contentType?: string | null,
): OpenAPI.Document => {
  try {
    // 1. Try parsing based on content type for remote files
    if (contentType) {
      if (contentType.includes('json')) {
        return JSON.parse(content) as OpenAPI.Document;
      }
      if (contentType.includes('yaml') || contentType.includes('x-yaml') || contentType.includes('yml')) {
        return YAML.parse(content) as OpenAPI.Document;
      }
    }

    // 2. Try parsing based on file extension
    const ext = extname(source).toLowerCase();
    if (ext === '.json') {
      return JSON.parse(content) as OpenAPI.Document;
    }
    if (ext === '.yaml' || ext === '.yml') {
      return YAML.parse(content) as OpenAPI.Document;
    }
    
    // 3. Fallback: try parsing as JSON, then YAML
    try {
      return JSON.parse(content) as OpenAPI.Document;
    } catch (jsonError) {
      return YAML.parse(content) as OpenAPI.Document;
    }
  } catch (error) {
    throw new Error(
      `Failed to parse content from '${source}'. Not valid JSON or YAML.`,
    );
  }
};
```

```typescript // src/backend/utils/ssrf.ts
import { resolve } from 'node:dns/promises';
import { isIP } from 'node:net';

const isPrivateIP = (ip: string): boolean => {
  // IPv6 loopback and private ranges (ULA, etc.)
  if (ip === '::1' || ip.startsWith('fc00:') || ip.startsWith('fd00:')) {
    return true;
  }
  
  // Check for IPv4-mapped IPv6 addresses (e.g., ::ffff:127.0.0.1)
  if (ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }

  // Handle localhost for IPv4
  if (ip === '127.0.0.1') {
    return true;
  }

  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) {
     return false; // Not a valid IPv4 address string
  }

  const [p1, p2] = parts;
  if (p1 === undefined || p2 === undefined) {
    return false; // Should not happen due to length check
  }

  return (
    p1 === 10 || // 10.0.0.0/8
    (p1 === 172 && p2 >= 16 && p2 <= 31) || // 172.16.0.0/12
    (p1 === 192 && p2 === 168) || // 192.168.0.0/16
    p1 === 127 || // 127.0.0.0/8
    (p1 === 169 && p2 === 254) // 169.254.0.0/16 (APIPA)
  );
};

type SafetyResult = { safe: true } | { safe: false, message: string, status: number };

export const checkUrlSafety = async (url: string): Promise<SafetyResult> => {
    try {
        const urlObj = new URL(url);

        if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
            return { safe: false, message: 'URL must use http or https protocol.', status: 400 };
        }
        
        const hostname = urlObj.hostname;
        const isHostnameAnIp = isIP(hostname) !== 0;

        if (isHostnameAnIp) {
            if (isPrivateIP(hostname)) {
                return { safe: false, message: 'Fetching specs from private or local network addresses is forbidden.', status: 403 };
            }
        } else {
            try {
                const addresses = await resolve(hostname, { all: true });
                if (addresses.some(addr => isPrivateIP(addr.address))) {
                    return { safe: false, message: 'Fetching specs from private or local network addresses is forbidden.', status: 403 };
                }
            } catch (dnsError) {
                return { safe: false, message: `Could not resolve hostname: ${hostname}`, status: 400 };
            }
        }

        return { safe: true };

    } catch (e) {
        if (e instanceof TypeError) {
            return { safe: false, message: `Invalid URL provided: ${url}`, status: 400 };
        }
        const message = e instanceof Error ? e.message : String(e);
        return { safe: false, message: `An unexpected error occurred while validating URL: ${message}`, status: 500 };
    }
};
```

```typescript // src/frontend/components/features/ActionPanel.tsx
import React, { useRef } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { isLoadingAtom, condenseSpecAtom, specContentAtom, outputAtom } from '../../state/atoms';
import { useButtonHover } from '../../state/motion.reuse';
import { Spinner } from '../ui';

export const ActionPanel: React.FC = () => {
    const isLoading = useAtomValue(isLoadingAtom);
    const specContent = useAtomValue(specContentAtom);
    const output = useAtomValue(outputAtom);
    const onCondense = useSetAtom(condenseSpecAtom);
    const buttonRef = useRef<HTMLButtonElement>(null);
    useButtonHover(buttonRef);

    return (
        <button 
            ref={buttonRef}
            onClick={() => onCondense()}
            disabled={isLoading || !specContent}
            className="w-full bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 flex items-center justify-center"
        >
            {isLoading ? (
                <Spinner className="-ml-1 mr-3 h-5 w-5 text-white" />
            ) : output ? 'Re-condense' : 'Condense'}
        </button>
    );
}
```

```typescript // src/frontend/components/features/input/InputPanel.tsx
import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import { useSetAtom, useAtom } from 'jotai';
import { client } from '../../../client';
import { specContentAtom, fileNameAtom } from '../../../state/atoms';
import { 
  INPUT_DEBOUNCE_DELAY, 
  URL_FETCH_DEBOUNCE_DELAY,
  DEFAULT_SPEC_FILENAME,
  DEFAULT_URL_FILENAME
} from '../../../constants';
import { Spinner } from '../../ui';

interface InputPanelProps {
  // No props needed after Jotai integration
}

const TabButton = memo<{tab: 'paste' | 'upload' | 'url', activeTab: 'paste' | 'upload' | 'url', onClick: (tab: 'paste' | 'upload' | 'url') => void, children: React.ReactNode}>(
  ({ tab, activeTab, onClick, children }) => (
    <button
      onClick={() => onClick(tab)}
      className={`px-4 py-2 text-sm font-medium transition ${activeTab === tab ? 'text-white bg-slate-700/50' : 'text-slate-400 hover:bg-slate-800/60'}`}
    >
      {children}
    </button>
  )
);

export const InputPanel: React.FC<InputPanelProps> = () => {
  const [specContent, setSpecContent] = useAtom(specContentAtom);
  const setFileName = useSetAtom(fileNameAtom);

  const [activeTab, setActiveTab] = useState<'paste' | 'upload' | 'url'>('paste');
  const [url, setUrl] = useState('');
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [localSpecContent, setLocalSpecContent] = useState(specContent);

  // Debounce effect for spec content
  useEffect(() => {
    const handler = setTimeout(() => {
      if (specContent !== localSpecContent) {
        setSpecContent(localSpecContent);
      }
    }, INPUT_DEBOUNCE_DELAY);

    return () => {
      clearTimeout(handler);
    };
  }, [localSpecContent, specContent, setSpecContent]);

  // When global state changes (e.g., from file upload or URL fetch), update local state
  useEffect(() => {
    if (specContent !== localSpecContent) {
        setLocalSpecContent(specContent);
    }
  }, [specContent]);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setSpecContent(content);
        if (textareaRef.current) {
          textareaRef.current.value = content;
        }
        setFileName(file.name);
        setFetchError(null);
      };
      reader.readAsText(file);
    }
  }, [setSpecContent, setFileName]);

  const handlePasteChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalSpecContent(event.target.value);
    setFileName(DEFAULT_SPEC_FILENAME); // Assume json for pasted content
    setFetchError(null);
    setUploadedFileName(null);
  }, [setFileName]);
  
  const handleTabClick = useCallback((tab: 'paste' | 'upload' | 'url') => {
    setActiveTab(tab);
  }, []);
  
  const handleUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
  }, []);

  useEffect(() => {
    const fetchSpecFromUrl = async () => {
      if (!url) {
        setFetchError(null);
        return;
      }

      try {
        new URL(url);
      } catch {
        setFetchError('Invalid URL format.');
        return;
      }

      setIsFetching(true);
      setFetchError(null);
      setUploadedFileName(null);

      try {
        const { data, error } = await client.api['fetch-spec'].get({ $query: { url } });

        if (error) {
          let errorMessage = 'Failed to fetch the spec.';
          const errorValue = error.value as any;
          if (typeof errorValue === 'object' && errorValue !== null) {
            errorMessage = errorValue.error || (typeof errorValue.message === 'string' ? errorValue.message : errorMessage);
          }
          setFetchError(errorMessage);
        } else if (data) {
          setSpecContent(data.content);
          if (textareaRef.current) {
              textareaRef.current.value = data.content;
          }
          try {
            const urlObject = new URL(url);
            setFileName(urlObject.pathname.split('/').pop() || DEFAULT_URL_FILENAME);
          } catch {
            setFileName(DEFAULT_URL_FILENAME);
          }
        }
      } catch (err) {
        setFetchError(`Request failed: ${err instanceof Error ? err.message : String(err)}`);
      }
      
      setIsFetching(false);
    };

    if (activeTab === 'url') {
      const handler = setTimeout(() => {
        fetchSpecFromUrl();
      }, URL_FETCH_DEBOUNCE_DELAY);

      return () => clearTimeout(handler);
    }
  }, [url, activeTab, setSpecContent, setFileName]);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg overflow-hidden">
      <div className="flex border-b border-slate-700/50">
        <TabButton tab="paste" activeTab={activeTab} onClick={handleTabClick}>Paste Spec</TabButton>
        <TabButton tab="upload" activeTab={activeTab} onClick={handleTabClick}>Upload File</TabButton>
        <TabButton tab="url" activeTab={activeTab} onClick={handleTabClick}>From URL</TabButton>
      </div>
      <div className="p-1">
        {activeTab === 'paste' && (
          <textarea
            ref={textareaRef}
            value={localSpecContent}
            onChange={handlePasteChange}
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
              <div className="relative flex items-center">
                <input
                  id="url-input"
                  type="url"
                  value={url}
                  onChange={handleUrlChange}
                  placeholder="https://petstore3.swagger.io/api/v3/openapi.json"
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-md pl-3 pr-10 py-2 text-sm text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition"
                />
                {isFetching && (
                    <div className="absolute right-3">
                        <Spinner className="h-5 w-5 text-slate-400" />
                    </div>
                )}
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

```typescript // src/frontend/components/ui/index.ts
export * from './Tooltip';
export * from './Section';
export * from './Switch';
export * from './TextInput';
export * from './Spinner';
export * from './InfoTooltip';
```

```typescript // src/frontend/components/ui/InfoTooltip.tsx
import React from 'react';
import { Tooltip } from './Tooltip';

export const InfoTooltip: React.FC<{ text: string }> = ({ text }) => (
    <Tooltip text={text}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    </Tooltip>
);
```

```typescript // src/frontend/components/ui/Spinner.tsx
import React from 'react';

export const Spinner: React.FC<{ className?: string }> = ({ className = 'h-5 w-5 text-white' }) => (
  <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);
```

```typescript // src/frontend/components/ui/Switch.tsx
import React, { useRef } from 'react';
import { InfoTooltip } from './InfoTooltip';
import { useSwitchAnimation } from '../../state/motion.reuse';

export const Switch: React.FC<{ label: string; checked: boolean; onChange: (checked: boolean) => void; tooltip?: string }> = React.memo(({ label, checked, onChange, tooltip }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    useSwitchAnimation(inputRef, checked);

    return (
        <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-slate-300 flex items-center gap-2">
                {label}
                {tooltip && <InfoTooltip text={tooltip} />}
            </span>
            <div className="relative">
                <input ref={inputRef} type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
                <div className="block w-10 h-6 rounded-full bg-slate-600"></div>
                <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full"></div>
            </div>
        </label>
    )
});
```

```typescript // src/frontend/components/ui/TextInput.tsx
import React, { useRef } from 'react';
import { InfoTooltip } from './InfoTooltip';
import { useInputFocus } from '../../state/motion.reuse';

export const TextInput: React.FC<{ label: string; value: string[] | undefined; onChange: (value: string[]) => void; placeholder: string; tooltip?: string; }> = React.memo(({ label, value, onChange, placeholder, tooltip }) => {
    const inputRef = useRef<HTMLDivElement>(null);
    useInputFocus(inputRef);

    return (
        <div ref={inputRef}>
            <label className="block text-sm text-slate-300 mb-1 flex items-center gap-2">
                {label}
                {tooltip && <InfoTooltip text={tooltip} />}
            </label>
            <input
                type="text"
                placeholder={placeholder}
                value={value?.join(', ')}
                onChange={(e) => onChange(e.target.value ? e.target.value.split(',').map(s => s.trim()).filter(Boolean) : [])}
                className="w-full bg-slate-700/50 border border-slate-600 rounded-md px-3 py-2 text-sm text-white placeholder-slate-400 outline-none transition"
            />
        </div>
    )
});
```

```typescript // src/shared/types.ts
import type { OpenAPI, OpenAPIV3 } from 'openapi-types';

export type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head' | 'trace';

export type OutputFormat = 'json' | 'yaml' | 'xml' | 'markdown';

export type FilterPatterns = {
  include?: string[];
  exclude?: string[];
};

export interface FilterOptions {
  paths?: FilterPatterns;
  tags?: FilterPatterns;
  operationIds?: FilterPatterns;
  methods?: HttpMethod[];
  includeDeprecated?: boolean;
}

export interface TransformOptions {
  maxDepth?: number;
  removeExamples?: boolean;
  removeDescriptions?: boolean;
  removeSummaries?: boolean;
  includeServers?: boolean;
  includeInfo?: boolean;
  includeSchemas?: boolean;
  includeRequestBodies?: boolean;
  includeResponses?: boolean;
}

export type Source =
  | {
      type: 'local' | 'remote';
      path: string;
      content?: undefined;
    }
  | {
      type: 'memory';
      path: string; // for determining parser, e.g., 'spec.json'
      content: string;
    };

export interface ExtractorConfig {
  source: Source;
  output: {
    format: OutputFormat;
    destination?: string;
  };
  filter?: FilterOptions;
  transform?: TransformOptions;
  validation?: {
    strict: boolean;
    ignoreErrors?: string[];
  };
}

export interface SpecStats {
  paths: number;
  operations: number;
  schemas: number;
  charCount: number;
  lineCount: number;
  tokenCount: number;
}

export interface OpenAPIExtractorResult {
  success: boolean;
  data?: OpenAPI.Document | string;
  stats?: {
    before: SpecStats;
    after: SpecStats;
  };
  warnings?: string[];
  errors?: string[];
}

export type SchemaTransformer = (
  schema: OpenAPIV3.SchemaObject,
) => OpenAPIV3.SchemaObject;
```

```typescript // test/e2e/transformer.test.ts
import { describe, it, expect } from 'bun:test';
import { extractOpenAPI } from '../../src/backend/extractor';
import type { ExtractorConfig, OpenAPIExtractorResult } from '../../src/shared/types';

const complexTestSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Complex Test API',
    version: '1.0.0',
  },
  paths: {
    '/users/{id}': {
      get: {
        summary: 'Get a user',
        tags: ['Users'],
        operationId: 'getUser',
        parameters: [
          { $ref: '#/components/parameters/UserId' }
        ],
        responses: {
          '200': {
            description: 'A user object',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/User' },
              },
            },
          },
        },
      },
    },
    '/posts/{id}': {
      get: {
        summary: 'Get a post',
        tags: ['Posts'],
        operationId: 'getPost',
        responses: {
          '200': {
            description: 'A post object',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Post' },
              },
            },
          },
        },
      },
    },
    '/tags': {
        post: {
            summary: 'Create a tag',
            tags: ['Tags'],
            operationId: 'createTag',
            requestBody: {
                $ref: '#/components/requestBodies/TagBody'
            },
            responses: {
                '201': {
                    description: 'Tag created'
                }
            }
        }
    }
  },
  components: {
    parameters: {
        UserId: {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' }
        }
    },
    requestBodies: {
        TagBody: {
            content: {
                'application/json': {
                    schema: { $ref: '#/components/schemas/Tag' }
                }
            }
        }
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          profile: { $ref: '#/components/schemas/UserProfile' },
        },
      },
      UserProfile: {
        type: 'object',
        properties: {
          email: { type: 'string' },
          avatar: { $ref: '#/components/schemas/Avatar' }
        },
      },
      Avatar: {
        type: 'object',
        properties: {
          url: { type: 'string' },
        }
      },
      Post: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          author: { $ref: '#/components/schemas/User' },
        },
      },
      Tag: {
        type: 'object',
        properties: {
          name: { type: 'string' }
        }
      }
    },
  },
};

describe('Complex Transformer and Stats Validation', () => {
  it('should correctly filter paths, remove unused components transitively, and calculate accurate stats', async () => {
    const config: ExtractorConfig = {
      source: {
        type: 'memory',
        path: 'spec.json',
        content: JSON.stringify(complexTestSpec),
      },
      filter: {
        paths: {
          exclude: ['/posts/{id}'],
        },
      },
      transform: {},
      output: {
        format: 'json',
      },
    };

    const result: OpenAPIExtractorResult = await extractOpenAPI(config);

    expect(result.success).toBe(true);
    if (!result.success || !result.stats) return;

    const transformedSpec = JSON.parse(result.data as string);
    
    // 1. Validate Stats
    expect(result.stats.before.operations).toBe(3);
    expect(result.stats.before.schemas).toBe(5);
    expect(result.stats.after.operations).toBe(2); // get user, create tag
    expect(result.stats.after.schemas).toBe(4);   // User, UserProfile, Avatar, Tag (Post should be removed)
    expect(result.stats.after.charCount).toBeLessThan(result.stats.before.charCount);
    expect(result.stats.after.tokenCount).toBeLessThan(result.stats.before.tokenCount);

    // 2. Validate Path Filtering
    expect(transformedSpec.paths['/users/{id}']).toBeDefined();
    expect(transformedSpec.paths['/posts/{id}']).toBeUndefined();
    expect(transformedSpec.paths['/tags']).toBeDefined();

    // 3. Validate Component Removal
    const components = transformedSpec.components;
    // Kept because /users/{id} is kept
    expect(components.schemas.User).toBeDefined();
    // Kept because User needs it (transitive)
    expect(components.schemas.UserProfile).toBeDefined();
    // Kept because UserProfile needs it (transitive)
    expect(components.schemas.Avatar).toBeDefined();
    // Kept because /tags is kept
    expect(components.schemas.Tag).toBeDefined();
     // Kept because /users/{id} needs it
    expect(components.parameters.UserId).toBeDefined();
    // Kept because /tags needs it
    expect(components.requestBodies.TagBody).toBeDefined();

    // Removed because /posts/{id} was removed and nothing else uses it
    expect(components.schemas.Post).toBeUndefined();
  });

  it('should handle a combination of path, tag, and method filters plus transformations', async () => {
    const multiFilterSpec = {
      openapi: '3.0.0',
      info: { title: 'Multi-filter Test', version: '1.0' },
      paths: {
        '/products': {
          get: { 
            tags: ['products', 'search'],
            summary: 'Get all products',
            description: 'This should be removed.',
            responses: { '200': { description: 'OK' } }
          },
          post: {
            tags: ['products'],
            summary: 'Create a product',
            responses: { '201': { description: 'Created' } }
          }
        },
        '/inventory': {
          get: {
            tags: ['inventory'],
            summary: 'Get inventory',
            responses: { '200': { content: { 'application/json': { schema: { $ref: '#/components/schemas/Inventory' }, example: { 'stock': 100 } } } } }
          }
        },
        '/users': {
          get: {
            tags: ['users'],
            summary: 'Get users',
            responses: { '200': { description: 'OK' } }
          }
        }
      },
      components: {
        schemas: {
          Inventory: { type: 'object', properties: { stock: { type: 'integer' } } }
        }
      }
    };

    const config: ExtractorConfig = {
      source: {
        type: 'memory',
        path: 'spec.json',
        content: JSON.stringify(multiFilterSpec)
      },
      filter: {
        paths: { exclude: ['/users'] }, // Exclude /users
        tags: { include: ['products', 'inventory'] }, // Only include endpoints with these tags
        methods: ['get'] // Only allow GET methods
      },
      transform: {
        removeDescriptions: true,
        removeExamples: true
      },
      output: { format: 'json' }
    };

    const result = await extractOpenAPI(config);
    expect(result.success).toBe(true);
    if(!result.success || !result.stats) return;

    const spec = JSON.parse(result.data as string);

    // 1. Path and method assertions
    expect(spec.paths['/products']).toBeDefined();
    expect(spec.paths['/products'].get).toBeDefined(); // Kept: matches tags and method
    expect(spec.paths['/products'].post).toBeUndefined(); // Removed: method is not 'get'
    
    expect(spec.paths['/inventory']).toBeDefined();
    expect(spec.paths['/inventory'].get).toBeDefined(); // Kept: matches tags and method
    
    expect(spec.paths['/users']).toBeUndefined(); // Removed: excluded by path filter

    // 2. Transformation assertions
    expect(spec.paths['/products'].get.description).toBeUndefined();
    expect(spec.paths['/inventory'].get.responses['200'].content['application/json'].example).toBeUndefined();

    // 3. Component assertions
    expect(spec.components.schemas.Inventory).toBeDefined(); // Kept because /inventory is kept

    // 4. Stats assertions
    expect(result.stats.before.operations).toBe(4);
    expect(result.stats.after.operations).toBe(2); // /products -> get, /inventory -> get
    expect(result.stats.after.charCount).toBeLessThan(result.stats.before.charCount);
  });
});
```