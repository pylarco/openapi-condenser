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
    <div className="sticky top-24 p-6 bg-slate-800 border border-slate-700 rounded-lg">
      <Section title="Output Format">
        <select 
            value={outputFormat}
            onChange={(e) => setOutputFormat(e.target.value as OutputFormat)}
            className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-sm text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition"
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