import { useState, useCallback } from 'react';
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
      try {
        const parsedError = JSON.parse(apiError.value as any);
        if (parsedError && parsedError.errors) {
          setError(parsedError.errors.join('\\n'));
        } else {
          setError('An unknown error occurred.');
        }
      } catch (e) {
        setError(String(apiError.value) || 'An unknown error occurred.');
      }
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