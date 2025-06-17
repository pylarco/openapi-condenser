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
- Only files matching these patterns are included: src, index.html, openapi-condenser.config.ts, package.json, tsconfig.json, vite.config.ts, test
- Files matching these patterns are excluded: *.git *.cursor/
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
```
index.html
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
src/frontend/App.tsx
src/frontend/client.ts
src/frontend/components/ConfigPanel.tsx
src/frontend/components/InputPanel.tsx
src/frontend/components/OutputPanel.tsx
src/frontend/components/StatsPanel.tsx
src/frontend/main.tsx
src/frontend/styles.css
test/e2e/server.test.ts
test/test.util.ts
tsconfig.json
vite.config.ts
```

# Files

## File: index.html
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>OpenAPI Condenser</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <script>
      tailwind.config = {
        theme: {
          extend: {
            fontFamily: {
              sans: ['Inter', 'sans-serif'],
            },
          },
        },
      }
    </script>
  </head>
  <body class="bg-slate-900 text-slate-300">
    <div id="root"></div>
    <script type="module" src="/src/frontend/main.tsx"></script>
  </body>
</html>
```

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

## File: src/frontend/components/StatsPanel.tsx
```typescript
import React from 'react';
import type { SpecStats } from '../../backend/types';

interface StatsPanelProps {
  stats: {
    before: SpecStats;
    after: SpecStats;
  } | null;
}

const StatItem: React.FC<{ label: string; before: number; after: number }> = ({ label, before, after }) => {
  const reduction = before > 0 ? ((before - after) / before) * 100 : 0;
  const reductionColor = reduction > 0 ? 'text-green-400' : 'text-slate-400';
  const change = after - before;

  return (
    <div className="flex justify-between items-center py-2">
      <span className="text-slate-300">{label}</span>
      <div className="flex items-center gap-4">
        <span className="text-slate-400">{before}</span>
        <span className="text-xl font-bold text-white tabular-nums">{after}</span>
        <span className={`text-sm font-medium w-24 text-right ${reductionColor}`}>
          {change !== 0 ? `${change > 0 ? '+' : ''}${change}` : ''} ({reduction.toFixed(0)}%)
        </span>
      </div>
    </div>
  );
};

export const StatsPanel: React.FC<StatsPanelProps> = ({ stats }) => {
  if (!stats) return null;

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Condensation Stats</h3>
      <div className="flex justify-between items-center text-xs text-slate-400 font-medium mb-2 px-2">
        <span>Metric</span>
        <div className="flex items-center gap-4 w-[240px] justify-between">
          <span className='w-8 text-center'>Before</span>
          <span className='w-8 text-center'>After</span>
          <span className="w-24 text-right">Change / Reduction</span>
        </div>
      </div>
      <div className="divide-y divide-slate-700/50">
        <StatItem label="Paths" before={stats.before.paths} after={stats.after.paths} />
        <StatItem label="Operations" before={stats.before.operations} after={stats.after.operations} />
        <StatItem label="Schemas" before={stats.before.schemas} after={stats.after.schemas} />
      </div>
    </div>
  );
};
```

## File: src/frontend/main.tsx
```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

## File: src/frontend/styles.css
```css
/* You can add any additional global styles here if needed */
body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

## File: test/test.util.ts
```typescript
export const sampleSpec = {
    openapi: '3.0.0',
    info: {
      title: 'Sample API',
      version: '1.0.0',
      description: 'A sample API for testing.',
    },
    servers: [
      {
        url: 'https://api.example.com/v1',
        description: 'Production server',
      },
    ],
    tags: [
      { name: 'users', description: 'User operations' },
      { name: 'items', description: 'Item operations' },
      { name: 'internal', description: 'Internal stuff' },
    ],
    paths: {
      '/users': {
        get: {
          summary: 'Get all users',
          tags: ['users'],
          description: 'Returns a list of all users.',
          responses: {
            '200': {
              description: 'A list of users.',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/User' },
                  },
                  example: [{ id: '1', name: 'John Doe' }],
                },
              },
            },
          },
        },
      },
      '/users/{userId}': {
        get: {
          summary: 'Get a user by ID',
          tags: ['users'],
          description: 'Returns a single user.',
          parameters: [
            { name: 'userId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: {
            '200': {
              description: 'A single user.',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/User' },
                },
              },
            },
          },
        },
      },
      '/items': {
        post: {
          summary: 'Create an item',
          tags: ['items'],
          description: 'Creates a new item.',
          requestBody: {
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Item' },
              },
            },
          },
          responses: {
            '201': { description: 'Item created' },
          },
        },
      },
      '/internal/status': {
        get: {
          summary: 'Get internal status',
          tags: ['internal'],
          deprecated: true,
          description: 'This is a deprecated endpoint.',
          responses: {
            '200': { description: 'OK' },
          },
        },
      },
    },
    components: {
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'User ID', example: 'user-123' },
            name: { type: 'string', description: 'User name', example: 'Jane Doe' },
          },
        },
        Item: {
          type: 'object',
          properties: {
            sku: { type: 'string' },
            price: { type: 'number' },
          },
        },
        UnusedSchema: {
          type: 'object',
          properties: {
            foo: { type: 'string' },
          },
        },
      },
    },
  };
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

## File: src/frontend/components/ConfigPanel.tsx
```typescript
import React from 'react';
import type { FilterOptions, TransformOptions, OutputFormat } from '../../backend/types';

interface ConfigPanelProps {
  config: { filter: FilterOptions; transform: TransformOptions };
  setConfig: React.Dispatch<React.SetStateAction<{ filter: FilterOptions; transform: TransformOptions }>>;
  outputFormat: OutputFormat;
  setOutputFormat: (format: OutputFormat) => void;
  onCondense: () => void;
  isLoading: boolean;
}

const Tooltip: React.FC<{ text: string, children: React.ReactNode }> = ({ text, children }) => (
    <div className="relative flex items-center group">
      {children}
      <div className="absolute left-0 bottom-full mb-2 w-64 p-2 bg-slate-700 text-white text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
        {text}
      </div>
    </div>
  );

const Section: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
  <div className="mb-6">
    <h3 className="text-lg font-semibold text-white mb-3">{title}</h3>
    <div className="space-y-4">{children}</div>
  </div>
);

const Switch: React.FC<{ label: string; checked: boolean; onChange: (checked: boolean) => void; tooltip?: string }> = ({ label, checked, onChange, tooltip }) => (
    <label className="flex items-center justify-between cursor-pointer">
        <span className="text-sm text-slate-300 flex items-center gap-2">
            {label}
            {tooltip && (
                <Tooltip text={tooltip}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </Tooltip>
            )}
        </span>
      <div className="relative">
        <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <div className={`block w-10 h-6 rounded-full transition ${checked ? 'bg-cyan-500' : 'bg-slate-600'}`}></div>
        <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${checked ? 'transform translate-x-4' : ''}`}></div>
      </div>
    </label>
);

const TextInput: React.FC<{ label: string; value: string[] | undefined; onChange: (value: string[]) => void; placeholder: string; tooltip?: string; }> = ({ label, value, onChange, placeholder, tooltip }) => (
    <div>
        <label className="block text-sm text-slate-300 mb-1 flex items-center gap-2">
            {label}
            {tooltip && (
                <Tooltip text={tooltip}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </Tooltip>
            )}
        </label>
        <input 
            type="text"
            placeholder={placeholder}
            value={value?.join(', ')}
            onChange={(e) => onChange(e.target.value ? e.target.value.split(',').map(s => s.trim()) : [])}
            className="w-full bg-slate-700/50 border border-slate-600 rounded-md px-3 py-2 text-sm text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition"
        />
    </div>
);


export const ConfigPanel: React.FC<ConfigPanelProps> = ({ config, setConfig, outputFormat, setOutputFormat, onCondense, isLoading }) => {
  const handleFilterChange = (key: keyof FilterOptions, value: any) => {
    setConfig(c => ({ ...c, filter: { ...c.filter, [key]: value } }));
  };

  const handleTransformChange = (key: keyof TransformOptions, value: any) => {
    setConfig(c => ({ ...c, transform: { ...c.transform, [key]: value } }));
  };
  
  return (
    <div className="sticky top-24 p-6 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg">
      <Section title="Output Format">
        <select 
            value={outputFormat}
            onChange={(e) => setOutputFormat(e.target.value as OutputFormat)}
            className="w-full bg-slate-700/50 border border-slate-600 rounded-md px-3 py-2 text-sm text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition"
        >
            <option value="markdown">Markdown</option>
            <option value="json">JSON</option>
            <option value="yaml">YAML</option>
            <option value="xml">XML</option>
        </select>
      </Section>

      <Section title="Filtering">
        <TextInput 
            label="Include Paths (glob)" 
            placeholder="/users/**, /posts/*"
            value={config.filter.paths?.include}
            onChange={v => handleFilterChange('paths', { ...config.filter.paths, include: v })}
            tooltip="Comma-separated list of glob patterns to include paths. e.g., /users/**"
        />
        <TextInput 
            label="Exclude Paths (glob)" 
            placeholder="/internal/**"
            value={config.filter.paths?.exclude}
            onChange={v => handleFilterChange('paths', { ...config.filter.paths, exclude: v })}
            tooltip="Comma-separated list of glob patterns to exclude paths. e.g., /admin/**"
        />
        <Switch 
            label="Include Deprecated"
            checked={!!config.filter.includeDeprecated}
            onChange={v => handleFilterChange('includeDeprecated', v)}
            tooltip="If checked, endpoints marked as 'deprecated' will be included."
        />
      </Section>

      <Section title="Transformation">
        <Switch 
            label="Remove Examples"
            checked={!!config.transform.removeExamples}
            onChange={v => handleTransformChange('removeExamples', v)}
            tooltip="If checked, all 'example' and 'examples' fields will be removed."
        />
        <Switch 
            label="Remove Descriptions"
            checked={!!config.transform.removeDescriptions}
            onChange={v => handleTransformChange('removeDescriptions', v)}
            tooltip="If checked, all 'description' fields will be removed."
        />
        <Switch 
            label="Include Servers"
            checked={!!config.transform.includeServers}
            onChange={v => handleTransformChange('includeServers', v)}
            tooltip="If checked, the 'servers' block will be included."
        />
        <Switch 
            label="Include Info"
            checked={!!config.transform.includeInfo}
            onChange={v => handleTransformChange('includeInfo', v)}
            tooltip="If checked, the 'info' block (title, version, etc.) will be included."
        />
      </Section>
      
      <button 
        onClick={onCondense}
        disabled={isLoading}
        className="w-full bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 flex items-center justify-center"
      >
        {isLoading ? (
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : 'Condense'}
      </button>
    </div>
  );
};
```

## File: src/frontend/components/OutputPanel.tsx
```typescript
import React, { useState, useEffect } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { OutputFormat } from '../../backend/types';

interface OutputPanelProps {
  output: string;
  isLoading: boolean;
  error: string | null;
  format: OutputFormat;
}

const languageMap: Record<OutputFormat, string> = {
  json: 'json',
  yaml: 'yaml',
  xml: 'xml',
  markdown: 'markdown',
};

const SkeletonLoader = () => (
    <div className="absolute inset-0 p-4 space-y-3 animate-pulse">
        <div className="h-4 bg-slate-700/50 rounded w-1/4"></div>
        <div className="h-4 bg-slate-700/50 rounded w-1/2"></div>
        <div className="h-4 bg-slate-700/50 rounded w-1/3"></div>
        <div className="h-4 bg-slate-700/50 rounded w-3/4"></div>
        <div className="h-4 bg-slate-700/50 rounded w-2/5"></div>
        <div className="h-4 bg-slate-700/50 rounded w-1/2"></div>
    </div>
);


export const OutputPanel: React.FC<OutputPanelProps> = ({ output, isLoading, error, format }) => {
  const [copyStatus, setCopyStatus] = useState('Copy');
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  useEffect(() => {
    if (copyStatus === 'Copied!') {
      const timer = setTimeout(() => setCopyStatus('Copy'), 2000);
      return () => clearTimeout(timer);
    }
  }, [copyStatus]);

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopyStatus('Copied!');
  };

  const handleDownload = () => {
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `condensed-spec.${format === 'markdown' ? 'md' : format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  
  const panelClasses = isFullScreen 
    ? "fixed inset-0 z-50 bg-slate-800 flex flex-col"
    : "bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg min-h-[20rem] flex flex-col";

  return (
    <div className={panelClasses}>
      <div className="flex items-center justify-between p-3 border-b border-slate-700/50 flex-shrink-0">
        <h3 className="text-sm font-semibold text-white">Condensed Output</h3>
        <div className="flex items-center gap-2">
            <button onClick={() => setIsFullScreen(!isFullScreen)} className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded-md transition-colors">
                {isFullScreen ? 'Exit Fullscreen' : 'Fullscreen'}
            </button>
            {output && !isLoading && (
            <>
                <button onClick={handleCopy} className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded-md transition-colors">{copyStatus}</button>
                <button onClick={handleDownload} className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded-md transition-colors">Download</button>
            </>
            )}
        </div>
      </div>
      <div className="flex-grow p-1 relative overflow-auto">
        {isLoading && <SkeletonLoader />}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="bg-red-900/50 border border-red-500 text-red-300 p-4 rounded-lg text-sm max-w-full overflow-auto">
                <p className="font-bold mb-2">An error occurred:</p>
                <pre className="whitespace-pre-wrap">{error}</pre>
            </div>
          </div>
        )}
        {!isLoading && !error && output && (
            <SyntaxHighlighter language={languageMap[format]} style={vscDarkPlus} customStyle={{ background: 'transparent', margin: 0, padding: '1rem', height: isFullScreen ? '100%' : 'auto', minHeight: '100%' }} codeTagProps={{style:{fontFamily: 'monospace'}}} wrapLines={true} showLineNumbers>
                {output}
            </SyntaxHighlighter>
        )}
        {!isLoading && !error && !output && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                <p>Your condensed OpenAPI spec will appear here.</p>
            </div>
        )}
      </div>
    </div>
  );
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
  
  // Then, remove any components that are no longer referenced
  result = removeUnusedComponents(result);

  // Apply other transformations to the entire remaining spec
  if (transformOpts) {
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

## File: src/frontend/client.ts
```typescript
import { edenTreaty } from '@elysiajs/eden';
import type { App } from '../backend/server';

// Use with the specific older version
export const client = edenTreaty<App>('http://localhost:3000');
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
  operationIds?: FilterPatterns;
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

## File: src/frontend/components/InputPanel.tsx
```typescript
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
      const { data, error } = await client.api['fetch-spec'].get({ $query: { url } });

      if (error) {
        let errorMessage = 'Failed to fetch the spec.';
        const errorValue = error.value as any;
        if (typeof errorValue === 'object' && errorValue !== null) {
          if ('error' in errorValue && typeof errorValue.error === 'string') {
            errorMessage = errorValue.error;
          } else if ('message' in errorValue && typeof errorValue.message === 'string') {
            errorMessage = errorValue.message;
          }
        }
        setFetchError(errorMessage);
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

## File: test/e2e/server.test.ts
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { treaty } from '@elysiajs/eden';
import YAML from 'yaml';
import { app } from '../../src/backend/server';
import type { App } from '../../src/backend/server';
import { sampleSpec } from '../test.util';

// Using a real public spec for fetch tests
const publicSpecUrl = 'https://petstore3.swagger.io/api/v3/openapi.json';
const nonExistentUrl = 'https://example.com/non-existent-spec.json';

describe('E2E API Tests', () => {
  let server: ReturnType<typeof app.listen>;
  let api: ReturnType<typeof treaty<App>>;

  beforeAll(() => {
    // Start server on a random available port
    server = app.listen(0);
    const port = server.server?.port;
    if (!port) {
        throw new Error('Server port not available');
    }
    api = treaty<App>(`http://localhost:${port}`);
  });

  afterAll(() => {
    server.stop(true);
  });

  describe('/api/fetch-spec', () => {
    it('should fetch a valid remote OpenAPI spec', async () => {
      const { data, error, status } = await api['api']['fetch-spec'].get({
        query: { url: publicSpecUrl },
      });

      expect(status).toBe(200);
      expect(error).toBeNull();
      expect(data?.content).toBeString();
      expect(() => JSON.parse(data!.content)).not.toThrow();
      const parsed = JSON.parse(data!.content);
      expect(parsed.openapi).toStartWith('3.');
    }, 10000);

    it('should return 400 for a missing URL parameter', async () => {
        // @ts-expect-error - testing invalid input
        const { data, error, status } = await api['api']['fetch-spec'].get({ query: {} });
        expect(status).toBe(400);
        if (error?.value && 'error' in error.value) {
            expect(error.value.error).toBe('URL parameter is required');
        } else {
            throw new Error('Unexpected error response format');
        }
    });

    it('should return 400 for an invalid URL format', async () => {
        const { error, status } = await api['api']['fetch-spec'].get({ query: { url: 'not-a-url' } });
        expect(status).toBe(400);
        if (error?.value && 'error' in error.value) {
            expect(error.value.error).toInclude('Invalid URL');
        } else {
            throw new Error('Unexpected error response format');
        }
    });
    
    it('should return 403 when trying to fetch from a private network address (SSRF protection)', async () => {
        const { error, status } = await api['api']['fetch-spec'].get({ query: { url: 'http://127.0.0.1/spec.json' } });
        expect(status).toBe(403);
        if (error?.value && 'error' in error.value) {
            expect(error.value.error).toBe('Fetching specs from private or local network addresses is forbidden.');
        } else {
            throw new Error('Unexpected error response format');
        }
    });

    it('should handle non-existent remote files gracefully', async () => {
        const { error, status } = await api['api']['fetch-spec'].get({ query: { url: nonExistentUrl } });
        expect(status).toBe(404);
        if (error?.value && 'error' in error.value) {
            expect(error.value.error).toInclude('Failed to fetch spec');
        } else {
            throw new Error('Unexpected error response format');
        }
    });
  });

  describe('/api/condense', () => {
    it('should condense a spec to YAML format', async () => {
      const { data, error, status } = await api.api.condense.post({
        source: {
          content: JSON.stringify(sampleSpec),
          path: 'spec.json',
        },
        output: { format: 'yaml' },
      });

      expect(status).toBe(200);
      expect(error).toBeNull();
      expect(data?.success).toBe(true);
      expect(data?.data).toBeString();

      // Check if the output is valid YAML
      let parsedYaml: any;
      expect(() => parsedYaml = YAML.parse(data!.data)).not.toThrow();
      
      if(parsedYaml) {
        expect(parsedYaml.openapi).toBe('3.0.0');
        expect(parsedYaml.info.title).toBe('Sample API');
      } else {
        throw new Error('parsedYaml should not be undefined');
      }
    });
    
    it('should condense a spec to Markdown format', async () => {
        const { data, error, status } = await api.api.condense.post({
            source: {
              content: JSON.stringify(sampleSpec),
              path: 'spec.json',
            },
            output: { format: 'markdown' },
        });

        expect(status).toBe(200);
        expect(error).toBeNull();
        expect(data?.success).toBe(true);
        expect(data?.data).toBeString();
        expect(data?.data).toStartWith('# Sample API');
        expect(data?.data).toInclude('## Endpoints');
        expect(data?.data).toInclude('### /users');
    });

    it('should filter paths based on include glob pattern', async () => {
        const { data } = await api.api.condense.post({
            source: { content: JSON.stringify(sampleSpec), path: 'spec.json' },
            output: { format: 'json' },
            filter: {
                paths: { include: ['/users'] },
            },
        });
        
        const result = JSON.parse(data!.data);
        expect(Object.keys(result.paths)).toEqual(['/users']);
        expect(result.paths['/users/{userId}']).toBeUndefined();
        // Check stats
        expect(data?.stats.before.paths).toBe(4);
        expect(data?.stats.after.paths).toBe(1);
    });
    
    it('should filter paths based on exclude glob pattern', async () => {
        const { data } = await api.api.condense.post({
            source: { content: JSON.stringify(sampleSpec), path: 'spec.json' },
            output: { format: 'json' },
            filter: {
                paths: { exclude: ['/internal/**'] },
            },
        });
        
        const result = JSON.parse(data!.data);
        expect(Object.keys(result.paths)).not.toInclude('/internal/status');
        expect(Object.keys(result.paths)).toHaveLength(3);
        // Check stats
        expect(data?.stats.before.paths).toBe(4);
        expect(data?.stats.after.paths).toBe(3);
    });

    it('should filter by tags', async () => {
        const { data } = await api.api.condense.post({
            source: { content: JSON.stringify(sampleSpec), path: 'spec.json' },
            output: { format: 'json' },
            filter: {
                tags: { include: ['users'] },
            },
        });
        
        const result = JSON.parse(data!.data);
        expect(Object.keys(result.paths)).toEqual(['/users', '/users/{userId}']);
        expect(data?.stats.after.operations).toBe(2);
    });

    it('should exclude deprecated endpoints by default', async () => {
        const { data } = await api.api.condense.post({
            source: { content: JSON.stringify(sampleSpec), path: 'spec.json' },
            output: { format: 'json' },
        });
        
        const result = JSON.parse(data!.data);
        expect(result.paths['/internal/status']).toBeUndefined();
    });

    it('should include deprecated endpoints when requested', async () => {
        const { data } = await api.api.condense.post({
            source: { content: JSON.stringify(sampleSpec), path: 'spec.json' },
            output: { format: 'json' },
            filter: {
                includeDeprecated: true,
            },
        });
        
        const result = JSON.parse(data!.data);
        expect(result.paths['/internal/status']).toBeDefined();
    });

    it('should remove unused components after filtering', async () => {
        const { data } = await api.api.condense.post({
            source: { content: JSON.stringify(sampleSpec), path: 'spec.json' },
            output: { format: 'json' },
            filter: {
                tags: { include: ['items'] },
            },
        });

        const result = JSON.parse(data!.data);
        // Only '/items' path should remain
        expect(Object.keys(result.paths)).toEqual(['/items']);
        // Only 'Item' schema should remain, 'User' and 'UnusedSchema' should be gone
        expect(Object.keys(result.components.schemas)).toEqual(['Item']);
        expect(data?.stats.before.schemas).toBe(3);
        expect(data?.stats.after.schemas).toBe(1);
    });

    it('should apply transformations like removing descriptions', async () => {
        const { data } = await api.api.condense.post({
            source: { content: JSON.stringify(sampleSpec), path: 'spec.json' },
            output: { format: 'json' },
            transform: {
                removeDescriptions: true,
            },
        });

        const result = JSON.parse(data!.data);
        expect(result.info.description).toBeUndefined();
        expect(result.paths['/users'].get.description).toBeUndefined();
        expect(result.components.schemas.User.properties.id.description).toBeUndefined();
    });

    it('should return 400 for invalid source content', async () => {
        const { error, status } = await api.api.condense.post({
            source: {
              content: 'this is not a valid json or yaml',
              path: 'spec.json',
            },
            output: { format: 'json' },
        });

        expect(status).toBe(400);

        if (error?.value && 'success' in error.value && 'errors' in error.value) {
            expect(error.value.success).toBe(false);
            expect(error.value.errors).toContain('Error extracting OpenAPI: Error processing spec: Failed to parse content from \'spec.json\'. Not valid JSON or YAML.');
        } else {
            throw new Error('Unexpected error response format');
        }
    });
  });
});
```

## File: src/backend/server.ts
```typescript
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
      // Catches errors from `new URL()` for malformed URLs and other unexpected errors
      set.status = 500;
      const message = e instanceof Error ? e.message : String(e);
      return { error: `An unexpected error occurred: ${message}` };
    }
  }, {
    query: t.Object({
      url: t.Optional(t.String({
        format: 'uri',
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
```

## File: src/frontend/App.tsx
```typescript
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
        let errorMessage = 'An unknown error occurred.';
        const errorValue = error.value as any;
        if (typeof errorValue === 'object' && errorValue !== null) {
          if ('errors' in errorValue && Array.isArray(errorValue.errors)) {
            errorMessage = errorValue.errors.join('\n');
          } else if ('message' in errorValue && typeof errorValue.message === 'string') {
            errorMessage = errorValue.message;
          }
        }
        setError(errorMessage);
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
  "include": ["src", "openapi-condenser.config.ts", "vite.config.ts", "test"],
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
    "cli": "bun run src/backend/cli.ts",
    "test": "bun test"
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
    "@elysiajs/cors": "^1.3.3",
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
