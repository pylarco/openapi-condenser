import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import { useSetAtom, useAtom } from 'jotai';
import { client } from '../../../client';
import { specContentAtom, fileNameAtom } from '../../../state/atoms';
import { 
  INPUT_DEBOUNCE_DELAY, 
  URL_FETCH_DEBOUNCE_DELAY,
  DEFAULT_SPEC_FILENAME,
  DEFAULT_URL_FILENAME
} from '../../../constants';

interface InputPanelProps {
  // No props needed after Jotai integration
}

const TabButton = memo<{tab: 'paste' | 'upload' | 'url', activeTab: 'paste' | 'upload' | 'url', onClick: (tab: 'paste' | 'upload' | 'url') => void, children: React.ReactNode}>(
  ({ tab, activeTab, onClick, children }) => (
    <button
      onClick={() => onClick(tab)}
      className={`px-4 py-2 text-sm font-medium transition ${activeTab === tab ? 'text-white bg-slate-700/50' : 'text-slate-400 hover:bg-slate-800/60'}`}
    >
      {children}
    </button>
  )
);

export const InputPanel: React.FC<InputPanelProps> = () => {
  const [specContent, setSpecContent] = useAtom(specContentAtom);
  const setFileName = useSetAtom(fileNameAtom);

  const [activeTab, setActiveTab] = useState<'paste' | 'upload' | 'url'>('paste');
  const [url, setUrl] = useState('');
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [localSpecContent, setLocalSpecContent] = useState(specContent);

  // Debounce effect for spec content
  useEffect(() => {
    const handler = setTimeout(() => {
      if (specContent !== localSpecContent) {
        setSpecContent(localSpecContent);
      }
    }, INPUT_DEBOUNCE_DELAY);

    return () => {
      clearTimeout(handler);
    };
  }, [localSpecContent, specContent, setSpecContent]);

  // When global state changes (e.g., from file upload or URL fetch), update local state
  useEffect(() => {
    if (specContent !== localSpecContent) {
        setLocalSpecContent(specContent);
    }
  }, [specContent]);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setSpecContent(content);
        if (textareaRef.current) {
          textareaRef.current.value = content;
        }
        setFileName(file.name);
        setFetchError(null);
      };
      reader.readAsText(file);
    }
  }, [setSpecContent, setFileName]);

  const handlePasteChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalSpecContent(event.target.value);
    setFileName(DEFAULT_SPEC_FILENAME); // Assume json for pasted content
    setFetchError(null);
    setUploadedFileName(null);
  }, [setFileName]);
  
  const handleTabClick = useCallback((tab: 'paste' | 'upload' | 'url') => {
    setActiveTab(tab);
  }, []);
  
  const handleUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
  }, []);

  useEffect(() => {
    const fetchSpecFromUrl = async () => {
      if (!url) {
        setFetchError(null);
        return;
      }

      try {
        new URL(url);
      } catch {
        setFetchError('Invalid URL format.');
        return;
      }

      setIsFetching(true);
      setFetchError(null);
      setUploadedFileName(null);

      try {
        const { data, error } = await client.api['fetch-spec'].get({ $query: { url } });

        if (error) {
          let errorMessage = 'Failed to fetch the spec.';
          const errorValue = error.value as any;
          if (typeof errorValue === 'object' && errorValue !== null) {
            errorMessage = errorValue.error || (typeof errorValue.message === 'string' ? errorValue.message : errorMessage);
          }
          setFetchError(errorMessage);
        } else if (data) {
          setSpecContent(data.content);
          if (textareaRef.current) {
              textareaRef.current.value = data.content;
          }
          try {
            const urlObject = new URL(url);
            setFileName(urlObject.pathname.split('/').pop() || DEFAULT_URL_FILENAME);
          } catch {
            setFileName(DEFAULT_URL_FILENAME);
          }
        }
      } catch (err) {
        setFetchError(`Request failed: ${err instanceof Error ? err.message : String(err)}`);
      }
      
      setIsFetching(false);
    };

    if (activeTab === 'url') {
      const handler = setTimeout(() => {
        fetchSpecFromUrl();
      }, URL_FETCH_DEBOUNCE_DELAY);

      return () => clearTimeout(handler);
    }
  }, [url, activeTab, setSpecContent, setFileName]);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg overflow-hidden">
      <div className="flex border-b border-slate-700/50">
        <TabButton tab="paste" activeTab={activeTab} onClick={handleTabClick}>Paste Spec</TabButton>
        <TabButton tab="upload" activeTab={activeTab} onClick={handleTabClick}>Upload File</TabButton>
        <TabButton tab="url" activeTab={activeTab} onClick={handleTabClick}>From URL</TabButton>
      </div>
      <div className="p-1">
        {activeTab === 'paste' && (
          <textarea
            ref={textareaRef}
            value={localSpecContent}
            onChange={handlePasteChange}
            placeholder="Paste your OpenAPI (JSON or YAML) spec here..."
            className="w-full h-64 bg-transparent text-slate-300 p-4 resize-none focus:outline-none placeholder-slate-500 font-mono text-sm"
          />
        )}
        {activeTab === 'upload' && (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json,.yaml,.yml" />
            <button onClick={handleUploadClick} className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-6 rounded-lg transition-colors">
              Select OpenAPI File
            </button>
            {uploadedFileName && <p className="mt-4 text-sm text-slate-300">Selected: <span className="font-medium">{uploadedFileName}</span></p>}
            {!uploadedFileName && <p className="mt-4 text-sm">Supports .json, .yaml, and .yml</p>}
          </div>
        )}
        {activeTab === 'url' && (
          <div className="h-64 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md">
              <label htmlFor="url-input" className="block text-sm font-medium text-slate-300 mb-2">
                Enter public URL to an OpenAPI spec
              </label>
              <div className="relative flex items-center">
                <input
                  id="url-input"
                  type="url"
                  value={url}
                  onChange={handleUrlChange}
                  placeholder="https://petstore3.swagger.io/api/v3/openapi.json"
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-md pl-3 pr-10 py-2 text-sm text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition"
                />
                {isFetching && (
                    <div className="absolute right-3">
                        <svg className="animate-spin h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    </div>
                )}
              </div>
              {fetchError && <p className="mt-2 text-sm text-red-400">{fetchError}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};