'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { createGlobe, type Globe } from './globe';
import { TARGET, viewOf, type Point } from './mapCanvas';
import { CLOSING } from './story';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const GRADIENT_ON_DARK = 'heading-accent';
const START_ZOOM = 0.6; // how close in the rise begins
const SMALL_SCREENS = '(max-width: 1023.98px), (max-height: 639.98px), (prefers-reduced-motion: reduce)';

/** "Back to Earth" for phones, tablets and reduced motion, where the page flows instead of using one pinned scene. */
export default function EarthReturn() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia(ref.current!);
      mm.add(SMALL_SCREENS, () => {
        const root = ref.current!;
        const stage = root.querySelector<HTMLElement>('[data-er="stage"]')!;
        const canvas = root.querySelector<HTMLCanvasElement>('[data-er="gl"]')!;
        const text = root.querySelector<HTMLElement>('[data-er="text"]')!;
        const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const state = { z: calm ? 0 : START_ZOOM };
        let globe: Globe | null = null;
        let w = 0;
        let h = 0;
        let center: Point = [0, 0];
        let radius0 = 0;
        let lastTime = 0;
        let spinLon = TARGET.lon + 24;

        const draw = (time: number) => {
          if (!w || !globe) return;
          const dt = Math.min(0.05, Math.max(0, time - lastTime));
          lastTime = time;
          if (!calm && state.z < 0.03) spinLon -= 3.5 * dt;
          const v = viewOf({ w, z: state.z, radius0, start: center, center, spinLon, spinLat: 10 });
          globe.draw({ cx: v.cx, cy: v.cy, R: v.R, lon0: v.lon0, lat0: v.lat0, fov: v.fov, time, fade: calm ? 0.25 : 0 });
        };
        const measure = () => {
          const s = stage.getBoundingClientRect();
          w = s.width;
          h = s.height;
          if (w > h) {
            // landscape: the planet beside the words
            radius0 = h * 0.42;
            center = [w * 0.78, h * 0.54];
          } else {
            // portrait: the planet in the space left under the words and logos
            const bottom = text.offsetTop + text.offsetHeight;
            radius0 = Math.max(90, Math.min(w * 0.44, (h - bottom - 40) / 2));
            center = [w * 0.5, Math.max((bottom + h) / 2, h * 0.5)];
          }
          globe?.resize(w, h, Math.min(window.devicePixelRatio || 1, 1.5));
          if (calm) draw(0);
        };
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(stage);
        ro.observe(text); // the words can reflow as the fonts arrive

        // Its own planet, only loaded when the visitor gets near it
        const near = new IntersectionObserver(
          ([e]) => {
            if (!e.isIntersecting) {
              globe?.sleep();
              return;
            }
            if (globe) return;
            globe = createGlobe(canvas, window.innerWidth < 768, () => draw(calm ? 0 : lastTime));
            measure();
          },
          { rootMargin: '100% 0px' },
        );
        near.observe(root);

        if (calm) {
          return () => {
            near.disconnect();
            ro.disconnect();
            globe?.destroy();
          };
        }

        gsap
          .timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: root, start: 'top top', end: 'bottom bottom', scrub: 0.3 } })
          .to(state, { z: 0, duration: 0.7 }, 0)
          .fromTo('[data-er="text"]', { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.2, ease: 'power2.out' }, 0.55)
          .to({}, { duration: 0.1 }, 0.9);

        let onScreen = false;
        const seen = new IntersectionObserver(([e]) => {
          onScreen = e.isIntersecting;
        });
        seen.observe(root);
        const tick = (time: number) => {
          if (onScreen) draw(time);
        };
        gsap.ticker.add(tick);
        return () => {
          gsap.ticker.remove(tick);
          near.disconnect();
          seen.disconnect();
          ro.disconnect();
          globe?.destroy();
        };
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <section ref={ref} aria-labelledby="er-title" className="relative h-[240svh] bg-midnight motion-reduce:h-auto">
      <div data-er="stage" className="sticky top-0 h-svh overflow-hidden motion-reduce:relative">
        <canvas data-er="gl" aria-hidden="true" className="absolute inset-0 h-full w-full" />
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[22svh] bg-linear-to-b from-midnight to-transparent" />
        <div data-er="text" className="relative px-4 pt-[9svh] text-center [@media(max-height:480px)]:w-[62%] [@media(max-height:480px)]:pt-4">
          <span className="mb-2 inline-flex items-center gap-3 font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.25em] font-bold text-[#9dbbff]">
            <span className="h-2 w-2 rounded-full bg-current animate-pulse" />
            {CLOSING.kicker}
          </span>
          <h2 id="er-title" className="heading-section text-white text-balance">
            {CLOSING.plain} <span className={GRADIENT_ON_DARK}>{CLOSING.bright}</span>
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-white/75 leading-relaxed text-balance">{CLOSING.text}</p>
        </div>
      </div>
    </section>
  );
}
