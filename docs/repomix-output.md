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
- Only files matching these patterns are included: src, openapi-condenser.config.ts, package.json, tsconfig.json
- Files matching these patterns are excluded: *.git *.cursor/
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
```
openapi-condenser.config.ts
package.json
src/extractor.ts
src/formatters/index.ts
src/formatters/json.ts
src/formatters/markdown.ts
src/formatters/xml.ts
src/formatters/yaml.ts
src/index.ts
src/transformer.ts
src/types.ts
src/utils/fetcher.ts
tsconfig.json
```

# Files

## File: src/index.ts
```typescript
#!/usr/bin/env bun
import { parse } from 'cmd-ts';
import { command, option, string, boolean, optional, flag } from 'cmd-ts';
import { loadConfig, mergeWithCommandLineArgs, extractOpenAPI } from './extractor';
import type { ExtractorConfig } from './types';

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
      description: 'Output format (json, yaml, xml, markdown)',
    }),
    outputPath: option({
      type: optional(string),
      long: 'output',
      short: 'o',
      description: 'Output file path',
    }),
    paths: option({
      type: optional(string),
      long: 'paths',
      description: 'Filter by paths (comma-separated)',
    }),
    tags: option({
      type: optional(string),
      long: 'tags',
      description: 'Filter by tags (comma-separated)',
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
          // Create minimal config if no config file but source is provided
          config = {
            source: {
              type: (args.sourceType === 'remote' ? 'remote' : 'local') as 'local' | 'remote',
              path: args.source
            },
            output: {
              format: (args.format || 'json') as any
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

## File: openapi-condenser.config.ts
```typescript
import type { ExtractorConfig } from './src/types';

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
    paths: undefined, // Filter by paths - string[] or RegExp
    tags: undefined, // Filter by tags - string[] or RegExp
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

## File: src/formatters/index.ts
```typescript
import type { OutputFormat } from '../types';
import { formatAsJson } from './json.ts';
import { formatAsYaml } from './yaml.ts';
import { formatAsXml } from './xml.ts';
import { formatAsMarkdown } from './markdown.ts';

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

## File: src/formatters/json.ts
```typescript
/**
 * Format data as JSON
 */
export const formatAsJson = (data: any): string => {
  return JSON.stringify(data, null, 2);
};
```

## File: src/formatters/markdown.ts
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

## File: src/formatters/xml.ts
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

## File: src/formatters/yaml.ts
```typescript
import YAML from 'yaml';

/**
 * Format data as YAML
 */
export const formatAsYaml = (data: any): string => {
  return YAML.stringify(data);
};
```

## File: src/transformer.ts
```typescript
import type { FilterOptions, TransformOptions, SchemaTransformer } from './types';

/**
 * Filter paths based on configuration
 */
export const filterPaths = (
  paths: Record<string, any>, 
  filterOptions: FilterOptions
): Record<string, any> => {
  if (!filterOptions) return paths;
  
  return Object.entries(paths).reduce((acc, [path, methods]) => {
    // Filter by path
    if (filterOptions.paths) {
      if (filterOptions.paths instanceof RegExp && !filterOptions.paths.test(path)) {
        return acc;
      } else if (Array.isArray(filterOptions.paths) && !filterOptions.paths.includes(path)) {
        return acc;
      }
    }
    
    // Filter methods based on configuration
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
    if (filterOptions.tags && definition.tags) {
      const hasMatchingTag = definition.tags.some((tag: string) => {
        if (filterOptions.tags instanceof RegExp) {
          return filterOptions.tags.test(tag);
        } else if (Array.isArray(filterOptions.tags)) {
          return filterOptions.tags.includes(tag);
        }
        return false;
      });
      
      if (!hasMatchingTag) {
        return acc;
      }
    }
    
    acc[method] = definition;
    return acc;
  }, {} as Record<string, any>);
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
    return { truncated: true };
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
  const result = { ...openapi };
  
  // Transform paths if they exist
  if (result.paths && filterOpts) {
    result.paths = filterPaths(result.paths, filterOpts);
  }
  
  // Apply schema transformations
  if (transformOpts) {
    // Remove server information if not required
    if (!transformOpts.includeServers && result.servers) {
      delete result.servers;
    }
    
    // Remove API info if not required
    if (!transformOpts.includeInfo && result.info) {
      delete result.info;
    }
    
    // Transform schemas if they exist
    if (result.components?.schemas) {
      result.components.schemas = transformSchema(
        result.components.schemas,
        transformOpts
      );
    }
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

## File: src/types.ts
```typescript
export type OutputFormat = 'json' | 'yaml' | 'xml' | 'markdown';

export type FilterOptions = {
  paths?: string[] | RegExp;
  tags?: string[] | RegExp;
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

export type ExtractorConfig = {
  source: {
    type: 'local' | 'remote';
    path: string;
  };
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

export type OpenAPIExtractorResult = {
  success: boolean;
  data?: any;
  warnings?: string[];
  errors?: string[];
};

export type SchemaTransformer = (schema: any) => any;
```

## File: src/utils/fetcher.ts
```typescript
import { promises as fs } from 'node:fs';
import { extname } from 'node:path';
import YAML from 'yaml';
import type { OpenAPIExtractorResult } from '../types';

/**
 * Fetch OpenAPI spec from local file or remote URL
 */
export const fetchSpec = async (
  sourcePath: string, 
  sourceType: 'local' | 'remote'
): Promise<OpenAPIExtractorResult> => {
  try {
    let content: string;
    
    if (sourceType === 'local') {
      content = await fs.readFile(sourcePath, 'utf-8');
    } else {
      const response = await fetch(sourcePath);
      if (!response.ok) {
        return {
          success: false,
          errors: [`Failed to fetch remote spec: ${response.status} ${response.statusText}`]
        };
      }
      content = await response.text();
    }
    
    return {
      success: true,
      data: parseContent(content, sourcePath),
    };
  } catch (error) {
    return {
      success: false,
      errors: [`Error fetching spec: ${error instanceof Error ? error.message : String(error)}`]
    };
  }
};

/**
 * Parse content based on file extension or content type
 */
export const parseContent = (content: string, source: string): any => {
  const ext = extname(source).toLowerCase();
  
  try {
    if (ext === '.yaml' || ext === '.yml') {
      return YAML.parse(content);
    } else {
      return JSON.parse(content);
    }
  } catch (error) {
    throw new Error(`Failed to parse content: ${error instanceof Error ? error.message : String(error)}`);
  }
};
```

## File: tsconfig.json
```json
{
  "compilerOptions": {
    // Environment setup & latest features
    "lib": ["ESNext"],
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
  "include": ["src", "src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

## File: src/extractor.ts
```typescript
import type { ExtractorConfig, OpenAPIExtractorResult } from './types';
import { fetchSpec } from './utils/fetcher';
import { transformOpenAPI } from './transformer';
import { getFormatter } from './formatters';
import { promises as fs } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Extract OpenAPI information based on configuration
 */
export const extractOpenAPI = async (
  config: ExtractorConfig
): Promise<OpenAPIExtractorResult> => {
  try {
    // Fetch OpenAPI spec
    const result = await fetchSpec(config.source.path, config.source.type);
    
    if (!result.success) {
      return result;
    }
    
    // Apply transformations
    const transformed = transformOpenAPI(
      result.data,
      config.filter,
      config.transform
    );
    
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
      data: formattedOutput
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
  const result = { ...config };
  
  // Override source settings
  if (args.source) {
    result.source = {
      ...result.source,
      path: args.source
    };
  }
  
  if (args.sourceType) {
    result.source = {
      ...result.source,
      type: args.sourceType as 'local' | 'remote'
    };
  }
  
  // Override output settings
  if (args.format) {
    result.output = {
      ...result.output,
      format: args.format
    };
  }
  
  if (args.outputPath) {
    result.output = {
      ...result.output,
      destination: args.outputPath
    };
  }
  
  // Override filter settings
  if (args.paths) {
    result.filter = {
      ...result.filter,
      paths: args.paths.split(',')
    };
  }
  
  if (args.tags) {
    result.filter = {
      ...result.filter,
      tags: args.tags.split(',')
    };
  }
  
  if (args.methods) {
    result.filter = {
      ...result.filter,
      methods: args.methods.split(',')
    };
  }
  
  return result;
};
```

## File: package.json
```json
{
  "name": "openapi-condenser",
  "module": "index.ts",
  "type": "module",
  "private": true,
  "scripts": {
    "start": "bun run index.ts",
    "dev": "bun --watch index.ts"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "@types/node": "^20.10.5"
  },
  "peerDependencies": {
    "typescript": "^5"
  },
  "dependencies": {
    "cmd-ts": "^0.13.0",
    "fast-xml-parser": "^4.3.2",
    "yaml": "^2.3.4"
  }
}
```
