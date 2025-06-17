import React, { useState, useEffect, useRef } from 'react';
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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (copyStatus === 'Copied!') {
      const timer = setTimeout(() => setCopyStatus('Copy'), 2000);
      return () => clearTimeout(timer);
    }
  }, [copyStatus]);

  useEffect(() => {
    const lineCount = output.split('\n').length;
    const container = scrollContainerRef.current;

    if (lineCount > 100 && container) {
      const handleScroll = () => {
        // Trigger fullscreen on first scroll action
        if (container.scrollTop > 0 && !isFullScreen) {
          setIsFullScreen(true);
        }
      };
      container.addEventListener('scroll', handleScroll, { once: true });
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [output, isFullScreen]);

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
    ? "fixed inset-0 z-50 bg-slate-900 flex flex-col"
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
            <SyntaxHighlighter language={languageMap[format]} style={vscDarkPlus} customStyle={{ background: 'transparent', margin: 0, padding: '1rem', height: '100%', minHeight: '100%' }} codeTagProps={{style:{fontFamily: 'monospace'}}} wrapLines={true} showLineNumbers>
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