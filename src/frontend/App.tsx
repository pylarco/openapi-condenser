import { useState, useCallback, useRef, useMemo } from 'react';
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
    removeSummaries: false,
    includeServers: true,
    includeInfo: true,
  },
};

type Stats = {
  before: SpecStats;
  after: SpecStats;
}

export default function App() {
  const specContentRef = useRef('');
  const fileNameRef = useRef('spec.json');
  
  const [config, setConfig] = useState(defaultConfig);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('markdown');
  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);

  const setSpecContent = useCallback((content: string) => {
    specContentRef.current = content;
  }, []);

  const setFileName = useCallback((name: string) => {
    fileNameRef.current = name;
  }, []);
  
  const setOutputFormatCallback = useCallback((format: OutputFormat) => {
    setOutputFormat(format);
  }, []);

  const handleCondense = useCallback(async () => {
    if (!specContentRef.current) {
      setError('Please provide an OpenAPI specification.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setOutput('');
    setStats(null);

    const payload = {
      source: {
        content: specContentRef.current,
        path: fileNameRef.current,
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
        if (data.stats) {
          // Ensure stats values are valid numbers, especially for markdown mode
          const normalizeStats = (stats: any) => {
            if (!stats) return stats;
            
            // Process 'before' stats
            if (stats.before) {
              stats.before = {
                paths: Number(stats.before.paths) || 0,
                operations: Number(stats.before.operations) || 0,
                schemas: Number(stats.before.schemas) || 0,
                charCount: Number(stats.before.charCount) || 0,
                lineCount: Number(stats.before.lineCount) || 0,
                tokenCount: Number(stats.before.tokenCount) || 0,
              };
            }
            
            // Process 'after' stats
            if (stats.after) {
              stats.after = {
                paths: Number(stats.after.paths) || 0,
                operations: Number(stats.after.operations) || 0,
                schemas: Number(stats.after.schemas) || 0,
                charCount: Number(stats.after.charCount) || 0,
                lineCount: Number(stats.after.lineCount) || 0,
                tokenCount: Number(stats.after.tokenCount) || 0,
              };
            }
            
            return stats;
          };
          
          setStats(normalizeStats(data.stats));
        }
      }
    } catch (err) {
      setError(`Failed to process request: ${err instanceof Error ? err.message : String(err)}`);
    }

    setIsLoading(false);
  }, [config, outputFormat]);
  
  // Use memoized config to prevent unnecessary re-renders
  const memoizedConfig = useMemo(() => config, [config]);
  
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
              config={memoizedConfig} 
              setConfig={setConfig} 
              outputFormat={outputFormat}
              setOutputFormat={setOutputFormatCallback}
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