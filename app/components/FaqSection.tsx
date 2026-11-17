'use client';

import { useEffect, useId, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { calm, playOnView } from './blog/data';
import { useSite, useText } from '../site/SiteContext';
import { accent, type FaqPage } from '../site/site';

gsap.registerPlugin(useGSAP);

/** A short wait before pointing at a panel opens it, so that sweeping across the row doesn't flicker */
const PREVIEW_MS = 90;
/** Leaving the row goes back to the panel that was clicked, after this */
const BACK_MS = 300;
/** The open panel's padding at each side (globals.css, .slat-body) */
const PAD = 34;
/** The row is never lower than this; it grows to fit the longest answer */
const MIN_ROW = 460;
/** The open panel's text column at most (about 65 characters of answer) */
const MAX_TEXT = 560;

/**
 * A page's questions (Questions & answers in the admin) as "slats"; no section at all while the page has none.
 * Where there is room (globals.css, .slats): a row of tall panels, each with its question running up its side. Pointing
 * at one (or tapping it) widens it to show the question and its answer while the others narrow; the row keeps its size,
 * so nothing on the page moves. Narrower: the panels stack, and a tap opens one under its question.
 * Every question and answer is in the page once, for search engines (the sideways label is drawn from data-q, not
 * text); the page marks up for them only the questions whose main page it is (site/schema.ts).
 */
export default function FaqSection({ page, tone = 'light', className = '' }: { page: FaqPage; tone?: 'light' | 'dark'; className?: string }) {
  const items = useSite().questions[page];
  const t = useText();
  const [plain, bright] = accent(t(`${page}_faq_title`));
  const ref = useRef<HTMLElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(0);
  // the panel that was clicked: pointing at the others only opens them while the pointer is there
  const pinned = useRef(0);
  const wait = useRef(0);
  const uid = useId();

  /** Whether the panels stand in a row (set in CSS from the room there is) */
  const inRow = () => !!list.current && getComputedStyle(list.current).getPropertyValue('--slats-row').trim() === '1';

  useGSAP(
    () => {
      if (!items.length) return;
      const move = (v: number) => (calm() ? 0 : v);
      const tl = gsap
        .timeline({ paused: true, defaults: { ease: 'expo.out' } })
        .from('[data-qa="kicker"]', { y: move(10), autoAlpha: 0, duration: 0.7 }, 0)
        .from('[data-qa="word"]', { yPercent: move(110), autoAlpha: calm() ? 0 : 1, duration: 1.1, stagger: 0.1 }, 0.1)
        .from('[data-qa="lede"]', { y: move(16), autoAlpha: 0, duration: 0.9 }, 0.3)
        .from('[data-qa="slat"]', { y: move(28), autoAlpha: 0, duration: 0.9, stagger: 0.06 }, 0.25);
      return playOnView(ref.current, tl);
    },
    { scope: ref, dependencies: [items.length] },
  );

  // In a row: the open panel's text column is set from the room there is (so its words never re-wrap as it opens), and
  // the row is as tall as the longest answer needs
  useEffect(() => {
    const el = list.current;
    if (!el) return;
    const fit = () => {
      if (!inRow()) {
        el.style.removeProperty('--slat-text');
        el.style.removeProperty('--slats-h');
        return;
      }
      const n = el.children.length;
      const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
      const room = el.clientWidth - gap * (n - 1);
      const grow = Math.max(5, n);
      const text = Math.min(MAX_TEXT, Math.round((room * grow) / (n - 1 + grow)) - 2 * PAD);
      el.style.setProperty('--slat-text', `${Math.max(240, text)}px`);
      const tallest = Math.max(0, ...[...el.querySelectorAll<HTMLElement>('.slat-body')].map((b) => b.scrollHeight));
      el.style.setProperty('--slats-h', `${Math.max(MIN_ROW, Math.ceil(tallest) + 8)}px`);
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
  // (a click anywhere on a panel lands here: the panel's button bubbles up to it, and so does a key press on the button)
  const choose = (i: number) => {
    window.clearTimeout(wait.current);
    const next = inRow() || open !== i ? i : -1;
    pinned.current = next;
    setOpen(next);
  };
  const byMouse = (e: PointerEvent) => e.pointerType === 'mouse' && inRow();

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

        <div className="slats-room">
          <ul
            ref={list}
            className="slats"
            style={{ '--grow': Math.max(5, items.length) } as CSSProperties}
            onPointerLeave={(e) => byMouse(e) && later(() => setOpen(pinned.current), BACK_MS)}
          >
            {items.map((f, i) => (
              <li
                key={i}
                data-qa="slat"
                data-open={open === i || undefined}
                className="slat"
                onPointerEnter={(e) => byMouse(e) && later(() => setOpen(i), PREVIEW_MS)}
                onClick={(e) => {
                  // (stacked, a tap on the answer itself leaves it open: people tap text they are reading)
                  if (!inRow() && (e.target as Element).closest('.slat-a')) return;
                  choose(i);
                }}
              >
                {/* (drawn, not text: the number and the question up the side; the question is in the heading below once) */}
                <span aria-hidden="true" className="slat-n" />
                <span aria-hidden="true" className="slat-v" data-q={f.q} />
                <span aria-hidden="true" className="slat-glow" />
                <div className="slat-body">
                  <h3 className="slat-h">
                    <button
                      type="button"
                      id={`${uid}-q${i}`}
                      aria-expanded={open === i}
                      aria-controls={`${uid}-a${i}`}
                      onFocus={() => inRow() && setOpen(i)}
                      className="slat-q"
                    >
                      {f.q}
                    </button>
                  </h3>
                  <div id={`${uid}-a${i}`} role="region" aria-labelledby={`${uid}-q${i}`} className="slat-a">
                    <div className="slat-a-inner">
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
