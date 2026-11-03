'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import Scramble from '../Scramble';
import { CLIENTS_PATH, toClients, type MapClient } from './clients';
import { CLIENTS } from './story';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

const LOCAL_BACKEND = 'http://127.0.0.1:8000';

const GRADIENT_ON_DARK = 'heading-accent-dark';

// (Must match ROUTE in SystemMap)
const ROUTE = '(prefers-reduced-motion: no-preference) and (max-width: 1023.98px), (prefers-reduced-motion: no-preference) and (max-height: 639.98px)';

// Local preview only: made-up logos so the stop can be seen before real ones are uploaded. Never included on the live site.
const SAMPLES: MapClient[] =
  process.env.NODE_ENV === 'development'
    ? Array.from({ length: 8 }, (_, i) => ({
        id: -(i + 1),
        name: `Sample client ${i + 1}`,
        logo: `/about/sample-clients/${i + 1}.svg`,
        description: i % 2 ? '' : 'A short line about this client appears here.',
      }))
    : [];

/** The logos to show. The server render can miss them while the API is waking up, so this asks again from the browser. */
export function useClients(initial: MapClient[]) {
  const [clients, setClients] = useState(initial.length ? initial : SAMPLES);

  useEffect(() => {
    if (initial.length) return;
    const controller = new AbortController();
    // (while developing, a backend running on this computer is tried first, so uploads can be previewed before deploying)
    const bases = process.env.NODE_ENV === 'development' && !apiBase.includes('127.0.0.1') ? [LOCAL_BACKEND, apiBase] : [apiBase];
    (async () => {
      for (const base of bases) {
        try {
          const res = await fetch(`${base}${CLIENTS_PATH}`, { signal: controller.signal });
          if (!res.ok) continue;
          const real = toClients(await res.json(), base);
          if (real.length) {
            setClients(real);
            return;
          }
        } catch {
          // not running, or not deployed yet: try the next one
        }
      }
    })();
    return () => controller.abort();
  }, [initial.length]);

  return clients;
}

/** The stop's words, in the same voice as the services and the orbit */
function ClientsHeading({ clients, id }: { clients: MapClient[]; id: string }) {
  return (
    <>
      <span className="mb-2 inline-flex items-center gap-2 sm:gap-3 font-mono text-[9px] min-[380px]:text-[10px] sm:text-[11px] tracking-[0.14em] min-[380px]:tracking-[0.2em] sm:tracking-[0.3em] uppercase font-bold text-[#9dbbff]">
        <span className="h-2 w-2 shrink-0 rounded-full bg-current animate-pulse" />
        {CLIENTS.kicker}
      </span>
      <h2 id={id} className="heading-section text-white">
        {CLIENTS.plain} <span className={GRADIENT_ON_DARK}>{CLIENTS.bright}</span>
      </h2>
      {clients[0].id < 0 && <p className="mt-2 mx-auto w-fit rounded bg-amber-300/90 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-midnight">Sample logos · local preview only</p>}
    </>
  );
}

/** The logo on its light plate (uploaded logos can be any colour) */
function Plate({ client, sizes, className }: { client: MapClient; sizes: string; className: string }) {
  return (
    <span className={`relative block rounded-xl bg-white ${className}`}>
      <span className="absolute inset-x-2.5 inset-y-1.5">
        <Image src={client.logo} alt="" fill sizes={sizes} loading="eager" unoptimized={!client.logo.includes('res.cloudinary.com')} className="object-contain" />
      </span>
    </span>
  );
}

/** Large screens: a board the camera travels to after the orbit. The logos plug into sockets along a data bus, in rows either side of it. */
export function ClientBoard({ clients, onActive }: { clients: MapClient[]; onActive: (i: number) => void }) {
  const [active, setActive] = useState(-1);
  if (!clients.length) return null;

  const select = (i: number) => {
    setActive(i);
    onActive(i);
  };
  const current = active >= 0 ? clients[active] : null;
  const half = Math.ceil(clients.length / 2);

  const socket = (c: MapClient, i: number) => {
    const on = active === i;
    return (
      <li key={c.id} data-sm="socket" className="min-w-0 flex-[0_1_11rem]">
        <button
          type="button"
          data-sm="client-card"
          aria-label={c.description ? `${c.name}: ${c.description}` : c.name}
          onPointerEnter={(e) => {
            if (e.pointerType === 'mouse') select(i);
          }}
          onPointerLeave={(e) => {
            if (e.pointerType === 'mouse') select(-1);
          }}
          onFocus={(e) => {
            if (e.target.matches(':focus-visible')) select(i);
          }}
          onBlur={() => select(-1)}
          onClick={(e) => {
            // a tap reads it; with a mouse, hovering already did
            if (e.detail !== 0 && window.matchMedia('(pointer: fine)').matches) return;
            select(on ? -1 : i);
          }}
          className={`invisible pointer-events-auto block w-full rounded-2xl border p-1.5 transition-[background-color,border-color,box-shadow] duration-300
            focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7fa6ff]
            ${on ? 'border-[#9dbbff] bg-[#0a2a80] shadow-[0_0_34px_-6px_rgb(59_123_247/0.8)]' : 'border-white/12 bg-[#050d3a]'}`}
        >
          <Plate client={c} sizes="176px" className="h-[clamp(2.75rem,8.5vh,4.75rem)]" />
          <span className="mt-1 flex items-center justify-between px-1 font-mono text-[9px] xl:text-[10px] font-bold">
            <span className={`transition-colors duration-300 ${on ? 'text-white' : 'text-[#7fa6ff]'}`}>{String(i + 1).padStart(2, '0')}</span>
            <span className={`h-1.5 w-1.5 rounded-full transition-colors duration-300 ${on ? 'bg-white' : 'bg-[#7fa6ff]'}`} />
          </span>
        </button>
      </li>
    );
  };

  return (
    <div data-sm="panel-clients" className="absolute left-[118%] top-[118%] flex h-full w-full flex-col items-center justify-center pt-[calc(var(--header-h)*0.5)]">
      <div data-sm="clients-head" className="invisible text-center">
        <ClientsHeading clients={clients} id="sm-clients-title" />
      </div>
      <div aria-labelledby="sm-clients-title" role="group" className="mt-[clamp(1rem,3vh,2rem)] w-full max-w-[1360px] px-14 xl:px-12">
        <ul className="flex justify-center gap-[clamp(0.5rem,1.1vw,1rem)]">{clients.slice(0, half).map((c, i) => socket(c, i))}</ul>
        {/* The bus runs through this gap (drawn on the canvas under the board) */}
        <div data-sm="client-bus" aria-hidden="true" className="h-[clamp(2rem,6.5vh,3.5rem)]" />
        <ul className="flex justify-center gap-[clamp(0.5rem,1.1vw,1rem)]">{clients.slice(half).map((c, i) => socket(c, i + half))}</ul>
      </div>
      <div data-sm="client-readout" className="invisible mt-[clamp(0.75rem,2.5vh,1.5rem)] min-h-[3.25rem] w-full max-w-md px-6 text-center">
        {current ? (
          <>
            <p className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.2em] font-bold text-[#9dbbff]">
              <Scramble text={current.name} playKey={active} duration={350} />
            </p>
            {current.description && <p className="mt-1 text-[13px] xl:text-sm text-white/75 leading-relaxed line-clamp-2">{current.description}</p>}
          </>
        ) : (
          <p className="text-[13px] xl:text-sm text-white/55 leading-relaxed">
            <span className="pointer-coarse:hidden">Hover a client to read about them.</span>
            <span className="hidden pointer-coarse:inline">Tap a client to read about them.</span>
          </p>
        )}
      </div>
    </div>
  );
}

// Keeps the name card on screen when a logo sits near the edge
const keepOnScreen = (el: HTMLElement | null) => {
  if (!el) return;
  el.style.marginLeft = '0px';
  const r = el.getBoundingClientRect();
  const edge = 12;
  const shift = r.left < edge ? edge - r.left : r.right > window.innerWidth - edge ? window.innerWidth - edge - r.right : 0;
  el.style.marginLeft = `${Math.round(shift)}px`;
};

/** Phones, tablets and reduced motion: the route's line carries on after the orbit, with the logos branching off it either side. */
export function ClientRoute({ clients }: { clients: MapClient[] }) {
  const ref = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(-1);

  useGSAP(
    () => {
      if (!clients.length) return;
      const mm = gsap.matchMedia(ref.current!);
      mm.add(ROUTE, () => {
        gsap.fromTo('[data-cl="head"]', { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, ease: 'power2.out', scrollTrigger: { trigger: '[data-cl="head"]', start: 'top 92%', end: 'top 72%', scrub: 0.4 } });
        gsap.fromTo('[data-cl="bus"]', { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '[data-cl="list"]', start: 'top 88%', end: 'bottom 72%', scrub: 0.4 } });
        gsap.utils.toArray<HTMLElement>('[data-cl="row"]', ref.current).forEach((row, i) => {
          const towardsLine = i % 2 ? -26 : 26; // (they come out of the line, so they never start off the side of the screen)
          const scrollTrigger = { trigger: row, start: 'top 90%', end: 'top 68%', scrub: 0.4 };
          gsap.fromTo(row.querySelector('[data-cl="stub"]'), { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger });
          gsap.fromTo(row.querySelector('[data-cl="card"]'), { x: towardsLine, scale: 0.95, autoAlpha: 0 }, { x: 0, scale: 1, autoAlpha: 1, ease: 'power2.out', scrollTrigger });
        });
      });
      return () => mm.revert();
    },
    { scope: ref, dependencies: [clients], revertOnUpdate: true },
  );

  if (!clients.length) return null;

  return (
    <section ref={ref} aria-labelledby="sm-clients-route-title" className="mx-auto max-w-xl px-4 sm:px-6 pt-10 pb-8 text-center">
      <div data-cl="head">
        <ClientsHeading clients={clients} id="sm-clients-route-title" />
      </div>
      <div className="relative mt-6">
        <div data-cl="bus" aria-hidden="true" className="absolute inset-y-0 left-1/2 w-px origin-top bg-[#7fa6ff]/50" />
        <ul data-cl="list" className="relative grid grid-cols-2 gap-x-7 gap-y-3 sm:gap-x-9">
          {clients.map((c, i) => (
            <li key={c.id} data-cl="row" className="relative has-[[role=tooltip]]:z-10">
              {/* The branch from the line to this logo */}
              <span data-cl="stub" aria-hidden="true" className={`absolute top-1/2 h-px w-3.5 bg-[#7fa6ff]/50 sm:w-[1.125rem] ${i % 2 ? 'right-full origin-right' : 'left-full origin-left'}`} />
              <div data-cl="card">
                <button
                  type="button"
                  aria-label={c.description ? `${c.name}: ${c.description}` : c.name}
                  onPointerEnter={(e) => {
                    if (e.pointerType === 'mouse') setOpen(i);
                  }}
                  onPointerLeave={(e) => {
                    if (e.pointerType === 'mouse') setOpen(-1);
                  }}
                  onFocus={(e) => {
                    if (e.target.matches(':focus-visible')) setOpen(i);
                  }}
                  onBlur={() => setOpen(-1)}
                  onClick={(e) => {
                    // a tap toggles; with a mouse, hovering already opened it
                    if (e.detail !== 0 && window.matchMedia('(pointer: fine)').matches) return;
                    setOpen(open === i ? -1 : i);
                  }}
                  className={`block w-full rounded-2xl border p-1.5 transition-[background-color,border-color] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7fa6ff] ${open === i ? 'border-[#9dbbff] bg-[#0a2a80]' : 'border-white/12 bg-[#050d3a]'}`}
                >
                  <Plate client={c} sizes="240px" className="h-14 sm:h-16" />
                </button>
              </div>
              {open === i && (
                <span
                  ref={keepOnScreen}
                  role="tooltip"
                  className="pointer-events-none absolute bottom-full left-1/2 mb-2 block w-max max-w-[15rem] -translate-x-1/2 rounded-lg border border-[#7fa6ff]/40 bg-[#0a2a80] px-3 py-1.5 text-left shadow-lg"
                >
                  <span className="block font-display font-bold uppercase text-[12px] tracking-tight text-white">{c.name}</span>
                  {c.description && <span className="block mt-0.5 text-[11px] leading-snug text-white/75">{c.description}</span>}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
