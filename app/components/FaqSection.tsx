'use client';

import { useEffect, useId, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useGSAPWhenNear } from './useGSAPWhenNear';
import Icon from './Icon';
import { calm, playOnView } from './blog/data';
import { useSite, useText } from '../site/SiteContext';
import { accent, hoursShort, phoneHref, type FaqPage } from '../site/site';

gsap.registerPlugin(useGSAP);

/** A short wait before pointing at a question shows its answer, so that sweeping across them doesn't flicker */
const PREVIEW_MS = 80;
/** Leaving the network goes back to the question that was clicked, after this */
const BACK_MS = 300;
/** How long the pulse takes to run along a wire to the hub */
const PULSE_MS = 380;
const SVG = 'http://www.w3.org/2000/svg';

/**
 * A page's questions (Questions & answers in the admin) as a network; no section at all while the page has none.
 * Wide (globals.css, .net): the questions are nodes on both sides, wired to the INTA hub in the middle. Pointing at one
 * sends a pulse along its wire to the hub, and its answer shows in the card under the hub; a click keeps it. The card's
 * room is as tall as the longest answer, so nothing on the page moves.
 * Narrow: the hub on top, the questions on a line down from it, each answer opening under its question with a tap.
 * Every question and answer is in the page once, for search engines; the page marks up for them only the questions whose
 * main page it is (site/schema.ts).
 */
export default function FaqSection({ page, tone = 'light', className = '' }: { page: FaqPage; tone?: 'light' | 'dark'; className?: string }) {
  const site = useSite();
  const items = site.questions[page];
  const t = useText();
  const [plain, bright] = accent(t(`${page}_faq_title`));
  const ref = useRef<HTMLElement>(null);
  const net = useRef<HTMLDivElement>(null);
  const wires = useRef<SVGSVGElement>(null);
  const [open, setOpen] = useState(0);
  const pinned = useRef(0);
  const wait = useRef(0);
  const pulse = useRef(0);
  const uid = useId();
  const rows = Math.ceil(items.length / 2);

  /** Whether the questions stand on both sides of the hub (set in CSS from the room there is) */
  const wide = () => !!net.current && getComputedStyle(net.current).getPropertyValue('--net-wide').trim() === '1';

  // The wires, the room for the answer card, and where that card sits: measured, as they depend on the words' sizes
  useEffect(() => {
    const el = net.current;
    const svg = wires.current;
    if (!el || !svg) return;
    const draw = () => {
      svg.replaceChildren();
      if (!wide()) {
        el.style.removeProperty('--room-h');
        el.style.removeProperty('--room-top');
        return;
      }
      // (scrollHeight, and the card's own top offset: an answer that is closed still measures its full height)
      const tallest = Math.max(0, ...[...el.querySelectorAll<HTMLElement>('[data-net="answer"] > *')].map((a) => a.scrollHeight));
      el.style.setProperty('--room-h', `${tallest + 24}px`);
      const room = el.querySelector<HTMLElement>('[data-net="room"]');
      el.style.setProperty('--room-top', `${room?.offsetTop ?? 0}px`);
      const box = el.getBoundingClientRect();
      // the hub, not the tile: the entrance scales the tile, and a wire measured then would anchor short
      const tile = el.querySelector('.net-hub')!.getBoundingClientRect();
      const hy = tile.top + tile.height / 2 - box.top;
      el.querySelectorAll<HTMLElement>('[data-net="port"]').forEach((port) => {
        const r = port.getBoundingClientRect();
        const left = r.left < tile.left;
        const x1 = r.left + r.width / 2 - box.left;
        const y1 = r.top + r.height / 2 - box.top;
        const x2 = (left ? tile.left : tile.right) - box.left;
        const mx = (x1 + x2) / 2;
        const path = document.createElementNS(SVG, 'path');
        path.setAttribute('d', `M${x1} ${y1} C${mx} ${y1} ${mx} ${hy} ${x2} ${hy}`);
        path.setAttribute('class', 'net-wire');
        path.dataset.i = port.dataset.i;
        svg.appendChild(path);
      });
      // and down from the hub to the answer card
      if (room) {
        const down = document.createElementNS(SVG, 'path');
        const cx = tile.left + tile.width / 2 - box.left;
        down.setAttribute('d', `M${cx} ${tile.bottom - box.top} V${room.offsetTop}`);
        down.setAttribute('class', 'net-wire net-down');
        svg.appendChild(down);
      }
    };
    const watch = new ResizeObserver(draw);
    watch.observe(el);
    draw();
    document.fonts?.ready.then(draw);
    return () => {
      watch.disconnect();
      window.clearTimeout(wait.current);
      cancelAnimationFrame(pulse.current);
    };
  }, [items.length]);

  // The open question's wire lights up
  useEffect(() => {
    wires.current?.querySelectorAll<SVGPathElement>('.net-wire').forEach((w) => w.classList.toggle('on', w.dataset.i === String(open) || (open >= 0 && w.classList.contains('net-down'))));
  }, [open]);

  useGSAPWhenNear(
    () => {
      if (!items.length) return;
      const move = (v: number) => (calm() ? 0 : v);
      const tl = gsap
        .timeline({ paused: true, defaults: { ease: 'expo.out' } })
        .from('[data-qa="line"]', { scaleX: 0, duration: 0.8 }, 0)
        .from('[data-qa="kicker"]', { x: move(-8), autoAlpha: 0, duration: 0.7 }, 0.05)
        .from('[data-qa="word"]', { yPercent: move(110), autoAlpha: calm() ? 0 : 1, duration: 1.1, stagger: 0.1 }, 0.1)
        .from('[data-qa="lede"]', { y: move(16), autoAlpha: 0, duration: 0.9 }, 0.3)
        .from('[data-net="tile"]', { scale: calm() ? 1 : 0.7, autoAlpha: 0, duration: 0.9 }, 0.3)
        // (the cards inside the items move, never the items: an item with a transform would carry its answer with it)
        .from('[data-net="card"]', { y: move(18), autoAlpha: 0, duration: 0.8, stagger: 0.06 }, 0.4)
        .from('[data-net="wires"]', { autoAlpha: 0, duration: 0.8 }, 0.75);
      return playOnView(ref.current, tl);
    },
    { scope: ref, dependencies: [items.length] },
  );

  if (!items.length) return null;

  /** Open a question: wide, after a pulse runs along its wire to the hub */
  const show = (i: number, withPulse: boolean) => {
    cancelAnimationFrame(pulse.current);
    const svg = wires.current;
    const wire = svg?.querySelector<SVGPathElement>(`.net-wire[data-i="${i}"]`);
    if (!withPulse || !wire || calm() || !wide()) {
      setOpen(i);
      return;
    }
    svg!.querySelectorAll('.net-pulse').forEach((d) => d.remove());
    const dot = document.createElementNS(SVG, 'circle');
    dot.setAttribute('r', '4');
    dot.setAttribute('class', 'net-pulse');
    svg!.appendChild(dot);
    const len = wire.getTotalLength();
    let start = -1;
    const step = (now: number) => {
      if (start < 0) start = now;
      const k = Math.min(1, (now - start) / PULSE_MS);
      const at = wire.getPointAtLength((1 - Math.pow(1 - k, 3)) * len);
      dot.setAttribute('cx', String(at.x));
      dot.setAttribute('cy', String(at.y));
      if (k < 1) pulse.current = requestAnimationFrame(step);
      else {
        dot.remove();
        setOpen(i);
      }
    };
    pulse.current = requestAnimationFrame(step);
  };
  const later = (fn: () => void, ms: number) => {
    window.clearTimeout(wait.current);
    wait.current = window.setTimeout(fn, ms);
  };
  const choose = (i: number) => {
    window.clearTimeout(wait.current);
    // (narrow, a second tap closes it again)
    const next = wide() || open !== i ? i : -1;
    pinned.current = next;
    if (next === open) return;
    if (next < 0) setOpen(-1);
    else show(next, true);
  };
  const byMouse = (e: PointerEvent) => e.pointerType === 'mouse' && wide();

  return (
    <section ref={ref} id={page === 'home' ? 'faq' : `${page}-faq`} aria-labelledby={`${page}-faq-title`} className={`net-${tone} ${className}`}>
      <div className="max-w-[1520px] mx-auto px-4 sm:px-6 py-12 sm:py-16 lg:py-20">
        <div className="mb-10 flex flex-col justify-between gap-4 sm:mb-12 md:flex-row md:items-end md:gap-8">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <span data-qa="line" className="net-kicker-line h-0.5 w-6 origin-left" />
              <span data-qa="kicker" className="net-kicker font-mono text-[11px] font-bold uppercase tracking-[0.3em]">{t(`${page}_faq_kicker`)}</span>
            </div>
            <h2 id={`${page}-faq-title`} className="net-title font-display font-extrabold uppercase tracking-tight leading-[1.04] text-[length:clamp(2rem,4.2vw,3.4rem)]">
              <span className="inline-block overflow-hidden align-bottom"><span data-qa="word" className="inline-block">{plain}</span></span>{' '}
              <span className="inline-block overflow-hidden align-bottom pb-[0.12em]">
                <span data-qa="word" className="net-bright inline-block pr-1 pb-[0.14em] font-serif italic font-light normal-case bg-linear-to-r bg-clip-text text-transparent">{bright}</span>
              </span>
            </h2>
          </div>
          <p data-qa="lede" className="net-lede max-w-md text-sm leading-relaxed sm:text-[15px]">{t(`${page}_faq_text`)}</p>
        </div>

        <div className="net-room-q">
          <div
            ref={net}
            className="net"
            style={{ '--rows': rows } as CSSProperties}
            onPointerLeave={(e) => byMouse(e) && later(() => show(pinned.current, false), BACK_MS)}
          >
            <svg ref={wires} data-net="wires" aria-hidden="true" className="net-wires" />
            {/* The hub: the company's own tile */}
            <div aria-hidden="true" className="net-hub">
              <span data-net="tile" className="net-tile">
                <Image src="/logo/logo-inta.png" alt="" width={774} height={322} sizes="104px" className="h-9 w-auto sm:h-10" />
              </span>
            </div>
            <ul className="net-list">
              {items.map((f, i) => (
                <li key={i} className="net-item" data-open={open === i || undefined}>
                  <div
                    data-net="card"
                    className="net-node"
                    onPointerEnter={(e) => byMouse(e) && later(() => show(i, true), PREVIEW_MS)}
                    onClick={() => choose(i)}
                  >
                    <span aria-hidden="true" data-net="port" data-i={i} className="net-port" />
                    <h3 className="net-q">
                      <button
                        type="button"
                        id={`${uid}-q${i}`}
                        aria-expanded={open === i}
                        aria-controls={`${uid}-a${i}`}
                        onFocus={() => wide() && show(i, false)}
                        className="text-left"
                      >
                        {f.q}
                      </button>
                    </h3>
                  </div>
                  <div id={`${uid}-a${i}`} role="region" aria-labelledby={`${uid}-q${i}`} data-net="answer" className="net-answer">
                    <div className="net-answer-inner">
                      {/* (wide, the card says which question it answers: drawn from data-*, so the question is in the page once) */}
                      <span aria-hidden="true" className="net-answer-label" data-label={`Q.${String(i + 1).padStart(2, '0')} · Answered`} />
                      <span aria-hidden="true" className="net-answer-title" data-q={f.q} />
                      {f.a.split(/\n\s*\n/).map((para, k) => (
                        <p key={k} className="whitespace-pre-line">{para.trim()}</p>
                      ))}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            {/* where the answer card sits on wide screens: as tall as the longest answer */}
            <div data-net="room" aria-hidden="true" className="net-room" />
          </div>
        </div>

        <div className="net-ask mt-8 flex flex-col items-center gap-3 text-center sm:mt-10 sm:flex-row sm:justify-center sm:gap-6">
          <span className="text-sm">{t('faq_ask_label')}</span>
          <Link href={page === 'contact' ? '#contact-title' : '/contact'} className="net-ask-link group inline-flex items-center gap-2 font-mono text-[12px] font-semibold uppercase tracking-wider">
            <span className="border-b border-current/30 transition-colors group-hover:border-current">{t('faq_ask_link')}</span>
            <Icon name="arrow_outward" className="text-[16px] transition-transform duration-300 group-hover:rotate-45" />
          </Link>
          <a href={phoneHref(site.phone)} className="net-ask-phone font-mono text-xs">
            <span className="font-bold tabular-nums">{site.phone}</span> <span className="opacity-60">· {hoursShort(site)}</span>
          </a>
        </div>
      </div>
    </section>
  );
}
