'use client';

import { useEffect, useId, useRef, useState, type PointerEvent } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { calm, playOnView } from './blog/data';
import { useSite, useText } from '../site/SiteContext';
import { accent, type FaqPage } from '../site/site';

gsap.registerPlugin(useGSAP);

/** A short wait before pointing at a question shows its answer, so that sweeping across the list doesn't flicker */
const PREVIEW_MS = 70;
/** Leaving the list goes back to the answer that was clicked, after this */
const BACK_MS = 220;

/**
 * A page's questions (Questions & answers in the admin); no section at all while the page has none.
 * With a mouse and room to spare (globals.css, .qa): the questions on the left and the answer beside them. Pointing at a
 * question shows its answer, clicking keeps it there. Otherwise (phones, tablets, narrow places): tap a question to open
 * its answer under it. Every answer is in the page either way, for search engines; the page marks up for them only the
 * questions whose main page it is (site/schema.ts).
 */
export default function FaqSection({ page, tone = 'light', className = '' }: { page: FaqPage; tone?: 'light' | 'dark'; className?: string }) {
  const items = useSite().questions[page];
  const t = useText();
  const [plain, bright] = accent(t(`${page}_faq_title`));
  const ref = useRef<HTMLElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(0);
  // the answer that was clicked: pointing at the others only previews them
  const pinned = useRef(0);
  const wait = useRef(0);
  const uid = useId();

  /** Whether the questions and the answer are side by side (set in CSS, from the screen and the room) */
  const sideBySide = () => !!list.current && getComputedStyle(list.current).getPropertyValue('--qa-split').trim() === '1';

  useGSAP(
    () => {
      if (!items.length) return;
      const move = (v: number) => (calm() ? 0 : v);
      const tl = gsap
        .timeline({ paused: true, defaults: { ease: 'expo.out' } })
        .from('[data-qa="kicker"]', { y: move(10), autoAlpha: 0, duration: 0.7 }, 0)
        .from('[data-qa="word"]', { yPercent: move(110), autoAlpha: calm() ? 0 : 1, duration: 1.1, stagger: 0.1 }, 0.1)
        .from('[data-qa="lede"]', { y: move(16), autoAlpha: 0, duration: 0.9 }, 0.3)
        // (the questions rise, the answers only fade: a transform on anything between the list and an answer would become
        // the box the answer is placed in, and the side-by-side answer would land inside the question column)
        .from('[data-qa="row"]', { y: move(20), autoAlpha: 0, duration: 0.8, stagger: 0.06 }, 0.3)
        .from('.qa-a', { autoAlpha: 0, duration: 0.8 }, 0.45);
      return playOnView(ref.current, tl);
    },
    { scope: ref, dependencies: [items.length] },
  );

  // Side by side, the answers sit beside the list: it is kept as tall as the longest, so none runs into the next section
  useEffect(() => {
    const el = list.current;
    if (!el) return;
    const fit = () => {
      const tallest = sideBySide() ? Math.max(0, ...[...el.querySelectorAll<HTMLElement>('[data-qa-panel]')].map((a) => a.offsetHeight)) : 0;
      const want = tallest ? `${tallest}px` : '';
      if (el.style.minHeight !== want) el.style.minHeight = want;
    };
    const watch = new ResizeObserver(fit);
    watch.observe(el);
    fit();
    return () => {
      watch.disconnect();
      window.clearTimeout(wait.current);
    };
  }, [items.length]);

  if (!items.length) return null;

  const later = (fn: () => void, ms: number) => {
    window.clearTimeout(wait.current);
    wait.current = window.setTimeout(fn, ms);
  };
  const preview = (i: number) => later(() => setOpen(i), PREVIEW_MS);
  const choose = (i: number) => {
    window.clearTimeout(wait.current);
    const next = sideBySide() || open !== i ? i : -1;
    pinned.current = next;
    setOpen(next);
  };
  const fromMouse = (e: PointerEvent) => e.pointerType === 'mouse' && sideBySide();

  return (
    <section ref={ref} id={page === 'home' ? 'faq' : `${page}-faq`} aria-labelledby={`${page}-faq-title`} className={`qa-${tone} ${className}`}>
      <div className="mx-auto max-w-[1520px] px-4 sm:px-6 py-12 sm:py-16 lg:py-20">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:mb-10 md:flex-row md:items-end md:gap-8">
          <div>
            <span data-qa="kicker" className="qa-kicker mb-3 block font-mono text-[11px] font-bold uppercase tracking-[0.3em]">{t(`${page}_faq_kicker`)}</span>
            <h2 id={`${page}-faq-title`} className="heading-section qa-title">
              <span className="inline-block overflow-hidden align-bottom pb-[0.06em]"><span data-qa="word" className="inline-block">{plain}</span></span>{' '}
              <span className="inline-block overflow-hidden align-bottom pb-[0.06em]"><span data-qa="word" className={`${tone === 'dark' ? 'heading-accent-dark' : 'heading-accent'} inline-block pb-[0.06em]`}>{bright}</span></span>
            </h2>
          </div>
          <p data-qa="lede" className="qa-lede max-w-md text-sm leading-relaxed sm:text-[15px]">{t(`${page}_faq_text`)}</p>
        </div>

        <div className="qa">
          <ul ref={list} className="qa-list" onPointerLeave={(e) => fromMouse(e) && later(() => setOpen(pinned.current), BACK_MS)}>
            {items.map((f, i) => (
              <li key={i} data-open={open === i || undefined} className="qa-item" onPointerEnter={(e) => fromMouse(e) && preview(i)}>
                <h3 data-qa="row" className="qa-heading">
                  <button
                    type="button"
                    id={`${uid}-q${i}`}
                    aria-expanded={open === i}
                    aria-controls={`${uid}-a${i}`}
                    onClick={() => choose(i)}
                    onFocus={() => sideBySide() && preview(i)}
                    className="qa-q"
                  >
                    {/* (the number and the icons are drawn, not text: the heading reads as the question alone) */}
                    <span aria-hidden="true" className="qa-n" />
                    <span className="qa-text">{f.q}</span>
                    <span aria-hidden="true" className="qa-icon qa-icon-open">
                      <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M8 2v12M2 8h12" /></svg>
                    </span>
                    <span aria-hidden="true" className="qa-icon qa-icon-point">
                      <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 8h11M9 4l4 4-4 4" /></svg>
                    </span>
                  </button>
                </h3>
                <div id={`${uid}-a${i}`} role="region" aria-labelledby={`${uid}-q${i}`} data-qa-panel className="qa-a">
                  <div className="qa-a-inner">
                    <span aria-hidden="true" className="qa-a-label" />
                    <div className="qa-a-text">
                      {f.a.split(/\n\s*\n/).map((para, k) => (
                        <p key={k}>{para.trim()}</p>
                      ))}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
