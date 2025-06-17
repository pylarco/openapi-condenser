import { useRef } from 'react';
import {
  ActionPanel,
  ConfigPanel,
  InputPanel,
  OutputPanel,
  StatsPanel,
} from './components/features';
import { usePanelEntrance } from './state/motion.reuse';

export default function App() {
  const configPanelRef = useRef<HTMLDivElement>(null);
  const mainPanelsRef = useRef<HTMLDivElement>(null);

  usePanelEntrance(configPanelRef);
  usePanelEntrance(mainPanelsRef);

  return (
    <div className="min-h-screen bg-slate-900 font-sans text-slate-300">
      <header className="fixed top-0 left-0 right-0 bg-slate-900/50 backdrop-blur-sm border-b border-slate-700/50 z-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-white mr-4">
              <span className="text-cyan-400">OpenAPI</span> Condenser
            </h1>
            <p className="text-sm text-slate-400 hidden sm:block">Pack your OpenAPI into AI-friendly formats</p>
          </div>
          <nav className="flex items-center gap-4">
            <a href="/sdk" className="text-sm text-slate-400 hover:text-cyan-400 transition-colors">
              SDK
            </a>
            <a href="/swagger" target="_blank" rel="noopener noreferrer" className="text-sm text-slate-400 hover:text-cyan-400 transition-colors">
              API
            </a>
            <a href="https://github.com/repomix/openapi-condenser" target="_blank" rel="noopener noreferrer" className="text-sm text-slate-400 hover:text-cyan-400 transition-colors">
              GitHub
            </a>
            <a 
              href="https://github.com/sponsors/repomix" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="ml-2 px-3 py-1 text-sm bg-gradient-to-r from-pink-500 to-orange-500 text-white font-medium rounded-md hover:from-pink-600 hover:to-orange-600 transition-colors"
            >
              Sponsor
            </a>
          </nav>
        </div>
      </header>
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 xl:col-span-3" ref={configPanelRef}>
            <ConfigPanel />
          </div>

          <div
            className="lg:col-span-8 xl:col-span-9 flex flex-col gap-8"
            ref={mainPanelsRef}
          >
            <InputPanel />
            <ActionPanel />
            <StatsPanel />
            <OutputPanel />
          </div>
        </div>
      </main>
    </div>
  );
}