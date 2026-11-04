'use client';

import { useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { refreshSoon } from './refresh';
import type { DetailBenefit } from './types';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const FOLD = 6;
const LABEL = 'font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#9dbbff] sm:text-[11px]';
const MORE = 'mt-1 ml-5 rounded-lg border border-white/20 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white transition-colors duration-300 hover:border-[#9dbbff] focus-visible:outline-2 focus-visible:outline-[#9dbbff] lg:hidden';
const pinNumber = (i: number) => String(i + 1).padStart(2, '0');

type Props = { part: string; name: string; inputs: string[]; outputs: DetailBenefit[]; inLabel: string; outLabel: string; showAll: (count: number) => string };

/**
 * What goes in and what comes out, drawn the way a chip's datasheet draws it. As the page scrolls a signal runs down
 * the inputs, through the part and out along what you get, and it runs back again on the way up.
 */
export default function Pinout({ part, name, inputs, outputs, inLabel, outLabel, showAll }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [allIn, setAllIn] = useState(false);
  const [allOut, setAllOut] = useState(false);

  useGSAP(
    () => {
      const root = ref.current!;
      const pinsIn = gsap.utils.toArray<HTMLElement>('[data-pin="in"]', root).filter((el) => el.offsetParent);
      const pinsOut = gsap.utils.toArray<HTMLElement>('[data-pin="out"]', root).filter((el) => el.offsetParent);
      const busIn = root.querySelector<HTMLElement>('[data-bus="in"]');
      const busOut = root.querySelector<HTMLElement>('[data-bus="out"]');
      const total = pinsIn.length + pinsOut.length;
      const set = (el: HTMLElement, lit: boolean) => {
        const value = String(lit);
        if (el.dataset.lit !== value) el.dataset.lit = value;
      };
      const light = (p: number) => {
        const reached = p * (total + 1);
        pinsIn.forEach((el, i) => set(el, reached > i));
        set(root, reached > pinsIn.length);
        pinsOut.forEach((el, i) => set(el, reached > pinsIn.length + 1 + i));
        if (busIn) busIn.style.transform = `scaleY(${Math.min(1, reached / Math.max(1, pinsIn.length)).toFixed(3)})`;
        if (busOut) busOut.style.transform = `scaleY(${Math.min(1, Math.max(0, reached - pinsIn.length - 1) / Math.max(1, pinsOut.length)).toFixed(3)})`;
      };
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        light(1);
        return;
      }
      ScrollTrigger.create({
        trigger: root,
        start: 'top 74%',
        end: 'bottom 62%',
        onUpdate: (st) => light(st.progress),
        onRefresh: (st) => light(st.progress),
        onLeave: () => light(1),
        onLeaveBack: () => light(0),
      });
    },
    { scope: ref, dependencies: [allIn, allOut], revertOnUpdate: true },
  );

  const both = inputs.length > 0 && outputs.length > 0;

  return (
    <div
      ref={ref}
      data-lit="false"
      className={`group/chip mt-6 grid gap-y-5 sm:mt-9 ${both ? 'lg:grid-cols-[minmax(0,1fr)_minmax(12rem,17rem)_minmax(0,1.25fr)]' : outputs.length ? 'lg:grid-cols-[minmax(12rem,17rem)_minmax(0,1fr)]' : 'lg:grid-cols-[minmax(0,1fr)_minmax(12rem,17rem)]'}`}
    >
      {/* ---- What goes in ---- */}
      {inputs.length > 0 && (
        <div className="lg:order-1">
          <p className={`${LABEL} mb-2 lg:text-right lg:pr-5`}>{inLabel}</p>
          <div className="relative">
            <span aria-hidden="true" className="absolute inset-y-0 left-5 w-px bg-white/15 lg:left-auto lg:right-0" />
            <span aria-hidden="true" data-bus="in" className="absolute inset-y-0 left-5 w-px origin-top scale-y-0 bg-[#5b8cff] shadow-[0_0_8px_rgb(91_140_255/0.9)] lg:left-auto lg:right-0" />
            <ul>
              {inputs.map((feature, i) => (
                <li key={feature} data-pin="in" data-lit="false" className={`group relative flex items-center gap-3 py-1.5 pl-5 lg:justify-end lg:gap-0 lg:py-2 lg:pl-0 ${!allIn && i >= FOLD ? 'max-lg:hidden' : ''}`}>
                  <span className="order-3 flex min-w-0 items-baseline gap-2.5 font-mono text-[11px] font-bold uppercase tracking-wider text-white/60 transition-colors duration-500 group-hover:text-[#9dbbff] group-data-[lit=true]:text-white sm:text-xs lg:order-1 lg:flex-row-reverse lg:text-right">
                    <span aria-hidden="true" className="text-[#9dbbff]">{pinNumber(i)}</span>
                    <span>{feature}</span>
                  </span>
                  <span aria-hidden="true" className="order-1 h-px w-5 shrink-0 bg-white/20 transition-colors duration-500 group-data-[lit=true]:bg-[#5b8cff] lg:order-2 lg:ml-3 lg:w-5" />
                  <span aria-hidden="true" className="order-2 h-2 w-3 shrink-0 rounded-[2px] bg-white/25 transition-[background-color,box-shadow] duration-500 group-data-[lit=true]:bg-[#5b8cff] group-data-[lit=true]:shadow-[0_0_12px_2px_rgb(91_140_255/0.7)] lg:hidden" />
                </li>
              ))}
            </ul>
          </div>
          {!allIn && inputs.length > FOLD && (
            <button type="button" onClick={() => { setAllIn(true); refreshSoon(); }} className={MORE}>{showAll(inputs.length)}</button>
          )}
        </div>
      )}

      {/* ---- The part, which stays alongside while the lists go past ---- */}
      <div className={`relative lg:sticky lg:top-[calc(50svh-6rem)] lg:mx-5 lg:self-start ${inputs.length ? 'lg:order-2' : 'lg:order-1'}`}>
        <div className="relative flex min-h-24 flex-col items-center justify-center rounded-2xl border border-[#5b8cff]/40 bg-linear-to-br from-[#263c80] to-[#111f55] p-4 text-center shadow-[0_18px_50px_-22px_rgb(59_123_247/0.35)] transition-shadow duration-700 group-data-[lit=true]/chip:shadow-[0_18px_80px_-10px_rgb(59_123_247/0.85)] lg:min-h-48">
          <span aria-hidden="true" className="absolute left-3 top-3 h-0 w-0 border-t-[9px] border-r-[9px] border-t-white border-r-transparent" />
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#9dbbff]">{part}</span>
          <span className="heading-sub mt-1.5 text-white">{name}</span>
        </div>
        {inputs.length > 0 && <span aria-hidden="true" className="absolute -left-5 top-1/2 hidden h-px w-5 bg-white/25 transition-colors duration-500 group-data-[lit=true]/chip:bg-[#5b8cff] lg:block" />}
        {outputs.length > 0 && <span aria-hidden="true" className="absolute -right-5 top-1/2 hidden h-px w-5 bg-white/25 transition-colors duration-500 group-data-[lit=true]/chip:bg-[#5b8cff] lg:block" />}
      </div>

      {/* ---- What comes out ---- */}
      {outputs.length > 0 && (
        <div className="lg:order-3">
          <p className={`${LABEL} mb-2 lg:pl-5`}>{outLabel}</p>
          <div className="relative">
            <span aria-hidden="true" className="absolute inset-y-0 left-5 w-px bg-white/15 lg:left-0" />
            <span aria-hidden="true" data-bus="out" className="absolute inset-y-0 left-5 w-px origin-top scale-y-0 bg-[#5b8cff] shadow-[0_0_8px_rgb(91_140_255/0.9)] lg:left-0" />
            <ul>
              {outputs.map((benefit, i) => (
                <li key={benefit.id} data-pin="out" data-lit="false" className={`group relative flex items-start gap-3 py-1.5 pl-5 lg:gap-0 lg:py-2 lg:pl-0 ${!allOut && i >= FOLD ? 'max-lg:hidden' : ''}`}>
                  <span aria-hidden="true" className="mt-2 h-px w-5 shrink-0 bg-white/20 transition-colors duration-500 group-data-[lit=true]:bg-[#5b8cff]" />
                  <span aria-hidden="true" className="mt-1 h-2 w-3 shrink-0 rounded-[2px] bg-white/25 transition-[background-color,box-shadow] duration-500 group-data-[lit=true]:bg-[#5b8cff] group-data-[lit=true]:shadow-[0_0_12px_2px_rgb(91_140_255/0.7)] lg:mr-3" />
                  <span className="min-w-0">
                    <span className="block font-mono text-[11px] font-bold uppercase tracking-wider text-white/60 transition-colors duration-500 group-hover:text-[#9dbbff] group-data-[lit=true]:text-white sm:text-xs">{benefit.title}</span>
                    {benefit.description && <span className="mt-0.5 block text-sm leading-relaxed text-white/60 transition-colors duration-500 group-data-[lit=true]:text-white/85">{benefit.description}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          {!allOut && outputs.length > FOLD && (
            <button type="button" onClick={() => { setAllOut(true); refreshSoon(); }} className={MORE}>{showAll(outputs.length)}</button>
          )}
        </div>
      )}
    </div>
  );
}
