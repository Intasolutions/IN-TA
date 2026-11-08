'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import Icon from '../../Icon';
import { optimisable, type DetailImage, type DetailProject } from './types';

gsap.registerPlugin(useGSAP);

const ROUND = 'inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-white/5 text-white transition-colors duration-300 hover:bg-white hover:text-midnight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9dbbff] disabled:opacity-40';
const CARD = 'group block h-full w-full overflow-hidden rounded-2xl border border-white/12 bg-[#040c38] text-left transition-[border-color,box-shadow] duration-500 hover:border-[#5b8cff]/70 hover:shadow-[0_24px_70px_-30px_rgb(59_123_247/0.9)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#9dbbff]';
const FRAME = 'relative block aspect-[16/10] overflow-hidden bg-midnight';
const PICTURE = 'object-contain transition-transform duration-700 group-hover:scale-[1.03]';

/** In real use: finished work and pictures on one row that can be dragged and flicked. Nothing is ever cropped. */
export default function Gallery({ images, projects, liveTag }: { images: DetailImage[]; projects: DetailProject[]; liveTag: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLUListElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(-1);

  // the cards lean into the movement
  useGSAP(
    () => {
      const row = rowRef.current!;
      const bar = rootRef.current!.querySelector<HTMLElement>('[data-bar]');
      const progress = () => {
        const room = row.scrollWidth - row.clientWidth;
        if (bar) bar.style.transform = `scaleX(${room > 0 ? Math.max(0.06, row.scrollLeft / room) : 1})`;
      };
      progress();
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        row.addEventListener('scroll', progress, { passive: true });
        return () => row.removeEventListener('scroll', progress);
      }
      const cards = gsap.utils.toArray<HTMLElement>('[data-shot]', row);
      const leans = cards.map((c) => gsap.quickTo(c, 'rotationY', { duration: 0.5, ease: 'power3.out' }));
      let last = row.scrollLeft;
      let settle = 0;
      const onScroll = () => {
        const speed = row.scrollLeft - last;
        last = row.scrollLeft;
        const lean = Math.max(-16, Math.min(16, speed * 0.45));
        leans.forEach((set) => set(lean));
        window.clearTimeout(settle);
        settle = window.setTimeout(() => leans.forEach((set) => set(0)), 90);
        progress();
      };
      row.addEventListener('scroll', onScroll, { passive: true });

      // a mouse can drag it, as a finger can
      let down = false;
      let startX = 0;
      let startLeft = 0;
      let dragged = 0;
      const onDown = (e: PointerEvent) => {
        if (e.pointerType !== 'mouse') return;
        down = true;
        startX = e.clientX;
        startLeft = row.scrollLeft;
        dragged = 0;
      };
      const onMove = (e: PointerEvent) => {
        if (!down) return;
        dragged = Math.max(dragged, Math.abs(e.clientX - startX));
        row.scrollLeft = startLeft - (e.clientX - startX);
      };
      const onUp = () => {
        down = false;
      };
      const noClickAfterDrag = (e: MouseEvent) => {
        if (dragged > 6) {
          e.preventDefault();
          e.stopPropagation();
        }
      };
      row.addEventListener('pointerdown', onDown);
      window.addEventListener('pointermove', onMove, { passive: true });
      window.addEventListener('pointerup', onUp, { passive: true });
      row.addEventListener('click', noClickAfterDrag, true);
      return () => {
        row.removeEventListener('scroll', onScroll);
        row.removeEventListener('pointerdown', onDown);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        row.removeEventListener('click', noClickAfterDrag, true);
        window.clearTimeout(settle);
      };
    },
    { scope: rootRef },
  );

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open >= 0 && !d.open) d.showModal();
    if (open < 0 && d.open) d.close();
  }, [open]);

  const nudge = (dir: number) => {
    const row = rowRef.current;
    if (row) row.scrollBy({ left: dir * Math.min(row.clientWidth * 0.8, 640), behavior: 'smooth' });
  };
  const current = open >= 0 ? images[open] : null;

  return (
    <div ref={rootRef}>
      <ul ref={rowRef} className="-mx-4 flex cursor-grab snap-x scroll-pl-4 gap-4 overflow-x-auto px-4 pb-3 [perspective:1200px] [scrollbar-width:none] active:cursor-grabbing sm:-mx-6 sm:scroll-pl-6 sm:px-6 [&::-webkit-scrollbar]:hidden">
        {projects.map((p) => {
          const body = (
            <>
              <span className={FRAME}>
                {p.hero && <Image src={p.hero} alt="" fill draggable={false} sizes="(min-width: 800px) 36rem, 84vw" quality={90} unoptimized={!optimisable(p.hero)} className={PICTURE} />}
                <span className="absolute left-3 top-3 rounded-md bg-midnight/85 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-[#9dbbff]">{liveTag}</span>
              </span>
              <span className="block p-4 sm:p-5">
                <span className="heading-sub block text-white">{p.title}</span>
                {p.role && <span className="mt-0.5 block font-mono text-[10px] font-bold uppercase tracking-wider text-[#9dbbff]">{p.role}</span>}
                {p.summary && <span className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-white/80">{p.summary}</span>}
              </span>
            </>
          );
          return (
            <li key={`p${p.id}`} data-shot className="w-[min(84vw,36rem)] shrink-0 snap-start">
              {p.url ? <a href={p.url} target="_blank" rel="noopener noreferrer" draggable={false} className={CARD}>{body}</a> : <Link href="/portfolio" draggable={false} className={CARD}>{body}</Link>}
            </li>
          );
        })}
        {images.map((item, i) => (
          <li key={item.id} data-shot className="w-[min(84vw,36rem)] shrink-0 snap-start">
            <button type="button" onClick={() => setOpen(i)} aria-label={`View full size${item.caption || item.alt ? `: ${item.caption || item.alt}` : ''}`} className={CARD}>
              <span className={FRAME}>
                <Image src={item.image} alt="" fill draggable={false} sizes="(min-width: 800px) 36rem, 84vw" quality={90} unoptimized={!optimisable(item.image)} className={PICTURE} />
                <span aria-hidden="true" className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-midnight opacity-0 shadow-md transition-opacity duration-300 group-hover:opacity-100">
                  <Icon name="open_in_full" className="text-[17px]" />
                </span>
              </span>
              {item.caption && <span className="block p-4 text-sm text-white/80">{item.caption}</span>}
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center gap-4">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
          <div data-bar className="h-full w-full origin-left rounded-full bg-[#5b8cff]" style={{ transform: 'scaleX(0.06)' }} />
        </div>
        <button type="button" onClick={() => nudge(-1)} aria-label="Previous pictures" className={ROUND}><Icon name="west" className="text-[18px]" /></button>
        <button type="button" onClick={() => nudge(1)} aria-label="More pictures" className={ROUND}><Icon name="east" className="text-[18px]" /></button>
      </div>

      <dialog
        ref={dialogRef}
        onClose={() => setOpen(-1)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(-1);
        }}
        aria-label="Full size picture"
        className="fixed inset-0 m-0 h-svh max-h-none w-screen max-w-none bg-midnight/95 p-3 text-white backdrop:bg-midnight/80 sm:p-6"
      >
        {current && (
          <div className="flex h-full flex-col gap-3" data-lenis-prevent>
            <div className="flex items-center justify-between gap-3">
              <p className="min-w-0 truncate text-sm text-white/90">{current.caption}</p>
              <button type="button" onClick={() => setOpen(-1)} aria-label="Close" className={`${ROUND} shrink-0`}><Icon name="close" className="text-[18px]" /></button>
            </div>
            <div className="relative min-h-0 flex-1">
              <Image key={current.id} src={current.image} alt={current.alt} fill sizes="100vw" quality={90} unoptimized={!optimisable(current.image)} className="object-contain" />
            </div>
            <div className="flex items-center justify-center gap-3">
              <button type="button" onClick={() => setOpen((open - 1 + images.length) % images.length)} aria-label="Previous picture" className={ROUND}><Icon name="west" className="text-[18px]" /></button>
              <span className="font-mono text-xs tabular-nums text-white/80">{open + 1} / {images.length}</span>
              <button type="button" onClick={() => setOpen((open + 1) % images.length)} aria-label="Next picture" className={ROUND}><Icon name="east" className="text-[18px]" /></button>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
