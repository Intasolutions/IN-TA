'use client';

import { useEffect, useRef, useState } from 'react';
import { scrollToY } from '../../SmoothScroll';

/** Where the page has got to, and a way to go straight anywhere */
export default function PageRail({ items }: { items: { id: string; label: string }[] }) {
  const ref = useRef<HTMLElement>(null);
  const [current, setCurrent] = useState(-1);
  useEffect(() => {
    const seen = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setCurrent(items.findIndex((i) => i.id === e.target.id));
          else if (e.target.id === items[0]?.id && e.boundingClientRect.top > 0) setCurrent(-1);
        });
      },
      { rootMargin: '-48% 0px -48% 0px' },
    );
    items.forEach((i) => {
      const el = document.getElementById(i.id);
      if (el) seen.observe(el);
    });
    return () => seen.disconnect();
  }, [items]);
  return (
    <nav ref={ref} aria-label="On this page" className={`fixed right-3 top-1/2 z-20 hidden -translate-y-1/2 flex-col items-center gap-2.5 rounded-full border border-white/12 bg-midnight/80 px-1.5 py-3 transition-opacity duration-500 lg:flex xl:right-5 ${current < 0 ? 'pointer-events-none opacity-0' : 'opacity-100'}`}>
      {items.map((item, i) => (
        <button
          key={item.id}
          type="button"
          aria-current={current === i ? 'true' : undefined}
          onClick={() => {
            const el = document.getElementById(item.id);
            if (el) scrollToY(el.getBoundingClientRect().top + window.scrollY - 20);
          }}
          className="group relative flex h-2.5 w-2.5 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9dbbff]"
        >
          <span className="pointer-events-none absolute right-full top-1/2 mr-4 -translate-y-1/2 whitespace-nowrap rounded bg-midnight px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100 xl:text-[10px]">{item.label}</span>
          <span className={`block rounded-full transition-[width,height,background-color] duration-300 ${current === i ? 'h-2.5 w-2.5 bg-[#9dbbff]' : 'h-1.5 w-1.5 bg-white/40 group-hover:bg-white'}`} />
        </button>
      ))}
    </nav>
  );
}
