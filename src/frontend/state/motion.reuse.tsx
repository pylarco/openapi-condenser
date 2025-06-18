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
  const tl = useRef<gsap.core.Timeline>();
  const isInitialMount = useRef(true);

  // This effect runs once to create the timeline.
  useLayoutEffect(() => {
    if (!el.current) return;
    const knob = el.current.nextElementSibling?.nextElementSibling;
    const background = el.current.nextElementSibling;
    if (!knob || !background) return;

    tl.current = gsap.timeline({ paused: true })
      .to(background, { backgroundColor: 'rgb(6 182 212)', duration: 0.2, ease: 'power2.inOut' })
      .to(knob, { x: 16, duration: 0.2, ease: 'power2.inOut' }, '<');
      
    return () => { tl.current?.kill() };
  }, [el]);

  // This effect controls the animation based on the `checked` state.
  useLayoutEffect(() => {
    if (tl.current) {
      if (isInitialMount.current) {
        // On first render, just set the state, don't animate
        tl.current.progress(checked ? 1 : 0);
        isInitialMount.current = false;
      } else {
        // On subsequent renders, animate
        if (checked) {
          tl.current.play();
        } else {
          tl.current.reverse();
        }
      }
    }
  }, [checked]);
}