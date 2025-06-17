This file is a merged representation of a subset of the codebase, containing specifically included files and files not matching ignore patterns, combined into a single document by Repomix.

# File Summary

## Purpose
This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Only files matching these patterns are included: src/backend, openapi-condenser.config.ts, tsconfig.json, vite.config.ts, package.json
- Files matching these patterns are excluded: *.git *.cursor/
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
```
openapi-condenser.config.ts
package.json
src/backend/cli.ts
src/backend/extractor.ts
src/backend/formatters/index.ts
src/backend/formatters/json.ts
src/backend/formatters/markdown.ts
src/backend/formatters/xml.ts
src/backend/formatters/yaml.ts
src/backend/index.ts
src/backend/server.ts
src/backend/transformer.ts
src/backend/types.ts
src/backend/utils/fetcher.ts
tsconfig.json
vite.config.ts
```

# Files

## File: src/backend/cli.ts
```typescript
#!/usr/bin/env bun
import { parse } from 'cmd-ts';
import { command, option, string, optional, flag } from 'cmd-ts';
import { loadConfig, mergeWithCommandLineArgs, extractOpenAPI } from './extractor';
import type { ExtractorConfig, OutputFormat } from './types';

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

## File: src/backend/formatters/index.ts
```typescript
import { formatAsJson } from './json.ts';
import { formatAsYaml } from './yaml.ts';
import { formatAsXml } from './xml.ts';
import { formatAsMarkdown } from './markdown.ts';
import type { OutputFormat } from '../types.ts';

export interface Formatter {
  format: (data: any) => string;
}

export const getFormatter = (format: OutputFormat): Formatter => {
  switch (format) {
    case 'json':
      return { format: formatAsJson };
    case 'yaml':
      return { format: formatAsYaml };
    case 'xml':
      return { format: formatAsXml };
    case 'markdown':
      return { format: formatAsMarkdown };
    default:
      throw new Error(`Unsupported output format: ${format}`);
  }
};
```

## File: src/backend/formatters/json.ts
```typescript
/**
 * Format data as JSON
 */
export const formatAsJson = (data: any): string => {
  return JSON.stringify(data, null, 2);
};
```

## File: src/backend/formatters/markdown.ts
```typescript
/**
 * Format data as Markdown documentation
 */
export const formatAsMarkdown = (data: any): string => {
  let markdown = '';
  
  // Add API information
  if (data.info) {
    markdown += `# ${data.info.title || 'API Documentation'}\n\n`;
    
    if (data.info.version) {
      markdown += `**Version:** ${data.info.version}\n\n`;
    }
    
    if (data.info.description) {
      markdown += `${data.info.description}\n\n`;
    }
  }
  
  // Add server information
  if (data.servers && data.servers.length > 0) {
    markdown += `## Servers\n\n`;
    
    data.servers.forEach((server: any) => {
      markdown += `- ${server.url}${server.description ? ` - ${server.description}` : ''}\n`;
    });
    
    markdown += '\n';
  }
  
  // Add endpoints
  if (data.paths && Object.keys(data.paths).length > 0) {
    markdown += `## Endpoints\n\n`;
    
    Object.entries(data.paths).forEach(([path, methods]: [string, any]) => {
      markdown += `### ${path}\n\n`;
      
      Object.entries(methods).forEach(([method, operation]: [string, any]) => {
        markdown += `#### ${method.toUpperCase()}\n\n`;
        
        if (operation.summary) {
          markdown += `**Summary:** ${operation.summary}\n\n`;
        }
        
        if (operation.description) {
          markdown += `${operation.description}\n\n`;
        }
        
        // Parameters
        if (operation.parameters && operation.parameters.length > 0) {
          markdown += `##### Parameters\n\n`;
          markdown += `| Name | In | Required | Type | Description |\n`;
          markdown += `| ---- | -- | -------- | ---- | ----------- |\n`;
          
          operation.parameters.forEach((param: any) => {
            const type = param.schema ? formatSchemaType(param.schema) : '';
            markdown += `| ${param.name} | ${param.in} | ${param.required ? 'Yes' : 'No'} | ${type} | ${param.description || ''} |\n`;
          });
          
          markdown += '\n';
        }
        
        // Request body
        if (operation.requestBody) {
          markdown += `##### Request Body\n\n`;
          
          if (operation.requestBody.description) {
            markdown += `${operation.requestBody.description}\n\n`;
          }
          
          if (operation.requestBody.content) {
            Object.entries(operation.requestBody.content).forEach(([contentType, content]: [string, any]) => {
              markdown += `**Content Type:** ${contentType}\n\n`;
              
              if (content.schema) {
                markdown += formatSchema(content.schema);
                markdown += '\n';
              }
            });
          }
        }
        
        // Responses
        if (operation.responses && Object.keys(operation.responses).length > 0) {
          markdown += `##### Responses\n\n`;
          
          Object.entries(operation.responses).forEach(([code, response]: [string, any]) => {
            markdown += `###### ${code} - ${response.description || ''}\n\n`;
            
            if (response.content) {
              Object.entries(response.content).forEach(([contentType, content]: [string, any]) => {
                markdown += `**Content Type:** ${contentType}\n\n`;
                
                if (content.schema) {
                  markdown += formatSchema(content.schema);
                  markdown += '\n';
                }
              });
            }
          });
        }
      });
    });
  }
  
  // Add schemas
  if (data.components?.schemas) {
    markdown += `## Schemas\n\n`;
    
    Object.entries(data.components.schemas).forEach(([name, schema]: [string, any]) => {
      markdown += `### ${name}\n\n`;
      
      if (schema.description) {
        markdown += `${schema.description}\n\n`;
      }
      
      markdown += formatSchema(schema);
      markdown += '\n';
    });
  }
  
  return markdown;
};

/**
 * Format schema type for display
 */
const formatSchemaType = (schema: any): string => {
  if (!schema) return '';
  
  if (schema.$ref) {
    return schema.$ref.split('/').pop() || '';
  }
  
  if (schema.type === 'array' && schema.items) {
    return `array[${formatSchemaType(schema.items)}]`;
  }
  
  return schema.type || '';
};

/**
 * Format schema as Markdown
 */
const formatSchema = (schema: any, indent = 0): string => {
  if (!schema) return '';
  
  const indentStr = '  '.repeat(indent);
  let markdown = '';
  
  if (schema.$ref) {
    return `${indentStr}- Reference: ${schema.$ref.split('/').pop()}\n`;
  }
  
  if (schema.type === 'object' && schema.properties) {
    markdown += `${indentStr}**Properties:**\n\n`;
    
    Object.entries(schema.properties).forEach(([propName, propSchema]: [string, any]) => {
      const required = schema.required?.includes(propName) ? '(required)' : '';
      const type = formatSchemaType(propSchema);
      
      markdown += `${indentStr}- **${propName}** ${required}: ${type}`;
      
      if (propSchema.description) {
        markdown += ` - ${propSchema.description}`;
      }
      
      markdown += '\n';
      
      if (propSchema.type === 'object' && propSchema.properties) {
        markdown += formatSchema(propSchema, indent + 1);
      } else if (propSchema.type === 'array' && propSchema.items?.properties) {
        markdown += formatSchema(propSchema.items, indent + 1);
      }
    });
  } else if (schema.type === 'array' && schema.items) {
    markdown += `${indentStr}**Array items:** ${formatSchemaType(schema.items)}\n`;
    
    if (schema.items.type === 'object' && schema.items.properties) {
      markdown += formatSchema(schema.items, indent + 1);
    }
  } else {
    const type = formatSchemaType(schema);
    markdown += `${indentStr}**Type:** ${type}\n`;
  }
  
  return markdown;
};
```

## File: src/backend/formatters/xml.ts
```typescript
import { XMLBuilder } from 'fast-xml-parser';

/**
 * Format data as XML
 */
export const formatAsXml = (data: any): string => {
  const builder = new XMLBuilder({
    format: true,
    indentBy: '  ',
    ignoreAttributes: false
  });
  
  return builder.build({ openapi: data });
};
```

## File: src/backend/formatters/yaml.ts
```typescript
import YAML from 'yaml';

/**
 * Format data as YAML
 */
export const formatAsYaml = (data: any): string => {
  return YAML.stringify(data);
};
```

## File: src/backend/server.ts
```typescript
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

## File: vite.config.ts
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000'
    }
  }
})
```

## File: src/backend/index.ts
```typescript
//TODO: delete this file
```

## File: src/backend/transformer.ts
```typescript
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
  
  const [type, name] = parts;
  if (!type || !name) {
    return null;
  }

  return { type, name };
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

## File: src/backend/utils/fetcher.ts
```typescript
import { promises as fs } from 'node:fs';
import { extname } from 'node:path';
import YAML from 'yaml';
import type { OpenAPIExtractorResult, Source } from '../types';

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
        return {
          success: false,
          errors: [`Failed to fetch remote spec: ${response.status} ${response.statusText}`]
        };
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
    return {
      success: false,
      errors: [`Error processing spec: ${error instanceof Error ? error.message : String(error)}`]
    };
  }
};

/**
 * Parse content based on file extension or content type, with fallback.
 */
export const parseContent = (content: string, source: string, contentType?: string | null): any => {
  try {
    // 1. Try parsing based on content type for remote files
    if (contentType) {
      if (contentType.includes('json')) {
        return JSON.parse(content);
      }
      if (contentType.includes('yaml') || contentType.includes('x-yaml') || contentType.includes('yml')) {
        return YAML.parse(content);
      }
    }

    // 2. Try parsing based on file extension
    const ext = extname(source).toLowerCase();
    if (ext === '.json') {
      return JSON.parse(content);
    }
    if (ext === '.yaml' || ext === '.yml') {
      return YAML.parse(content);
    }
    
    // 3. Fallback: try parsing as JSON, then YAML
    try {
      return JSON.parse(content);
    } catch (jsonError) {
      return YAML.parse(content);
    }
  } catch (error) {
    throw new Error(`Failed to parse content from '${source}'. Not valid JSON or YAML.`);
  }
};
```

## File: openapi-condenser.config.ts
```typescript
import type { ExtractorConfig } from './src/backend/types';

const config: ExtractorConfig = {
  source: {
    type: 'local',
    path: './openapi.json', // Path to local file or remote URL
  },
  output: {
    format: 'markdown', // 'json', 'yaml', 'xml', or 'markdown'
    destination: './output', // Output directory or file
  },
  filter: {
    paths: {
      // e.g., include: ['/users/**', '/pets/**'],
      // e.g., exclude: ['/users/{userId}/posts']
    }, // Filter by paths using glob patterns
    tags: {
      // e.g., include: ['user', 'pet*'],
      // e.g., exclude: ['internal']
    }, // Filter by tags using glob patterns
    methods: undefined, // Filter by HTTP methods
    includeDeprecated: false, // Whether to include deprecated endpoints
  },
  transform: {
    maxDepth: Infinity, // Maximum depth for schema extraction
    removeExamples: false, // Whether to remove examples
    removeDescriptions: false, // Whether to remove descriptions
    includeServers: true, // Include server information
    includeInfo: true, // Include API info (title, version, etc.)
  },
  validation: {
    strict: true, // Enforce strict validation
    ignoreErrors: [], // Error types to ignore
  },
};

export default config;
```

## File: src/backend/extractor.ts
```typescript
import type { ExtractorConfig, OpenAPIExtractorResult, SpecStats } from './types';
import { fetchSpec } from './utils/fetcher';
import { transformOpenAPI } from './transformer';
import { getFormatter } from './formatters';
import { promises as fs } from 'node:fs';
import { join, dirname } from 'node:path';

const calculateStats = (spec: any): SpecStats => {
  if (!spec || typeof spec !== 'object') {
    return { paths: 0, operations: 0, schemas: 0 };
  }
  const paths = Object.keys(spec.paths || {});
  const operations = paths.reduce((count, path) => {
    if (spec.paths[path] && typeof spec.paths[path] === 'object') {
      return count + Object.keys(spec.paths[path]).length;
    }
    return count;
  }, 0);
  const schemas = Object.keys(spec.components?.schemas || {});

  return {
    paths: paths.length,
    operations: operations,
    schemas: schemas.length,
  };
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
    
    if (!result.success) {
      return result;
    }
    
    const beforeStats = calculateStats(result.data);

    // Apply transformations
    const transformed = transformOpenAPI(
      result.data,
      config.filter,
      config.transform
    );
    
    const afterStats = calculateStats(transformed);
    
    // Format output
    const formatter = getFormatter(config.output.format);
    const formattedOutput = formatter.format(transformed);
    
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

## File: src/backend/types.ts
```typescript
export type OutputFormat = 'json' | 'yaml' | 'xml' | 'markdown';

export type FilterPatterns = {
  include?: string[];
  exclude?: string[];
};

export type FilterOptions = {
  paths?: FilterPatterns;
  tags?: FilterPatterns;
  methods?: ('get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head')[];
  includeDeprecated?: boolean;
};

export type TransformOptions = {
  maxDepth?: number;
  removeExamples?: boolean;
  removeDescriptions?: boolean;
  includeServers?: boolean;
  includeInfo?: boolean;
};

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

export type ExtractorConfig = {
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
};

export type SpecStats = {
  paths: number;
  operations: number;
  schemas: number;
};

export type OpenAPIExtractorResult = {
  success: boolean;
  data?: any;
  stats?: {
    before: SpecStats;
    after: SpecStats;
  };
  warnings?: string[];
  errors?: string[];
};

export type SchemaTransformer = (schema: any) => any;
```

## File: tsconfig.json
```json
{
  "compilerOptions": {
    // Environment setup & latest features
    "lib": ["ESNext", "DOM", "DOM.Iterable"],
    "target": "ESNext",
    "module": "ESNext",
    "moduleDetection": "force",
    "jsx": "react-jsx",
    "allowJs": true,

    // Bundler mode
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "noEmit": true,

    // Best practices
    "strict": true,
    "skipLibCheck": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,

    // Stricter flags enabled
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitAny": true
  },
  "include": ["src", "openapi-condenser.config.ts", "vite.config.ts"],
  "exclude": ["node_modules", "dist"]
}
```

## File: package.json
```json
{
  "name": "openapi-condenser",
  "main": "src/server.ts",
  "type": "module",
  "bin": {
    "openapi-condenser": "src/cli.ts"
  },
  "scripts": {
    "dev": "concurrently \"vite\" \"bun run src/backend/server.ts\"",
    "start": "bun run src/backend/server.ts",
    "build": "vite build",
    "cli": "bun run src/backend/cli.ts"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "@types/micromatch": "^4.0.7",
    "@types/node": "20.19.1",
    "@types/react": "18.3.23",
    "@types/react-dom": "18.3.7",
    "@types/react-syntax-highlighter": "15.5.13",
    "@vitejs/plugin-react": "4.5.2",
    "concurrently": "^9.1.2",
    "vite": "5.4.19"
  },
  "peerDependencies": {
    "typescript": "^5"
  },
  "dependencies": {
    "@elysiajs/eden": "^1.3.2",
    "@elysiajs/static": "^1.3.0",
    "@elysiajs/swagger": "^1.3.0",
    "cmd-ts": "0.13.0",
    "elysia": "1.3.4",
    "fast-xml-parser": "4.5.3",
    "micromatch": "^4.0.5",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "react-syntax-highlighter": "15.6.1",
    "yaml": "^2.3.4"
  }
}
```
