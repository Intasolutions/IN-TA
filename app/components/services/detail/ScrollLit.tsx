'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const paragraphsOf = (text: string) => text.split(/\r?\n\s*\r?\n/).map((p) => p.trim()).filter(Boolean);

/** A description that lights up word by word as it's scrolled through, and goes dim again on the way back */
export default function ScrollLit({ text }: { text: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = ref.current!;
      const words = gsap.utils.toArray<HTMLElement>('[data-w]', root);
      let lit = 0;
      const light = (p: number) => {
        const next = Math.round(p * words.length);
        for (let i = Math.min(lit, next); i < Math.max(lit, next); i++) words[i].dataset.on = i < next ? 'true' : 'false';
        lit = next;
      };
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        light(1);
        return;
      }
      ScrollTrigger.create({
        trigger: root,
        start: 'top 82%',
        end: 'bottom 58%',
        onUpdate: (st) => light(st.progress),
        onRefresh: (st) => light(st.progress),
        onLeave: () => light(1),
        onLeaveBack: () => light(0),
      });
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className="space-y-4 text-[17px] font-light leading-relaxed text-white sm:text-xl sm:leading-relaxed">
      {paragraphsOf(text).map((paragraph, i) => (
        <p key={i}>
          {paragraph.split(/\s+/).map((word, n) => (
            <span key={n} data-w data-on="false" className="opacity-30 transition-opacity duration-300 data-[on=true]:opacity-100">
              {word}{' '}
            </span>
          ))}
        </p>
      ))}
    </div>
  );
}
