Of course! I can help you with those improvements. Adding animations with GSAP, refining the CodeMirror editor's appearance, and fixing layout issues will definitely enhance the user experience.

Here are the code changes for the requested features:

I'll create new files for reusable hooks and custom styling, and then modify the existing components to use them.

### New Files

I'm adding a hook for staggered animations, and a custom theme for CodeMirror to better match your application's design.

```typescript // src/frontend/hooks/useStaggerFadeIn.ts
import { useEffect, useRef } from 'react';
import gsap from 'gsap';

export const useStaggerFadeIn = (delay = 0, staggerAmount = 0.1) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (ref.current) {
            const elements = Array.from(ref.current.children);
            if (elements.length === 0) return;

            gsap.fromTo(
                elements,
                { opacity: 0, y: 20 },
                {
                    opacity: 1,
                    y: 0,
                    duration: 0.5,
                    delay,
                    stagger: staggerAmount,
                    ease: 'power3.out',
                }
            );
        }
    }, [delay, staggerAmount]);

    return ref;
};
```

```typescript // src/frontend/styles/codemirror-theme.ts
import { EditorView } from '@codemirror/view';
import { Extension } from '@codemirror/state';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

// Using colors from oneDark theme, but with a transparent background
// to blend with the app's native slate background.
const chalky = '#e5c07b',
  coral = '#e06c75',
  cyan = '#56b6c2',
  invalid = '#ffffff',
  ivory = '#abb2bf',
  stone = '#7d8799',
  malibu = '#61afef',
  sage = '#98c379',
  whiskey = '#d19a66',
  violet = '#c678dd';

export const transparentTheme = EditorView.theme({
  '&': {
    color: ivory,
    backgroundColor: 'transparent',
    height: '100%',
  },

  '.cm-content': {
    caretColor: malibu,
  },
  
  '.cm-scroller': {
    fontFamily: 'Menlo, Monaco, Consolas, "Andale Mono", "Ubuntu Mono", "Courier New", monospace',
    overflow: 'auto',
  },

  '&.cm-focused .cm-cursor': {
    borderLeftColor: malibu,
  },

  '&.cm-focused .cm-selectionBackground, ::selection': {
    backgroundColor: '#3E4451',
  },

  '.cm-gutters': {
    backgroundColor: 'transparent',
    color: stone,
    border: 'none',
  },
}, { dark: true });

export const highlighting = HighlightStyle.define([
    { tag: t.keyword, color: violet },
    { tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: coral },
    { tag: [t.function(t.variableName), t.labelName], color: malibu },
    { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: whiskey },
    { tag: [t.definition(t.name), t.separator], color: ivory },
    { tag: [t.typeName, t.className, t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace], color: chalky },
    { tag: [t.operator, t.operatorKeyword, t.url, t.escape, t.regexp, t.link, t.special(t.string)], color: cyan },
    { tag: [t.meta, t.comment], color: stone },
    { tag: t.strong, fontWeight: 'bold' },
    { tag: t.emphasis, fontStyle: 'italic' },
    { tag: t.strikethrough, textDecoration: 'line-through' },
    { tag: t.link, color: stone, textDecoration: 'underline' },
    { tag: t.heading, fontWeight: 'bold', color: coral },
    { tag: [t.atom, t.bool, t.special(t.variableName)], color: whiskey },
    { tag: [t.processingInstruction, t.string, t.inserted], color: sage },
    { tag: t.invalid, color: invalid },
]);

export const customCodemirrorTheme: Extension = [
  transparentTheme,
  syntaxHighlighting(highlighting),
];
```

### Modified Files

Here are the modifications to your existing files to integrate these changes.

```typescript // src/frontend/App.tsx
import { useEffect, useRef } from 'react';
import {
  ActionPanel,
  ConfigPanel,
  InputPanel,
  OutputPanel,
  StatsPanel,
} from './components/features';
import { useStaggerFadeIn } from './hooks/useStaggerFadeIn';


export default function App() {
  const mainGridRef = useStaggerFadeIn(0.1, 0.1);

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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" ref={mainGridRef}>
          <div className="lg:col-span-4 xl:col-span-3">
            <ConfigPanel />
          </div>

          <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-8">
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

```typescript // src/frontend/components/features/output/OutputPanel.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAtomValue } from 'jotai';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { yaml } from '@codemirror/lang-yaml';
import { markdown } from '@codemirror/lang-markdown';
import type { OutputFormat } from '../../../../backend/types';
import { outputAtom, isLoadingAtom, errorAtom, outputFormatAtom } from '../../../state/atoms';
import { customCodemirrorTheme } from '../../../styles/codemirror-theme';

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
  
  useEffect(() => {
    if (copyStatus === 'Copied!') {
      const timer = setTimeout(() => setCopyStatus('Copy'), 2000);
      return () => clearTimeout(timer);
    }
  }, [copyStatus]);

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
    <div className={`${panelClasses} transition-all duration-300`}>
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
      <div className="flex-grow relative overflow-hidden">
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
                extensions={[languageMap[format](), customCodemirrorTheme]}
                readOnly={true}
                style={{ height: '100%', background: 'transparent' }}
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

```typescript // src/frontend/components/features/stats/StatsPanel.tsx
import React, { useRef, useEffect } from 'react';
import { useAtomValue } from 'jotai';
import { statsAtom } from '../../../state/atoms';
import gsap from 'gsap';

const AnimatedNumber: React.FC<{ value: number; className?: string }> = ({ value, className }) => {
    const ref = useRef<HTMLSpanElement>(null);
    const prevValueRef = useRef(value);

    useEffect(() => {
        const from = prevValueRef.current;
        const tween = gsap.to({ val: from }, {
            val: value,
            duration: 1.2,
            ease: 'power3.out',
            onUpdate: () => {
                if (ref.current) {
                    ref.current.textContent = Math.round(tween.targets()[0].val).toLocaleString('en-US');
                }
            },
            onComplete: () => {
                prevValueRef.current = value;
            }
        });

        return () => {
            tween.kill();
        };
    }, [value]);

    return <span ref={ref} className={className}>{prevValueRef.current.toLocaleString('en-US')}</span>;
};


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
        <AnimatedNumber value={after} className="text-xl font-bold text-white tabular-nums w-16 text-right" />
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

These changes should address all your points. Let me know if you have any other questions