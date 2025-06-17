import React from 'react';

export const StatsHeader: React.FC = () => (
  <div className="flex justify-between items-center text-xs text-slate-400 font-medium mb-2 px-2">
    <span>Metric</span>
    <div className="flex items-center gap-4 w-[320px] justify-end">
      <span className="w-16 text-right">Before</span>
      <span className="w-16 text-right">After</span>
      <span className="w-32 text-right">Change / Reduction</span>
    </div>
  </div>
); 