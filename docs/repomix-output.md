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
src/backend/formatters/concise-text.ts
src/backend/formatters/index.ts
src/backend/formatters/json.ts
src/backend/formatters/xml.ts
src/backend/server.ts
src/backend/transformer.ts
src/backend/types.ts
src/backend/utils/fetcher.ts
src/frontend/App.tsx
src/frontend/client.ts
src/frontend/components/features/config/ConfigPanel.tsx
src/frontend/components/features/index.ts
src/frontend/components/features/input/InputPanel.tsx
src/frontend/components/features/output/OutputPanel.tsx
src/frontend/components/features/stats/StatsPanel.tsx
src/frontend/components/ui/index.ts
src/frontend/components/ui/Section.tsx
src/frontend/components/ui/Switch.tsx
src/frontend/components/ui/TextInput.tsx
src/frontend/components/ui/Tooltip.tsx
src/frontend/main.tsx
src/frontend/state/atoms.ts
src/frontend/styles.css
test/e2e/server.test.ts
test/e2e/transformer.test.ts
test/test.util.ts
test/unit/extractor.test.ts
test/unit/transformer.test.ts
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

## File: src/backend/formatters/concise-text.ts
```typescript
import { OpenAPIV3 } from 'openapi-types';

const resolveRef = <T extends object>(
  refObj: OpenAPIV3.ReferenceObject | T,
  doc: OpenAPIV3.Document,
): T => {
  if (!refObj || typeof refObj !== 'object' || !('$ref' in refObj))
    return refObj as T;

  const refPath = refObj.$ref.replace('#/components/', '').split('/');
  let current: any = doc.components;
  for (const part of refPath) {
    current = current?.[part];
  }
  return (current || refObj) as T;
};

const formatSchemaType = (
  schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject | undefined,
  doc: OpenAPIV3.Document,
): string => {
  if (!schema) return 'any';
  if ('$ref' in schema) {
    return schema.$ref.split('/').pop() || 'any';
  }
  if (schema.type === 'array' && schema.items) {
    const itemType = formatSchemaType(schema.items, doc);
    return `array<${itemType}>`;
  }
  return schema.type || 'any';
};

const contentTypeMappings: ReadonlyArray<[string, string]> = [
    ['json', 'json'],
    ['form-data', 'form-data'],
    ['x-www-form-urlencoded', 'form-urlencoded'],
    ['xml', 'xml'],
    ['text/plain', 'text'],
];

const shortenContentType = (contentType: string): string => {
    for (const [key, shortName] of contentTypeMappings) {
        if (contentType.includes(key)) {
            return shortName;
        }
    }
    return contentType;
};


const formatProperties = (
  properties: { [name: string]: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject },
  required: string[] | undefined,
  doc: OpenAPIV3.Document,
  indent = 0,
): string => {
  let propsMarkdown = '';
  const indentStr = '  '.repeat(indent);

  for (const [propName, propSchema] of Object.entries(properties)) {
    const resolvedPropSchema = resolveRef(propSchema, doc);
    const isRequired = required?.includes(propName);
    const requiredStr = isRequired ? ' (required)' : '';
    
    const typeStr = formatSchemaType(propSchema, doc);
    const descriptionStr = resolvedPropSchema.description ? ` - ${resolvedPropSchema.description.split('\n')[0]}` : '';

    propsMarkdown += `${indentStr}- ${propName}:${typeStr}${requiredStr}${descriptionStr}\n`;

    let nestedPropsSchema: OpenAPIV3.SchemaObject | undefined;
    const resolvedItems = resolvedPropSchema.type === 'array' && resolvedPropSchema.items ? resolveRef(resolvedPropSchema.items, doc) : undefined;

    if (resolvedPropSchema.type === 'object') {
        nestedPropsSchema = resolvedPropSchema;
    } else if (resolvedItems?.type === 'object') {
        nestedPropsSchema = resolvedItems;
    }

    if (nestedPropsSchema?.properties) {
        propsMarkdown += formatProperties(nestedPropsSchema.properties, nestedPropsSchema.required, doc, indent + 1);
    }
  }
  return propsMarkdown;
};

const formatEndpoint = (method: string, path: string, operation: OpenAPIV3.OperationObject, data: OpenAPIV3.Document): string => {
    let output = '';
    output += `${method.toUpperCase()} ${path}\n`;

    const description = (operation.summary || operation.description || '').replace(/\n/g, ' ');
    if (description) {
      output += `D: ${description}\n`;
    }

    // Parameters
    if (operation.parameters?.length) {
      output += `P:\n`;
      for (const paramRef of operation.parameters) {
        const param = resolveRef(paramRef, data);
        const schema = param.schema as OpenAPIV3.SchemaObject;
        const type = schema ? formatSchemaType(schema, data) : 'any';
        const required = param.required ? 'required' : 'optional';
        const paramDesc = param.description ? ` - ${param.description.replace(/\n/g, ' ')}` : '';
        output += `  - ${param.name}: ${type} (${param.in}, ${required})${paramDesc}\n`;
      }
    }
    
    // Request Body
    if (operation.requestBody) {
      const requestBody = resolveRef(operation.requestBody, data);
      if (requestBody.content) {
        const contentEntries = Object.entries(requestBody.content);
        if (contentEntries.length > 0) {
            const firstEntry = contentEntries[0];
            if (firstEntry) {
                const schemaName = formatSchemaType(firstEntry[1].schema, data);
                if (contentEntries.length === 1) {
                    output += `B: ${shortenContentType(firstEntry[0])} -> ${schemaName}\n`;
                } else {
                    output += `B:\n`;
                    for (const [contentType, mediaType] of contentEntries) {
                        output += `  - ${shortenContentType(contentType)} -> ${formatSchemaType(mediaType.schema, data)}\n`;
                    }
                }
            }
        }
      }
    }

    // Responses
    if (operation.responses) {
      output += `R:\n`;
      const groupedResponses: { [key: string]: string[] } = {};
      
      for (const [code, responseRef] of Object.entries(operation.responses)) {
        const response = resolveRef(responseRef, data);
        const responseIdParts: string[] = [];
        if (response.content) {
            for (const [contentType, mediaType] of Object.entries(response.content)) {
                responseIdParts.push(`${shortenContentType(contentType)} -> ${formatSchemaType(mediaType.schema, data)}`);
            }
        }
        
        let responseId = responseIdParts.join(', ');
        if (!responseId) {
            responseId = response.description?.replace(/\n/g, ' ') || 'No description';
        }

        groupedResponses[responseId] = [...(groupedResponses[responseId] || []), code];
      }

      for (const [responseId, codes] of Object.entries(groupedResponses)) {
           output += `  ${codes.join(', ')}: ${responseId}\n`;
      }
    }
    return output;
}

const formatSchema = (name: string, schemaRef: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject, data: OpenAPIV3.Document): string => {
    let output = '';
    const schema = resolveRef(schemaRef, data);
      
    output += `SCHEMA: ${name}\n`;
    if (schema.description) {
        output += `D: ${schema.description.replace(/\n/g, ' ')}\n`;
    }

    if (schema.type === 'object' && schema.properties) {
        output += 'PROPS:\n';
        output += formatProperties(schema.properties, schema.required, data, 1);
    } else if (schema.type === 'array' && schema.items) {
        output += `ARRAY OF: ${formatSchemaType(schema.items, data)}\n`;
        const resolvedItems = resolveRef(schema.items, data);
        if (resolvedItems.type === 'object' && resolvedItems.properties) {
             output += formatProperties(resolvedItems.properties, resolvedItems.required, data, 1);
        }
    } else if (schema.type) {
        output += `TYPE: ${schema.type}\n`;
    }
    return output;
}

/**
 * Format data as a concise text format for LLMs.
 */
export const formatAsConciseText = (data: OpenAPIV3.Document): string => {
  const endpoints: string[] = [];
  const schemas: string[] = [];
  
  // Endpoints
  if (data.paths) {
    for (const [path, pathItem] of Object.entries(data.paths)) {
      if (!pathItem) continue;
      
      const validMethods = Object.keys(pathItem).filter(method => 
        ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'].includes(method)
      ) as (keyof typeof pathItem)[];

      for (const method of validMethods) {
        const operation = pathItem[method] as OpenAPIV3.OperationObject;
        if (!operation || typeof operation !== 'object' || !('responses' in operation)) continue;
        
        endpoints.push(formatEndpoint(method, path, operation, data));
      }
    }
  }

  // Schemas
  if (data.components?.schemas) {
    for (const [name, schemaRef] of Object.entries(data.components.schemas)) {
        schemas.push(formatSchema(name, schemaRef, data));
    }
  }

  let output = endpoints.join('\n');
  
  if (schemas.length > 0) {
      if (output.length > 0) {
        output += '\n---\n\n';
      }
      output += schemas.join('\n');
  }
  
  return output.trim();
};
```

## File: src/frontend/components/features/config/ConfigPanel.tsx
```typescript
import React from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import type { FilterOptions, TransformOptions, OutputFormat } from '../../../../backend/types';
import { configAtom, outputFormatAtom, isLoadingAtom, condenseSpecAtom } from '../../../state/atoms';
import { Section, Switch, TextInput } from '../../ui';

type Config = {
  filter: FilterOptions;
  transform: TransformOptions;
}

export const ConfigPanel: React.FC = () => {
  const [config, setConfig] = useAtom(configAtom);
  const [outputFormat, setOutputFormat] = useAtom(outputFormatAtom);
  const isLoading = useAtomValue(isLoadingAtom);
  const onCondense = useSetAtom(condenseSpecAtom);

  const handleFilterChange = (key: keyof FilterOptions, value: any) => {
    setConfig((c: Config) => ({ ...c, filter: { ...c.filter, [key]: value } }));
  };

  const handleTransformChange = (key: keyof TransformOptions, value: any) => {
    setConfig((c: Config) => ({ ...c, transform: { ...c.transform, [key]: value } }));
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
            label="Remove Summaries"
            checked={!!config.transform.removeSummaries}
            onChange={v => handleTransformChange('removeSummaries', v)}
            tooltip="If checked, all 'summary' fields will be removed."
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
        onClick={() => onCondense()}
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

## File: src/frontend/components/features/index.ts
```typescript
export * from './config/ConfigPanel';
export * from './input/InputPanel';
export * from './output/OutputPanel';
export * from './stats/StatsPanel';
```

## File: src/frontend/components/features/input/InputPanel.tsx
```typescript
import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import { useSetAtom, useAtom } from 'jotai';
import { client } from '../../../client';
import { specContentAtom, fileNameAtom } from '../../../state/atoms';

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
    }, 300); // 300ms debounce delay

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
    setFileName('spec.json'); // Assume json for pasted content
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
            setFileName(urlObject.pathname.split('/').pop() || 'spec.from.url');
          } catch {
            setFileName('spec.from.url');
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
      }, 500); // 500ms debounce

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
                        <svg className="animate-spin h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
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

## File: src/frontend/components/features/output/OutputPanel.tsx
```typescript
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAtomValue } from 'jotai';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { yaml } from '@codemirror/lang-yaml';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import type { OutputFormat } from '../../../../backend/types';
import { outputAtom, isLoadingAtom, errorAtom, outputFormatAtom } from '../../../state/atoms';

interface OutputPanelProps {
  // No props needed after Jotai integration
}

const languageMap: { [K in OutputFormat]: () => any } = {
  json: () => json(),
  yaml: () => yaml(),
  xml: () => markdown({}), // fallback for xml
  markdown: () => markdown({}),
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


export const OutputPanel: React.FC<OutputPanelProps> = () => {
  const output = useAtomValue(outputAtom);
  const isLoading = useAtomValue(isLoadingAtom);
  const error = useAtomValue(errorAtom);
  const format = useAtomValue(outputFormatAtom);

  const [copyStatus, setCopyStatus] = useState('Copy');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (copyStatus === 'Copied!') {
      const timer = setTimeout(() => setCopyStatus('Copy'), 2000);
      return () => clearTimeout(timer);
    }
  }, [copyStatus]);

  // Check if we need to automatically go fullscreen
  useEffect(() => {
    if (!output) return;
    
    const lineCount = output.split('\n').length;
    if (lineCount > 100) {
      setIsFullScreen(true);
    }
  }, [output]);

  // Setup scroll listener for fullscreen mode
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || isFullScreen) return;

    const handleScroll = () => {
      // If user starts scrolling and we have lots of content, go fullscreen
      if (container.scrollTop > 20 && output.split('\n').length > 30) {
        setIsFullScreen(true);
      }
    };
    
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [output, isFullScreen]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(output);
    setCopyStatus('Copied!');
  }, [output]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `condensed-spec.${format === 'markdown' ? 'md' : format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [output, format]);
  
  const handleToggleFullscreen = useCallback(() => {
    setIsFullScreen(prev => !prev);
  }, []);
  
  const panelClasses = isFullScreen 
    ? "fixed inset-0 z-50 bg-slate-900 flex flex-col"
    : "bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg min-h-[20rem] flex flex-col";

  return (
    <div className={panelClasses}>
      <div className="flex items-center justify-between p-3 border-b border-slate-700/50 flex-shrink-0">
        <h3 className="text-sm font-semibold text-white">Condensed Output</h3>
        <div className="flex items-center gap-2">
            <button onClick={handleToggleFullscreen} className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded-md transition-colors">
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
      <div ref={scrollContainerRef} className="flex-grow p-1 relative overflow-auto">
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
            <CodeMirror
                value={output}
                height="100%"
                extensions={[languageMap[format](), oneDark]}
                readOnly={true}
                theme="dark"
                style={{ height: '100%', minHeight: '100%' }}
            />
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

## File: src/frontend/components/ui/Section.tsx
```typescript
import React from 'react';

export const Section: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
  <div className="mb-6">
    <h3 className="text-lg font-semibold text-white mb-3">{title}</h3>
    <div className="space-y-4">{children}</div>
  </div>
);
```

## File: src/frontend/components/ui/Switch.tsx
```typescript
import React from 'react';
import { Tooltip } from './Tooltip';

export const Switch: React.FC<{ label: string; checked: boolean; onChange: (checked: boolean) => void; tooltip?: string }> = React.memo(({ label, checked, onChange, tooltip }) => (
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
));
```

## File: src/frontend/components/ui/TextInput.tsx
```typescript
import React from 'react';
import { Tooltip } from './Tooltip';

export const TextInput: React.FC<{ label: string; value: string[] | undefined; onChange: (value: string[]) => void; placeholder: string; tooltip?: string; }> = React.memo(({ label, value, onChange, placeholder, tooltip }) => (
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
            onChange={(e) => onChange(e.target.value ? e.target.value.split(',').map(s => s.trim()).filter(Boolean) : [])}
            className="w-full bg-slate-700/50 border border-slate-600 rounded-md px-3 py-2 text-sm text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition"
        />
    </div>
));
```

## File: src/frontend/components/ui/Tooltip.tsx
```typescript
import React from 'react';

export const Tooltip: React.FC<{ text: string, children: React.ReactNode }> = ({ text, children }) => (
    <div className="relative flex items-center group">
      {children}
      <div className="absolute left-0 bottom-full mb-2 w-64 p-2 bg-slate-700 text-white text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-[1000]">
        {text}
      </div>
    </div>
);
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

## File: src/frontend/state/atoms.ts
```typescript
import { atom } from 'jotai';
import { client } from '../client';
import type { FilterOptions, TransformOptions, OutputFormat, SpecStats } from '../../backend/types';

// --- Default Config ---
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
    removeSummaries: false,
    includeServers: true,
    includeInfo: true,
  },
};

// --- Base State Atoms ---
export const specContentAtom = atom<string>('');
export const fileNameAtom = atom<string>('spec.json');
export const configAtom = atom(defaultConfig);
export const outputFormatAtom = atom<OutputFormat>('markdown');

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

## File: src/backend/formatters/json.ts
```typescript
import { OpenAPIV3 } from 'openapi-types';

/**
 * Format data as JSON
 */
export const formatAsJson = (data: OpenAPIV3.Document): string => {
  return JSON.stringify(data, null, 2);
};
```

## File: src/backend/formatters/xml.ts
```typescript
import { XMLBuilder } from 'fast-xml-parser';
import { OpenAPIV3 } from 'openapi-types';

/**
 * Format data as XML
 */
export const formatAsXml = (data: OpenAPIV3.Document): string => {
  const builder = new XMLBuilder({
    format: true,
    indentBy: '  ',
    ignoreAttributes: false
  });
  
  return builder.build({ openapi: data });
};
```

## File: src/frontend/components/features/stats/StatsPanel.tsx
```typescript
import React from 'react';
import { useAtomValue } from 'jotai';
import { statsAtom } from '../../../state/atoms';

const StatsHeader: React.FC = () => (
  <div className="flex justify-between items-center text-xs text-slate-400 font-medium mb-2 px-2">
    <span>Metric</span>
    <div className="flex items-center gap-4 w-[320px] justify-end">
      <span className="w-16 text-right">Before</span>
      <span className="w-16 text-right">After</span>
      <span className="w-32 text-right">Change / Reduction</span>
    </div>
  </div>
);

const StatItem: React.FC<{ label: string; before: number; after: number }> = ({ label, before, after }) => {
  const reduction = before > 0 ? ((before - after) / before) * 100 : 0;
  const reductionColor = reduction > 0 ? 'text-green-400' : reduction < 0 ? 'text-red-400' : 'text-slate-400';
  const change = after - before;
  const formatNumber = (num: number) => num.toLocaleString('en-US');

  return (
    <div className="flex justify-between items-center py-2">
      <span className="text-slate-300">{label}</span>
      <div className="flex items-center gap-4">
        <span className="text-slate-400 tabular-nums w-16 text-right">{formatNumber(before)}</span>
        <span className="text-xl font-bold text-white tabular-nums w-16 text-right">{formatNumber(after)}</span>
        <span className={`text-sm font-medium w-32 text-right tabular-nums ${reductionColor}`}>
          {change !== 0 ? `${change > 0 ? '+' : ''}${formatNumber(change)}` : ''} ({reduction.toFixed(0)}%)
        </span>
      </div>
    </div>
  );
};


export const StatsPanel: React.FC = () => {
  const stats = useAtomValue(statsAtom);

  if (!stats) return null;

  const specStats = [
    { label: 'Paths', before: stats.before.paths, after: stats.after.paths },
    { label: 'Operations', before: stats.before.operations, after: stats.after.operations },
    { label: 'Schemas', before: stats.before.schemas, after: stats.after.schemas },
  ];

  const contentStats = [
    { label: 'Characters', before: stats.before.charCount, after: stats.after.charCount },
    { label: 'Lines', before: stats.before.lineCount, after: stats.after.lineCount },
    { label: 'Tokens (est.)', before: stats.before.tokenCount, after: stats.after.tokenCount },
  ];

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Condensation Stats</h3>
      <StatsHeader />
      <div className="divide-y divide-slate-700/50">
        {specStats.map(stat => <StatItem key={stat.label} {...stat} />)}
      </div>
      <div className="my-2 border-t border-slate-700/50" />
      <div className="divide-y divide-slate-700/50">
        {contentStats.map(stat => <StatItem key={stat.label} {...stat} />)}
      </div>
    </div>
  );
};
```

## File: src/frontend/components/ui/index.ts
```typescript
export * from './Tooltip';
export * from './Section';
export * from './Switch';
export * from './TextInput';
```

## File: src/frontend/styles.css
```css
/* You can add any additional global styles here if needed */
body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Global performance optimizations */
body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Use GPU acceleration for certain animations */
.transform,
.transition-transform,
.transition,
.transition-all,
.transition-opacity {
  will-change: transform, opacity;
  transform: translateZ(0);
  backface-visibility: hidden;
}

/* Optimize for scrolling performance */
.overflow-auto {
  -webkit-overflow-scrolling: touch;
  scroll-behavior: smooth;
}

/* Optimize tooltips */
[class*="z-"] {
  transform: translateZ(0);
}
```

## File: test/e2e/transformer.test.ts
```typescript
import { describe, it, expect } from 'bun:test';
import { extractOpenAPI } from '../../src/backend/extractor';
import type { ExtractorConfig, OpenAPIExtractorResult } from '../../src/backend/types';

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

## File: test/unit/transformer.test.ts
```typescript
import { describe, it, expect } from 'bun:test';
import { getComponentNameFromRef, removeUnusedComponents, findRefsRecursive } from '../../src/backend/transformer';
import { OpenAPIV3 } from 'openapi-types';

describe('transformer.ts unit tests', () => {
    describe('getComponentNameFromRef', () => {
        it('should correctly parse a standard component ref', () => {
            const result = getComponentNameFromRef('#/components/schemas/MySchema');
            expect(result).toEqual({ type: 'schemas', name: 'MySchema' });
        });

        it('should correctly parse a ref with a multi-part name', () => {
            const result = getComponentNameFromRef('#/components/schemas/Common/ErrorResponse');
            expect(result).toEqual({ type: 'schemas', name: 'Common/ErrorResponse' });
        });

        it('should return null for refs not pointing to components', () => {
            const result = getComponentNameFromRef('#/paths/~1users/get');
            expect(result).toBeNull();
        });

        it('should return null for malformed component refs', () => {
            expect(getComponentNameFromRef('#/components/schemas/')).toBeNull();
            expect(getComponentNameFromRef('#/components/')).toBeNull();
            expect(getComponentNameFromRef('invalid-ref')).toBeNull();
        });
    });

    describe('findRefsRecursive', () => {
        it('should find all refs in a complex object', () => {
            const obj = {
                a: { $ref: '#/components/schemas/A' },
                b: [{ $ref: '#/components/schemas/B' }],
                c: { nested: { $ref: '#/components/schemas/C' } },
                d: 'not a ref',
                e: { $ref: 123 } // invalid ref type
            };
            const refs = new Set<string>();
            findRefsRecursive(obj, refs);
            expect(refs).toEqual(new Set(['#/components/schemas/A', '#/components/schemas/B', '#/components/schemas/C']));
        });
    });

    describe('removeUnusedComponents', () => {
        const baseSpec = (): OpenAPIV3.Document => ({
            openapi: '3.0.0',
            info: { title: 'Test Spec', version: '1.0.0' },
            paths: {
                '/users': {
                    get: {
                        responses: { '200': { description: 'ok', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } } }
                    }
                }
            },
            components: {
                schemas: {
                    User: { type: 'object', properties: { profile: { $ref: '#/components/schemas/Profile' } } },
                    Profile: { type: 'object', properties: { avatar: { $ref: '#/components/schemas/Avatar' } } },
                    Avatar: { type: 'object' },
                    UnusedSchema: { type: 'object' },
                    OrphanedDependency: { $ref: '#/components/schemas/UnusedSchema' }
                },
                parameters: {
                    UnusedParam: { name: 'limit', in: 'query' }
                }
            }
        });
        
        it('should remove all unused components, including transitive ones', () => {
            const spec = baseSpec();
            const result = removeUnusedComponents(spec);

            // Kept schemas
            expect(result.components?.schemas?.User).toBeDefined();
            expect(result.components?.schemas?.Profile).toBeDefined();
            expect(result.components?.schemas?.Avatar).toBeDefined();

            // Removed schemas
            expect(result.components?.schemas?.UnusedSchema).toBeUndefined();
            expect(result.components?.schemas?.OrphanedDependency).toBeUndefined();

            // Removed component groups
            expect(result.components?.parameters).toBeUndefined();
        });

        it('should remove the entire components object if nothing is left', () => {
            const spec: OpenAPIV3.Document = {
                openapi: '3.0.0',
                info: { title: 'Test Spec', version: '1.0.0' },
                paths: { '/health': { get: { responses: { '200': { description: 'OK' } } } } },
                components: { schemas: { Unused: { type: 'object' } } }
            };
            const result = removeUnusedComponents(spec);
            expect(result.components).toBeUndefined();
        });

        it('should not modify a spec with no components object', () => {
            const spec: OpenAPIV3.Document = { 
                openapi: '3.0.0',
                info: { title: 'Test Spec', version: '1.0.0' },
                paths: {} 
            };
            const result = removeUnusedComponents(JSON.parse(JSON.stringify(spec)));
            expect(result).toEqual(spec);
        });
    });
});
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

## File: src/frontend/client.ts
```typescript
import { edenTreaty } from '@elysiajs/eden';
import type { App } from '../backend/server';

// Use with the specific older version
export const client = edenTreaty<App>('http://localhost:3000');
```

## File: src/backend/formatters/index.ts
```typescript
import { formatAsJson } from './json';
import { formatAsXml } from './xml';
import { formatAsConciseText } from './concise-text';
import type { OutputFormat } from '../types';
import { OpenAPIV3 } from 'openapi-types';

export interface Formatter {
  format: (data: OpenAPIV3.Document) => string;
}

const formatters: Record<OutputFormat, Formatter> = {
  json: { format: formatAsJson },
  yaml: { format: formatAsConciseText },
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

## File: src/backend/utils/fetcher.ts
```typescript
import { promises as fs } from 'node:fs';
import { extname } from 'node:path';
import YAML from 'yaml';
import type { OpenAPIExtractorResult, Source } from '../types';
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

## File: test/unit/extractor.test.ts
```typescript
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
        expect(data?.data).toInclude('### `GET` /users');
    });

    it('should filter paths based on include glob pattern', async () => {
        const { data } = await api.api.condense.post({
            source: { content: JSON.stringify(sampleSpec), path: 'spec.json' },
            output: { format: 'json' },
            filter: {
                paths: { include: ['/users'] },
            },
        });
        
        expect(data).toBeDefined();
        expect(data?.stats).toBeDefined();
        if (!data || !data.stats) throw new Error("Data or stats missing");
        
        const result = JSON.parse(data.data);
        expect(Object.keys(result.paths)).toEqual(['/users']);
        expect(result.paths['/users/{userId}']).toBeUndefined();
        // Check stats
        expect(data.stats.before.paths).toBe(4);
        expect(data.stats.after.paths).toBe(1);
        expect(data.stats.after.charCount).toBeLessThan(data.stats.before.charCount);
    });
    
    it('should filter paths based on exclude glob pattern', async () => {
        const { data } = await api.api.condense.post({
            source: { content: JSON.stringify(sampleSpec), path: 'spec.json' },
            output: { format: 'json' },
            filter: {
                paths: { exclude: ['/internal/**'] },
            },
        });
        
        expect(data).toBeDefined();
        expect(data?.stats).toBeDefined();
        if (!data || !data.stats) throw new Error("Data or stats missing");

        const result = JSON.parse(data.data);
        expect(Object.keys(result.paths)).not.toInclude('/internal/status');
        expect(Object.keys(result.paths)).toHaveLength(3);
        // Check stats
        expect(data.stats.before.paths).toBe(4);
        expect(data.stats.after.paths).toBe(3);
        expect(data.stats.after.charCount).toBeLessThan(data.stats.before.charCount);
    });

    it('should filter by tags', async () => {
        const { data } = await api.api.condense.post({
            source: { content: JSON.stringify(sampleSpec), path: 'spec.json' },
            output: { format: 'json' },
            filter: {
                tags: { include: ['users'] },
            },
        });
        
        expect(data).toBeDefined();
        if (!data) throw new Error("Data missing");

        const result = JSON.parse(data.data);
        expect(Object.keys(result.paths)).toEqual(['/users', '/users/{userId}']);
        expect(data.stats?.after.operations).toBe(2);
    });

    it('should exclude deprecated endpoints by default', async () => {
        const { data } = await api.api.condense.post({
            source: { content: JSON.stringify(sampleSpec), path: 'spec.json' },
            output: { format: 'json' },
        });
        
        expect(data).toBeDefined();
        if (!data) throw new Error("Data missing");
        
        const result = JSON.parse(data.data);
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
        
        expect(data).toBeDefined();
        if (!data) throw new Error("Data missing");

        const result = JSON.parse(data.data);
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

        expect(data).toBeDefined();
        expect(data?.stats).toBeDefined();
        if (!data || !data.stats) throw new Error("Data or stats missing");

        const result = JSON.parse(data.data);
        // Only '/items' path should remain
        expect(Object.keys(result.paths)).toEqual(['/items']);
        // Only 'Item' schema should remain, 'User' and 'UnusedSchema' should be gone
        expect(Object.keys(result.components.schemas)).toEqual(['Item']);
        expect(data.stats.before.schemas).toBe(3);
        expect(data.stats.after.schemas).toBe(1);
    });

    it('should apply transformations like removing descriptions', async () => {
        const { data } = await api.api.condense.post({
            source: { content: JSON.stringify(sampleSpec), path: 'spec.json' },
            output: { format: 'json' },
            transform: {
                removeDescriptions: true,
            },
        });

        expect(data).toBeDefined();
        if (!data) throw new Error("Data missing");

        const result = JSON.parse(data.data);
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

        if (error?.value && 'success' in error.value && 'errors' in error.value && Array.isArray(error.value.errors)) {
            expect(error.value.success).toBe(false);
            expect(error.value.errors).toContain('Error extracting OpenAPI: Error processing spec: Failed to parse content from \'spec.json\'. Not valid JSON or YAML.');
        } else {
            throw new Error('Unexpected error response format');
        }
    });
  });
});
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
    "verbatimModuleSyntax": false,
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

## File: src/backend/extractor.ts
```typescript
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

## File: src/backend/transformer.ts
```typescript
import {
  type FilterOptions,
  type TransformOptions,
  type SchemaTransformer,
  type FilterPatterns,
  type HttpMethod,
} from './types';
import micromatch from 'micromatch';
import { OpenAPIV3 } from 'openapi-types';

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

const httpMethods: HttpMethod[] = [
  'get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'
];

function isHttpMethod(method: string): method is HttpMethod {
  return httpMethods.includes(method as HttpMethod);
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
 * in the remaining parts of the specification.
 */
export const removeUnusedComponents = (
  spec: OpenAPIV3.Document,
): OpenAPIV3.Document => {
  if (!spec.components) return spec;

  // 1. Find all initial references from the spec roots that are kept.
  const allRefs = new Set<string>();
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
      findRefsRecursive(root, allRefs);
    }
  }

  // 2. Transitively discover all dependencies within the components.
  // We keep iterating until no new references are found in an iteration.
  let previousSize;
  do {
    previousSize = allRefs.size;
    allRefs.forEach(ref => {
      const componentInfo = getComponentNameFromRef(ref);
      if (componentInfo) {
        const { type, name } = componentInfo;
        const component = (spec.components as any)?.[type]?.[name];
        if (component) {
          findRefsRecursive(component, allRefs);
        }
      }
    });
  } while (allRefs.size > previousSize);

  // 3. Build a new components object with only the referenced items.
  const newComponents: OpenAPIV3.ComponentsObject = {};
  if (spec.components) {
    for (const componentType in spec.components) {
      const componentGroup = (spec.components as any)[componentType];
      const newComponentGroup: Record<string, any> = {};
      for (const componentName in componentGroup) {
        const ref = `#/components/${componentType}/${componentName}`;
        if (allRefs.has(ref)) {
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
 * Transform OpenAPI schema based on configuration
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
    return node
      .map(item => transformSchema(item, transformOptions, currentDepth + 1))
      .filter(Boolean);
  }

  const result: { [key: string]: any } = { ...node };
  
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

  // Remove summaries if configured
  if (transformOptions.removeSummaries && 'summary' in result) {
    delete result.summary;
  }
  
  // Recursively transform nested properties
  for (const key in result) {
    const prop = result[key];
    if (typeof prop === 'object' && prop !== null) {
      result[key] = transformSchema(
        prop,
        transformOptions,
        currentDepth + 1,
      );
    }
  }
  
  return result;
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

  // Apply filtering
  if (filterOpts && transformed.paths) {
    transformed.paths = filterPaths(transformed.paths, filterOpts);
  }

  // Apply transformations on the entire document
  if (transformOpts) {
    transformed = transformSchema(
      transformed,
      transformOpts,
    ) as OpenAPIV3.Document;
  }

  // Then, remove any components that are no longer referenced
  transformed = removeUnusedComponents(transformed);

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

## File: src/backend/types.ts
```typescript
import type { OpenAPI, OpenAPIV3 } from 'openapi-types';

export type OutputFormat = 'json' | 'yaml' | 'xml' | 'markdown';
export type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head' | 'trace';

export type FilterPatterns = {
  include?: string[];
  exclude?: string[];
};

export type FilterOptions = {
  paths?: FilterPatterns;
  tags?: FilterPatterns;
  operationIds?: FilterPatterns;
  methods?: HttpMethod[];
  includeDeprecated?: boolean;
};

export type TransformOptions = {
  maxDepth?: number;
  removeExamples?: boolean;
  removeDescriptions?: boolean;
  removeSummaries?: boolean;
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
  charCount: number;
  lineCount: number;
  tokenCount: number;
};

export type OpenAPIExtractorResult = {
  success: boolean;
  data?: OpenAPI.Document | string;
  stats?: {
    before: SpecStats;
    after: SpecStats;
  };
  warnings?: string[];
  errors?: string[];
};

export type SchemaTransformer = (
  schema: OpenAPIV3.SchemaObject,
) => OpenAPIV3.SchemaObject;
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

## File: src/frontend/App.tsx
```typescript
import {
  ConfigPanel,
  InputPanel,
  OutputPanel,
  StatsPanel,
} from './components/features';

export default function App() {
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
            <ConfigPanel />
          </div>

          <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-8">
            <InputPanel />
            <StatsPanel />
            <OutputPanel />
          </div>
        </div>
      </main>
    </div>
  );
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
    "@vitejs/plugin-react": "4.5.2",
    "concurrently": "^9.1.2",
    "vite": "5.4.19"
  },
  "peerDependencies": {
    "typescript": "^5"
  },
  "dependencies": {
    "@codemirror/lang-json": "^6.0.1",
    "@codemirror/lang-markdown": "^6.3.3",
    "@codemirror/lang-yaml": "^6.1.2",
    "@codemirror/theme-one-dark": "^6.1.2",
    "@elysiajs/cors": "^1.3.3",
    "@elysiajs/eden": "^1.3.2",
    "@elysiajs/static": "^1.3.0",
    "@elysiajs/swagger": "^1.3.0",
    "@uiw/react-codemirror": "^4.23.13",
    "cmd-ts": "0.13.0",
    "elysia": "1.3.4",
    "fast-xml-parser": "4.5.3",
    "jotai": "^2.12.5",
    "micromatch": "^4.0.5",
    "openapi-types": "^12.1.3",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "yaml": "^2.3.4"
  }
}
```
