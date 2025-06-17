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
- Only files matching these patterns are included: src/frontend, index.html, vite.config.ts, tsconfig.json
- Files matching these patterns are excluded: *.git *.cursor/
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
```
index.html
src/frontend/App.tsx
src/frontend/client.ts
src/frontend/components/features/ActionPanel.tsx
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
src/frontend/constants.ts
src/frontend/main.tsx
src/frontend/state/atoms.ts
src/frontend/state/motion.reuse.tsx
src/frontend/styles.css
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

## File: src/frontend/components/features/index.ts
```typescript
export * from './ActionPanel';
export * from './config/ConfigPanel';
export * from './input/InputPanel';
export * from './output/OutputPanel';
export * from './stats/StatsPanel';
```

## File: src/frontend/components/ui/index.ts
```typescript
export * from './Tooltip';
export * from './Section';
export * from './Switch';
export * from './TextInput';
```

## File: src/frontend/components/ui/TextInput.tsx
```typescript
import React, { useRef } from 'react';
import { Tooltip } from './Tooltip';
import { useInputFocus } from '../../state/motion.reuse';

export const TextInput: React.FC<{ label: string; value: string[] | undefined; onChange: (value: string[]) => void; placeholder: string; tooltip?: string; }> = React.memo(({ label, value, onChange, placeholder, tooltip }) => {
    const inputRef = useRef<HTMLDivElement>(null);
    useInputFocus(inputRef);

    return (
        <div ref={inputRef}>
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
                className="w-full bg-slate-700/50 border border-slate-600 rounded-md px-3 py-2 text-sm text-white placeholder-slate-400 outline-none transition"
            />
        </div>
    )
});
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
  const isInitial = useRef(true);

  useLayoutEffect(() => {
    if (!el.current) return;
    const knob = el.current.nextElementSibling?.nextElementSibling;
    const background = el.current.nextElementSibling;
    if (!knob || !background) return;

    const duration = isInitial.current ? 0 : 0.2;

    gsap.to(background, {
      backgroundColor: checked ? 'rgb(6 182 212)' : 'rgb(71 85 105)',
      duration,
      ease: 'power2.inOut',
    });

    gsap.to(knob, {
      x: checked ? 16 : 0,
      duration,
      ease: 'power2.inOut',
    });

    isInitial.current = false;
  }, [checked]);
};
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

## File: src/frontend/components/features/ActionPanel.tsx
```typescript
import React, { useRef } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { isLoadingAtom, condenseSpecAtom, specContentAtom, outputAtom } from '../../state/atoms';
import { useButtonHover } from '../../state/motion.reuse';

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
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            ) : output ? 'Re-condense' : 'Condense'}
        </button>
    );
}
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
    <div className="bg-slate-800/75 backdrop-blur-sm border border-slate-700/50 rounded-lg overflow-hidden">
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
    <div className="bg-slate-800/75 backdrop-blur-sm border border-slate-700/50 rounded-lg p-6">
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

## File: src/frontend/components/ui/Switch.tsx
```typescript
import React, { useRef } from 'react';
import { Tooltip } from './Tooltip';
import { useSwitchAnimation } from '../../state/motion.reuse';

export const Switch: React.FC<{ label: string; checked: boolean; onChange: (checked: boolean) => void; tooltip?: string }> = React.memo(({ label, checked, onChange, tooltip }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    useSwitchAnimation(inputRef, checked);

    return (
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
                <input ref={inputRef} type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
                <div className="block w-10 h-6 rounded-full bg-slate-600"></div>
                <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full"></div>
            </div>
        </label>
    )
});
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

## File: vite.config.ts
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { API_PREFIX, API_HOST, API_PORT } from './src/shared/constants'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      [API_PREFIX]: {
        target: `http://${API_HOST}:${API_PORT}`,
        changeOrigin: true,
      }
    }
  }
})
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
    <div className="sticky top-24 p-6 bg-slate-800/75 backdrop-blur-sm border border-slate-700/50 rounded-lg">
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
      </Section>
    </div>
  );
};
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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (copyStatus === 'Copied!') {
      const timer = setTimeout(() => setCopyStatus('Copy'), 2000);
      return () => clearTimeout(timer);
    }
  }, [copyStatus]);

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
    : "bg-slate-800/75 backdrop-blur-sm border border-slate-700/50 rounded-lg min-h-[20rem] flex flex-col";

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

## File: src/frontend/client.ts
```typescript
import { edenTreaty } from '@elysiajs/eden';
import type { App } from '../backend/server';
import { API_BASE_URL } from '../shared/constants';

// Use with the specific older version
export const client = edenTreaty<App>(API_BASE_URL);
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

## File: src/frontend/App.tsx
```typescript
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
