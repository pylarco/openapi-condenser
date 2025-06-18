Of course! I'll fix the animation bug with the transformation toggle switches and add the scroll-to-top/bottom buttons for you. Here are the code changes:

### 1. Fixing the Switch Animation

The animation bug was due to how the animation timeline was being created and managed, especially when the component re-rendered. I've replaced it with a more robust and simpler implementation that is not affected by parent component re-renders. I've also removed `React.memo` from the `Switch` component as it was ineffective with the previous setup and is no longer necessary with the fix.

### 2. Adding Scroll Buttons

I've added two floating buttons to the main application view:
- A "scroll to top" button that appears when you scroll down the page.
- A "scroll to bottom" button that is visible until you reach the end of the page.

These will improve navigation on long pages with extensive output.

Here are the complete changes for the affected files:

```typescript // src/frontend/App.tsx
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
```

```typescript // src/frontend/components/ui/Switch.tsx
import React, { useRef } from 'react';
import { InfoTooltip } from './InfoTooltip';
import { useSwitchAnimation } from '../../state/motion.reuse';

export const Switch: React.FC<{ label: string; checked: boolean; onChange: (checked: boolean) => void; tooltip?: string }> = ({ label, checked, onChange, tooltip }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    useSwitchAnimation(inputRef, checked);

    return (
        <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-slate-300 flex items-center gap-2">
                {label}
                {tooltip && <InfoTooltip text={tooltip} />}
            </span>
            <div className="relative">
                <input ref={inputRef} type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
                <div className="block w-10 h-6 rounded-full bg-slate-600"></div>
                <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full"></div>
            </div>
        </label>
    )
};
```

```typescript // src/frontend/state/motion.reuse.tsx
import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'

export const usePanelEntrance = (el: React.RefObject<HTMLElement>) => {
  useLayoutEffect(() => {
    if (!el.current) return

    gsap.from(el.current, {
      opacity: 0,
      y: 50,
      duration: 0.5,
      ease: 'power3.out',
    })
  }, [el])
}

export const useButtonHover = (el: React.RefObject<HTMLElement>) => {
  useLayoutEffect(() => {
    if (!el.current) return;
    const tl = gsap.timeline({ paused: true });
    tl.to(el.current, { scale: 1.05, duration: 0.2, ease: 'power2.out' });

    const onEnter = () => tl.play();
    const onLeave = () => tl.reverse();

    el.current.addEventListener('mouseenter', onEnter);
    el.current.addEventListener('mouseleave', onLeave);

    return () => {
      el.current?.removeEventListener('mouseenter', onEnter);
      el.current?.removeEventListener('mouseleave', onLeave);
    }
  }, [el]);
}

export const useInputFocus = (el: React.RefObject<HTMLElement>) => {
  useLayoutEffect(() => {
    if (!el.current) return;

    const input = el.current.querySelector('input, textarea');
    if (!input) return;

    const tl = gsap.timeline({ paused: true });
    tl.to(el.current, {
      boxShadow: '0 0 0 2px rgba(34, 211, 238, 0.5)',
      borderColor: 'rgb(34 211 238)',
      duration: 0.2,
      ease: 'power2.out'
    });

    const onFocus = () => tl.play();
    const onBlur = () => tl.reverse();

    input.addEventListener('focus', onFocus);
    input.addEventListener('blur', onBlur);

    return () => {
      input.removeEventListener('focus', onFocus);
      input.removeEventListener('blur', onBlur);
    }
  }, [el]);
}

export const useSwitchAnimation = (el: React.RefObject<HTMLInputElement>, checked: boolean) => {
  const isInitialMount = useRef(true);

  useLayoutEffect(() => {
    if (!el.current) return;
    const knob = el.current.nextElementSibling?.nextElementSibling;
    const background = el.current.nextElementSibling;
    if (!knob || !background) return;

    // The color for bg-slate-600 from tailwind config
    const offColor = 'rgb(71 85 105)'; 
    // The color for bg-cyan-500 from the original timeline animation
    const onColor = 'rgb(6 182 212)';

    if (isInitialMount.current) {
      // On first render, just set the state, don't animate
      gsap.set(knob, { x: checked ? 16 : 0 });
      gsap.set(background, { backgroundColor: checked ? onColor : offColor });
      isInitialMount.current = false;
    } else {
      // On subsequent renders, animate
      gsap.to(knob, { x: checked ? 16 : 0, duration: 0.2, ease: 'power2.inOut' });
      gsap.to(background, { backgroundColor: checked ? onColor : offColor, duration: 0.2, ease: 'power2.inOut' });
    }
  }, [checked, el]);
};
```