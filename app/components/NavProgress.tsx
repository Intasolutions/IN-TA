'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/** Pages that arrive faster than this show nothing at all; most do, since links are fetched before they're clicked */
const SHOW_AFTER_MS = 250;
/** If a click leads nowhere (a failed request), the line gives up after this */
const GIVE_UP_MS = 12000;

/**
 * A thin line along the top of the window while a page change takes noticeably long, so a click never seems to have
 * done nothing. It creeps toward the end while waiting, completes when the new page arrives, then fades.
 * It watches clicks on the site's own links; it changes only styles, never React state.
 */
export default function NavProgress() {
  const pathname = usePathname();
  const bar = useRef<HTMLDivElement>(null);
  const waiting = useRef(false);
  const timers = useRef<number[]>([]);

  const clear = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  // A click on a link to another page of the site starts the wait
  useEffect(() => {
    const el = bar.current;
    if (!el) return;
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname === location.pathname) return;
      clear();
      waiting.current = true;
      timers.current.push(
        window.setTimeout(() => {
          if (!waiting.current) return;
          el.style.transition = 'none';
          el.style.opacity = '1';
          el.style.transform = 'scaleX(0.08)';
          void el.offsetWidth; // start the creep from here
          el.style.transition = 'transform 8s cubic-bezier(0.1, 0.6, 0.2, 1)';
          el.style.transform = 'scaleX(0.9)';
        }, SHOW_AFTER_MS),
        window.setTimeout(() => {
          waiting.current = false;
          el.style.transition = 'opacity 0.3s ease';
          el.style.opacity = '0';
        }, GIVE_UP_MS),
      );
    };
    // capture: Next.js's Link cancels the click's default action before it would bubble up to here
    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      clear();
    };
  }, []);

  // The new page is here: finish the line if it was showing, then fade it
  useEffect(() => {
    const el = bar.current;
    if (!el || !waiting.current) return;
    waiting.current = false;
    clear();
    if (el.style.opacity !== '1') return; // it arrived before the line ever showed
    el.style.transition = 'transform 0.2s ease-out, opacity 0.3s ease 0.2s';
    el.style.transform = 'scaleX(1)';
    el.style.opacity = '0';
  }, [pathname]);

  return (
    <div
      ref={bar}
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[99998] h-[2px] origin-left bg-brand-blue shadow-[0_0_8px_rgb(59_123_247/0.7)]"
      style={{ opacity: 0, transform: 'scaleX(0)' }}
    />
  );
}
