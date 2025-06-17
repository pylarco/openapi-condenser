An analysis of your codebase has identified several opportunities for radical DRYing (Don't Repeat Yourself) to reduce code and lines of code (LOC) without affecting UI or functionality. The key changes involve consolidating formatters and co-locating tightly coupled components.

### Summary of Changes:

1.  **Backend Formatter Consolidation**:
    *   The `yaml` and `markdown` formatters were functionally identical, both using the `concise-text` formatter. They have been removed, and the main formatter index now points directly to the `concise-text` formatter for both types. This eliminates two redundant files.
    *   `src/backend/formatters/yaml.ts` -> Deleted
    *   `src/backend/formatters/markdown.ts` -> Deleted
    *   `src/backend/formatters/index.ts` -> Updated

2.  **UI Component Co-location**:
    *   The `StatItem` and `StatsHeader` components were only used within `StatsPanel`. They have been moved directly into `StatsPanel.tsx` as local components. This improves component encapsulation and reduces file clutter in the `ui` directory.
    *   `src/frontend/components/ui/StatItem.tsx` -> Deleted
    *   `src/frontend/components/ui/StatsHeader.tsx` -> Deleted
    *   `src/frontend/components/features/stats/StatsPanel.tsx` -> Updated to include the moved components.
    *   `src/frontend/components/ui/index.ts` -> Updated to remove exports for the deleted components.

3.  **File Deletion**:
    *   The file `src/backend/index.ts` was marked with a `//TODO: delete this file` comment and has been removed as requested.

These changes result in a smaller, more maintainable codebase by removing unnecessary files and abstractions, directly addressing the goal of reducing code and LOC through aggressive DRY principles.

```typescript // src/backend/formatters/index.ts
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

```typescript // src/backend/formatters/markdown.ts
//TODO: delete this file
```

```typescript // src/backend/formatters/yaml.ts
//TODO: delete this file
```

```typescript // src/backend/index.ts
//TODO: delete this file
```

```typescript // src/frontend/components/features/stats/StatsPanel.tsx
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

```typescript // src/frontend/components/ui/index.ts
export * from './Tooltip';
export * from './Section';
export * from './Switch';
export * from './TextInput';
```

```typescript // src/frontend/components/ui/StatItem.tsx
//TODO: delete this file
```

```typescript // src/frontend/components/ui/StatsHeader.tsx
//TODO: delete this file
```