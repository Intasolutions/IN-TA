'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { NAVIGATE_EVENT } from '../site/navigate';

/** Pages that arrive faster than this show nothing at all; most do, since links are fetched before they're clicked */
const SHOW_AFTER_MS = 250;
/** A page still not here after this gets the opening's short version: "loading /page" over the screen */
const BOOT_AFTER_MS = 800;
/** If a click leads nowhere (a failed request), the line gives up after this */
const GIVE_UP_MS = 12000;
/** Long addresses are shortened in the short version */
const MAX_PATH = 34;

/**
 * A thin line along the top of the window while a page change takes noticeably long, so a click never seems to have
 * done nothing. It creeps toward the end while waiting, completes when the new page arrives, then fades. A page that
 * takes really long gets the opening's short version over the screen as well: "loading /page", a cursor and a moving
 * line, gone as soon as the page is here.
 * It changes only styles and text, never React state.
 */
export default function NavProgress() {
  const pathname = usePathname();
  const bar = useRef<HTMLDivElement>(null);
  const boot = useRef<HTMLDivElement>(null);
  const bootPath = useRef<HTMLSpanElement>(null);
  const waiting = useRef(false);
  const timers = useRef<number[]>([]);

  const clear = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  // A page change that has really started (instrumentation-client.ts: links, the router, back and forward) starts the
  // wait. A click alone isn't enough: some are cancelled on purpose (on a touch screen, the About page's first tap on a
  // module only selects it), and the loading screen would then wait for a page that never comes.
  useEffect(() => {
    const el = bar.current;
    if (!el) return;
    const onNavigate = (e: Event) => {
      let url: URL;
      try {
        url = new URL(String((e as CustomEvent<string>).detail), location.href);
      } catch {
        return;
      }
      // (the same page with another #section or ?filter: nothing to wait for)
      if (url.origin !== location.origin || url.pathname === location.pathname) return;
      clear();
      waiting.current = true;
      if (bootPath.current) bootPath.current.textContent = url.pathname.length > MAX_PATH ? `${url.pathname.slice(0, MAX_PATH - 1)}…` : url.pathname;
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
          if (waiting.current) boot.current?.setAttribute('data-on', '');
        }, BOOT_AFTER_MS),
        window.setTimeout(() => {
          waiting.current = false;
          el.style.transition = 'opacity 0.3s ease';
          el.style.opacity = '0';
          boot.current?.removeAttribute('data-on');
        }, GIVE_UP_MS),
      );
    };
    window.addEventListener(NAVIGATE_EVENT, onNavigate);
    return () => {
      window.removeEventListener(NAVIGATE_EVENT, onNavigate);
      clear();
    };
  }, []);

  // The new page is here: finish the line if it was showing, then fade it
  useEffect(() => {
    const el = bar.current;
    if (!el || !waiting.current) return;
    waiting.current = false;
    clear();
    boot.current?.removeAttribute('data-on');
    if (el.style.opacity !== '1') return; // it arrived before the line ever showed
    el.style.transition = 'transform 0.2s ease-out, opacity 0.3s ease 0.2s';
    el.style.transform = 'scaleX(1)';
    el.style.opacity = '0';
  }, [pathname]);

  return (
    <>
      <div ref={boot} aria-hidden="true" className="nav-boot">
        <div className="nav-boot-term">
          <span>
            loading <span ref={bootPath} /> <span className="boot-caret" />
          </span>
          <span className="nav-boot-track" />
        </div>
      </div>
      <div
        ref={bar}
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 z-[99998] h-[2px] origin-left bg-brand-blue shadow-[0_0_8px_rgb(59_123_247/0.7)]"
        style={{ opacity: 0, transform: 'scaleX(0)' }}
      />
    </>
  );
}
