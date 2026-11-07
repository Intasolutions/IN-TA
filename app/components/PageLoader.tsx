'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import gsap from 'gsap';
import { LOADER_SEEN } from '../site/loader';

/**
 * The opening: the logo fades in, the line draws, the logo lifts away and the black slides up off the page.
 * Everything up to the slide is CSS (.page-loader-* in globals.css), so it plays from the first paint while the
 * page's scripts are still loading. The slide waits for both: the opening to finish and the page to be ready to animate.
 * On a fast connection it looks exactly as before; on a slow phone the page shows up to a couple of seconds sooner.
 */
export default function PageLoader({ onDone }: { onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const logo = useRef<HTMLDivElement>(null);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const finish = () => requestAnimationFrame(() => done.current());
    if (document.documentElement.dataset.loader === 'seen') {
      finish();
      return;
    }
    let cancelled = false;
    let slide: gsap.core.Tween | null = null;
    // The CSS part of the opening, or (where animations can't be read) the time it takes
    const opening = logo.current?.getAnimations?.()[0];
    const ready = opening ? opening.finished.catch(() => undefined) : new Promise((r) => setTimeout(r, Math.max(0, 1330 - performance.now())));
    ready.then(() => {
      if (cancelled) return;
      try {
        sessionStorage.setItem(LOADER_SEEN, '1');
      } catch {
        // private browsing: the opening simply plays again next time
      }
      slide = gsap.to(root.current, {
        yPercent: -100,
        duration: 0.6,
        ease: 'power4.inOut',
        onComplete: () => {
          finish();
        },
      });
    });
    return () => {
      cancelled = true;
      slide?.kill();
    };
  }, []);

  return (
    <div ref={root} className="page-loader fixed inset-0 z-[99999] bg-black flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <div ref={logo} className="page-loader-logo">
          <Image src="/logo/logo-inta.png" alt="INTA" width={140} height={58} preload loading="eager" fetchPriority="high" />
        </div>

        <div className="w-[180px] h-[2px] bg-white/20 overflow-hidden">
          <div className="page-loader-line h-full bg-white origin-left" />
        </div>
      </div>
    </div>
  );
}
