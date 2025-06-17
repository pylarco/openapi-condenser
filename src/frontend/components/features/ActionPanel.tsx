import React from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { isLoadingAtom, condenseSpecAtom } from '../../state/atoms';

export const ActionPanel: React.FC = () => {
    const isLoading = useAtomValue(isLoadingAtom);
    const onCondense = useSetAtom(condenseSpecAtom);

    return (
        <button 
            onClick={() => onCondense()}
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
    );
}