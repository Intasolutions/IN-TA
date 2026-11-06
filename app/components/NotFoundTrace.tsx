'use client';

import { useRef, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import Icon from './Icon';
import { usePlayIntro } from '../context/usePlayIntro';

gsap.registerPlugin(useGSAP);

// The site's pages, by address
const ROUTES = [
  { href: '/portfolio', name: 'Work' },
  { href: '/services', name: 'Capabilities' },
  { href: '/about', name: 'About' },
  { href: '/blog', name: 'Blog' },
  { href: '/contact', name: 'Contact' },
  { href: '/terms', name: 'Terms' },
  { href: '/privacy', name: 'Privacy' },
  { href: '/security', name: 'Security' },
];
const MAIN = ROUTES.slice(0, 5);
const HOST = 'in-tasolutions.com';

const never = () => () => {};

const readable = (path: string) => {
  try {
    return decodeURI(path);
  } catch {
    return path;
  }
};

/**
 * The 404: the address that was asked for, traced back through the site to the nearest page that does exist.
 * Every line it prints is true: a hop is only "found" if it's one of the site's pages.
 */
export default function NotFoundTrace() {
  // This page is built once, ahead of any request, so the address asked for is only known in the browser
  const known = useSyncExternalStore(never, () => true, () => false);
  const asked = usePathname();
  const path = known ? readable(asked || '/').replace(/\/+$/, '') || '/' : '';
  const rootRef = useRef<HTMLElement>(null);
  const introRef = useRef<gsap.core.Timeline | null>(null);
  usePlayIntro(introRef);

  // The nearest page above the missing one: /services/nothing → /services
  const parts = path.split('/').filter(Boolean);
  let nearest: (typeof ROUTES)[number] | null = null;
  for (let i = parts.length - 1; i > 0 && !nearest; i--) {
    const prefix = `/${parts.slice(0, i).join('/')}`;
    nearest = ROUTES.find((r) => r.href === prefix) ?? null;
  }
  const hops = [
    { at: HOST, found: true },
    ...(nearest ? [{ at: nearest.href, found: true }] : []),
    ...(path ? [{ at: path, found: false }] : []),
  ];

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const tl = gsap
        .timeline({ paused: true, defaults: { ease: 'expo.out' } })
        .from('[data-nf="kicker"]', { y: 10, autoAlpha: 0, duration: 0.7 }, 0)
        .from('[data-nf="word"]', { y: 44, autoAlpha: 0, duration: 1.2, stagger: 0.14 }, 0.1)
        .from('[data-nf="in"]', { y: 16, autoAlpha: 0, duration: 0.9, stagger: 0.08 }, 0.35)
        .from('[data-nf="panel"]', { y: 30, autoAlpha: 0, duration: 1 }, 0.3)
        // the trace prints a line at a time, as a terminal would
        .from('[data-nf="cmd"]', { clipPath: 'inset(0 100% 0 0)', duration: 0.7, ease: 'steps(24)' }, 0.75);
      gsap.utils.toArray<HTMLElement>('[data-nf="hop"]').forEach((hop, i, all) => {
        const at = 1.6 + i * 0.45;
        tl.from(hop, { autoAlpha: 0, duration: 0.01 }, at).from(hop.querySelector('[data-nf="status"]'), { autoAlpha: 0, duration: 0.01 }, at + (i === all.length - 1 ? 0.7 : 0.25));
      });
      tl.from('[data-nf="route"]', { x: -10, autoAlpha: 0, duration: 0.6, stagger: 0.05 }, 1.6 + hops.length * 0.45 + 0.4);
      introRef.current = tl;
    },
    { scope: rootRef, dependencies: [path], revertOnUpdate: true },
  );

  return (
    <main ref={rootRef} className="overflow-x-clip bg-canvas text-midnight">
      <div className="mx-auto grid min-h-svh w-full max-w-[1520px] items-center gap-10 px-4 pb-16 pt-[calc(var(--header-h)+2rem)] sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,34rem)] lg:gap-16">
        <div>
          <p data-nf="kicker" className="inline-flex items-center gap-3 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-brand-blue sm:text-[11px] sm:tracking-[0.3em]">
            <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-current" />
            Error 404 {'//'} Page not found
          </p>
          <h1 className="heading-page mt-2.5 text-midnight sm:mt-3">
            <span data-nf="word" className="inline-block">Nothing on</span>{' '}
            <span data-nf="word" className="heading-accent heading-serif">this route.</span>
          </h1>
          <p data-nf="in" className="mt-5 max-w-xl text-[15px] leading-relaxed text-midnight/80 [text-wrap:pretty] sm:text-lg">
            The address may be mistyped, or the page may have moved. The trace shows the pages that do exist.
          </p>
          <div data-nf="in" className="mt-7 flex flex-wrap gap-2">
            <Link href={nearest?.href ?? '/'} className="kinetic-cta-btn inline-flex items-center gap-2 rounded-xl bg-brand-blue px-5 py-3 font-mono text-xs font-semibold uppercase tracking-wider text-white hover:bg-midnight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue">
              <Icon name="arrow_back" className="text-[16px]" />
              {nearest ? `Back to ${nearest.name}` : 'Home page'}
            </Link>
            <Link href="/contact" className="inline-flex items-center rounded-xl border border-midnight/20 px-5 py-3 font-mono text-xs font-semibold uppercase tracking-wider text-midnight transition-colors duration-300 hover:border-brand-blue hover:text-brand-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue">
              Tell us what you were looking for
            </Link>
          </div>
        </div>

        {/* ---- The trace ---- */}
        <div data-nf="panel" className="min-w-0 overflow-hidden rounded-2xl bg-midnight font-mono text-[12px] text-white shadow-[0_40px_80px_-40px_rgb(1_7_43/0.6)] sm:text-[13px]">
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
            {[0, 1, 2].map((i) => (
              <span key={i} aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-white/20" />
            ))}
            <span className="ml-2 text-[10px] uppercase tracking-[0.2em] text-white/45 sm:text-[11px]">trace</span>
          </div>
          <div className="space-y-5 p-4 sm:p-6">
            <p data-nf="cmd" className="break-all text-white/90">
              <span className="text-[#7fa6ff]">$</span> trace {HOST}
              {path === '/' ? '' : path}
              {!path && <span aria-hidden="true" className="nf-caret ml-1 inline-block h-[1em] w-[0.55em] translate-y-[0.15em] bg-current" />}
            </p>
            <ol className="space-y-2" aria-label="Trace">
              {hops.map((h, i) => (
                <li key={h.at} data-nf="hop" className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-baseline gap-3">
                  <span className="text-white/40 tabular-nums">{i + 1}</span>
                  <span className="break-all text-white/85">{h.at}</span>
                  <span data-nf="status" className={`text-[11px] font-bold uppercase tracking-wider ${h.found ? 'text-[#7ee2a8]' : 'text-[#ff8a8a]'}`}>
                    {h.found ? 'found' : (
                      <>
                        no route<span aria-hidden="true" className="nf-caret ml-1 inline-block h-[1em] w-[0.55em] translate-y-[0.15em] bg-current" />
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ol>
            <div className="border-t border-white/10 pt-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/45 sm:text-[11px]">Known routes</p>
              <ul className="mt-2 grid gap-0.5 sm:grid-cols-2 sm:gap-x-4">
                {[{ href: '/', name: 'Home' }, ...MAIN].map((r) => (
                  <li key={r.href} data-nf="route">
                    <Link href={r.href} className="group flex items-center gap-2 rounded-md py-1.5 text-white/75 transition-colors duration-200 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7fa6ff]">
                      <span aria-hidden="true" className="text-[#7fa6ff] transition-transform duration-200 group-hover:translate-x-1">→</span>
                      <span>{r.href}</span>
                      <span className="text-white/35">{r.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
