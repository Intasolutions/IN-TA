'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import Icon from './Icon';
import { calm, playOnView } from './blog/data';
import { useSite, useText } from '../site/SiteContext';
import { accent } from '../site/site';

gsap.registerPlugin(useGSAP);

/**
 * The home page's questions, written in the admin (Site settings > Home page questions). There is no section at all until
 * the first one is added. Each is a <details>, so the answers are in the page for search engines and open without
 * scripts; the same questions are given to search engines as an FAQPage (site/schema.ts).
 */
export default function Questions() {
  const { faq } = useSite();
  const t = useText();
  const [titlePlain, titleBright] = accent(t('home_faq_title'));
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!faq.length) return;
      const move = (v: number) => (calm() ? 0 : v);
      const tl = gsap
        .timeline({ paused: true, defaults: { ease: 'expo.out' } })
        .from('[data-qa="kicker"]', { y: move(10), autoAlpha: 0, duration: 0.7 }, 0)
        .from('[data-qa="word"]', { yPercent: move(110), autoAlpha: calm() ? 0 : 1, duration: 1.1, stagger: 0.1 }, 0.1)
        .from('[data-qa="lede"]', { y: move(16), autoAlpha: 0, duration: 0.9 }, 0.3)
        .from('[data-qa="row"]', { y: move(24), autoAlpha: 0, duration: 0.9, stagger: 0.07 }, 0.3);
      return playOnView(ref.current, tl);
    },
    { scope: ref, dependencies: [faq.length] },
  );

  if (!faq.length) return null;

  return (
    <section ref={ref} id="faq" aria-labelledby="faq-title" className="max-w-[1520px] mx-auto px-4 sm:px-6 pt-12 sm:pt-16 lg:pt-20 pb-12 sm:pb-16">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-[calc(var(--header-h)+2rem)]">
            <span data-qa="kicker" className="font-mono text-[11px] text-brand-blue tracking-[0.3em] uppercase block mb-3 font-bold">
              {t('home_faq_kicker')}
            </span>
            <h2 id="faq-title" className="heading-section text-midnight">
              <span className="inline-block overflow-hidden align-bottom pb-[0.06em]"><span data-qa="word" className="inline-block">{titlePlain}</span></span>{' '}
              <span className="inline-block overflow-hidden align-bottom pb-[0.06em]"><span data-qa="word" className="heading-accent inline-block pb-[0.06em]">{titleBright}</span></span>
            </h2>
            <p data-qa="lede" className="mt-4 sm:mt-5 max-w-sm text-sm sm:text-[15px] leading-relaxed text-midnight/80">{t('home_faq_text')}</p>
          </div>
        </div>

        <ul className="lg:col-span-8 border-t border-brand-blue/15">
          {faq.map((f, i) => (
            <li key={i} data-qa="row" className="border-b border-brand-blue/15">
              <details className="group/qa">
                <summary className="flex cursor-pointer list-none items-start gap-4 sm:gap-6 py-5 sm:py-6 [&::-webkit-details-marker]:hidden rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-blue">
                  <span className="mt-1.5 w-10 shrink-0 font-mono text-[11px] font-bold tracking-wider text-brand-blue sm:text-xs">Q.{String(i + 1).padStart(2, '0')}</span>
                  <span className="flex-1 font-display text-lg font-bold leading-snug tracking-[-0.01em] text-midnight transition-colors duration-300 group-hover/qa:text-brand-blue sm:text-xl lg:text-[1.4rem]">{f.q}</span>
                  <span aria-hidden="true" className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-brand-blue/25 bg-white text-brand-blue transition-[rotate,background-color,color] duration-300 group-open/qa:rotate-45 group-open/qa:bg-brand-blue group-open/qa:text-white">
                    <Icon name="add" className="text-[18px]" />
                  </span>
                </summary>
                <div className="flex gap-4 sm:gap-6 pb-6 sm:pb-7">
                  <span className="w-10 shrink-0 font-mono text-[11px] font-bold tracking-wider text-[#1d7a4a] sm:text-xs">A.</span>
                  <div className="flex-1 max-w-[65ch] space-y-3 text-[15px] leading-relaxed text-midnight/80 sm:text-base">
                    {f.a.split(/\n\s*\n/).map((para, k) => (
                      <p key={k} className="whitespace-pre-line">{para.trim()}</p>
                    ))}
                  </div>
                  <span aria-hidden="true" className="hidden w-8 shrink-0 sm:block" />
                </div>
              </details>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
