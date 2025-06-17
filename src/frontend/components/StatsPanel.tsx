import React, { useMemo } from 'react';
import type { SpecStats } from '../../backend/types';

interface StatsPanelProps {
  stats: {
    before: SpecStats;
    after: SpecStats;
  } | null;
}

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

export const StatsPanel: React.FC<StatsPanelProps> = ({ stats }) => {
  if (!stats) return null;
  
  // Ensure stats values are numbers for accurate calculations
  const normalizedStats = useMemo(() => {
    const normalize = (stat: SpecStats): SpecStats => {
      return {
        paths: Number(stat.paths) || 0,
        operations: Number(stat.operations) || 0,
        schemas: Number(stat.schemas) || 0,
        charCount: Number(stat.charCount) || 0,
        lineCount: Number(stat.lineCount) || 0,
        tokenCount: Number(stat.tokenCount) || 0
      };
    };
    
    return {
      before: normalize(stats.before),
      after: normalize(stats.after)
    };
  }, [stats]);

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Condensation Stats</h3>
      <div className="flex justify-between items-center text-xs text-slate-400 font-medium mb-2 px-2">
        <span>Metric</span>
        <div className="flex items-center gap-4 w-[320px] justify-end">
          <span className='w-16 text-right'>Before</span>
          <span className='w-16 text-right'>After</span>
          <span className="w-32 text-right">Change / Reduction</span>
        </div>
      </div>
      <div className="divide-y divide-slate-700/50">
        <StatItem label="Paths" before={normalizedStats.before.paths} after={normalizedStats.after.paths} />
        <StatItem label="Operations" before={normalizedStats.before.operations} after={normalizedStats.after.operations} />
        <StatItem label="Schemas" before={normalizedStats.before.schemas} after={normalizedStats.after.schemas} />
      </div>
      <div className="divide-y divide-slate-700/50 pt-2 mt-2 border-t border-slate-700/50">
        <StatItem label="Characters" before={normalizedStats.before.charCount} after={normalizedStats.after.charCount} />
        <StatItem label="Lines" before={normalizedStats.before.lineCount} after={normalizedStats.after.lineCount} />
        <StatItem label="Tokens (est.)" before={normalizedStats.before.tokenCount} after={normalizedStats.after.tokenCount} />
      </div>
    </div>
  );
};