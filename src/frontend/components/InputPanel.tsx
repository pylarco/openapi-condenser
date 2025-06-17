import React, { useState, useCallback, useRef } from 'react';

interface InputPanelProps {
  setSpecContent: (content: string) => void;
  setFileName: (name: string) => void;
}

export const InputPanel: React.FC<InputPanelProps> = ({ setSpecContent, setFileName }) => {
  const [activeTab, setActiveTab] = useState<'paste' | 'upload'>('paste');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSpecContent(e.target?.result as string);
        setFileName(file.name);
      };
      reader.readAsText(file);
    }
  }, [setSpecContent, setFileName]);

  const handlePaste = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSpecContent(event.target.value);
    setFileName('spec.json'); // Assume json for pasted content
  }, [setSpecContent, setFileName]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg overflow-hidden">
      <div className="flex border-b border-slate-700/50">
        <button 
          onClick={() => setActiveTab('paste')} 
          className={`px-4 py-2 text-sm font-medium transition ${activeTab === 'paste' ? 'text-white bg-slate-700/50' : 'text-slate-400 hover:bg-slate-800/60'}`}
        >
          Paste Spec
        </button>
        <button 
          onClick={() => setActiveTab('upload')} 
          className={`px-4 py-2 text-sm font-medium transition ${activeTab === 'upload' ? 'text-white bg-slate-700/50' : 'text-slate-400 hover:bg-slate-800/60'}`}
        >
          Upload File
        </button>
      </div>
      <div className="p-1">
        {activeTab === 'paste' ? (
          <textarea
            onChange={handlePaste}
            placeholder="Paste your OpenAPI (JSON or YAML) spec here..."
            className="w-full h-64 bg-transparent text-slate-300 p-4 resize-none focus:outline-none placeholder-slate-500 font-mono text-sm"
          />
        ) : (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400">
            <button onClick={handleUploadClick} className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-6 rounded-lg transition-colors">
              Select OpenAPI File
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json,.yaml,.yml" />
            <p className="mt-4 text-sm">Supports .json, .yaml, and .yml</p>
          </div>
        )}
      </div>
    </div>
  );
};