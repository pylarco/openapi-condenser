import React, { useRef } from 'react';
import { InfoTooltip } from './InfoTooltip';
import { useInputFocus } from '../../state/motion.reuse';

export const TextInput: React.FC<{ label: string; value: string[] | undefined; onChange: (value: string[]) => void; placeholder: string; tooltip?: string; }> = React.memo(({ label, value, onChange, placeholder, tooltip }) => {
    const inputRef = useRef<HTMLDivElement>(null);
    useInputFocus(inputRef);

    return (
        <div ref={inputRef}>
            <label className="block text-sm text-slate-300 mb-1 flex items-center gap-2">
                {label}
                {tooltip && <InfoTooltip text={tooltip} />}
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