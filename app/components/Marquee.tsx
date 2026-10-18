'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const ITEMS = [
  'Custom Software',
  'Web Platforms',
  'Mobile Apps',
  'AI Integration',
  'ERP Systems',
  'UI/UX Design',
  'SaaS Products',
  'Cloud & DevOps',
];

function Row({ hidden = false }: { hidden?: boolean }) {
  return (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 items-center">
      {ITEMS.map((item, i) => (
        <li key={item} className="flex items-center">
          <span className={`transition-colors duration-300 hover:text-brand-blue ${i % 2 === 0 ? 'text-midnight' : 'text-midnight/55'}`}>
            {item}
          </span>
          <span aria-hidden="true" className="mx-6 sm:mx-10 text-brand-blue">✦</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Services ticker at the foot of the hero. Transparent, so the hero's background animation runs behind it.
 * Drifts on its own, speeds up with scroll velocity, follows scroll direction, and eases down on hover.
 */
export default function Marquee() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const wrap = wrapRef.current;
      const track = trackRef.current;
      if (!wrap || !track) return;

      const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const BASE_SPEED = calm ? 14 : 55; // px per second
      const setX = gsap.quickSetter(track, 'x', 'px');
      const pace = { v: 1 }; // eased down while hovered

      let x = 0;
      let dir = -1; // -1 = moving left
      let boost = 0;
      let rowWidth = track.offsetWidth / 2; // two identical copies → loop by one copy's width
      let onScreen = true;

      const tick = (_time: number, deltaMs: number) => {
        if (!onScreen) return;
        const dt = Math.min(deltaMs, 50) / 1000;
        x += (BASE_SPEED + boost) * dir * pace.v * dt;
        if (x <= -rowWidth) x += rowWidth;
        if (x > 0) x -= rowWidth;
        setX(x);
        boost *= 0.94;
      };
      gsap.ticker.add(tick);

      const scroll = calm
        ? null
        : ScrollTrigger.create({
            trigger: wrap,
            start: 'top bottom',
            end: 'bottom top',
            onUpdate: (self) => {
              boost = Math.min(Math.abs(self.getVelocity()) / 3, 900);
              dir = self.direction === 1 ? -1 : 1;
            },
          });

      const ro = new ResizeObserver(() => { rowWidth = track.offsetWidth / 2; });
      ro.observe(track);
      const io = new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; });
      io.observe(wrap);

      const onEnter = () => gsap.to(pace, { v: 0.15, duration: 0.6, ease: 'power2.out', overwrite: true });
      const onLeave = () => gsap.to(pace, { v: 1, duration: 0.6, ease: 'power2.out', overwrite: true });
      wrap.addEventListener('pointerenter', onEnter);
      wrap.addEventListener('pointerleave', onLeave);

      return () => {
        gsap.ticker.remove(tick);
        scroll?.kill();
        ro.disconnect();
        io.disconnect();
        wrap.removeEventListener('pointerenter', onEnter);
        wrap.removeEventListener('pointerleave', onLeave);
      };
    },
    { scope: wrapRef },
  );

  return (
    <div
      ref={wrapRef}
      className="relative w-full overflow-hidden border-y border-brand-blue/20 [mask-image:linear-gradient(90deg,transparent,#000_5%,#000_95%,transparent)]"
    >
      <div
        ref={trackRef}
        className="flex w-max whitespace-nowrap py-5 sm:py-6 font-display text-base sm:text-lg lg:text-2xl tracking-[0.18em] uppercase font-bold will-change-transform"
      >
        <Row />
        <Row hidden />
      </div>
    </div>
  );
}
