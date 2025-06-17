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