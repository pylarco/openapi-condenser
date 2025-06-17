import React, { useRef } from 'react';
import { Tooltip } from './Tooltip';
import { useSwitchAnimation } from '../../state/motion.reuse';

export const Switch: React.FC<{ label: string; checked: boolean; onChange: (checked: boolean) => void; tooltip?: string }> = React.memo(({ label, checked, onChange, tooltip }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    useSwitchAnimation(inputRef, checked);

    return (
        <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-slate-300 flex items-center gap-2">
                {label}
                {tooltip && (
                    <Tooltip text={tooltip}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </Tooltip>
                )}
            </span>
            <div className="relative">
                <input ref={inputRef} type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
                <div className="block w-10 h-6 rounded-full bg-slate-600"></div>
                <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full"></div>
            </div>
        </label>
    )
});