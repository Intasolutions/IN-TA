'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Icon from '../../Icon';
import { ALL_BLOCKS, BOARD, LINKS, type Block, type BlockKind } from '../floorplan';
import { slugOf } from './PartStage';
import { optimisable, type DetailFaq, type DetailTool, type RelatedService } from './types';

// ---- Tools: two rows running opposite ways, or one still row when there are only a few ----

function ToolTile({ tool }: { tool: DetailTool }) {
  return (
    <span className="flex h-12 shrink-0 items-center gap-2.5 rounded-xl border border-white/15 bg-white px-3.5 shadow-sm">
      {tool.logo && (
        <span className="relative h-7 w-7 shrink-0">
          <Image src={tool.logo} alt="" fill sizes="28px" unoptimized={!optimisable(tool.logo)} className="object-contain" />
        </span>
      )}
      <span className="whitespace-nowrap font-mono text-[10px] font-bold uppercase tracking-wider text-midnight sm:text-[11px]">{tool.name}</span>
    </span>
  );
}

function ToolRow({ tools, reverse = false }: { tools: DetailTool[]; reverse?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const row = ref.current!;
    const seen = new IntersectionObserver(([e]) => {
      row.style.animationPlayState = e.isIntersecting ? '' : 'paused';
    });
    seen.observe(row);
    return () => seen.disconnect();
  }, []);
  // half of the moving row has to be wider than the widest screen, or a gap would show as it loops
  const sets = Math.max(1, Math.ceil(2800 / (tools.length * 165))) * 2;
  return (
    <div className="overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_5%,#000_95%,transparent)]">
      <div ref={ref} className="flex w-max animate-marquee motion-reduce:animate-none" style={{ animationDuration: `${Math.max(24, tools.length * 5) * (sets / 2)}s`, animationDirection: reverse ? 'reverse' : 'normal' }}>
        {Array.from({ length: sets }, (_, n) => (
          <ul key={n} aria-hidden={n > 0 || undefined} className="flex shrink-0 gap-2.5 pr-2.5">
            {tools.map((t) => <li key={t.name}><ToolTile tool={t} /></li>)}
          </ul>
        ))}
      </div>
    </div>
  );
}

export function Toolchain({ tools }: { tools: DetailTool[] }) {
  if (tools.length <= 5) {
    return (
      <ul className="flex flex-wrap gap-2.5">
        {tools.map((t) => <li key={t.name}><ToolTile tool={t} /></li>)}
      </ul>
    );
  }
  const half = Math.ceil(tools.length / 2);
  return (
    <div className="space-y-2.5">
      <ToolRow tools={tools.slice(0, half)} />
      <ToolRow tools={tools.slice(half)} reverse />
    </div>
  );
}

// ---- Questions: asked at a prompt, and answered as if typed ----

function Typed({ text, go }: { text: string; go: boolean }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!go) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const id = window.setTimeout(() => setShown(text.length), 0);
      return () => window.clearTimeout(id);
    }
    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const n = Math.min(text.length, Math.round((now - start) * 0.11));
      setShown(n);
      if (n < text.length) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      setShown(0);
    };
  }, [go, text]);
  return (
    <span className="relative block">
      {/* the whole answer holds the space and is what's read aloud; the typing sits on top of it */}
      <span className="invisible block">{text}</span>
      <span aria-hidden="true" className="absolute inset-0 block">
        {text.slice(0, shown)}
        {shown < text.length && <span className="ml-0.5 inline-block h-[1em] w-[0.5em] translate-y-[0.15em] bg-[#9dbbff]" />}
      </span>
    </span>
  );
}

export function Questions({ faqs, windowTitle }: { faqs: DetailFaq[]; windowTitle: string }) {
  const [open, setOpen] = useState(0);
  return (
    <div className="overflow-hidden rounded-2xl border border-white/12 bg-[#040c38]">
      <p aria-hidden="true" className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-white/55">
        <span className="h-2 w-2 rounded-full bg-[#5b8cff]" />
        {windowTitle}
      </p>
      <ul className="divide-y divide-white/10">
        {faqs.map((f, i) => {
          const isOpen = open === i;
          return (
            <li key={f.id}>
              <h3>
                <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? -1 : i)} className="flex w-full items-start gap-3 px-4 py-3.5 text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#9dbbff] sm:px-5 sm:py-4">
                  <span aria-hidden="true" className="mt-0.5 font-mono text-sm font-bold text-[#9dbbff] sm:text-base">&gt;</span>
                  <span className="heading-sub flex-1 text-white">{f.question}</span>
                  <Icon name="add" className={`mt-0.5 shrink-0 text-[20px] text-[#9dbbff] transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`} />
                </button>
              </h3>
              <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <div className="overflow-hidden">
                  <p className="px-4 pb-4 pl-[2.1rem] text-[15px] leading-relaxed text-white/85 sm:px-5 sm:pb-5 sm:pl-[2.6rem]"><Typed text={f.answer} go={isOpen} /></p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ---- The board again, seen from above: this part, and the copper that joins it to the others ----

const percent = (v: number) => `${((v + BOARD.half) / (BOARD.half * 2)) * 100}%`;
const size = (v: number) => `${(v / (BOARD.half * 2)) * 100}%`;

export function BoardMap({ block, related, formId, linkLabel }: { block: Block; related: RelatedService[]; formId: string; linkLabel: string }) {
  const [hot, setHot] = useState<BlockKind | null>(null);
  const joined = LINKS.filter((l) => l.from === block.kind || l.to === block.kind);
  const near = new Set(joined.map((l) => (l.from === block.kind ? l.to : l.from)));
  const list = ALL_BLOCKS.flatMap((b) => {
    if (!near.has(b.kind)) return [];
    const service = related.find((r) => r.slug === slugOf(b));
    return service ? [{ b, service }] : [];
  });
  const h = BOARD.half;

  return (
    <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-12">
      <div className="relative mx-auto aspect-square w-full max-w-[34rem] overflow-hidden rounded-2xl bg-white shadow-[0_30px_90px_-30px_rgb(59_123_247/0.9)]">
        <svg aria-hidden="true" viewBox={`${-h} ${-h} ${h * 2} ${h * 2}`} className="absolute inset-0 h-full w-full">
          {LINKS.map((l) => {
            const mine = l.from === block.kind || l.to === block.kind;
            const lit = mine && (hot === null || hot === l.from || hot === l.to);
            return (
              <polyline
                key={`${l.from}-${l.to}`}
                points={l.path.map((p) => p.join(',')).join(' ')}
                fill="none"
                stroke={lit ? '#2563eb' : '#b6c6ea'}
                strokeWidth={lit ? 0.028 : 0.014}
                strokeLinecap="round"
                strokeLinejoin="round"
                className={lit ? 'trace-flow' : undefined}
              />
            );
          })}
        </svg>
        {ALL_BLOCKS.map((b) => {
          const [x0, z0, x1, z1] = b.rect;
          const me = b.kind === block.kind;
          const socket = b.kind === 'yours';
          const close = near.has(b.kind);
          const slug = slugOf(b);
          const tile = `absolute flex items-center justify-center rounded-md p-1 text-center font-mono text-[8px] font-bold uppercase leading-tight tracking-wider transition-[opacity,background-color,box-shadow] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue sm:text-[10px] ${
            me ? 'bg-brand-blue text-white shadow-[0_0_0_3px_rgb(37_99_235/0.25)]' : socket ? 'border-2 border-dashed border-midnight/30 text-midnight/70 hover:border-brand-blue hover:text-brand-blue' : `bg-[#1a2a5e] text-white hover:bg-midnight ${close || hot === b.kind ? '' : 'opacity-45 hover:opacity-100'} ${hot === b.kind ? 'shadow-[0_0_0_3px_rgb(37_99_235/0.45)]' : ''}`
          }`;
          const place = { left: percent(x0), top: percent(z0), width: size(x1 - x0), height: size(z1 - z0) };
          if (me) return <span key={b.id} aria-current="page" className={tile} style={place}>{b.short}</span>;
          if (socket) return <a key={b.id} href={`#${formId}`} className={tile} style={place}>{b.short}</a>;
          return slug ? <Link key={b.id} href={`/services/${slug}`} onPointerEnter={() => setHot(b.kind)} onPointerLeave={() => setHot(null)} className={tile} style={place}>{b.short}</Link> : null;
        })}
      </div>

      <div>
        <ul className="divide-y divide-white/10 border-y border-white/10">
          {list.map(({ b, service }) => (
            <li key={b.id}>
              <Link
                href={`/services/${service.slug}`}
                onPointerEnter={() => setHot(b.kind)}
                onPointerLeave={() => setHot(null)}
                onFocus={() => setHot(b.kind)}
                onBlur={() => setHot(null)}
                className="group flex items-center gap-3 py-2.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9dbbff] sm:py-3"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-mono text-[10px] font-bold uppercase tracking-wider text-[#9dbbff]">{b.part}</span>
                  <span className="heading-sub block text-white transition-colors duration-300 group-hover:text-[#9dbbff]">{service.title}</span>
                </span>
                <Icon name="north_east" className="shrink-0 text-[18px] text-[#9dbbff] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/services" className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/25 px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-wider text-white transition-colors duration-300 hover:border-[#9dbbff] hover:text-[#9dbbff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9dbbff]">
          {linkLabel} <Icon name="east" className="text-[15px]" />
        </Link>
      </div>
    </div>
  );
}
