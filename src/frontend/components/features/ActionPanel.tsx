import React, { useRef } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { isLoadingAtom, condenseSpecAtom, specContentAtom, outputAtom } from '../../state/atoms';
import { useButtonHover } from '../../state/motion.reuse';
import { Spinner } from '../ui';

export const ActionPanel: React.FC = () => {
    const isLoading = useAtomValue(isLoadingAtom);
    const specContent = useAtomValue(specContentAtom);
    const output = useAtomValue(outputAtom);
    const onCondense = useSetAtom(condenseSpecAtom);
    const buttonRef = useRef<HTMLButtonElement>(null);
    useButtonHover(buttonRef);

    return (
        <button 
            ref={buttonRef}
            onClick={() => onCondense()}
            disabled={isLoading || !specContent}
            className="w-full bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 flex items-center justify-center"
        >
            {isLoading ? (
                <Spinner className="-ml-1 mr-3 h-5 w-5 text-white" />
            ) : output ? 'Re-condense' : 'Condense'}
        </button>
    );
}