import { useRef, useState, useEffect, useCallback } from 'react';
import {
  ActionPanel,
  ConfigPanel,
  InputPanel,
  OutputPanel,
  StatsPanel,
} from './components/features';
import { usePanelEntrance } from './state/motion.reuse';
import { APP_SUBTITLE, APP_TITLE, NAV_LINKS } from './constants';

export default function App() {
  const configPanelRef = useRef<HTMLDivElement>(null);
  const mainPanelsRef = useRef<HTMLDivElement>(null);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(true);

  usePanelEntrance(configPanelRef);
  usePanelEntrance(mainPanelsRef);

  const handleScroll = useCallback(() => {
    const scrollThreshold = 400;
    const bottomThreshold = 20;

    setShowScrollToTop(window.scrollY > scrollThreshold);

    const isAtBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - bottomThreshold;
    setShowScrollToBottom(!isAtBottom);
  }, []);

  useEffect(() => {
      window.addEventListener('scroll', handleScroll, { passive: true });
      handleScroll(); // Initial check
      return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  const scrollToBottom = () => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });

  return (
    <div className="min-h-screen bg-slate-900 font-sans text-slate-300">
      <header className="fixed top-0 left-0 right-0 bg-slate-900/50 backdrop-blur-sm border-b border-slate-700/50 z-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-white mr-4">
              <span className="text-cyan-400">{APP_TITLE.split(' ')[0]}</span> {APP_TITLE.split(' ')[1]}
            </h1>
            <p className="text-sm text-slate-400 hidden sm:block">{APP_SUBTITLE}</p>
          </div>
          <nav className="flex items-center gap-4">
            <a href={NAV_LINKS.SDK} className="text-sm text-slate-400 hover:text-cyan-400 transition-colors">
              SDK
            </a>
            <a href={NAV_LINKS.API} target="_blank" rel="noopener noreferrer" className="text-sm text-slate-400 hover:text-cyan-400 transition-colors">
              API
            </a>
            <a href={NAV_LINKS.GITHUB} target="_blank" rel="noopener noreferrer" className="text-sm text-slate-400 hover:text-cyan-400 transition-colors">
              GitHub
            </a>
            <a 
              href={NAV_LINKS.SPONSOR} 
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
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        {showScrollToTop && (
            <button 
                onClick={scrollToTop} 
                className="p-3 bg-cyan-500/80 hover:bg-cyan-500 text-white rounded-full shadow-lg transition-all hover:scale-110 backdrop-blur-sm"
                aria-label="Scroll to top"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                </svg>
            </button>
        )}
        {showScrollToBottom && (
            <button 
                onClick={scrollToBottom} 
                className="p-3 bg-cyan-500/80 hover:bg-cyan-500 text-white rounded-full shadow-lg transition-all hover:scale-110 backdrop-blur-sm"
                aria-label="Scroll to bottom"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
            </button>
        )}
      </div>
    </div>
  );
}