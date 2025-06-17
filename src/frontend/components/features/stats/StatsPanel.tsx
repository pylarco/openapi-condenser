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