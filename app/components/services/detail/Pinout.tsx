'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const pinNumber = (i: number) => String(i + 1).padStart(2, '0');

/** What's included, drawn the way a chip's datasheet draws it: the part in the middle and each feature on its own pin. The pins light up one by one as the page scrolls, and go out again on the way back. */
export default function Pinout({ part, name, features }: { part: string; name: string; features: string[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = ref.current!;
      const pins = gsap.utils.toArray<HTMLElement>('[data-pin]', root);
      const light = (p: number) => {
        root.dataset.lit = String(p > 0);
        pins.forEach((el, i) => {
          const lit = String(p * pins.length > i);
          if (el.dataset.lit !== lit) el.dataset.lit = lit;
        });
      };
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        light(1);
        return;
      }
      ScrollTrigger.create({
        trigger: root,
        start: 'top 80%',
        end: 'bottom 66%',
        onUpdate: (st) => light(st.progress),
        onRefresh: (st) => light(st.progress),
        onLeave: () => light(1),
        onLeaveBack: () => light(0),
      });
    },
    { scope: ref },
  );

  return (
    <div
      ref={ref}
      data-lit="false"
      className="group/chip mt-6 grid sm:mt-9 lg:auto-rows-[minmax(2.75rem,auto)] lg:grid-cols-[minmax(0,1fr)_minmax(13rem,19rem)_minmax(0,1fr)]"
      style={{ '--rows': Math.ceil(features.length / 2) } as React.CSSProperties}
    >
      <div className="relative flex min-h-24 flex-col items-center justify-center rounded-2xl border border-[#5b8cff]/40 bg-linear-to-br from-[#263c80] to-[#111f55] p-4 text-center shadow-[0_18px_50px_-22px_rgb(59_123_247/0.35)] transition-shadow duration-700 group-data-[lit=true]/chip:shadow-[0_18px_70px_-12px_rgb(59_123_247/0.75)] lg:min-h-40 lg:[grid-column:2] lg:[grid-row:1/span_var(--rows)]">
        <span aria-hidden="true" className="absolute left-3 top-3 h-0 w-0 border-t-[9px] border-r-[9px] border-t-white border-r-transparent" />
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#9dbbff]">{part}</span>
        <span className="heading-sub mt-1.5 text-white">{name}</span>
      </div>

      <ul className="contents">
        {features.map((feature, i) => {
          const left = i % 2 === 0;
          return (
            <li
              key={feature}
              data-pin
              data-lit="false"
              className="group relative flex items-center gap-3 py-2 pl-5 lg:gap-0 lg:py-0 lg:pl-0 lg:[grid-column:var(--c)] lg:[grid-row:var(--r)]"
              style={{ '--c': left ? 1 : 3, '--r': Math.floor(i / 2) + 1 } as React.CSSProperties}
            >
              {/* on a phone the pins hang off one line down the side */}
              <span aria-hidden="true" className="absolute inset-y-0 left-5 w-px bg-white/20 transition-colors duration-500 group-data-[lit=true]:bg-[#5b8cff] lg:hidden" />
              <span className={`order-3 flex min-w-0 items-baseline gap-2.5 font-mono text-[11px] font-bold uppercase tracking-wider text-white/60 transition-colors duration-500 group-hover:text-[#9dbbff] group-data-[lit=true]:text-white group-data-[lit=true]:group-hover:text-[#9dbbff] sm:text-xs lg:max-w-[78%] ${left ? 'lg:order-1 lg:flex-row-reverse lg:text-right' : 'lg:order-3'}`}>
                <span aria-hidden="true" className="text-[#9dbbff]">{pinNumber(i)}</span>
                <span>{feature}</span>
              </span>
              <span aria-hidden="true" className={`relative order-1 h-px w-5 shrink-0 overflow-hidden bg-white/20 transition-colors duration-500 group-data-[lit=true]:bg-[#5b8cff]/70 lg:order-2 lg:w-auto lg:min-w-8 lg:flex-1 ${left ? 'lg:ml-3' : 'lg:mr-3'}`}>
                <span className={`pin-pulse absolute inset-y-0 left-0 w-1/3 bg-linear-to-r from-transparent via-white to-transparent opacity-0 group-data-[lit=true]:opacity-100 max-lg:hidden ${left ? 'pin-pulse-back' : ''}`} />
              </span>
              <span aria-hidden="true" className={`order-2 h-2 w-3 shrink-0 rounded-[2px] bg-white/25 transition-[background-color,box-shadow] duration-500 group-hover:bg-white group-data-[lit=true]:bg-[#5b8cff] group-data-[lit=true]:shadow-[0_0_12px_2px_rgb(91_140_255/0.7)] group-data-[lit=true]:group-hover:bg-white ${left ? 'lg:order-3' : 'lg:order-1'}`} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
