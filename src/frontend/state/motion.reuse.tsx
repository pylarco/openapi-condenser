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
  const timeline = useRef(gsap.timeline({ paused: true }));

  useLayoutEffect(() => {
    if (!el.current) return;
    const knob = el.current.nextElementSibling?.nextElementSibling;
    const background = el.current.nextElementSibling;
    if (!knob || !background) return;

    timeline.current.clear().to(background, {
      backgroundColor: checked ? 'rgb(6 182 212)' : 'rgb(71 85 105)',
      duration: 0.2,
      ease: 'power2.inOut'
    }).to(knob, {
      x: checked ? 16 : 0,
      duration: 0.2,
      ease: 'power2.inOut'
    }, '<');
  }, []);

  useLayoutEffect(() => {
    timeline.current.play();
  }, [checked]);
} 