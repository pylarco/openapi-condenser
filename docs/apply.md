Of course! I'd be happy to help you build a beautiful and cohesive web interface for your OpenAPI Condenser tool. This will involve creating a new frontend with React and Vite, and a backend server with ElysiaJS to power it, while refactoring the existing CLI logic to be reusable.

Here are the code changes to transform your tool into a full-fledged web application.

```typescript // index.html
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

```json // package.json
{
  "name": "openapi-condenser",
  "main": "src/server.ts",
  "type": "module",
  "bin": {
    "openapi-condenser": "src/cli.ts"
  },
  "scripts": {
    "dev": "bun run src/server.ts",
    "start": "bun run src/server.ts",
    "build": "vite build",
    "cli": "bun run src/cli.ts"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "@types/micromatch": "^4.0.7",
    "@types/node": "^20.10.5",
    "@types/react": "^18.2.46",
    "@types/react-dom": "^18.2.28",
    "@types/react-syntax-highlighter": "^15.5.11",
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.0.10"
  },
  "peerDependencies": {
    "typescript": "^5"
  },
  "dependencies": {
    "@elysiajs/eden": "^0.8.1",
    "@elysiajs/static": "^0.8.1",
    "cmd-ts": "^0.13.0",
    "elysia": "^0.8.9",
    "fast-xml-parser": "^4.3.2",
    "micromatch": "^4.0.5",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-syntax-highlighter": "^15.5.0",
    "yaml": "^2.3.4"
  }
}
```

```typescript // src/backend/extractor.ts
import type { ExtractorConfig, OpenAPIExtractorResult } from './types';
import { fetchSpec } from './utils/fetcher';
import { transformOpenAPI } from './transformer';
import { getFormatter } from './formatters';
import { promises as fs } from 'node:fs';
import { join, dirname } from 'node:path';

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

```typescript // src/backend/index.ts
//TODO: delete this file
```

```typescript // src/backend/types.ts
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

export type OpenAPIExtractorResult = {
  success: boolean;
  data?: any;
  warnings?: string[];
  errors?: string[];
};

export type SchemaTransformer = (schema: any) => any;
```

```typescript // src/backend/utils/fetcher.ts
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

```typescript // src/cli.ts
#!/usr/bin/env bun
import { parse } from 'cmd-ts';
import { command, option, string, optional, flag } from 'cmd-ts';
import { loadConfig, mergeWithCommandLineArgs, extractOpenAPI } from './backend/extractor';
import type { ExtractorConfig } from './backend/types';

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

```typescript // src/frontend/App.tsx
import React, { useState, useCallback } from 'react';
import { client } from './client';
import type { ExtractorConfig, FilterOptions, TransformOptions, OutputFormat } from '../backend/types';
import { ConfigPanel } from './components/ConfigPanel';
import { InputPanel } from './components/InputPanel';
import { OutputPanel } from './components/OutputPanel';

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

export default function App() {
  const [specContent, setSpecContent] = useState('');
  const [fileName, setFileName] = useState('spec.json');
  const [config, setConfig] = useState(defaultConfig);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('markdown');
  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCondense = useCallback(async () => {
    if (!specContent) {
      setError('Please provide an OpenAPI specification.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setOutput('');

    const payload: Omit<ExtractorConfig, 'source'> & { source: { content: string; path: string } } = {
      source: {
        content: specContent,
        path: fileName,
      },
      output: {
        format: outputFormat,
      },
      filter: config.filter,
      transform: config.transform,
    };

    const { data, error: apiError } = await client.api.condense.post(payload);

    if (apiError) {
      setError(apiError.value.errors?.join('\n') || 'An unknown error occurred.');
    } else if (data) {
      setOutput(data.data as string);
    }
    setIsLoading(false);
  }, [specContent, fileName, config, outputFormat]);
  
  return (
    <div className="min-h-screen bg-slate-900 font-sans text-slate-300">
      <header className="fixed top-0 left-0 right-0 bg-slate-900/50 backdrop-blur-sm border-b border-slate-700/50 z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">
            <span className="text-cyan-400">OpenAPI</span> Condenser
          </h1>
          <a href="https://github.com/repomix/openapi-condenser" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-cyan-400 transition-colors">
            GitHub
          </a>
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

```typescript // src/frontend/client.ts
import { edenTreaty } from '@elysiajs/eden';
import type { App } from '../server';

export const client = edenTreaty<App>('http://localhost:3000');
```

```typescript // src/frontend/components/ConfigPanel.tsx
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

const Section: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
  <div className="mb-6">
    <h3 className="text-lg font-semibold text-white mb-3">{title}</h3>
    <div className="space-y-4">{children}</div>
  </div>
);

const Switch: React.FC<{ label: string; checked: boolean; onChange: (checked: boolean) => void }> = ({ label, checked, onChange }) => (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-sm text-slate-300">{label}</span>
      <div className="relative">
        <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <div className={`block w-10 h-6 rounded-full transition ${checked ? 'bg-cyan-500' : 'bg-slate-600'}`}></div>
        <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${checked ? 'transform translate-x-4' : ''}`}></div>
      </div>
    </label>
);

const TextInput: React.FC<{ label: string; value: string[] | undefined; onChange: (value: string[]) => void; placeholder: string; }> = ({ label, value, onChange, placeholder }) => (
    <div>
        <label className="block text-sm text-slate-300 mb-1">{label}</label>
        <input 
            type="text"
            placeholder={placeholder}
            value={value?.join(',')}
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
        />
        <TextInput 
            label="Exclude Paths (glob)" 
            placeholder="/internal/**"
            value={config.filter.paths?.exclude}
            onChange={v => handleFilterChange('paths', { ...config.filter.paths, exclude: v })}
        />
        <Switch 
            label="Include Deprecated"
            checked={!!config.filter.includeDeprecated}
            onChange={v => handleFilterChange('includeDeprecated', v)}
        />
      </Section>

      <Section title="Transformation">
        <Switch 
            label="Remove Examples"
            checked={!!config.transform.removeExamples}
            onChange={v => handleTransformChange('removeExamples', v)}
        />
        <Switch 
            label="Remove Descriptions"
            checked={!!config.transform.removeDescriptions}
            onChange={v => handleTransformChange('removeDescriptions', v)}
        />
        <Switch 
            label="Include Servers"
            checked={!!config.transform.includeServers}
            onChange={v => handleTransformChange('includeServers', v)}
        />
        <Switch 
            label="Include Info"
            checked={!!config.transform.includeInfo}
            onChange={v => handleTransformChange('includeInfo', v)}
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

```typescript // src/frontend/components/InputPanel.tsx
import React, { useState, useCallback, useRef } from 'react';

interface InputPanelProps {
  setSpecContent: (content: string) => void;
  setFileName: (name: string) => void;
}

export const InputPanel: React.FC<InputPanelProps> = ({ setSpecContent, setFileName }) => {
  const [activeTab, setActiveTab] = useState<'paste' | 'upload'>('paste');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSpecContent(e.target?.result as string);
        setFileName(file.name);
      };
      reader.readAsText(file);
    }
  }, [setSpecContent, setFileName]);

  const handlePaste = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSpecContent(event.target.value);
    setFileName('spec.json'); // Assume json for pasted content
  }, [setSpecContent, setFileName]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg overflow-hidden">
      <div className="flex border-b border-slate-700/50">
        <button 
          onClick={() => setActiveTab('paste')} 
          className={`px-4 py-2 text-sm font-medium transition ${activeTab === 'paste' ? 'text-white bg-slate-700/50' : 'text-slate-400 hover:bg-slate-800/60'}`}
        >
          Paste Spec
        </button>
        <button 
          onClick={() => setActiveTab('upload')} 
          className={`px-4 py-2 text-sm font-medium transition ${activeTab === 'upload' ? 'text-white bg-slate-700/50' : 'text-slate-400 hover:bg-slate-800/60'}`}
        >
          Upload File
        </button>
      </div>
      <div className="p-1">
        {activeTab === 'paste' ? (
          <textarea
            onChange={handlePaste}
            placeholder="Paste your OpenAPI (JSON or YAML) spec here..."
            className="w-full h-64 bg-transparent text-slate-300 p-4 resize-none focus:outline-none placeholder-slate-500 font-mono text-sm"
          />
        ) : (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400">
            <button onClick={handleUploadClick} className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-6 rounded-lg transition-colors">
              Select OpenAPI File
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json,.yaml,.yml" />
            <p className="mt-4 text-sm">Supports .json, .yaml, and .yml</p>
          </div>
        )}
      </div>
    </div>
  );
};
```

```typescript // src/frontend/components/OutputPanel.tsx
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

export const OutputPanel: React.FC<OutputPanelProps> = ({ output, isLoading, error, format }) => {
  const [copyStatus, setCopyStatus] = useState('Copy');
  
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

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg min-h-[20rem] flex flex-col">
      <div className="flex items-center justify-between p-3 border-b border-slate-700/50">
        <h3 className="text-sm font-semibold text-white">Condensed Output</h3>
        {output && !isLoading && (
          <div className="flex gap-2">
            <button onClick={handleCopy} className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded-md transition-colors">{copyStatus}</button>
            <button onClick={handleDownload} className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded-md transition-colors">Download</button>
          </div>
        )}
      </div>
      <div className="flex-grow p-1 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-800/50">
            <svg className="animate-spin h-8 w-8 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="bg-red-900/50 border border-red-500 text-red-300 p-4 rounded-lg text-sm">
                <p className="font-bold mb-2">An error occurred:</p>
                <pre className="whitespace-pre-wrap">{error}</pre>
            </div>
          </div>
        )}
        {!isLoading && !error && output && (
            <SyntaxHighlighter language={languageMap[format]} style={vscDarkPlus} customStyle={{ background: 'transparent', margin: 0, padding: '1rem', height: '100%' }} codeTagProps={{style:{fontFamily: 'monospace'}}} wrapLines={true} showLineNumbers>
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

```typescript // src/frontend/main.tsx
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

```css // src/frontend/styles.css
/* You can add any additional global styles here if needed */
body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

```typescript // src/server.ts
import { Elysia, t } from 'elysia';
import { staticPlugin } from '@elysiajs/static';
import { extractOpenAPI } from './backend/extractor';
import type { ExtractorConfig } from './backend/types';

const app = new Elysia()
  .use(staticPlugin())
  .post(
    '/api/condense',
    async ({ body }) => {
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
        throw new Error(JSON.stringify(result));
      }

      return result;
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
            methods: t.Optional(t.Array(t.String())),
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
    }
  )
  .listen(3000);

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);

export type App = typeof app;
```

```typescript // vite.config.ts
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