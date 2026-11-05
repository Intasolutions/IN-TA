import type { RefObject } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { calm } from './data';

const LIFT = -6;

/**
 * Call inside a gsap context. Each card tilts up into place as the scroll reaches it, a curtain wipes off its cover and
 * its words follow; a little later across each row. All of it goes back when the scroll does.
 */
export function revealCards() {
  const scrub = window.matchMedia('(pointer: fine)').matches ? true : 0.3;
  gsap.utils.toArray<HTMLElement>('[data-blog="rise"]').forEach((card, i) => {
    const later = (i % 3) * 4;
    gsap
      .timeline({ scrollTrigger: { trigger: card, start: `top ${102 - later}%`, end: `top ${68 - later}%`, scrub } })
      .fromTo(card, { y: 64, scale: 0.95, rotationX: 10, transformPerspective: 1100, transformOrigin: '50% 100%', autoAlpha: 0 }, { y: 0, scale: 1, rotationX: 0, autoAlpha: 1, ease: 'power2.out', duration: 1 }, 0)
      .fromTo(card.querySelector('[data-card="curtain"]'), { scaleY: 1 }, { scaleY: 0, ease: 'power2.inOut', duration: 0.7 }, 0.25)
      .fromTo(card.querySelectorAll('[data-card="text"] > *'), { y: 16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, ease: 'power1.out', duration: 0.4, stagger: 0.06 }, 0.45);
  });
}

/** With a mouse: whatever is marked data-tilt lifts and leans towards the cursor, with a soft light (data-spot) following it */
export function useCardHover(root: RefObject<HTMLElement | null>) {
  useGSAP(
    () => {
      if (calm() || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
      const el = root.current!;
      const follow = (target: Element, prop: string, duration: number) => gsap.quickTo(target, prop, { duration, ease: 'power3.out' });
      const make = (card: HTMLElement) => {
        const spot = card.querySelector('[data-spot]')!;
        gsap.set(card, { transformPerspective: 1000 });
        gsap.set(spot, { xPercent: -50, yPercent: -50 });
        return {
          card,
          most: Number(card.dataset.tilt) || 4,
          tiltX: follow(card, 'rotationX', 0.5),
          tiltY: follow(card, 'rotationY', 0.5),
          lift: follow(card, 'y', 0.35),
          spotX: follow(spot, 'x', 0.35),
          spotY: follow(spot, 'y', 0.35),
        };
      };
      type Live = ReturnType<typeof make>;
      const known = new WeakMap<HTMLElement, Live>();
      let active: Live | null = null;

      const settle = () => {
        if (!active) return;
        active.tiltX(0);
        active.tiltY(0);
        active.lift(0);
        active = null;
      };
      const onMove = (e: PointerEvent) => {
        if (e.pointerType !== 'mouse') return;
        const card = (e.target as Element).closest<HTMLElement>('[data-tilt]');
        if (!card) {
          settle();
          return;
        }
        const live = known.get(card) ?? make(card);
        known.set(card, live);
        if (active !== live) settle();
        active = live;
        const box = card.getBoundingClientRect();
        live.tiltY(((e.clientX - box.left) / box.width - 0.5) * 2 * live.most);
        live.tiltX(((e.clientY - box.top) / box.height - 0.5) * -2 * live.most);
        live.lift(LIFT);
        live.spotX(e.clientX - box.left);
        live.spotY(e.clientY - box.top);
      };
      el.addEventListener('pointermove', onMove, { passive: true });
      el.addEventListener('pointerleave', settle);
      window.addEventListener('scroll', settle, { passive: true });
      return () => {
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerleave', settle);
        window.removeEventListener('scroll', settle);
      };
    },
    { scope: root },
  );
}
