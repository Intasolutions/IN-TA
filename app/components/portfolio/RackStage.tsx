'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from 'react';
import Image from 'next/image';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import Icon from '../Icon';
import { jumpToY, scrollToY } from '../SmoothScroll';
import { useReveal } from '../../context/RevealContext';
import { usePlayIntro } from '../../context/usePlayIntro';
import { refreshSoon } from '../services/detail/refresh';
import { splitAccent } from '../services/detail/types';
import { optimisable, sharedTags, type RackProject } from './data';
import { useText } from '../../site/SiteContext';
import { accent } from '../../site/site';

gsap.registerPlugin(ScrollTrigger, useGSAP);

// In screens of scrolling. Everything reads from this one clock, so all of it runs backwards when the visitor scrolls back.
const INTRO_HOLD = 0.5;
const INTRO_TRAVEL = 1.1;
const DWELL = 0.46;
const GAP = 0.95;
const CLOSE_TRAVEL = 0.8;
const CLOSE_HOLD = 0.42;

// The rows of the rack above the projects (the maker's plate and the patch panel), and below them (the empty slot, a vent and the power strip)
const ROWS_ABOVE = 3;
const ROWS_BELOW = 3;

// The way in: the part of the scroll the screens take to come home
const HOME_FROM = 0.03;
const HOME_RUN = 0.42;
const HOME_BY = 0.95;
const TAU = Math.PI * 2;
// The fastest a laptop can open and shut, however fast the visitor scrolls
const OPEN_PER_SECOND = 1 / 1.8;
const SHUT_PER_SECOND = 1 / 1.5;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const ramp = (x: number, a: number, b: number) => clamp01((x - a) / (b - a));
const smooth = (x: number, a: number, b: number) => {
  const t = ramp(x, a, b);
  return t * t * (3 - 2 * t);
};
const smoother = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
function timing(n: number) {
  const arrive: number[] = [];
  const leave: number[] = [];
  let s = INTRO_HOLD + INTRO_TRAVEL;
  for (let i = 0; i < n; i++) {
    arrive.push(s);
    leave.push(s + DWELL);
    s += DWELL + GAP;
  }
  const closeAt = (n ? leave[n - 1] : INTRO_HOLD) + CLOSE_TRAVEL;
  return { arrive, leave, closeAt, total: closeAt + CLOSE_HOLD };
}

/** A way of looking at the rack: the row in the middle of it, where that row lands on the screen, how big, and from what angle */
type View = { row: number; px: number; py: number; scale: number; ry: number; rx: number };
type Key = View & { s: number; travel?: boolean; hop?: number };

function viewAt(keys: Key[], s: number): View {
  let i = 0;
  while (i < keys.length - 2 && s >= keys[i + 1].s) i += 1;
  const a = keys[i];
  const b = keys[i + 1];
  const t = clamp01((s - a.s) / (b.s - a.s));
  const k = b.travel ? smoother(t) : t;
  const scale = Math.exp(lerp(Math.log(a.scale), Math.log(b.scale), k)) * (b.hop ? 1 - b.hop * Math.sin(Math.PI * t) : 1);
  return { row: lerp(a.row, b.row, k), px: lerp(a.px, b.px, k), py: lerp(a.py, b.py, k), scale, ry: lerp(a.ry, b.ry, k), rx: lerp(a.rx, b.rx, k) };
}

// A real keyboard, in key-widths, so that an address is typed on the right keys
const KEYS = [
  'f0 f1 f2 f3 f4 f5 f6 f7 f8 f9 f10 f11 f12 f13 f14',
  '` 1 2 3 4 5 6 7 8 9 0 - = bk:2',
  'tab:1.5 q w e r t y u i o p [ ] \\:1.5',
  "cap:1.75 a s d f g h j k l ; ' ent:2.25",
  'shl:2.25 z x c v b n m , . / shr:2.75',
  'fn:1.25 ctl:1.25 alt:1.25 cmd:1.25 spc:5 cmr alr lft dwn rgt',
].map((row, r) => {
  let x = 0;
  return row.split(' ').map((spec) => {
    const [label, width] = spec.split(':');
    const key = { label, x, y: r === 0 ? 0 : 0.62 + r - 1, w: Number(width ?? 1), h: r === 0 ? 0.62 : 1 };
    x += key.w;
    return key;
  });
});
const KEY_OF = new Map(KEYS.flat().map((key) => [key.label, key]));

const KEY_NAMES: Record<string, string> = { f0: 'esc', f13: 'prt', f14: 'del', bk: 'back', tab: 'tab', cap: 'caps', ent: 'enter', shl: 'shift', shr: 'shift', fn: 'fn', ctl: 'ctrl', alt: 'alt', cmd: 'sys', spc: '', cmr: 'alt', alr: 'ctrl', lft: '<', dwn: 'v', rgt: '>' };
const keyName = (label: string) => KEY_NAMES[label] ?? label.toUpperCase();

/** The keys, drawn once for the whole rack and only referred to by each laptop: the caps, and what's printed on them, a row at a time so that the backlight can come up row by row */
const KeyShapes = memo(function KeyShapes() {
  return (
    <svg aria-hidden="true" className="absolute h-0 w-0">
      <defs>
        <linearGradient id="rack-cap" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#232f60" />
          <stop offset="0.18" stopColor="#141d47" />
          <stop offset="1" stopColor="#0b1233" />
        </linearGradient>
        <g id="rack-caps" fill="url(#rack-cap)" stroke="#030720" strokeWidth={3}>
          {KEYS.flat().map((key) => (
            <rect key={key.label} x={key.x * 100 + 6} y={key.y * 100 + 6} width={key.w * 100 - 12} height={key.h * 100 - 12} rx={11} />
          ))}
        </g>
        {KEYS.map((row, r) => (
          <g key={r} id={`rack-legends-${r}`} fontFamily="ui-monospace, monospace" fontWeight={600} fontSize={r === 0 ? 20 : 27} textAnchor="middle">
            {row.map((key) => (
              <text key={key.label} x={key.x * 100 + key.w * 50} y={key.y * 100 + key.h * 50 + (r === 0 ? 7 : 9)}>{keyName(key.label)}</text>
            ))}
          </g>
        ))}
      </defs>
    </svg>
  );
});

function Plate({ project, index, off, onGo }: { project: RackProject; index: number; off: boolean; onGo: (i: number) => void }) {
  return (
    <button type="button" data-plate data-off={off} onClick={() => onGo(index)} className="rack-plate group pointer-events-auto absolute inset-0 flex cursor-pointer items-center gap-[calc(var(--uh)*0.28)] px-[calc(var(--uh)*0.3)] text-left font-mono uppercase transition-[transform,opacity] duration-300 hover:[transform:translateZ(16px)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#9dbbff] data-[off=true]:opacity-35" style={{ '--i': index } as CSSProperties}>
      <span aria-hidden="true" className="rack-screw shrink-0" />
      <span aria-hidden="true" className="rack-grip shrink-0" />
      <span className="min-w-0 flex-[0_1_46%] truncate text-[length:calc(var(--uh)*0.25)] font-bold tracking-wider text-white transition-colors duration-300 group-hover:text-[#9dbbff]"><span className="sr-only">Open </span>{project.title}</span>
      <span aria-hidden="true" className="rack-vent h-[42%] min-w-0 flex-1 rounded-[2px]" />
      <span className="shrink-0 rounded-[3px] border border-[#5b8cff]/60 px-[0.5em] text-[length:calc(var(--uh)*0.18)] font-bold tracking-wider text-[#9dbbff]">Live</span>
      <span aria-hidden="true" className="rack-leds flex shrink-0 items-center gap-[calc(var(--uh)*0.13)]">
        {['PWR', 'NET', 'I/O'].map((name, k) => (
          <span key={name} className="flex flex-col items-center gap-[calc(var(--uh)*0.055)]">
            <span {...(k > 0 ? { 'data-led': true } : {})} className="rack-led" />
            <span className="rack-led-name">{name}</span>
          </span>
        ))}
      </span>
      <span aria-hidden="true" className="rack-grip shrink-0" />
      <span aria-hidden="true" className="rack-screw shrink-0" />
      {/* the edge lights up when the laptop is out */}
      <span data-edge aria-hidden="true" className="rack-edge opacity-0" />
    </button>
  );
}

const Unit = memo(function Unit({ project, index, row, off, near, onGo, onView }: { project: RackProject; index: number; row: number; off: boolean; near: boolean; onGo: (i: number) => void; onView: (p: RackProject) => void }) {
  return (
    <>
    {/* The drawer's shadow, falling on the units below it */}
    <span data-shadow={index} aria-hidden="true" className="rack-cast absolute hidden opacity-0" style={{ left: 'var(--rail)', top: `calc(var(--uh) * ${row + 1})`, width: 'var(--lw)', height: 'calc(var(--uh) * 2.2)', transform: 'translateZ(-3px)' }} />
    <div data-unit={index} className="absolute [transform-style:preserve-3d]" style={{ left: 'var(--rail)', top: `calc(var(--uh) * ${row})`, width: 'var(--lw)', height: 'var(--uh)', transform: 'translateZ(-4px)' }}>
      {/* The base of the laptop, on its slide rails: a hinge, and a keyboard that lights up as the lid lifts off it */}
      <div data-tray aria-hidden="true" className="rack-tray absolute inset-x-0 hidden bottom-full origin-bottom [transform-style:preserve-3d]" style={{ height: 'var(--depth)', transform: 'rotateX(90deg)' }}>
        {/* the steel rails it runs on, and the sides of the base */}
        <span className="rack-slide absolute inset-y-0 right-full" style={{ width: 'calc(var(--rail) * 0.5)' }} />
        <span className="rack-slide absolute inset-y-0 left-full" style={{ width: 'calc(var(--rail) * 0.5)' }} />
        <span className="rack-wall absolute inset-y-0 left-0 origin-left" style={{ width: 'var(--uh)', transform: 'rotateY(90deg)' }} />
        <span className="rack-wall absolute inset-y-0 right-0 origin-right" style={{ width: 'var(--uh)', transform: 'rotateY(-90deg)' }} />
        {/* the hinge: the cover between two barrels, and the cooling slots in front of it */}
        <span className="rack-hinge absolute inset-x-[16%] top-0 h-[3%]" />
        <span className="rack-barrel absolute left-[6%] top-0 h-[4.2%] w-[10%]" />
        <span className="rack-barrel absolute right-[6%] top-0 h-[4.2%] w-[10%]" />
        <span className="rack-slots absolute inset-x-[24%] top-[4.2%] h-[2.2%]" />
        {/* the speakers, and the power button with its light */}
        <span className="rack-speaker absolute left-[2.5%] top-[14%] h-[50%] w-[6.5%]" />
        <span className="rack-speaker absolute right-[2.5%] top-[14%] h-[50%] w-[6.5%]" />
        <span className="rack-power absolute right-[4.6%] top-[7.5%]"><span data-wake className="rack-lit rack-power-light absolute inset-0 opacity-0" /></span>
        {/* the keyboard, set into a well in the deck: the backlight shows in the gaps between the caps and through what's printed on them */}
        <span className="rack-well absolute inset-x-[11%] top-[8%] h-[56%]">
          <span className="absolute inset-[1.2%]">
            <span data-halo className="rack-lit rack-keyglow absolute inset-0 opacity-0" />
            <svg viewBox="0 0 1500 562" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
              <use href="#rack-caps" />
              {KEYS.map((_, r) => <use key={r} href={`#rack-legends-${r}`} fill="#5b6a9f" />)}
            </svg>
            {KEYS.map((_, r) => (
              <svg key={r} data-keyrow viewBox="0 0 1500 562" preserveAspectRatio="none" className="rack-lit absolute inset-0 h-full w-full opacity-0"><use href={`#rack-legends-${r}`} fill="#dbe7ff" /></svg>
            ))}
            <span data-press className="rack-fx rack-press absolute left-0 top-0 opacity-0" />
          </span>
        </span>
        {/* the trackpad and its two buttons, the status lights, and the scoop in the front edge */}
        <span className="rack-trackpad absolute left-1/2 top-[67%] h-[20%] w-[30%] -translate-x-1/2" />
        <span className="rack-pad-button absolute left-[35.2%] top-[87.6%] h-[6.5%] w-[14.6%]" />
        <span className="rack-pad-button absolute right-[35.2%] top-[87.6%] h-[6.5%] w-[14.6%]" />
        <span className="absolute left-[13%] top-[73%] flex gap-[1.2%]" style={{ width: '10%' }}>
          <span data-wake className="rack-lit rack-status opacity-0" />
          <span data-wake className="rack-lit rack-status opacity-0" />
          <span data-wake className="rack-lit rack-status opacity-0" />
        </span>
        <span className="rack-scoop absolute bottom-0 left-1/2 h-[2.6%] w-[14%] -translate-x-1/2" />
        {/* the lid's shadow on the deck as it comes up, and then the screen's light */}
        <span data-under className="rack-fx absolute inset-0 bg-linear-to-b from-[#01041a]/90 to-[#01041a]/40" />
        <span data-light className="rack-lit absolute inset-x-0 top-0 h-[70%] bg-linear-to-b from-[#7fa6ff]/25 to-transparent opacity-0" />
      </div>

      {/* The lid: hinged at the back of the base, and lying shut on it, the same length, until it lifts */}
      <div data-lid className="absolute inset-x-0 bottom-full hidden origin-bottom [transform-style:preserve-3d]">
        <span data-glow aria-hidden="true" className="rack-lit absolute inset-0 rounded-t-lg opacity-0 shadow-[0_0_90px_-12px_rgb(59_123_247/0.65)] [backface-visibility:hidden]" />
        {/* the thickness of the lid */}
        <span aria-hidden="true" className="rack-lid-edge absolute inset-x-2 top-0 h-1.5 origin-top [transform:rotateX(-90deg)]" />
        <span aria-hidden="true" className="rack-lid-edge absolute bottom-0 left-0 top-2 w-1.5 origin-left [transform:rotateY(90deg)]" />
        <span aria-hidden="true" className="rack-lid-edge absolute bottom-0 right-0 top-2 w-1.5 origin-right [transform:rotateY(-90deg)]" />
        <div className="rack-bezel relative rounded-t-[10px] [backface-visibility:hidden]">
          {/* the camera with its lens and light, the microphones, the two rubber stops the lid shuts on, and our logo on the chin */}
          <span aria-hidden="true" className="rack-lens absolute left-1/2 top-[calc(var(--bezel)*0.45)] -translate-x-1/2" />
          <span data-wake aria-hidden="true" className="rack-lit rack-cam-light absolute left-1/2 top-[calc(var(--bezel)*0.66)] ml-[calc(var(--bezel)*0.75)] opacity-0" />
          <span aria-hidden="true" className="rack-mic absolute left-1/2 top-[calc(var(--bezel)*0.7)] -ml-[calc(var(--bezel)*1.25)]" />
          <span aria-hidden="true" className="rack-stop absolute left-[7%] top-[calc(var(--bezel)*0.5)]" />
          <span aria-hidden="true" className="rack-stop absolute right-[7%] top-[calc(var(--bezel)*0.5)]" />
          {near && <Image src="/logo/logo-inta.png" alt="" width={120} height={50} aria-hidden="true" className="pointer-events-none absolute bottom-[calc(var(--bezel)*0.35)] left-1/2 h-[calc(var(--bezel)*1.1)] w-auto -translate-x-1/2 opacity-60 max-sm:hidden" />}
          <div className="overflow-hidden rounded-[3px] shadow-[0_0_0_1px_#000,0_0_0_2px_rgb(190_210_255/0.07)]">
          <div className="relative flex items-center gap-2 border-b border-white/10 bg-[#0a1438] px-2.5 sm:gap-2.5 sm:px-3" style={{ height: 'var(--chrome)' }}>
            <span aria-hidden="true" className="flex shrink-0 gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-white/30 sm:h-2 sm:w-2" />
              <span className="h-1.5 w-1.5 rounded-full bg-white/20 sm:h-2 sm:w-2" />
              <span className="h-1.5 w-1.5 rounded-full bg-[#5b8cff] sm:h-2 sm:w-2" />
            </span>
            {project.url ? (
              <a href={project.url} target="_blank" rel="noopener noreferrer" className="group pointer-events-auto flex min-w-0 flex-1 items-center gap-1.5 rounded-md bg-white/8 px-2 py-0.5 font-mono text-[10px] text-white/85 transition-colors duration-300 hover:bg-white/15 hover:text-white focus-visible:outline-2 focus-visible:outline-[#9dbbff] sm:text-[11px]">
                <span className="relative min-w-0 flex-1 overflow-hidden whitespace-nowrap">
                  <span className="relative inline-block max-w-full truncate align-bottom">
                    {project.host}
                    {/* the address being typed: this slides away, a letter at a time */}
                    <span data-type aria-hidden="true" className="rack-fx rack-typing absolute inset-0" />
                  </span>
                </span>
                <Icon name="north_east" className="shrink-0 text-[12px] text-[#9dbbff]" />
              </a>
            ) : (
              <span className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md bg-white/5 px-2 py-0.5 font-mono text-[10px] text-white/65 sm:text-[11px]">
                <Icon name="lock" className="shrink-0 text-[12px]" />
                <span className="truncate">No public link</span>
              </span>
            )}
            {/* the page loading, as the screen wakes */}
            <span data-load aria-hidden="true" className="rack-fx absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-linear-to-r from-[#2563eb] to-[#9dbbff]" />
          </div>
          <button type="button" onClick={() => onView(project)} aria-label={`Full view: ${project.title}`} className="group pointer-events-auto relative block w-full cursor-zoom-in overflow-hidden bg-[#050b2a] focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#9dbbff]" style={{ aspectRatio: 'var(--r, 1.9)' }}>
            {near && project.hero && (
              <Image
                src={project.hero}
                alt={`${project.title}: the finished work`}
                fill
                sizes="(min-aspect-ratio: 23/20) 60vw, 96vw"
                quality={90}
                loading="eager"
                unoptimized={!optimisable(project.hero)}
                className="object-contain"
                onLoad={(e) => {
                  // (decoded ahead of time, so that nothing stutters when the lid comes up)
                  e.currentTarget.decode?.().catch(() => {});
                  const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
                  // the frame takes the shape of the picture, so that nothing is cut and no bars show
                  if (w && h) e.currentTarget.closest<HTMLElement>('[data-lid]')?.style.setProperty('--r', String(Math.min(2.3, Math.max(1.6, w / h))));
                }}
              />
            )}
            <span aria-hidden="true" className="absolute right-2.5 top-2.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-midnight/85 text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
              <Icon name="open_in_full" className="text-[15px]" />
            </span>
            {/* The screen waking as the lid lifts: dark, then our logo and a progress bar, then the page comes in from the top behind a line of light */}
            <span data-cover aria-hidden="true" className="rack-fx pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-[3%] bg-[#02061c]">
              <span data-boot className="flex h-[13%] w-[24%] flex-col items-center justify-center gap-2 opacity-0">
                {near && <Image src="/logo/logo-inta.png" alt="" width={120} height={50} className="h-full w-auto" />}
                <span className="block h-0.5 w-full shrink-0 overflow-hidden rounded-full bg-white/15">
                  <span data-bootbar className="rack-lit block h-full w-full origin-left scale-x-0 rounded-full bg-[#9dbbff]" />
                </span>
              </span>
              <span className="rack-scanline absolute inset-x-0 top-0" />
            </span>
            {/* the glass catching the light, seen best while the screen is dark */}
            <span data-glare aria-hidden="true" className="rack-fx rack-glare pointer-events-none absolute inset-0 opacity-0" />
          </button>
          </div>
        </div>
        <div aria-hidden="true" className="rack-lid-back absolute inset-0 flex items-center justify-center overflow-hidden rounded-t-[10px] [backface-visibility:hidden] [transform:rotateY(180deg)_translateZ(6px)]">
          <span data-logo className="rack-lit flex h-[14%] items-center justify-center">
            {near && <Image src="/logo/logo-inta.png" alt="" width={120} height={50} className="h-full w-auto rotate-180 opacity-80" />}
          </span>
          {/* the seam round the edge of the lid, and the dip a thumb opens it by */}
          <span className="rack-lid-seam absolute inset-[1.6%]" />
          <span className="absolute left-1/2 top-0 h-[1.6%] w-[9%] -translate-x-1/2 rounded-b-md bg-[#01041a]/70 shadow-[0_1px_0_rgb(190_210_255/0.2)]" />
          <span data-shine className="rack-fx rack-shine absolute inset-y-0 left-0 w-[38%] opacity-0" />
        </div>
      </div>

      <Plate project={project} index={index} off={off} onGo={onGo} />
    </div>
    </>
  );
});

/** A project's screen, out in orbit round the rack on the way in. It starts and ends as that project's own plate */
const FleetCard = memo(function FleetCard({ project, index, onGo }: { project: RackProject; index: number; onGo: (i: number) => void }) {
  return (
    <button type="button" data-card={index} onClick={() => onGo(index)} aria-label={`Go to ${project.title}`} className="rack-card group pointer-events-auto absolute left-0 top-0 block cursor-pointer text-left opacity-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#9dbbff]" style={{ width: 'var(--cw)' }}>
      <span className="rack-card-face relative block overflow-hidden transition-transform duration-500 ease-out group-hover:scale-[1.05]">
        <span className="rack-card-bar flex items-center font-mono font-bold uppercase tracking-wider text-white/90">
          <span aria-hidden="true" className="rack-card-dot shrink-0" />
          <span className="min-w-0 truncate">{project.title}</span>
        </span>
        <span className="relative block bg-[#050b2a]" style={{ aspectRatio: 'var(--ar, 1.9)' }}>
          {project.hero && (
            <Image
              src={project.hero}
              alt=""
              fill
              sizes="(max-aspect-ratio: 23/20) 50vw, 30vw"
              quality={90}
              loading="eager"
              draggable={false}
              unoptimized={!optimisable(project.hero)}
              className="object-contain"
              onLoad={(e) => {
                const img = e.currentTarget;
                const { naturalWidth: w, naturalHeight: h } = img;
                if (w && h) img.closest<HTMLElement>('[data-card]')?.style.setProperty('--ar', String(Math.min(2.3, Math.max(1.5, w / h))));
                // (shown once it's decoded, so that it arrives whole and nothing stutters)
                const show = () => { img.dataset.ready = 'true'; };
                if (img.decode) img.decode().then(show, show);
                else show();
              }}
            />
          )}
        </span>
        {/* the ones going round the back fall into the dark, and on the way home it turns into the metal of its plate */}
        <span data-shade aria-hidden="true" className="rack-card-shade pointer-events-none absolute inset-0" />
        <span data-metal aria-hidden="true" className="rack-plate rack-card-metal pointer-events-none absolute inset-0" />
      </span>
    </button>
  );
});

/** A project's name, what it was and what it does, beside its screen */
const Words = memo(function Words({ project, onView }: { project: RackProject; onView: (p: RackProject) => void }) {
  const [plain, bright] = splitAccent(project.title);
  const kicker = project.role || project.sub;
  return (
    <article className="flex max-h-full min-h-0 w-full flex-col rounded-3xl border border-white/12 bg-[#040c38]/95 p-4 shadow-[0_30px_80px_-30px_rgb(0_0_0/0.9)] sm:p-6 [@media(min-aspect-ratio:23/20)]:border-0 [@media(min-aspect-ratio:23/20)]:bg-transparent [@media(min-aspect-ratio:23/20)]:p-0 [@media(min-aspect-ratio:23/20)]:shadow-none">
      {kicker && (
        <p className="inline-flex shrink-0 items-center gap-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#9dbbff] sm:text-[11px]">
          <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-current" />
          <span className="line-clamp-1">{kicker}</span>
        </p>
      )}
      <h2 className="heading-project mt-2 shrink-0 text-white sm:mt-2.5">
        {plain && <>{plain} </>}<span className="heading-accent-dark">{bright}</span>
      </h2>
      {project.summary && (
        <div data-summary className="mt-2.5 min-h-0 shrink overflow-hidden text-[15px] font-light leading-relaxed text-white/85 data-[cut=true]:[mask-image:linear-gradient(180deg,#000_70%,transparent)] sm:mt-3.5 sm:text-base lg:text-[17px]">
          {project.summary}
        </div>
      )}
      {project.tags.length > 0 && (
        <ul className="mt-3 flex shrink-0 flex-wrap gap-1.5 [@media(max-height:620px)]:hidden">
          {project.tags.slice(0, 4).map((t) => (
            <li key={t} className="rounded-md border border-white/15 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[#9dbbff]">{t}</li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex shrink-0 flex-wrap gap-2 sm:mt-4">
        {project.url && (
          <a href={project.url} target="_blank" rel="noopener noreferrer" className="kinetic-cta-btn inline-flex items-center gap-2 rounded-xl bg-brand-blue px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-white transition-colors duration-300 hover:bg-white hover:text-midnight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9dbbff] sm:text-xs">
            Visit the site <Icon name="north_east" className="text-[14px]" />
          </a>
        )}
        <button type="button" onClick={() => onView(project)} className="inline-flex items-center gap-2 rounded-xl border border-white/25 px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-white transition-colors duration-300 hover:border-[#9dbbff] hover:text-[#9dbbff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9dbbff] sm:text-xs">
          Full view <Icon name="open_in_full" className="text-[14px]" />
        </button>
      </div>
    </article>
  );
});

/** The list of what's in the rack, for going straight to any of it */
function RackNav({ items, currentRef, onGo }: { items: { index: number; title: string }[]; currentRef: RefObject<(n: number) => void>; onGo: (i: number) => void }) {
  const [current, setCurrent] = useState(-1);
  useEffect(() => {
    currentRef.current = setCurrent;
  }, [currentRef]);
  return (
    <nav aria-label="Projects in the rack" className={`absolute right-3 top-1/2 z-20 hidden -translate-y-1/2 flex-col items-center gap-2.5 rounded-full border border-white/12 bg-midnight/80 px-1.5 py-3 transition-opacity duration-500 lg:flex xl:right-5 ${current < 0 ? 'pointer-events-none opacity-0' : 'opacity-100'}`}>
      {items.map((item, n) => (
        <button key={item.index} type="button" onClick={() => onGo(item.index)} aria-current={current === n ? 'true' : undefined} className="group relative flex h-2.5 w-2.5 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9dbbff]">
          <span className="pointer-events-none absolute right-full top-1/2 mr-4 -translate-y-1/2 whitespace-nowrap rounded bg-midnight px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100 xl:text-[10px]">{item.title}</span>
          <span className={`block rounded-full transition-[width,height,background-color] duration-300 ${current === n ? 'h-2.5 w-2.5 bg-[#9dbbff]' : 'h-1.5 w-1.5 bg-white/40 group-hover:bg-white'}`} />
        </button>
      ))}
    </nav>
  );
}

type Props = { projects: RackProject[]; siteCount: number; formId: string; nextId: string; onView: (p: RackProject) => void };

/**
 * The work as a server rack. Each project is a console in it: scrolling slides its drawer out, flips its screen up and
 * turns it on, shuts it, and moves on to the next. At rest the screen is exactly one to one with the display, so the
 * picture is as sharp as the file. The last slot is empty.
 */
function RackStage({ projects, siteCount, formId, nextId, onView }: Props) {
  const t = useText();
  const [titlePlain, titleBright] = accent(t('portfolio_title'));
  const [emptyPlain, emptyBright] = accent(t('portfolio_empty_title'));
  const rootRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef<(n: number) => void>(() => {});
  const readyRef = useRef(false);
  const introRef = useRef<gsap.core.Timeline | null>(null);
  const openedAtRef = useRef(-1);
  const fleetRef = useRef<{ ring: number; angle: number[]; on: number[]; turns: number[] } | null>(null);
  const { isIntroReady } = useReveal();
  const playedRef = usePlayIntro(introRef);
  const [tag, setTag] = useState('');
  const [nearSet, setNearSet] = useState<Set<number>>(() => new Set([0, 1]));

  const tags = useMemo(() => sharedTags(projects, 6), [projects]);
  // the projects the scroll stops at: all of them, or the ones with the tag that was picked
  const stops = useMemo(() => projects.flatMap((p, index) => (!tag || p.tags.includes(tag) ? [index] : [])), [projects, tag]);
  const clock = useMemo(() => timing(stops.length), [stops.length]);
  const rows = projects.length + ROWS_ABOVE + ROWS_BELOW;
  const goToRef = useRef<(index: number) => void>(() => {});
  const goTo = useCallback((index: number) => goToRef.current(index), []);

  useEffect(() => {
    readyRef.current = isIntroReady;
  }, [isIntroReady]);

  const toSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) scrollToY(el.getBoundingClientRect().top + window.scrollY - 20);
  };

  useGSAP(
    () => {
      const root = rootRef.current!;
      const stage = root.querySelector<HTMLElement>('[data-rack="stage"]')!;
      const rack = root.querySelector<HTMLElement>('[data-rack="rack"]')!;
      const openingEl = root.querySelector<HTMLElement>('[data-rack="opening"]')!;
      const closingEl = root.querySelector<HTMLElement>('[data-rack="closing"]')!;
      const skipEl = root.querySelector<HTMLElement>('[data-rack="skip"]')!;
      const doorEl = root.querySelector<HTMLElement>('[data-rack="door"]')!;
      const sheenEl = root.querySelector<HTMLElement>('[data-rack="sheen"]')!;
      const sheenBand = sheenEl.firstElementChild as HTMLElement;
      const doorGlint = doorEl.firstElementChild as HTMLElement;
      const scanEl = sheenEl.querySelector<HTMLElement>('[data-scan]')!;
      const signalsEl = root.querySelector<HTMLElement>('[data-rack="signals"]')!;
      const signals = gsap.utils.toArray<HTMLElement>(signalsEl.children);
      const shellEl = root.querySelector<HTMLElement>('[data-rack="shell"]')!;
      const dimEl = root.querySelector<HTMLElement>('[data-rack="dim"]')!;
      const ambientEl = root.querySelector<HTMLElement>('[data-rack="ambient"]')!;
      const slotGlow = root.querySelector<HTMLElement>('[data-rack="slot-glow"]')!;
      const runners = gsap.utils.toArray<HTMLElement>(root.querySelectorAll('[data-rack="runner"]'));
      const leds = gsap.utils.toArray<HTMLElement>(root.querySelectorAll('[data-led]'));
      const haloEl = root.querySelector<HTMLElement>('[data-rack="halo"]')!;
      const raysEl = root.querySelector<HTMLElement>('[data-rack="rays"]')!;
      const burstEl = root.querySelector<HTMLElement>('[data-rack="burst"]')!;
      const orbitEl = root.querySelector<HTMLElement>('[data-rack="orbit"]')!;
      const fleetEl = root.querySelector<HTMLElement>('[data-rack="fleet"]')!;
      const cards = gsap.utils.toArray<HTMLElement>(fleetEl.children).map((card) => ({ card, shade: card.querySelector<HTMLElement>('[data-shade]')!, metal: card.querySelector<HTMLElement>('[data-metal]')!, height: 0 }));
      const cardSizes = new ResizeObserver((entries) => {
        entries.forEach(({ target }) => {
          const el = target as HTMLElement;
          const c = cards[Number(el.dataset.card)];
          if (c && el.offsetHeight) c.height = el.offsetHeight;
        });
      });
      cards.forEach(({ card }) => cardSizes.observe(card));
      if (!fleetRef.current || fleetRef.current.angle.length !== projects.length) {
        fleetRef.current = { ring: 0.35, angle: projects.map((_, i) => (i / Math.max(1, projects.length)) * TAU), on: projects.map(() => 1), turns: projects.map((_, i) => Math.round((0.35 + (i / Math.max(1, projects.length)) * TAU) / TAU)) };
      }
      const fleet = fleetRef.current;
      const units = projects.map((_, i) => {
        const unit = root.querySelector<HTMLElement>(`[data-unit="${i}"]`)!;
        return {
          unit,
          tray: unit.querySelector<HTMLElement>('[data-tray]')!,
          light: unit.querySelector<HTMLElement>('[data-light]')!,
          lid: unit.querySelector<HTMLElement>('[data-lid]')!,
          cover: unit.querySelector<HTMLElement>('[data-cover]')!,
          load: unit.querySelector<HTMLElement>('[data-load]')!,
          glare: unit.querySelector<HTMLElement>('[data-glare]')!,
          under: unit.querySelector<HTMLElement>('[data-under]')!,
          wakes: gsap.utils.toArray<HTMLElement>(unit.querySelectorAll('[data-wake]')),
          halo: unit.querySelector<HTMLElement>('[data-halo]')!,
          bootbar: unit.querySelector<HTMLElement>('[data-bootbar]')!,
          press: unit.querySelector<HTMLElement>('[data-press]')!,
          type: unit.querySelector<HTMLElement>('[data-type]'),
          keyrows: gsap.utils.toArray<HTMLElement>(unit.querySelectorAll('[data-keyrow]')),
          host: projects[i].host,
          typed: -1,
          pressed: '',
          resting: false,
          moving: false,
          edge: unit.querySelector<HTMLElement>('[data-edge]')!,
          logo: unit.querySelector<HTMLElement>('[data-logo]')!,
          shine: unit.querySelector<HTMLElement>('[data-shine]')!,
          boot: unit.querySelector<HTMLElement>('[data-boot]')!,
          leds: gsap.utils.toArray<HTMLElement>(unit.querySelectorAll('[data-led]')),
          glow: unit.querySelector<HTMLElement>('[data-glow]')!,
          shadow: root.querySelector<HTMLElement>(`[data-shadow="${i}"]`)!,
          words: root.querySelector<HTMLElement>(`[data-words="${i}"]`)!,
          parts: gsap.utils.toArray<HTMLElement>(root.querySelector(`[data-words="${i}"] article`)!.children),
        };
      });

      introRef.current = gsap
        .timeline({ paused: true, defaults: { ease: 'expo.out' } })
        .from('[data-rack="word"]', { y: 44, autoAlpha: 0, duration: 1.3, stagger: 0.16 }, 0.75)
        .from('[data-rack="in"]', { y: 18, autoAlpha: 0, duration: 1, stagger: 0.1 }, 1.05);
      if (playedRef.current) introRef.current.progress(1);

      // ---- The page, measured ----
      let W = 1;
      let H = 1;
      let top = 0;
      let run = 1;
      let uh = 40;
      let depth = 200;
      let rackW = 800;
      let perspective = 1000;
      let ox = 0;
      let oy = 0;
      let across = 0;
      let downward = 0;
      let wideScreen = true;
      let lidWidth = 800;
      let cardWidth = 500;
      let cardLayout = 500;
      let focusX = 0;
      let focusY = 0;
      let heroX = 0;
      let heroY = 0;
      let shownOrigin = '';
      let ringX = 800;
      let ringZ = 500;
      let ringCentreZ = -200;
      let ringTilt = 0;
      let ringRoll = 0;
      let keys: Key[] = [];
      const measure = () => {
        W = stage.clientWidth;
        H = stage.clientHeight;
        const wide = W / H > 1.15;
        const short = H <= 480;
        wideScreen = wide;
        // how far the camera moves round a laptop as it comes out; narrow screens have less room for it
        downward = short ? 12 : wide ? 20 : 16;
        across = wide ? 13 : 7;
        const chrome = wide && !short ? 34 : 26;
        const dots = wide ? (W >= 1024 ? 64 : 20) : 0;
        const room = (wide ? H * 0.64 : H * 0.36) - chrome - 28;
        const fits = wide ? (W - 32 - dots) * (W < 800 ? 0.5 : W < 1200 ? 0.54 : 0.6) : (W - 8) / 1.125;
        // (an even width, so that the screen lands on whole pixels and stays as sharp as the file)
        const lw = Math.round(Math.min(1180, fits, room * 1.76) / 2) * 2;
        const rail = Math.round(lw * 0.03);
        uh = Math.round(Math.max(wide ? 32 : 36, Math.min(84, lw * 0.082)));
        depth = Math.round(lw * 0.44);
        rackW = lw + 2 * rail;
        // (a longer lens on a narrow screen, so that the front of the base comes out no wider than the screen)
        perspective = depth * (wide ? 6 : 9);
        const front = perspective / (perspective - depth);

        // on a large monitor the words and the screen stay together in the middle, not at opposite edges
        const edge = wide ? Math.max(16, Math.round((W - (620 + 12 + (lw / 2) * (front - 1) + lw + rail + dots)) / 2)) : 8;

        // where the drawer's hinge sits at rest, on whole pixels, so the screen above it lands exactly on the display's own
        const cx = Math.round(wide ? W - edge - dots - rail - lw / 2 : W / 2);
        focusX = cx;
        // (the bezel is on whole pixels too, and leaves the picture an even width)
        const bezel = Math.round(Math.max(6, Math.min(14, lw * 0.012)));
        const hinge = Math.round(Math.max(wide ? H * 0.05 : 8, 8) + (lw - 2 * bezel) / 1.76 + chrome + 3.4 * bezel);
        const eye = Math.round(hinge * (wide ? 0.44 : 0.3));
        focusY = eye;
        const plateBottom = Math.ceil(eye + (hinge - eye + uh) * front);

        root.style.setProperty('--lw', `${lw}px`);
        root.style.setProperty('--uh', `${uh}px`);
        root.style.setProperty('--rail', `${rail}px`);
        root.style.setProperty('--cab', `${Math.round(lw * 0.7)}px`);
        root.style.setProperty('--depth', `${depth}px`);
        root.style.setProperty('--chrome', `${chrome}px`);
        root.style.setProperty('--bezel', `${bezel}px`);
        root.style.setProperty('--words-x', `${wide ? edge : 8}px`);
        root.style.setProperty('--words-w', `${wide ? Math.floor(cx - (lw / 2) * front - edge - 12) : W - 16}px`);
        root.style.setProperty('--words-top', `${wide ? 16 : plateBottom + 8}px`);
        root.style.setProperty('--words-bottom', `${wide ? 16 : 8}px`);
        stage.style.perspective = `${perspective}px`;
        shownOrigin = '';
        rack.style.width = `${rackW}px`;
        rack.style.height = `${uh * rows}px`;
        ambientEl.style.left = `${cx}px`;
        ambientEl.style.top = `${Math.round(hinge * 0.55)}px`;

        // the words are longer than the room on some screens; "Full view" has all of them
        units.forEach(({ words }) => {
          const summary = words.querySelector<HTMLElement>('[data-summary]');
          if (summary) summary.dataset.cut = String(summary.scrollHeight > summary.clientHeight + 2);
        });

        top = root.getBoundingClientRect().top + window.scrollY;
        run = Math.max(1, root.offsetHeight - H);

        // ---- How the rack is seen at each moment ----
        const rackH = uh * rows;
        const below = openingEl.querySelector<HTMLElement>('[data-rack="opening-words"]')!;
        const wordsTop = below.getBoundingClientRect().top - openingEl.getBoundingClientRect().top;
        const header = parseFloat(getComputedStyle(root).getPropertyValue('--header-h')) || 0;
        // the rack stands in the middle, in the room above the words; on a short screen, beside them
        const overview: View = short
          ? { row: rows / 2, px: Math.round(W * 0.72), py: Math.round((header + H) / 2), scale: Math.min(0.8, (0.86 * (H - header)) / rackH, (0.26 * W) / rackW), ry: -8, rx: -3 }
          : { row: rows / 2, px: Math.round(W / 2), py: Math.round((header + wordsTop) / 2), scale: Math.min(0.8, (0.86 * (wordsTop - header)) / rackH, ((wide ? 0.34 : 0.5) * W) / rackW), ry: -8, rx: -3 };

        // the orbit, sized so that the screens stay clear of the rack and on the screen, whatever its shape. The ring leans towards the visitor and across the rack, like Saturn's, and more on a tall screen, which has the height for it
        ringTilt = ((wide ? 18 : 30) * Math.PI) / 180;
        ringRoll = ((wide ? -10 : -15) * Math.PI) / 180;
        lidWidth = lw;
        ringCentreZ = -Math.round(lw * 0.35);
        ringZ = Math.round(lw * (wide ? 0.8 : 0.7));
        const seenAt = (d: number) => overview.scale / (1 - (d * overview.scale) / perspective);
        const frontScale = seenAt(ringCentreZ + ringZ * Math.cos(ringTilt));
        const sideScale = seenAt(ringCentreZ);
        const shownWidth = short ? W * 0.17 : wide ? Math.min(W * 0.19, H * 0.33) : W * 0.31;
        cardWidth = Math.round(shownWidth / frontScale);
        // a screen is laid out with far more pixels than it ever shows, and scaled down: however it turns, its picture and its words stay sharp
        const dpr = window.devicePixelRatio || 1;
        cardLayout = Math.round((shownWidth * Math.max(2, dpr * 1.25)) / dpr);
        const halfWay = short ? W * 0.28 : W / 2;
        ringX = Math.round(Math.max(rackW / 2 + cardWidth * (wide ? 0.56 : 0.72), Math.min((halfWay * 0.96) / sideScale - cardWidth * 0.42, rackW / 2 + cardWidth * 1.7)));
        root.style.setProperty('--cw', `${cardLayout}px`);
        cards.forEach((c) => {
          if (c.card.offsetHeight) c.height = c.card.offsetHeight;
        });
        // while the rack is seen whole it's seen from straight in front of it, so that the ring is true around it
        heroX = overview.px;
        heroY = overview.py;
        orbitEl.style.width = `${ringX}px`;
        orbitEl.style.height = `${ringZ}px`;
        orbitEl.style.left = `${Math.round((rackW - ringX) / 2)}px`;
        orbitEl.style.top = `${Math.round((rackH - ringZ) / 2)}px`;
        orbitEl.style.transform = `translate3d(0,0,${ringCentreZ}px) rotateZ(${((ringRoll * 180) / Math.PI).toFixed(2)}deg) rotateX(${(90 - (ringTilt * 180) / Math.PI).toFixed(2)}deg) scale(2)`;
        for (const el of [haloEl, raysEl]) {
          el.style.left = `${overview.px}px`;
          el.style.top = `${overview.py}px`;
        }
        const focus = (index: number): View => ({ row: ROWS_ABOVE + index, px: cx, py: hinge, scale: 1, ry: 0, rx: 0 });
        const emptyRow = ROWS_ABOVE + projects.length + 0.5;
        const closing: View = wide
          ? { row: emptyRow, px: cx, py: Math.round(H * 0.5), scale: 0.86, ry: -9, rx: 2 }
          : { row: emptyRow, px: Math.round(W / 2), py: Math.round(H * 0.27), scale: 0.86, ry: -7, rx: 3 };

        keys = [
          { ...overview, s: 0 },
          // (a slow push in as the screens go home, and into the middle as the words clear)
          { ...overview, px: Math.round(W / 2), py: Math.round(H / 2), scale: overview.scale * 1.05, ry: overview.ry + 2, s: INTRO_HOLD, travel: true },
        ];
        stops.forEach((index, n) => {
          keys.push({ ...focus(index), s: clock.arrive[n], travel: true, hop: n === 0 ? 0 : 0.05 });
          keys.push({ ...focus(index), s: clock.leave[n] });
        });
        keys.push({ ...closing, s: clock.closeAt, travel: true });
        keys.push({ ...closing, ry: closing.ry + 3, s: clock.total });
      };
      measure();
      document.fonts?.ready.then(measure);
      ScrollTrigger.addEventListener('refresh', measure);
      const ro = new ResizeObserver(refreshSoon);
      ro.observe(root);
      rootRef.current!.dataset.ready = 'true';

      goToRef.current = (index) => {
        const n = stops.indexOf(index);
        if (n < 0) return;
        jumpToY(top + ((clock.arrive[n] + DWELL * 0.5) / clock.total) * run);
      };

      // ---- The visitor's hand leans the rack, while it's being seen whole ----
      let handX = 0;
      let handY = 0;
      const onMove = (e: PointerEvent) => {
        if (e.pointerType !== 'mouse') return;
        handX = (e.clientX / W) * 2 - 1;
        handY = (e.clientY / H) * 2 - 1;
      };
      window.addEventListener('pointermove', onMove, { passive: true });

      let ringSpeed = 0.11;
      let spin = 0;
      let hovering = false;
      let dragging = false;
      let dragX = 0;
      let dragged = 0;
      const onCardDown = (e: PointerEvent) => {
        dragging = true;
        dragX = e.clientX;
        dragged = 0;
      };
      const onCardDrag = (e: PointerEvent) => {
        if (!dragging || smoothed > 0.02) return;
        const dx = e.clientX - dragX;
        dragX = e.clientX;
        dragged += Math.abs(dx);
        fleet.ring += dx * 0.0035;
        spin = dx * 0.18;
      };
      const onCardUp = () => {
        dragging = false;
      };
      // (a screen that was dragged wasn't clicked)
      const onCardClick = (e: MouseEvent) => {
        if (dragged > 8) {
          e.stopPropagation();
          e.preventDefault();
        }
      };
      const onCardOver = (e: PointerEvent) => {
        if (e.pointerType === 'mouse') hovering = true;
      };
      const onCardOut = () => {
        hovering = false;
      };
      fleetEl.addEventListener('pointerdown', onCardDown);
      fleetEl.addEventListener('click', onCardClick, true);
      fleetEl.addEventListener('pointerover', onCardOver);
      fleetEl.addEventListener('pointerout', onCardOut);
      window.addEventListener('pointermove', onCardDrag, { passive: true });
      window.addEventListener('pointerup', onCardUp);
      window.addEventListener('pointercancel', onCardUp);

      let onScreen = true;
      const seen = new IntersectionObserver(([e]) => {
        onScreen = e.isIntersecting;
      });
      seen.observe(root);

      const stopOf = projects.map((_, i) => stops.indexOf(i));
      const open = projects.map(() => 0);
      const shown = projects.map(() => -1);
      let last = gsap.ticker.time;
      let smoothed = -1;
      let leanX = 0;
      let leanY = 0;
      let shownRack = '';
      let lookDown = 0;
      let shownFleet: boolean | null = null;
      let shownFx = -1;
      let shownBurst = '';
      let lookAcross = 0;
      let shownDim = -1;
      let shownAmbient = -1;
      let shownRunner = -1;
      let shownShell = '';
      let shownSignals = '';
      let nextFlicker = 0;
      let flickerSlot = 0;
      const flickering: (HTMLElement | null)[] = [null, null, null];
      let shownOpening = -1;
      let shownClosing = -1;
      let shownSkip = '';
      let currentStop = -2;
      let shownDoor = '';
      let shownDoorFade = -1;
      let shownAway = -1;

      const fade = (el: HTMLElement, alpha: number) => {
        el.style.opacity = alpha.toFixed(3);
        el.style.visibility = alpha < 0.004 ? 'hidden' : 'visible';
        el.style.transform = alpha > 0.996 ? 'none' : `translate3d(0,${((1 - alpha) * 16).toFixed(1)}px,0)`;
      };

      const tick = (time: number) => {
        if (!onScreen || document.hidden || !keys.length) return;
        const dt = Math.min(0.25, Math.max(0.001, time - last));
        last = time;
        const raw = clamp01((window.scrollY - top) / run) * clock.total;
        if (smoothed < 0) smoothed = raw;
        else smoothed += (raw - smoothed) * (1 - Math.exp(-dt * 7));
        const s = smoothed;

        if (openedAtRef.current < 0 && readyRef.current) openedAtRef.current = time;
        const age = openedAtRef.current < 0 ? 0 : time - openedAtRef.current;
        const arrival = smoother(ramp(age, 0, 2.4));

        // ---- The camera ----
        const toFocus = smooth(s, INTRO_HOLD, INTRO_HOLD + INTRO_TRAVEL * 0.8);
        ox = lerp(heroX, focusX, toFocus);
        oy = lerp(heroY, focusY, toFocus);
        const origin = `${ox.toFixed(1)}px ${oy.toFixed(1)}px`;
        if (origin !== shownOrigin) {
          shownOrigin = origin;
          stage.style.perspectiveOrigin = origin;
        }
        const v = viewAt(keys, s);
        const away = 1 - smooth(v.scale, 0.84, 1);
        leanX += (handX - leanX) * (1 - Math.exp(-dt * 2.4));
        leanY += (handY - leanY) * (1 - Math.exp(-dt * 2.4));
        const scale = v.scale * (1 - 0.08 * (1 - arrival) * away);
        const ry = v.ry + (leanX * 4 + Math.sin(time * 0.27) * 0.8 - (1 - arrival) * 9) * away + lookAcross;
        const rx = v.rx - leanY * 2 * away + lookDown;
        const transform = `translate3d(${(ox + (v.px - ox) / scale).toFixed(2)}px,${(oy + (v.py - oy) / scale).toFixed(2)}px,${(perspective * (1 - 1 / scale)).toFixed(2)}px) rotateX(${rx.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg) translate3d(${(-rackW / 2).toFixed(1)}px,${(-v.row * uh).toFixed(2)}px,0)`;
        if (transform !== shownRack) {
          shownRack = transform;
          rack.style.transform = transform;
        }

        // ---- The cabinet: shut when the page opens. Its glass door swings away and the lights wake down the rack ----
        const swing = Math.max(ramp(age, 0.45, 2.05), smooth(s, 0, 0.08));
        const opened = smoother(swing);
        const door = `translateZ(8px) rotateY(${(104 * opened).toFixed(2)}deg)`;
        if (door !== shownDoor) {
          shownDoor = door;
          doorEl.style.transform = door;
          doorGlint.style.transform = `translate3d(${(320 - 420 * opened).toFixed(1)}%,0,0) skewX(-16deg)`;
        }
        const doorFade = 1 - smooth(opened, 0.52, 0.97);
        if (doorFade !== shownDoorFade) {
          shownDoorFade = doorFade;
          doorEl.style.opacity = doorFade.toFixed(3);
          doorEl.style.display = doorFade < 0.004 ? 'none' : 'block';
        }
        if (swing > 0.2 && rack.dataset.lit !== 'true') rack.dataset.lit = 'true';

        // ---- Seen from further off: a highlight on the metal, a scan of light down the fronts, signals on the floor, the empty slot breathing ----
        if (Math.abs(away - shownAway) > 0.004) {
          shownAway = away;
          const seen = away < 0.004 ? 'hidden' : 'visible';
          sheenEl.style.visibility = seen;
          sheenEl.style.opacity = away.toFixed(3);
        }
        if (away > 0.004) {
          sheenBand.style.transform = `translate3d(${(ry * 6 + 190 + Math.sin(time * 0.31) * 40).toFixed(1)}%,0,0) skewX(-18deg)`;
          scanEl.style.transform = `translate3d(0,${(-100 + 1100 * ((age * 0.2) % 1)).toFixed(1)}%,0)`;
          slotGlow.style.opacity = (0.55 + 0.45 * Math.sin(time * 2.2)).toFixed(3);
          signals.forEach((signal, k) => {
            const phase = (time * 0.16 + k * 0.33) % 1;
            signal.style.transform = `translate3d(0,${(-phase * 340).toFixed(1)}%,0)`;
            signal.style.opacity = Math.sin(Math.PI * phase).toFixed(3);
          });
        }
        const signalsSeen = away < 0.004 ? 'hidden' : 'visible';
        if (signalsSeen !== shownSignals) {
          shownSignals = signalsSeen;
          signalsEl.style.visibility = signalsSeen;
        }

        // ---- The lights flicker with activity, mostly on the unit in view; one beat here is far cheaper than an animation per light ----
        if (time >= nextFlicker) {
          nextFlicker = time + 0.05 + Math.random() * 0.1;
          flickerSlot = (flickerSlot + 1) % flickering.length;
          flickering[flickerSlot]?.style.removeProperty('opacity');
          const active = units[stops[Math.max(0, currentStop)]];
          const pool = currentStop >= 0 && active && Math.random() < 0.6 ? active.leds : leds;
          const led = pool[Math.floor(Math.random() * pool.length)];
          flickering[flickerSlot] = led ?? null;
          led?.style.setProperty('opacity', '0.15');
        }

        // ---- When one laptop shuts, a signal runs down the rack's rails to the next, and that one comes out ----
        let runnerRow = 0;
        let runnerAlpha = 0;
        for (let n = 0; n < stops.length - 1; n++) {
          if (raw >= clock.leave[n] && raw < clock.arrive[n + 1]) {
            const p = ramp(raw, clock.leave[n] + GAP * 0.2, clock.leave[n] + GAP * 0.56);
            runnerRow = ROWS_ABOVE + lerp(stops[n], stops[n + 1], smoother(p));
            runnerAlpha = Math.sin(Math.PI * p);
            break;
          }
        }
        if (runnerAlpha > 0.003 || shownRunner > 0.003) {
          shownRunner = runnerAlpha;
          const place = `translate3d(0,${(runnerRow * uh).toFixed(1)}px,-5px)`;
          runners.forEach((runner) => {
            runner.style.transform = place;
            runner.style.opacity = runnerAlpha.toFixed(3);
          });
        }

        // ---- Each unit is a laptop: it runs out shut, the lid cracks open under a thumb, sweeps up, goes a little past on its hinge and settles, waking as it rises. Shutting is the same, backwards ----
        const ease = 1 - Math.exp(-dt * 11);
        // while a laptop is out and shut the camera comes round and looks down on its lid, from one side and then the other, and levels off as the lid rises
        let looking = 0;
        let lookingSide = 0;
        let brightest = 0;
        units.forEach((u, i) => {
          const n = stopOf[i];
          let goal = 0;
          if (n >= 0) {
            const opening = n === 0 ? 0.56 : GAP * 0.54;
            const closing = n === stops.length - 1 ? CLOSE_TRAVEL * 0.42 : GAP * 0.46;
            goal = Math.min(ramp(raw, clock.arrive[n] - opening, clock.arrive[n] - 0.01), 1 - ramp(raw, clock.leave[n] + 0.01, clock.leave[n] + closing));
          }
          // (however fast the scroll, a laptop takes its time)
          const most = (goal > open[i] ? OPEN_PER_SECOND : SHUT_PER_SECOND) * dt;
          let o = open[i] + Math.max(-most, Math.min(most, (goal - open[i]) * ease));
          if (Math.abs(goal - o) < 0.0015) o = goal;
          open[i] = o;
          const look = smooth(o, 0.03, 0.28) * (1 - smooth(o, 0.44, 0.88));
          looking += look;
          lookingSide += look * (i % 2 ? 1 : -1);
          brightest = Math.max(brightest, o);
          if (o === shown[i]) return;
          const wasOut = shown[i] > 0.001;
          shown[i] = o;
          const isOut = o > 0.001;
          if (isOut !== wasOut) {
            u.unit.dataset.out = String(isOut);
            const display = isOut ? 'block' : 'none';
            u.tray.style.display = display;
            u.lid.style.display = display;
            u.shadow.style.display = display;
          }
          // pushed in to release the catch, out on its rails with some weight, and a soft stop
          const release = Math.sin(Math.PI * ramp(o, 0, 0.05)) * -6;
          const run = smoother(ramp(o, 0.05, 0.36));
          const stop = Math.sin(Math.PI * ramp(o, 0.36, 0.43)) * 0.012;
          const pull = (depth + 4) * (run + stop) + release;
          // the lid: cracked open by a thumb, swept up, past upright, and the screen wobbling a little as the hinge takes it
          const lift = ramp(o, 0.4, 0.94);
          const settle = ramp(lift, 0.84, 1);
          const hinged = 0.09 * smooth(lift, 0, 0.16) + 0.91 * smoother(ramp(lift, 0.1, 0.84)) + 0.035 * Math.sin(Math.PI * 2.5 * settle) * (1 - settle);
          const wake = smoother(ramp(o, 0.82, 0.98));
          const lidH = u.lid.offsetHeight;
          // shut, the lid is the same length as the base; it reaches its full height as it lifts
          const length = lerp(Math.min(1, depth / Math.max(1, lidH)), 1, smooth(lift, 0, 0.8));
          const angle = 90 * (1 - hinged);
          // past upright the lid would go through the rows behind it, so its hinge comes forward by as much
          const clear = angle < 0 ? lidH * Math.sin((-angle * Math.PI) / 180) : 0;
          u.unit.style.transform = `translateZ(${(pull - 4).toFixed(2)}px)`;
          u.edge.style.opacity = smooth(o, 0, 0.14).toFixed(3);
          u.shadow.style.opacity = smooth(o, 0.05, 0.36).toFixed(3);
          if (isOut) {
            u.lid.style.transform = `translate3d(0,-2px,${(clear - depth).toFixed(2)}px) rotateX(${(-angle).toFixed(2)}deg) scaleY(${length.toFixed(4)})`;
            u.logo.style.transform = `scaleY(${(1 / length).toFixed(4)})`;
            u.shine.style.opacity = (lift > 0 && lift < 0.7 ? Math.sin(Math.PI * ramp(lift, 0, 0.7)) : 0).toFixed(3);
            u.shine.style.transform = `translate3d(${(-120 + 400 * ramp(lift, 0, 0.7)).toFixed(1)}%,0,0) skewX(-16deg)`;
            u.under.style.opacity = (1 - smooth(lift, 0, 0.6)).toFixed(3);
            // the keyboard lights up a row at a time, from the hinge towards the visitor
            u.keyrows.forEach((row, r) => {
              row.style.opacity = smooth(lift, 0.22 + r * 0.07, 0.4 + r * 0.07).toFixed(3);
            });
            u.glare.style.opacity = (Math.sin(Math.PI * ramp(lift, 0.15, 0.98)) * 0.9).toFixed(3);
            u.glare.style.transform = `translate3d(0,${(70 - 170 * lift).toFixed(1)}%,0)`;
            const awake = smooth(o, 0.62, 0.7).toFixed(3);
            u.wakes.forEach((light) => {
              light.style.opacity = awake;
            });
            u.halo.style.opacity = smooth(lift, 0.2, 0.8).toFixed(3);
            // the boot: our logo and a progress bar on the dark screen
            u.boot.style.opacity = (smooth(o, 0.56, 0.66) * (1 - smooth(o, 0.78, 0.84))).toFixed(3);
            u.bootbar.style.transform = `scaleX(${smooth(o, 0.58, 0.8).toFixed(3)})`;
            // the address is typed, and the keys go down for it
            if (u.type && u.host) {
              const typed = ramp(o, 0.66, 0.84);
              const count = Math.ceil(typed * u.host.length);
              const pressed = typed > 0 && typed < 1 ? u.host[count - 1] : '';
              if (count !== u.typed || pressed !== u.pressed) {
                u.typed = count;
                u.pressed = pressed;
                u.type.style.transform = `translate3d(${((count / u.host.length) * 100).toFixed(2)}%,0,0)`;
                const key = KEY_OF.get(pressed);
                u.press.style.opacity = key ? '1' : '0';
                if (key) u.press.style.transform = `translate3d(${key.x * 100}%,${key.y * 100}%,0)`;
              }
            }
            // then the page comes in from the top behind a line of light
            u.cover.style.transform = `translate3d(0,${(wake * 100).toFixed(2)}%,0)`;
            u.load.style.transform = `scaleX(${smooth(o, 0.8, 0.97).toFixed(3)})`;
            u.load.style.opacity = (1 - smooth(o, 0.97, 1)).toFixed(3);
            u.glow.style.opacity = smooth(lift, 0.5, 1).toFixed(3);
            u.light.style.opacity = ramp(o, 0.6, 1).toFixed(3);
          }
          // at rest nothing is left over the picture, and the screen goes back to a single layer
          const resting = o === 1;
          if (resting !== u.resting) {
            u.resting = resting;
            u.unit.dataset.rest = String(resting);
          }
          const moving = o > 0.76 && !resting;
          if (moving !== u.moving) {
            u.moving = moving;
            u.words.dataset.moving = String(moving);
          }
          // the words arrive piece by piece, from the side of the screen they sit on
          const alpha = smooth(o, 0.78, 0.86);
          u.words.style.opacity = alpha.toFixed(3);
          u.words.style.visibility = alpha < 0.004 ? 'hidden' : 'visible';
          if (alpha > 0) {
            u.parts.forEach((part, k) => {
              const t = smooth(o, 0.8 + k * 0.03, 0.9 + k * 0.03);
              part.style.opacity = t.toFixed(3);
              part.style.transform = t > 0.998 ? 'none' : wideScreen ? `translate3d(${((t - 1) * 26).toFixed(1)}px,0,0)` : `translate3d(0,${((1 - t) * 14).toFixed(1)}px,0)`;
            });
          }
        });
        lookDown = -downward * Math.min(1, looking);
        lookAcross = across * Math.max(-1, Math.min(1, lookingSide));

        // ---- The way in. A screen comes straight out of its plate to the front of the ring, and the ring carries it round to its place. Going home is exactly that backwards: round to the front, then straight into its own plate, the lowest first ----
        const count = Math.max(1, stops.length);
        const homeStep = count > 1 ? (HOME_BY - HOME_FROM - HOME_RUN) / (count - 1) : 0;
        const inHero = s < HOME_BY + 0.02;
        if (inHero !== shownFleet) {
          shownFleet = inHero;
          fleetEl.style.display = inHero ? 'block' : 'none';
          rack.dataset.hero = String(inHero);
        }
        if (inHero) {
          const free = s < 0.015;
          ringSpeed += ((hovering || dragging || !free ? 0 : 0.11) - ringSpeed) * (1 - Math.exp(-dt * 3));
          spin *= Math.exp(-dt * 2.2);
          fleet.ring += (ringSpeed + (dragging || !free ? 0 : spin)) * dt;
          const centreX = rackW / 2;
          const centreY = (rows / 2) * uh;
          const closeUp = 1 - Math.exp(-dt * 2.4);
          const tiltY = Math.sin(ringTilt);
          const tiltZ = Math.cos(ringTilt);
          const rollX = Math.cos(ringRoll);
          const rollY = Math.sin(ringRoll);
          cards.forEach((c, i) => {
            const rank = stopOf[i];
            const place = rank >= 0 ? rank : i;
            // a filter sends the ones it leaves out home, and the rest close the gaps by the short way round
            fleet.on[i] = Math.max(0, Math.min(1, fleet.on[i] + (rank >= 0 ? dt : -dt) / 1.4));
            const target = (place / count) * TAU;
            fleet.angle[i] += Math.atan2(Math.sin(target - fleet.angle[i]), Math.cos(target - fleet.angle[i])) * closeUp;
            const homeAt = HOME_FROM + (count - 1 - place) * homeStep;
            const p = Math.min(ramp(age, 1.05 + place * 0.16, 2.95 + place * 0.16), 1 - ramp(s, homeAt, homeAt + HOME_RUN), fleet.on[i]);
            if (open[i] === 0) units[i].edge.style.opacity = Math.sin(Math.PI * ramp(p, 0, 0.14)).toFixed(3);
            const visible = p >= 0.002;
            if (visible !== (c.card.style.visibility !== 'hidden')) c.card.style.visibility = visible ? 'visible' : 'hidden';
            if (!visible) return;

            const theta = fleet.ring + fleet.angle[i];
            // (counted from the turn it's on, so that the way round to the front never jumps)
            if (p === 1) fleet.turns[i] = Math.round(theta / TAU);
            const docking = 1 - p;
            const ride = smoother(ramp(docking, 0, 0.6));
            const dock = smoother(ramp(docking, 0.42, 1));
            const round = (theta - fleet.turns[i] * TAU) * (1 - ride);
            const sin = Math.sin(round);
            const cos = Math.cos(round);
            const bob = Math.sin(time * 0.8 + i * 1.7) * uh * 0.12 * (1 - ride);
            const across = ringX * sin;
            const down = ringZ * cos * tiltY + bob;
            const x = lerp(centreX + across * rollX - down * rollY, centreX, dock);
            const y = lerp(centreY + across * rollY + down * rollX, (ROWS_ABOVE + i + 0.5) * uh, dock);
            const z = lerp(ringCentreZ + ringZ * cos * tiltZ, 2, dock);
            // out in the ring it faces the visitor square on, whatever the camera is doing, and in its plate it lies flat in the rack
            const square = 1 - dock;
            const faceX = (-rx * square).toFixed(2);
            const faceY = (-ry * square).toFixed(2);
            const outward = (sin * 24 * square).toFixed(2);
            const base = cardWidth / cardLayout;
            const wide = lerp(base, lidWidth / cardLayout, dock);
            const tall = lerp(base, uh / Math.max(1, c.height || cardLayout * 0.6), dock);
            c.card.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,${z.toFixed(1)}px) translate(-50%,-50%) rotateY(${faceY}deg) rotateX(${faceX}deg) rotateY(${outward}deg) scale3d(${wide.toFixed(4)},${tall.toFixed(4)},1)`;
            c.card.style.opacity = smooth(p, 0, 0.05).toFixed(3);
            c.shade.style.opacity = ((1 - (cos + 1) / 2) * 0.72 * square).toFixed(3);
            c.metal.style.opacity = (1 - smooth(p, 0.06, 0.3)).toFixed(3);
          });
        }

        // the light behind it all: a bloom as the door opens that stays as a glow, and rays turning slowly
        const heroFade = 1 - smooth(s, 0.3, 0.95);
        if (heroFade > 0.004 || shownFx > 0.004) {
          shownFx = heroFade;
          const bloom = smooth(age, 0.6, 1.5) * (1 - 0.42 * smooth(age, 1.7, 3.4)) * heroFade;
          const hidden = bloom < 0.004 ? 'hidden' : 'visible';
          haloEl.style.opacity = bloom.toFixed(3);
          haloEl.style.visibility = hidden;
          haloEl.style.transform = `scale(${(1.7 + 0.5 * smooth(age, 0.6, 2.2)).toFixed(3)})`;
          raysEl.style.opacity = (bloom * smooth(age, 0.8, 2.4)).toFixed(3);
          raysEl.style.visibility = hidden;
          raysEl.style.transform = `rotate(${(time * 2.6).toFixed(2)}deg) scale(2.6)`;
          orbitEl.style.opacity = (heroFade * smooth(age, 1.1, 2.6)).toFixed(3);
          orbitEl.style.visibility = hidden;
        }
        const burst = Math.sin(Math.PI * ramp(age, 0.75, 2.5));
        const burstShow = burst > 0.004 ? 'block' : 'none';
        if (burstShow !== shownBurst) {
          shownBurst = burstShow;
          burstEl.style.display = burstShow;
        }
        if (burst > 0.004) burstEl.style.opacity = (burst * 0.8).toFixed(3);

        // ---- With a laptop open: the other units fall back a little and its screen lights the room ----
        const dim = Math.max(0.3 * smooth(brightest, 0.3, 0.9), 0.78 * (1 - smooth(age, 0.35, 1.5)));
        if (dim !== shownDim) {
          shownDim = dim;
          dimEl.style.opacity = dim.toFixed(3);
          dimEl.style.visibility = dim < 0.004 ? 'hidden' : 'visible';
        }
        const ambient = smooth(brightest, 0.7, 1);
        if (ambient !== shownAmbient) {
          shownAmbient = ambient;
          ambientEl.style.opacity = ambient.toFixed(3);
          ambientEl.style.visibility = ambient < 0.004 ? 'hidden' : 'visible';
        }

        // the cabinet's own walls can't be seen from straight in front
        const shell = away < 0.004 && looking === 0 ? 'hidden' : 'visible';
        if (shell !== shownShell) {
          shownShell = shell;
          shellEl.style.visibility = shell;
        }

        // ---- The opening words, the closing words, and the way past ----
        const openingAlpha = 1 - smooth(s, 0.04, 0.3);
        if (Math.abs(openingAlpha - shownOpening) > 0.003) {
          shownOpening = openingAlpha;
          openingEl.style.opacity = openingAlpha.toFixed(3);
          openingEl.style.visibility = openingAlpha < 0.004 ? 'hidden' : 'visible';
          openingEl.style.transform = `translate3d(0,${(-(1 - openingAlpha) * 36).toFixed(1)}px,0)`;
        }
        const closingAlpha = smooth(s, clock.closeAt - 0.32, clock.closeAt - 0.04);
        if (Math.abs(closingAlpha - shownClosing) > 0.003) {
          shownClosing = closingAlpha;
          fade(closingEl, closingAlpha);
        }
        const skip = s > 0.34 && s < clock.closeAt - 0.3 ? '1' : '0';
        if (skip !== shownSkip) {
          shownSkip = skip;
          skipEl.style.opacity = skip;
          skipEl.style.pointerEvents = skip === '1' ? 'auto' : 'none';
        }

        // ---- Which stop this is, for the list; and its screen and the next ones get their pictures ready ----
        let stop = -1;
        if (s > INTRO_HOLD + 0.2 && s < clock.closeAt - 0.3) {
          stop = 0;
          for (let n = 0; n < stops.length; n++) if (raw >= clock.arrive[n] - GAP * 0.5) stop = n;
        }
        if (stop !== currentStop) {
          currentStop = stop;
          currentRef.current(stop);
          const from = Math.max(0, stop);
          setNearSet((set) => {
            const wanted = [stops[from - 1], stops[from], stops[from + 1], stops[from + 2]].filter((i) => i !== undefined && !set.has(i));
            return wanted.length ? new Set([...set, ...wanted]) : set;
          });
        }
      };
      gsap.ticker.add(tick);

      return () => {
        gsap.ticker.remove(tick);
        ScrollTrigger.removeEventListener('refresh', measure);
        window.removeEventListener('pointermove', onMove);
        fleetEl.removeEventListener('pointerdown', onCardDown);
        fleetEl.removeEventListener('click', onCardClick, true);
        fleetEl.removeEventListener('pointerover', onCardOver);
        fleetEl.removeEventListener('pointerout', onCardOut);
        window.removeEventListener('pointermove', onCardDrag);
        window.removeEventListener('pointerup', onCardUp);
        window.removeEventListener('pointercancel', onCardUp);
        ro.disconnect();
        seen.disconnect();
        cardSizes.disconnect();
      };
    },
    { scope: rootRef, dependencies: [stops, clock, projects.length, rows], revertOnUpdate: true },
  );

  const navItems = useMemo(() => stops.map((index) => ({ index, title: projects[index].title })), [stops, projects]);
  const stopSet = useMemo(() => new Set(stops), [stops]);
  const facts = [
    projects.length > 0 && `${projects.length} project${projects.length === 1 ? '' : 's'}`,
    siteCount > 0 && `${siteCount} more site${siteCount === 1 ? '' : 's'}`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div
      ref={rootRef}
      data-ready="false"
      className="group/rack relative bg-midnight text-white"
      style={{ height: `${(clock.total + 1) * 100}svh`, '--lw': '600px', '--uh': '50px', '--rail': '18px', '--depth': '180px', '--chrome': '30px' } as CSSProperties}
    >
      <section data-rack="stage" aria-label="Our projects" className="rack-room sticky top-0 h-svh overflow-hidden [contain:layout_paint]">
        <KeyShapes />
        {/* The light behind the rack */}
        <div data-rack="halo" aria-hidden="true" className="rack-halo invisible absolute opacity-0" />
        <div data-rack="rays" aria-hidden="true" className="rack-rays invisible absolute opacity-0"><span className="rack-rays-paint absolute inset-0" /></div>
        <div data-rack="ambient" aria-hidden="true" className="rack-ambient invisible absolute opacity-0" />
        <div data-rack="rack" className="pointer-events-none invisible absolute left-0 top-0 origin-top-left [transform-style:preserve-3d] group-data-[ready=true]/rack:visible">
          {/* The cabinet, on a floor with signals moving across it */}
          <div aria-hidden="true" className="rack-floor absolute left-1/2 top-full">
            <div className="rack-floor-grid absolute inset-0" />
            <div data-rack="signals" className="absolute inset-0">
              <span className="rack-signal opacity-0" style={{ left: '38%' }} />
              <span className="rack-signal opacity-0" style={{ left: '50%' }} />
              <span className="rack-signal opacity-0" style={{ left: '62%' }} />
            </div>
          </div>
          <div data-rack="shell" aria-hidden="true" className="absolute inset-0 [transform-style:preserve-3d]">
            <div className="rack-back absolute inset-0" style={{ transform: 'translateZ(calc(var(--cab) * -1))' }} />
            <div className="rack-side absolute inset-y-0 left-0 origin-left" style={{ width: 'var(--cab)', transform: 'rotateY(90deg)' }} />
            <div className="rack-side absolute inset-y-0 right-0 origin-right" style={{ width: 'var(--cab)', transform: 'rotateY(-90deg)' }} />
            <div className="rack-side absolute inset-x-0 top-0 origin-top" style={{ height: 'var(--cab)', transform: 'rotateX(-90deg)' }} />
            {/* its reflection in the floor */}
            <div className="rack-mirror absolute inset-x-0 top-full" />
          </div>
          <div aria-hidden="true" className="rack-post absolute inset-y-0 left-0" style={{ width: 'var(--rail)', transform: 'translateZ(-6px)' }} />
          <div aria-hidden="true" className="rack-post absolute inset-y-0 right-0" style={{ width: 'var(--rail)', transform: 'translateZ(-6px)' }} />

          {/* The line the screens go round on */}
          <div data-rack="orbit" aria-hidden="true" className="rack-orbit invisible absolute opacity-0" />

          {/* The signal running down the rails to the next unit */}
          <span data-rack="runner" aria-hidden="true" className="rack-runner opacity-0" style={{ left: 'calc(var(--rail) * 0.32)' }} />
          <span data-rack="runner" aria-hidden="true" className="rack-runner opacity-0" style={{ right: 'calc(var(--rail) * 0.32)' }} />

          {/* The maker's plate, and the patch panel */}
          <div aria-hidden="true" className="rack-plate absolute flex items-center justify-between px-[calc(var(--uh)*0.5)]" style={{ left: 'var(--rail)', width: 'var(--lw)', top: 0, height: 'calc(var(--uh) * 2)', transform: 'translateZ(-4px)' }}>
            <Image src="/logo/logo-inta.png" alt="" width={120} height={50} className="h-[calc(var(--uh)*0.8)] w-auto" />
            <span className="rack-vent h-[46%] w-[46%] rounded-[2px]" />
          </div>
          <div aria-hidden="true" className="rack-plate absolute flex items-center gap-[calc(var(--uh)*0.3)] px-[calc(var(--uh)*0.3)]" style={{ left: 'var(--rail)', width: 'var(--lw)', top: 'calc(var(--uh) * 2)', height: 'var(--uh)', transform: 'translateZ(-4px)' }}>
            <span className="rack-screw" />
            <span className="rack-ports h-[46%] flex-1" />
            <span className="rack-leds"><span data-led className="rack-led" /></span>
            <span className="rack-screw" />
          </div>

          {projects.map((project, i) => (
            <Unit key={project.id} project={project} index={i} row={ROWS_ABOVE + i} off={!stopSet.has(i)} near={nearSet.has(i)} onGo={goTo} onView={onView} />
          ))}

          {/* The rest of the rack, falling back a little while a laptop is open */}
          <div data-rack="dim" aria-hidden="true" className="rack-dim invisible absolute inset-y-0 opacity-0" style={{ left: 'var(--rail)', width: 'var(--lw)', transform: 'translateZ(-3.2px)' }} />

          {/* The light flooding out as the door opens */}
          <div data-rack="burst" aria-hidden="true" className="rack-burst absolute inset-y-0 hidden opacity-0" style={{ left: 'var(--rail)', width: 'var(--lw)', transform: 'translateZ(-1px)' }} />

          {/* The slot with nothing in it */}
          <button type="button" onClick={() => toSection(formId)} className="rack-empty group pointer-events-auto absolute flex cursor-pointer items-center justify-center font-mono text-[length:calc(var(--uh)*0.24)] font-bold uppercase tracking-[0.25em] text-[#9dbbff] transition-colors duration-300 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#9dbbff]" style={{ left: 'var(--rail)', width: 'var(--lw)', top: `calc(var(--uh) * ${ROWS_ABOVE + projects.length})`, height: 'var(--uh)', transform: 'translateZ(-5px)' }}>
            <span data-rack="slot-glow" aria-hidden="true" className="rack-empty-glow absolute inset-0 opacity-0" />
            {/* named by what it shows, so saying "Your project" finds it */}
            <span className="relative">Your project<span className="sr-only">: start one with us</span></span>
          </button>

          {/* A vent and the power strip */}
          <div aria-hidden="true" className="rack-plate absolute flex items-center gap-[calc(var(--uh)*0.3)] px-[calc(var(--uh)*0.3)]" style={{ left: 'var(--rail)', width: 'var(--lw)', top: `calc(var(--uh) * ${ROWS_ABOVE + projects.length + 1})`, height: 'var(--uh)', transform: 'translateZ(-4px)' }}>
            <span className="rack-screw" />
            <span className="rack-vent h-[50%] flex-1 rounded-[2px]" />
            <span className="rack-screw" />
          </div>
          <div aria-hidden="true" className="rack-plate absolute flex items-center gap-[calc(var(--uh)*0.3)] px-[calc(var(--uh)*0.3)]" style={{ left: 'var(--rail)', width: 'var(--lw)', top: `calc(var(--uh) * ${ROWS_ABOVE + projects.length + 2})`, height: 'var(--uh)', transform: 'translateZ(-4px)' }}>
            <span className="rack-screw" />
            <span className="rack-led" />
            <span className="rack-led" />
            <span className="rack-ports h-[40%] flex-1 opacity-60" />
            <span className="rack-screw" />
          </div>

          {/* The light moving across the fronts */}
          <div data-rack="sheen" aria-hidden="true" className="rack-sheen invisible absolute inset-0 overflow-hidden" style={{ transform: 'translateZ(-2.4px)' }}>
            <span className="absolute inset-y-0 left-0 w-[34%] bg-linear-to-r from-transparent via-white/8 to-transparent" />
            <span data-scan className="rack-scan absolute inset-x-0 top-0 h-[10%]" />
          </div>

          {/* The glass door, and the glint that crosses it as it moves */}
          <div data-rack="door" aria-hidden="true" className="rack-door absolute inset-0 origin-right overflow-hidden" style={{ transform: 'translateZ(8px)' }}>
            <span className="rack-door-glint absolute inset-y-0 left-0 w-[30%]" />
            <span className="rack-seam absolute inset-y-0 left-0" />
          </div>

          {/* The work, out in orbit */}
          <div data-rack="fleet" className="absolute inset-0 [transform-style:preserve-3d]">
            {projects.map((project, i) => (
              <FleetCard key={project.id} project={project} index={i} onGo={goTo} />
            ))}
          </div>
        </div>

        {/* ---- What this is ---- */}
        <div data-rack="opening" className="rack-moves pointer-events-none absolute inset-0 z-10 flex flex-col justify-end pb-5 sm:pb-7 [@media(max-height:480px)]:justify-center [@media(max-height:480px)]:pb-0 [@media(max-height:480px)]:pt-[var(--header-h)]">
          <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[42%] bg-linear-to-t from-[#01072b] via-[#01072b]/75 to-transparent [@media(max-height:480px)]:hidden" />
          <div className="relative mx-auto w-full max-w-[1320px] px-4 text-center sm:px-6 [@media(max-height:480px)]:mx-0 [@media(max-height:480px)]:max-w-[46vw] [@media(max-height:480px)]:text-left">
            <div data-rack="opening-words" className="pointer-events-auto">
              <p data-rack="in" className="inline-flex items-center gap-3 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#9dbbff] sm:text-[11px] sm:tracking-[0.3em]">
                <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-current" />
                {t('portfolio_kicker')}{facts && <> {'//'} {facts}</>}
              </p>
              <h1 className="heading-page mt-2 text-white sm:mt-2.5">
                <span data-rack="word" className="inline-block">{titlePlain}</span>{' '}
                <span data-rack="word" className="heading-accent-dark heading-serif inline-block">{titleBright}</span>
              </h1>
              <p data-rack="in" className="mx-auto mt-2 max-w-4xl text-[15px] leading-relaxed text-white/85 [text-wrap:balance] sm:text-lg [@media(max-height:620px)]:hidden">
                {t('portfolio_text')}
              </p>
              {tags.length > 0 && (
                <div data-rack="in" role="group" aria-label="Show only" className="mt-3 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] sm:mt-4 sm:flex-wrap sm:justify-center sm:overflow-visible [&::-webkit-scrollbar]:hidden [@media(max-height:480px)]:hidden">
                  {['', ...tags].map((t) => (
                    <button key={t || 'all'} type="button" aria-pressed={tag === t} onClick={() => setTag(t)} className={`shrink-0 rounded-lg border px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9dbbff] sm:text-[11px] ${tag === t ? 'border-white bg-white text-midnight' : 'border-white/20 text-white/85 hover:border-[#9dbbff] hover:text-[#9dbbff]'}`}>
                      {t || 'All'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ---- One project at a time ---- */}
        {projects.map((project, i) => (
          <div key={project.id} data-words={i} className="invisible absolute z-10 flex items-start opacity-0 [@media(min-aspect-ratio:23/20)]:items-center" style={{ left: 'var(--words-x)', width: 'var(--words-w)', top: 'var(--words-top)', bottom: 'var(--words-bottom)' }}>
            <Words project={project} onView={onView} />
          </div>
        ))}

        {/* ---- The empty slot ---- */}
        <div data-rack="closing" className="rack-moves invisible absolute z-10 flex items-end opacity-0 [@media(min-aspect-ratio:23/20)]:items-center" style={{ left: 'var(--words-x)', width: 'var(--words-w)', top: 16, bottom: 16 }}>
          <div className="w-full rounded-3xl border border-white/12 bg-[#040c38]/95 p-5 sm:p-6 [@media(min-aspect-ratio:23/20)]:border-0 [@media(min-aspect-ratio:23/20)]:bg-transparent [@media(min-aspect-ratio:23/20)]:p-0">
            <h2 className="heading-section text-white">{emptyPlain} <span className="heading-accent-dark">{emptyBright}</span></h2>
            <p className="mt-3 text-[15px] leading-relaxed text-white/85 sm:text-lg">{t('portfolio_empty_text')}</p>
            <button type="button" onClick={() => toSection(formId)} className="kinetic-cta-btn mt-4 inline-flex items-center gap-2.5 rounded-xl bg-brand-blue px-5 py-3 font-mono text-[11px] font-semibold uppercase tracking-wider text-white transition-colors duration-300 hover:bg-white hover:text-midnight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9dbbff] sm:text-xs">
              Start a project <Icon name="north_east" className="text-[15px]" />
            </button>
          </div>
        </div>

        <button type="button" data-rack="skip" onClick={() => toSection(nextId)} aria-label="Skip the rack" className="absolute bottom-3.5 right-3.5 z-20 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-midnight/85 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white opacity-0 transition-[opacity,border-color] duration-300 hover:border-[#9dbbff] focus-visible:outline-2 focus-visible:outline-[#9dbbff] [@media(min-aspect-ratio:23/20)_and_(min-height:481px)]:bottom-auto [@media(min-aspect-ratio:23/20)_and_(min-height:481px)]:right-3 [@media(min-aspect-ratio:23/20)_and_(min-height:481px)]:top-3 lg:[@media(min-aspect-ratio:23/20)_and_(min-height:481px)]:right-14">
          <span className="max-[359px]:hidden">Skip</span> <Icon name="south" className="text-[13px]" />
        </button>

        <RackNav items={navItems} currentRef={currentRef} onGo={goTo} />
      </section>
    </div>
  );
}

export default memo(RackStage);
