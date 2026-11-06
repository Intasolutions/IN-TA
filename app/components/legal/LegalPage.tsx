'use client';

import { useRef, useState, type MouseEvent, type ReactNode } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import Icon from '../Icon';
import { EMAIL } from '../Footer';
import { scrollToY } from '../SmoothScroll';
import { usePlayIntro } from '../../context/usePlayIntro';

gsap.registerPlugin(ScrollTrigger, useGSAP);

export type LegalSection = { id: string; title: string; body: ReactNode };

/** Our email address as a link (from here, since a server page can't read the Footer's constants) */
export function Mail({ subject }: { subject: string }) {
  return <a href={`mailto:${EMAIL}?subject=${encodeURIComponent(subject)}`}>{EMAIL}</a>;
}

// The three documents, so each can point to the other two
const DOCUMENTS = [
  { href: '/terms', name: 'Terms of Service', about: 'Using this website and our services.' },
  { href: '/privacy', name: 'Privacy Policy', about: 'What our forms collect and what happens to it.' },
  { href: '/security', name: 'Security Policy', about: 'How we look after data, and how to report a problem.' },
];

const CONTAINER = 'mx-auto w-full max-w-[1520px] px-4 sm:px-6';
const LABEL = 'font-mono text-[10px] font-bold uppercase tracking-[0.2em] sm:text-[11px]';
const num = (i: number) => String(i + 1).padStart(2, '0');
const calm = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * A legal document, read like a spec: numbered sections, a contents rail that follows the reader and fills as they go,
 * and the other two documents at the end. Shared by Terms, Privacy and Security.
 */
export default function LegalPage({
  href,
  kicker,
  title,
  accent,
  lead,
  updated,
  sections,
}: {
  /** This document's own address, so the others can be offered at the end */
  href: string;
  kicker: string;
  title: string;
  accent: string;
  lead: string;
  /** When the wording last changed: an ISO date and how to show it */
  updated: { iso: string; label: string };
  sections: LegalSection[];
}) {
  const rootRef = useRef<HTMLElement>(null);
  const introRef = useRef<gsap.core.Timeline | null>(null);
  const playedRef = usePlayIntro(introRef);
  const [active, setActive] = useState(sections[0]?.id ?? '');

  useGSAP(
    () => {
      const still = calm();

      // ---- Which section is being read: the one crossing a line near the top (short sections would let the next one in too) ----
      gsap.utils.toArray<HTMLElement>('[data-lg="section"]').forEach((el) => {
        ScrollTrigger.create({
          trigger: el,
          start: 'top 15%',
          end: 'bottom 15%',
          onToggle: (self) => self.isActive && setActive(el.id),
        });
      });

      // ---- The contents rail fills as the document is read ----
      gsap.fromTo(
        '[data-lg="fill"]',
        { scaleY: 0 },
        { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '[data-lg="doc"]', start: 'top 15%', end: 'bottom 60%', scrub: true } },
      );

      if (still) return;

      // ---- The opening, once ----
      introRef.current = gsap
        .timeline({ paused: true, defaults: { ease: 'expo.out' } })
        .from('[data-lg="kicker"]', { y: 10, autoAlpha: 0, duration: 0.7 }, 0)
        .from('[data-lg="word"]', { y: 44, autoAlpha: 0, duration: 1.2, stagger: 0.14 }, 0.1)
        .from('[data-lg="in"]', { y: 16, autoAlpha: 0, duration: 0.9, stagger: 0.08 }, 0.35)
        .from('[data-lg="rule"]', { scaleX: 0, duration: 1.4 }, 0.3);
      if (playedRef.current) introRef.current.progress(1);

      // ---- Each section rises in as it arrives, its rule drawing across ----
      gsap.utils.toArray<HTMLElement>('[data-lg="section"]').forEach((el) => {
        gsap
          .timeline({ defaults: { ease: 'expo.out' }, scrollTrigger: { trigger: el, start: 'top 88%', once: true } })
          .from(el.querySelector('[data-lg="line"]'), { scaleX: 0, duration: 1.2 }, 0)
          .from(el.querySelectorAll('[data-lg="part"]'), { y: 22, autoAlpha: 0, duration: 0.9, stagger: 0.08 }, 0.05);
      });
      gsap.from('[data-lg="doc-card"]', {
        y: 30,
        autoAlpha: 0,
        duration: 1,
        stagger: 0.1,
        ease: 'expo.out',
        scrollTrigger: { trigger: '[data-lg="others"]', start: 'top 85%', once: true },
      });
    },
    { scope: rootRef },
  );

  // Contents links glide to their section and leave its address in the bar
  const go = (e: MouseEvent<HTMLAnchorElement>, id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    scrollToY(el.getBoundingClientRect().top + window.scrollY - 32);
    history.replaceState(null, '', `#${id}`);
    setActive(id);
  };

  const others = DOCUMENTS.filter((d) => d.href !== href);

  return (
    <main ref={rootRef} className="overflow-x-clip bg-canvas text-midnight">
      {/* ---- Title ---- */}
      <section aria-labelledby="legal-title" className={`${CONTAINER} pb-8 pt-[calc(var(--header-h)+1.5rem)] sm:pb-10 sm:pt-[calc(var(--header-h)+2.5rem)]`}>
        <p data-lg="kicker" className={`inline-flex items-center gap-3 text-brand-blue sm:tracking-[0.3em] ${LABEL}`}>
          <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-current" />
          Legal {'//'} {kicker}
        </p>
        <h1 id="legal-title" className="heading-page mt-2.5 text-midnight sm:mt-3">
          <span data-lg="word" className="inline-block">{title}</span>{' '}
          <span data-lg="word" className="heading-accent heading-serif">{accent}</span>
        </h1>

        <div className="relative mt-6 grid gap-5 pt-5 sm:mt-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:gap-12">
          <span data-lg="rule" aria-hidden="true" className="absolute inset-x-0 top-0 h-px origin-left bg-midnight/15" />
          <p data-lg="in" className="max-w-2xl text-[15px] leading-relaxed text-midnight/80 [text-wrap:pretty] sm:text-lg">
            {lead}
          </p>
          <dl data-lg="in" className="grid grid-cols-2 gap-x-6 gap-y-4 self-start font-mono text-[11px] uppercase tracking-wider sm:text-xs">
            <div>
              <dt className="text-midnight/50">Last updated</dt>
              <dd className="mt-1 font-bold text-midnight">
                <time dateTime={updated.iso}>{updated.label}</time>
              </dd>
            </div>
            <div>
              <dt className="text-midnight/50">Sections</dt>
              <dd className="mt-1 font-bold text-midnight">{String(sections.length).padStart(2, '0')}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-midnight/50">Questions</dt>
              <dd className="mt-1">
                <a href={`mailto:${EMAIL}`} className="break-all font-bold normal-case tracking-normal text-brand-blue underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue">
                  {EMAIL}
                </a>
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* ---- Contents and document ---- */}
      <div className={`${CONTAINER} grid gap-8 pb-16 sm:pb-24 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-16 xl:grid-cols-[17rem_minmax(0,1fr)]`}>
        <nav data-lg="in" aria-label="Contents" className="lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:self-start">
          <p className={`text-midnight/50 ${LABEL}`}>Contents</p>
          <ol className="relative mt-3 rounded-2xl border border-midnight/10 bg-white p-2 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:pl-5">
            <span aria-hidden="true" className="absolute bottom-1 left-0 top-1 hidden w-px bg-midnight/15 lg:block" />
            <span data-lg="fill" aria-hidden="true" className="absolute bottom-1 left-0 top-1 hidden w-px origin-top bg-brand-blue lg:block" />
            {sections.map((s, i) => {
              const on = active === s.id;
              return (
                <li key={s.id} className="relative">
                  <span aria-hidden="true" className={`absolute -left-5 top-1/2 hidden h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border transition-colors duration-300 lg:block ${on ? 'border-brand-blue bg-brand-blue' : 'border-midnight/30 bg-canvas'}`} />
                  <a
                    href={`#${s.id}`}
                    onClick={(e) => go(e, s.id)}
                    aria-current={on ? 'location' : undefined}
                    className={`group flex items-baseline gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue lg:px-0 lg:py-2 ${on ? 'text-brand-blue' : 'text-midnight/70 hover:text-midnight'}`}
                  >
                    <span className="font-mono text-[11px] font-bold tabular-nums">{num(i)}</span>
                    <span className="font-medium transition-transform duration-300 group-hover:translate-x-1">{s.title}</span>
                  </a>
                </li>
              );
            })}
          </ol>
        </nav>

        <article data-lg="doc" className="min-w-0 max-w-[46rem]">
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} data-lg="section" aria-labelledby={`${s.id}-title`} className="relative scroll-mt-8 pb-10 pt-6 first:pt-0 sm:pb-12 [&:first-child>[data-lg=line]]:hidden">
              <span data-lg="line" aria-hidden="true" className="absolute inset-x-0 top-0 h-px origin-left bg-midnight/15" />
              <p data-lg="part" className={`text-brand-blue ${LABEL}`}>§ {num(i)}</p>
              <h2 id={`${s.id}-title`} data-lg="part" className="heading-sub mt-2 text-midnight">
                {s.title}
              </h2>
              <div data-lg="part" className="legal-prose mt-4">
                {s.body}
              </div>
            </section>
          ))}
        </article>
      </div>

      {/* ---- The other documents ---- */}
      {others.length > 0 && (
        <section data-lg="others" aria-labelledby="legal-others" className="border-t border-midnight/10 bg-white/50">
          <div className={`${CONTAINER} py-12 sm:py-16`}>
            <h2 id="legal-others" className={`text-midnight/50 ${LABEL}`}>Also read</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:gap-6">
              {others.map((d) => (
                <Link
                  key={d.href}
                  href={d.href}
                  data-lg="doc-card"
                  className="group relative flex items-end justify-between gap-6 overflow-hidden rounded-2xl border border-midnight/10 bg-white p-5 transition-[border-color,box-shadow] duration-300 hover:border-brand-blue/40 hover:shadow-[0_30px_60px_-28px_rgb(1_7_43/0.45)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue sm:p-8"
                >
                  <span>
                    <span className="block font-display text-[clamp(1.35rem,2vw,1.9rem)] font-bold leading-tight tracking-tight text-midnight transition-colors duration-300 group-hover:text-brand-blue">{d.name}</span>
                    <span className="mt-2 block text-[15px] leading-relaxed text-midnight/70">{d.about}</span>
                  </span>
                  <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-midnight/15 text-midnight transition-colors duration-300 group-hover:border-brand-blue group-hover:bg-brand-blue group-hover:text-white">
                    <Icon name="arrow_outward" className="text-[20px] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
