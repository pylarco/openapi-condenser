This file is a merged representation of a subset of the codebase, containing specifically included files, combined into a single document by Repomix.
The content has been processed where security check has been disabled.

# Directory Structure
```
index.html
package.json
src/backend/cli.ts
src/backend/constants.ts
src/backend/extractor.ts
src/backend/formatters/concise-text.ts
src/backend/formatters/index.ts
src/backend/formatters/json.ts
src/backend/formatters/xml.ts
src/backend/server.ts
src/backend/transformer.ts
src/backend/types.ts
src/backend/utils/fetcher.ts
src/backend/utils/ssrf.ts
src/backend/worker.ts
src/frontend/App.tsx
src/frontend/client.ts
src/frontend/components/features/ActionPanel.tsx
src/frontend/components/features/config/ConfigPanel.tsx
src/frontend/components/features/index.ts
src/frontend/components/features/input/InputPanel.tsx
src/frontend/components/features/output/OutputPanel.tsx
src/frontend/components/features/stats/StatsPanel.tsx
src/frontend/components/ui/index.ts
src/frontend/components/ui/InfoTooltip.tsx
src/frontend/components/ui/Section.tsx
src/frontend/components/ui/Spinner.tsx
src/frontend/components/ui/Switch.tsx
src/frontend/components/ui/TextInput.tsx
src/frontend/components/ui/Tooltip.tsx
src/frontend/constants.ts
src/frontend/main.tsx
src/frontend/state/atoms.ts
src/frontend/state/motion.reuse.tsx
src/frontend/styles.css
src/shared/constants.ts
src/shared/types.ts
tsconfig.json
vite.config.ts
wrangler.toml
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

## File: src/frontend/components/ui/InfoTooltip.tsx
```typescript
import React from 'react';
import { Tooltip } from './Tooltip';

export const InfoTooltip: React.FC<{ text: string }> = ({ text }) => (
    <Tooltip text={text}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    </Tooltip>
);
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

## File: src/frontend/components/ui/Spinner.tsx
```typescript
import React from 'react';

export const Spinner: React.FC<{ className?: string }> = ({ className = 'h-5 w-5 text-white' }) => (
  <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);
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

## File: src/backend/utils/ssrf.ts
```typescript
import { isIP } from 'is-ip';

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

// Use DNS-over-HTTPS to resolve hostnames in a web-worker compatible way
const dohLookup = async (hostname: string): Promise<{ address: string }[]> => {
    // Using Cloudflare's own DoH resolver
    const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}`;
    try {
        const response = await fetch(url, {
            headers: { 'accept': 'application/dns-json' }
        });
        if (!response.ok) {
            console.error(`DoH lookup failed for ${hostname} with status: ${response.status}`);
            return [];
        }
        const dnsResult = await response.json() as { Answer?: { data: string, type: number }[] };
        
        // Filter for A (1) and AAAA (28) records
        return dnsResult.Answer?.filter(ans => ans.type === 1 || ans.type === 28)
                             .map(ans => ({ address: ans.data })) ?? [];
    } catch (e) {
        console.error(`Error during DoH lookup for ${hostname}:`, e);
        return [];
    }
}


type SafetyResult = { safe: true } | { safe: false, message: string, status: number };

export const checkUrlSafety = async (url: string): Promise<SafetyResult> => {
    try {
        const urlObj = new URL(url);

        if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
            return { safe: false, message: 'URL must use http or https protocol.', status: 400 };
        }
        
        const hostname = urlObj.hostname;
        const isHostnameAnIp = isIP(hostname);

        if (isHostnameAnIp) {
            if (isPrivateIP(hostname)) {
                return { safe: false, message: 'Fetching specs from private or local network addresses is forbidden.', status: 403 };
            }
        } else {
            const addresses = await dohLookup(hostname);
            if (addresses.length === 0) {
                return { safe: false, message: `Could not resolve hostname: ${hostname}`, status: 400 };
            }
            if (addresses.some(addr => isPrivateIP(addr.address))) {
                return { safe: false, message: 'Fetching specs from private or local network addresses is forbidden.', status: 403 };
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

## File: src/backend/worker.ts
```typescript
import { app } from './server';

export default {
  fetch: app.fetch,
};
```

## File: src/frontend/components/features/index.ts
```typescript
export * from './ActionPanel';
export * from './config/ConfigPanel';
export * from './input/InputPanel';
export * from './output/OutputPanel';
export * from './stats/StatsPanel';
```

## File: src/backend/constants.ts
```typescript
export const contentTypeMappings: ReadonlyArray<[string, string]> = [
    ['json', 'json'],
    ['form-data', 'form-data'],
    ['x-www-form-urlencoded', 'form-urlencoded'],
    ['xml', 'xml'],
    ['text/plain', 'text'],
];

export const TOKEN_CHAR_RATIO = 4;
export const USER_AGENT = 'OpenAPI-Condenser/1.0';
```

## File: src/frontend/components/ui/index.ts
```typescript
export * from './Tooltip';
export * from './Section';
export * from './Switch';
export * from './TextInput';
export * from './Spinner';
export * from './InfoTooltip';
```

## File: src/frontend/constants.ts
```typescript
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

## File: src/shared/types.ts
```typescript
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
  includeEndpointPathsSummary?: boolean;
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

## File: src/frontend/components/features/ActionPanel.tsx
```typescript
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

## File: src/frontend/components/ui/TextInput.tsx
```typescript
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

.invisible-scrollbar {
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
}
.invisible-scrollbar::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
}
```

## File: src/shared/constants.ts
```typescript
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
    includeEndpointPathsSummary: false,
  },
};
```

## File: vite.config.ts
```typescript
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

## File: wrangler.toml
```toml
name = "openapi-condenser"
main = "src/backend/worker.ts"
compatibility_date = "2025-06-08"
compatibility_flags = ["nodejs_compat", "nodejs_compat_populate_process_env"]

[site]
bucket = "./dist"

[build]
command = "npm run build"
```

## File: src/frontend/components/ui/Switch.tsx
```typescript
import React, { useRef } from 'react';
import { InfoTooltip } from './InfoTooltip';
import { useSwitchAnimation } from '../../state/motion.reuse';

export const Switch: React.FC<{ label: string; checked: boolean; onChange: (checked: boolean) => void; tooltip?: string }> = ({ label, checked, onChange, tooltip }) => {
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
};
```

## File: src/frontend/state/atoms.ts
```typescript
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

## File: src/frontend/state/motion.reuse.tsx
```typescript
import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'

export const usePanelEntrance = (el: React.RefObject<HTMLElement>) => {
  useLayoutEffect(() => {
    if (!el.current) return

    gsap.from(el.current, {
      opacity: 0,
      y: 50,
      duration: 0.5,
      ease: 'power3.out',
    })
  }, [el])
}

export const useButtonHover = (el: React.RefObject<HTMLElement>) => {
  useLayoutEffect(() => {
    if (!el.current) return;
    const tl = gsap.timeline({ paused: true });
    tl.to(el.current, { scale: 1.05, duration: 0.2, ease: 'power2.out' });

    const onEnter = () => tl.play();
    const onLeave = () => tl.reverse();

    el.current.addEventListener('mouseenter', onEnter);
    el.current.addEventListener('mouseleave', onLeave);

    return () => {
      el.current?.removeEventListener('mouseenter', onEnter);
      el.current?.removeEventListener('mouseleave', onLeave);
    }
  }, [el]);
}

export const useInputFocus = (el: React.RefObject<HTMLElement>) => {
  useLayoutEffect(() => {
    if (!el.current) return;

    const input = el.current.querySelector('input, textarea');
    if (!input) return;

    const tl = gsap.timeline({ paused: true });
    tl.to(el.current, {
      boxShadow: '0 0 0 2px rgba(34, 211, 238, 0.5)',
      borderColor: 'rgb(34 211 238)',
      duration: 0.2,
      ease: 'power2.out'
    });

    const onFocus = () => tl.play();
    const onBlur = () => tl.reverse();

    input.addEventListener('focus', onFocus);
    input.addEventListener('blur', onBlur);

    return () => {
      input.removeEventListener('focus', onFocus);
      input.removeEventListener('blur', onBlur);
    }
  }, [el]);
}

export const useSwitchAnimation = (el: React.RefObject<HTMLInputElement>, checked: boolean) => {
  const isInitialMount = useRef(true);

  useLayoutEffect(() => {
    if (!el.current) return;
    const knob = el.current.nextElementSibling?.nextElementSibling;
    const background = el.current.nextElementSibling;
    if (!knob || !background) return;

    // The color for bg-slate-600 from tailwind config
    const offColor = 'rgb(71 85 105)'; 
    // The color for bg-cyan-500 from the original timeline animation
    const onColor = 'rgb(6 182 212)';

    if (isInitialMount.current) {
      // On first render, just set the state, don't animate
      gsap.set(knob, { x: checked ? 16 : 0 });
      gsap.set(background, { backgroundColor: checked ? onColor : offColor });
      isInitialMount.current = false;
    } else {
      // On subsequent renders, animate
      gsap.to(knob, { x: checked ? 16 : 0, duration: 0.2, ease: 'power2.inOut' });
      gsap.to(background, { backgroundColor: checked ? onColor : offColor, duration: 0.2, ease: 'power2.inOut' });
    }
  }, [checked, el]);
};
```

## File: src/backend/cli.ts
```typescript
//TODO: delete this file
```

## File: src/frontend/client.ts
```typescript
import { edenTreaty } from '@elysiajs/eden';
import type { App } from '../backend/server';
import { API_BASE_URL } from '../shared/constants';

// Use with the specific older version
export const client = edenTreaty<App>(API_BASE_URL);
```

## File: src/frontend/components/features/input/InputPanel.tsx
```typescript
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

## File: src/backend/formatters/concise-text.ts
```typescript
import { OpenAPIV3 } from 'openapi-types';
import { contentTypeMappings } from '../constants';
import { HTTP_METHODS } from '../../shared/constants';

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

const shortenContentType = (contentType: string): string => {
    for (const [key, shortName] of contentTypeMappings) {
        if (contentType.includes(key)) {
            return shortName;
        }
    }
    return contentType;
};

const shortenParamIn = (paramIn: string): string => {
    switch (paramIn) {
        case 'query': return 'q';
        case 'path': return 'p';
        case 'header': return 'h';
        case 'cookie': return 'c';
        default: return paramIn;
    }
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

    propsMarkdown += `${indentStr}* \`${propName}\`: \`${typeStr}\`${requiredStr}${descriptionStr}\n`;

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
    output += `### \`${method.toUpperCase()}\` ${path}\n`;

    const description = (operation.summary || operation.description || '').replace(/\n/g, ' ');
    if (description) {
      output += `\n${description}\n`;
    }

    // Parameters
    if (operation.parameters?.length) {
      output += `\nP:\n`;
      for (const paramRef of operation.parameters) {
        const param = resolveRef(paramRef, data);
        const schema = param.schema as OpenAPIV3.SchemaObject;
        const type = schema ? formatSchemaType(schema, data) : 'any';
        const required = param.required ? ' (required)' : '';
        const paramDesc = param.description ? ` - ${param.description.replace(/\n/g, ' ')}` : '';
        output += `* \`${param.name}\` ${shortenParamIn(param.in)}: \`${type}\`${required}${paramDesc}\n`;
      }
    }
    
    // Request Body
    if (operation.requestBody) {
      const requestBody = resolveRef(operation.requestBody, data);
      if (requestBody.content) {
        const contentEntries = Object.entries(requestBody.content);
        if (contentEntries.length > 0) {
            output += `\nB:\n`;
            for (const [contentType, mediaType] of contentEntries) {
                output += `* \`${shortenContentType(contentType)}\` -> \`${formatSchemaType(mediaType.schema, data)}\`\n`;
            }
        }
      }
    }

    // Responses
    if (operation.responses) {
      output += `\nR:\n`;
      
      const responseGroups: Map<string, string[]> = new Map();

      for (const [code, responseRef] of Object.entries(operation.responses)) {
        const response = resolveRef(responseRef, data);
        let responseId = 'No description';

        if (response.content) {
            // Take the first content type's schema as the identifier.
            const firstContent = Object.values(response.content)[0];
            if (firstContent?.schema) {
                responseId = `\`${formatSchemaType(firstContent.schema, data)}\``;
            }
        }
        
        if (responseId === 'No description' && response.description) {
            // Fallback to description if no content/schema
            responseId = response.description.replace(/\n/g, ' ');
        }

        if (!responseGroups.has(responseId)) {
            responseGroups.set(responseId, []);
        }
        responseGroups.get(responseId)!.push(code);
      }

      for (const [responseId, codes] of responseGroups.entries()) {
        const codesStr = codes.map(c => `\`${c}\``).join(', ');
        output += `* ${codesStr}: ${responseId}\n`;
      }
    }
    return output;
}

const formatSchema = (name: string, schemaRef: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject, data: OpenAPIV3.Document): string => {
    let output = '';
    const schema = resolveRef(schemaRef, data);
      
    output += `### S: ${name}\n`;
    if (schema.description) {
        output += `\n${schema.description.replace(/\n/g, ' ')}\n`;
    }

    if (schema.type === 'object' && schema.properties) {
        output += '\nProps:\n';
        output += formatProperties(schema.properties, schema.required, data, 0);
    } else if (schema.type === 'array' && schema.items) {
        output += `\n**Type**: Array of \`${formatSchemaType(schema.items, data)}\`\n`;
        const resolvedItems = resolveRef(schema.items, data);
        if (resolvedItems.type === 'object' && resolvedItems.properties) {
             output += "\nItem Props:\n";
             output += formatProperties(resolvedItems.properties, resolvedItems.required, data, 0);
        }
    } else if (schema.type) {
        output += `\n**Type**: \`${schema.type}\`\n`;
    }
    return output;
}

/**
 * Format data as a concise text format for LLMs.
 */
export const formatAsConciseText = (data: OpenAPIV3.Document): string => {
  const parts: string[] = [];

  // Endpoint Paths Summary
  if ((data as any)['x-endpoint-paths-summary'] && Array.isArray((data as any)['x-endpoint-paths-summary'])) {
      const paths: string[] = (data as any)['x-endpoint-paths-summary'];
      if (paths.length > 0) {
          let summaryBlock = "## Endpoint Paths Summary\n\n";
          summaryBlock += paths.map(p => `* \`${p}\``).join('\n');
          parts.push(summaryBlock);
      }
  }

  // Info Block
  if (data.info) {
    let infoBlock = `# ${data.info.title}`;
    if (data.info.version) {
        infoBlock += ` (v${data.info.version})`;
    }
    if (data.info.description) {
        infoBlock += `\n\n${data.info.description.trim()}`;
    }
    parts.push(infoBlock);
  }

  const endpoints: string[] = [];
  // Endpoints
  if (data.paths) {
    for (const [path, pathItem] of Object.entries(data.paths)) {
      if (!pathItem) continue;
      
      const validMethods = Object.keys(pathItem).filter(method => 
        HTTP_METHODS.includes(method as any)
      ) as (keyof typeof pathItem)[];

      for (const method of validMethods) {
        const operation = pathItem[method] as OpenAPIV3.OperationObject;
        if (!operation || typeof operation !== 'object' || !('responses' in operation)) continue;
        
        endpoints.push(formatEndpoint(method, path, operation, data));
      }
    }
  }
  
  if (endpoints.length > 0) {
      parts.push("## Endpoints\n\n" + endpoints.join('\n---\n\n'));
  }

  const schemas: string[] = [];
  // Schemas
  if (data.components?.schemas) {
    for (const [name, schemaRef] of Object.entries(data.components.schemas)) {
        schemas.push(formatSchema(name, schemaRef, data));
    }
  }

  if (schemas.length > 0) {
      parts.push("## Schemas\n\n" + schemas.join('\n---\n\n'));
  }
  
  return parts.join('\n\n---\n\n').trim();
};
```

## File: src/backend/formatters/index.ts
```typescript
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
  "include": ["src", "vite.config.ts", "test"],
  "exclude": ["node_modules", "dist"]
}
```

## File: src/backend/utils/fetcher.ts
```typescript
import YAML from 'yaml';
import type { OpenAPIExtractorResult, Source } from '../../shared/types';
import { OpenAPI } from 'openapi-types';

function getExtension(path: string): string {
    const filename = path.split('?')[0]?.split('/').pop();
    if (!filename) return '';
    const lastDot = filename.lastIndexOf('.');
    // < 1 to ignore leading dots (e.g. '.env') and files with no extension
    if (lastDot < 1) return ''; 
    return filename.substring(lastDot);
}

/**
 * Fetch OpenAPI spec from remote URL or in-memory content
 */
export const fetchSpec = async (
  source: Source
): Promise<OpenAPIExtractorResult> => {
  try {
    let content: string;
    let contentType: string | null = null;
    
    if (source.type === 'memory') {
      content = source.content;
    } else if (source.type === 'remote') {
      const response = await fetch(source.path);
      if (!response.ok) {
        throw new Error(`Failed to fetch remote spec: ${response.status} ${response.statusText}`);
      }
      content = await response.text();
      contentType = response.headers.get('Content-Type');
    } else {
        throw new Error(`Unsupported source type. Only 'memory' and 'remote' are supported in this environment.`);
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
    const ext = getExtension(source).toLowerCase();
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

## File: src/frontend/components/features/config/ConfigPanel.tsx
```typescript
import React from 'react';
import { useAtom } from 'jotai';
import type { FilterOptions, TransformOptions, OutputFormat } from '../../../../shared/types';
import { configAtom, outputFormatAtom } from '../../../state/atoms';
import { Section, Switch, TextInput } from '../../ui';

type Config = {
  filter: FilterOptions;
  transform: TransformOptions;
}

export const ConfigPanel: React.FC = () => {
  const [config, setConfig] = useAtom(configAtom);
  const [outputFormat, setOutputFormat] = useAtom(outputFormatAtom);

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
        <div className="max-h-[26rem] overflow-y-auto space-y-4 pr-1 invisible-scrollbar">
            <Switch 
                label="Include Paths Summary"
                checked={!!config.transform.includeEndpointPathsSummary}
                onChange={v => handleTransformChange('includeEndpointPathsSummary', v)}
                tooltip="If checked, a summary of all endpoint paths will be added to the top of the output."
            />
            <Switch 
                label="Include Info"
                checked={!!config.transform.includeInfo}
                onChange={v => handleTransformChange('includeInfo', v)}
                tooltip="If checked, the 'info' block (title, version, etc.) will be included."
            />
            <Switch 
                label="Include Servers"
                checked={!!config.transform.includeServers}
                onChange={v => handleTransformChange('includeServers', v)}
                tooltip="If checked, the 'servers' block will be included."
            />
            <Switch 
                label="Include Responses"
                checked={!!config.transform.includeResponses}
                onChange={v => handleTransformChange('includeResponses', v)}
                tooltip="If checked, the 'responses' block for each endpoint will be included."
            />
            <Switch 
                label="Include Request Bodies"
                checked={!!config.transform.includeRequestBodies}
                onChange={v => handleTransformChange('includeRequestBodies', v)}
                tooltip="If checked, the 'requestBody' block for each endpoint will be included."
            />
            <Switch 
                label="Include Schemas"
                checked={!!config.transform.includeSchemas}
                onChange={v => handleTransformChange('includeSchemas', v)}
                tooltip="If checked, the 'components/schemas' block will be included."
            />
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
        </div>
      </Section>
    </div>
  );
};
```

## File: src/backend/types.ts
```typescript
//TODO: delete this file
```

## File: src/frontend/components/features/output/OutputPanel.tsx
```typescript
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAtomValue } from 'jotai';
import CodeMirror from '@uiw/react-codemirror';
import { oneDark } from '@codemirror/theme-one-dark';
import { outputAtom, isLoadingAtom, errorAtom, outputFormatAtom } from '../../../state/atoms';
import { languageMap } from '../../../constants';

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


export const OutputPanel: React.FC<{}> = () => {
  const output = useAtomValue(outputAtom);
  const isLoading = useAtomValue(isLoadingAtom);
  const error = useAtomValue(errorAtom);
  const format = useAtomValue(outputFormatAtom);

  const [copyStatus, setCopyStatus] = useState('Copy');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (copyStatus === 'Copied!') {
      const timer = setTimeout(() => setCopyStatus('Copy'), 2000);
      return () => clearTimeout(timer);
    }
  }, [copyStatus]);

  // Sync isFullScreen state with the browser's fullscreen status
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

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
    if (!panelRef.current) return;
    
    if (!document.fullscreenElement) {
      panelRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }, []);
  
  const handleToggleCollapse = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) {
        return;
    }
    setIsCollapsed(!isCollapsed);
  };

  const panelClasses = isFullScreen 
    ? "bg-slate-900 flex flex-col"
    : "bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg flex flex-col";

  return (
    <div ref={panelRef} className={panelClasses}>
      <div 
        onClick={handleToggleCollapse}
        className="flex items-center justify-between p-3 border-b border-slate-700/50 flex-shrink-0 cursor-pointer"
      >
        <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white">Condensed Output</h3>
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-slate-400 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
        </div>
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
      {!isCollapsed && (
        <div className="flex-grow p-1 relative overflow-auto min-h-[20rem]">
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
      )}
    </div>
  );
};
```

## File: src/backend/extractor.ts
```typescript
import type { ExtractorConfig, OpenAPIExtractorResult, SpecStats, HttpMethod } from '../shared/types';
import { fetchSpec } from './utils/fetcher';
import { transformOpenAPI } from './transformer';
import { getFormatter } from './formatters';
import { OpenAPIV3, OpenAPI } from 'openapi-types';
import { HTTP_METHODS } from '../shared/constants';
import { TOKEN_CHAR_RATIO } from './constants';

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
```

## File: src/backend/transformer.ts
```typescript
import {
  type FilterOptions,
  type TransformOptions,
  type SchemaTransformer,
  type FilterPatterns,
  type HttpMethod,
} from '../shared/types';
import { OpenAPIV3 } from 'openapi-types';
import { HTTP_METHODS } from '../shared/constants';

/**
 * Checks if an endpoint's tags match the provided patterns (exact match).
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
  
  const matchesInclude = include?.length ? endpointTags.some(tag => include.includes(tag)) : true;
  const matchesExclude = exclude?.length ? endpointTags.some(tag => exclude.includes(tag)) : false;

  return matchesInclude && !matchesExclude;
}

/**
 * Filter paths based on configuration (exact match).
 */
export const filterPaths = (
  paths: OpenAPIV3.PathsObject,
  filterOptions: FilterOptions,
): OpenAPIV3.PathsObject => {
  if (!filterOptions) return paths;
  
  const pathKeys = Object.keys(paths);
  let filteredPathKeys = pathKeys;

  if (filterOptions.paths?.include?.length) {
    filteredPathKeys = filteredPathKeys.filter(key => filterOptions.paths!.include!.includes(key));
  }
  if (filterOptions.paths?.exclude?.length) {
    filteredPathKeys = filteredPathKeys.filter(key => !filterOptions.paths!.exclude!.includes(key));
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

  // 6. Add endpoint paths summary if requested.
  if (transformOpts?.includeEndpointPathsSummary && transformed.paths) {
    const paths = Object.keys(transformed.paths);
    if (paths.length > 0) {
      (transformed as any)['x-endpoint-paths-summary'] = paths;
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

## File: src/frontend/App.tsx
```typescript
import { useRef, useState, useEffect, useCallback } from 'react';
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
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(true);

  usePanelEntrance(configPanelRef);
  usePanelEntrance(mainPanelsRef);

  const handleScroll = useCallback(() => {
    const scrollThreshold = 400;
    const bottomThreshold = 20;

    setShowScrollToTop(window.scrollY > scrollThreshold);

    const isAtBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - bottomThreshold;
    setShowScrollToBottom(!isAtBottom);
  }, []);

  useEffect(() => {
      window.addEventListener('scroll', handleScroll, { passive: true });
      handleScroll(); // Initial check
      return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  const scrollToBottom = () => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });

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
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        {showScrollToTop && (
            <button 
                onClick={scrollToTop} 
                className="p-3 bg-cyan-500/80 hover:bg-cyan-500 text-white rounded-full shadow-lg transition-all hover:scale-110 backdrop-blur-sm"
                aria-label="Scroll to top"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                </svg>
            </button>
        )}
        {showScrollToBottom && (
            <button 
                onClick={scrollToBottom} 
                className="p-3 bg-cyan-500/80 hover:bg-cyan-500 text-white rounded-full shadow-lg transition-all hover:scale-110 backdrop-blur-sm"
                aria-label="Scroll to bottom"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
            </button>
        )}
      </div>
    </div>
  );
}
```

## File: src/backend/server.ts
```typescript
import { Elysia, t } from 'elysia';
import { swagger } from '@elysiajs/swagger';
import { cors } from '@elysiajs/cors';
import { extractOpenAPI } from './extractor';
import type { ExtractorConfig, SpecStats } from '../shared/types';
import { API_PORT } from '../shared/constants';
import { USER_AGENT } from './constants';
import { checkUrlSafety } from './utils/ssrf';

export const app = new Elysia({ aot: false })
  .use(swagger())
  .use(cors({
    origin: [/^http:\/\/localhost(:\d+)?$/, /\.pages\.dev$/],
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
          includeEndpointPathsSummary: body.transform?.includeEndpointPathsSummary ?? false,
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
            includeEndpointPathsSummary: t.Optional(t.Boolean()),
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

## File: package.json
```json
{
  "name": "openapi-condenser",
  "main": "src/server.ts",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "start": "bun run src/backend/server.ts",
    "build": "vite build",
    "deploy": "wrangler deploy",
    "wrangler:dev": "wrangler dev",
    "test": "bun test"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "@types/node": "20.19.1",
    "@types/react": "18.3.23",
    "@types/react-dom": "18.3.7",
    "@vitejs/plugin-react": "4.5.2",
    "vite": "5.4.19",
    "wrangler": "^4.20.2"
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
    "@elysiajs/swagger": "^1.3.0",
    "@types/gsap": "^3.0.0",
    "@uiw/react-codemirror": "^4.23.13",
    "elysia": "1.3.4",
    "fast-xml-parser": "4.5.3",
    "gsap": "^3.13.0",
    "is-ip": "^5.0.0",
    "jotai": "^2.12.5",
    "openapi-types": "^12.1.3",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "repomix": "^0.3.9",
    "yaml": "^2.3.4"
  }
}
```
