import React, { useRef } from 'react';
import { Tooltip } from './Tooltip';
import { useInputFocus } from '../../state/motion.reuse';

export const TextInput: React.FC<{ label: string; value: string[] | undefined; onChange: (value: string[]) => void; placeholder: string; tooltip?: string; }> = React.memo(({ label, value, onChange, placeholder, tooltip }) => {
    const inputRef = useRef<HTMLDivElement>(null);
    useInputFocus(inputRef);

    return (
        <div ref={inputRef}>
            <label className="block text-sm text-slate-300 mb-1 flex items-center gap-2">
                {label}
                {tooltip && (
                    <Tooltip text={tooltip}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </Tooltip>
                )}
            </label>
            <input
                type="text"
                placeholder={placeholder}
                value={value?.join(', ')}
                onChange={(e) => onChange(e.target.value ? e.target.value.split(',').map(s => s.trim()).filter(Boolean) : [])}
                className="w-full bg-slate-700/50 border border-slate-600 rounded-md px-3 py-2 text-sm text-white placeholder-slate-400 outline-none transition"
            />
        </div>
    )
}); 