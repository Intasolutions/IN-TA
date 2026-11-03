'use client';

import { useEffect, useRef, useState, type FocusEvent, type MouseEvent, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import Icon from '../Icon';
import Scramble from '../Scramble';
import { SERVICES } from '../Footer';
import { scrollToY } from '../SmoothScroll';
import { IstClock } from '../Header';
import { useOfficeStatus } from '../OfficeStatus';
import TechOrbit from '../stack/TechOrbit';
import { useReveal } from '../../context/RevealContext';
import { ClientBoard, ClientRoute, useClients } from './ClientLogos';
import EarthReturn from './EarthReturn';
import type { MapClient } from './clients';
import { createGlobe } from './globe';
import { CLOSING, ORIGIN } from './story';
import { clamp01, drawMap, makeTrace, smooth, TARGET, viewOf, type LandDetail, type Point, type Trace } from './mapCanvas';

gsap.registerPlugin(ScrollTrigger, useGSAP);

export type MapService = { title: string; slug: string; description: string };

// The full scene needs room; smaller screens follow a vertical route instead.
// (Must match the [@media(min-width:1024px)_and_(min-height:640px)_and_(prefers-reduced-motion:no-preference)] classes in the markup.)
const SCENE = '(min-width: 1024px) and (min-height: 640px) and (prefers-reduced-motion: no-preference)';
const ROUTE = '(prefers-reduced-motion: no-preference) and (max-width: 1023.98px), (prefers-reduced-motion: no-preference) and (max-height: 639.98px)';
const CALM = '(prefers-reduced-motion: reduce)';

// The scene's scroll, in screens: zoom (1.66), the story (1), the services board (1.54), the orbit (1.6), the clients (2), back to Earth (1.6)
const SCENE_SCREENS = 9.4;
const SCREEN = 1 / SCENE_SCREENS;
const BOARD_UNIT = 3.2 / SCENE_SCREENS; // the zoom and board timings below are fractions of 3.2 screens
const STORY_LENGTH = 1 / SCENE_SCREENS;
const ORBIT_UNIT = 4.8 / SCENE_SCREENS;
const ZOOM_END = 0.52;
const TRACE_START = 0.06; // (after the core lands)
const TRACE_STEP = 0.028;
const TRACE_LENGTH = 0.09;
const PAN_START = 4.2 / SCENE_SCREENS; // from the services board across to the orbit
const PAN_LENGTH = 0.8 / SCENE_SCREENS;
const CLIENTS_PAN_START = 5.8 * SCREEN; // from the orbit down to the clients' board
const CLIENTS_PAN_LENGTH = 0.8 * SCREEN;
const CLIENTS_HEAD_IN = 6 * SCREEN;
const CLIENTS_BUS_START = 6.45 * SCREEN; // the bus draws across, and each logo plugs in as it passes
const CLIENTS_BUS_LENGTH = 0.5 * SCREEN;
const CLIENTS_STUB_LENGTH = 0.12 * SCREEN;
const CLIENTS_PLUG_LENGTH = 0.16 * SCREEN;
const OUT_START = 7.8 * SCREEN; // back up to Earth
// Phones and tablets: the zoom, then the story, then the core lands
const ROUTE_ZOOM_END = 0.5;
const ROUTE_LAND = 0.82;

// The side menu: where each stop sits on the scroll
const STOPS = [
  { name: 'The globe', p: 0 },
  { name: 'Where it started', p: 0.228 },
  { name: 'Services', p: 0.401 },
  { name: 'Stack', p: 0.583 },
  { name: 'Clients', p: 0.76 },
  { name: 'Our reach', p: 1 },
];

// Large monitors: the boards and words grow with the screen instead of sitting small in the middle of it
const ZOOMED = '[data-sm="system"], [data-sm="panel-stack"], [data-sm="panel-clients"], [data-sm="intro"], [data-sm="story"], [data-sm="outro"]';
const screenZoom = (w: number, h: number) => Math.min(1.9, Math.max(1, Math.min(w / 1480, h / 800))).toFixed(3);

const GRADIENT_ON_DARK = 'heading-accent';

// How the globe rests before you scroll (degrees): India in view, and turning the way the real earth turns
const REST_LON = TARGET.lon + 24;
const REST_LAT = 10;
const AUTO_SPIN = -3.5; // degrees per second

const placeName = (fov: number) =>
  fov > 6000 ? 'IN-TA Solutions' : fov > 1200 ? 'India' : fov > 240 ? 'Kerala' : fov > 60 ? 'Wayanad' : 'Thonichal, Mananthavady';

const formatKm = (fov: number) =>
  (fov >= 1000 ? Math.round(fov / 10) * 10 : fov >= 100 ? Math.round(fov) : Number(fov.toFixed(1))).toLocaleString('en-US');

function StatusPill() {
  const status = useOfficeStatus();
  const isOpen = status?.startsWith('OPEN') ?? false;
  return (
    <div data-sm="status" className="inline-flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 rounded-full border border-white/12 bg-[#050d3a]/85 px-3.5 py-2 font-mono text-[10px] uppercase tracking-wider">
      <span className="relative flex h-2 w-2 shrink-0">
        {isOpen && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#7fa6ff] opacity-75" />}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${isOpen ? 'bg-[#7fa6ff]' : 'bg-white/30'}`} />
      </span>
      <span className={isOpen ? 'text-[#9dbbff] font-bold' : 'text-white/60'}>{status ?? 'Mon–Sat · 9 AM–5 PM IST'}</span>
      <span aria-hidden="true" className="text-white/25">·</span>
      <span className="text-white/60 tabular-nums">
        <IstClock />
      </span>
    </div>
  );
}

/** The core: the official logo file, seated like a processor at the middle of the board */
function Core({ className = '' }: { className?: string }) {
  return (
    <div
      data-sm="chip"
      className={`relative flex items-center justify-center rounded-2xl border border-[#7fa6ff]/50 ring-1 ring-inset ring-white/10
        bg-[linear-gradient(145deg,#01072b_0%,#06123f_55%,#0a1d5c_100%)] shadow-[0_0_60px_-8px_rgb(59_123_247/0.75)] ${className}`}
    >
      <span aria-hidden="true" className="absolute inset-2 rounded-xl border border-white/10" />
      <Image src="/logo/logo-inta.png" alt="IN-TA Solutions" width={774} height={322} className="relative w-[80%] h-auto" />
    </div>
  );
}

function Heading({ count }: { count: number }) {
  return (
    <div data-sm="head" className="text-center">
      <span className="inline-flex items-center gap-3 font-mono text-[11px] tracking-[0.3em] uppercase font-bold text-[#9dbbff] mb-2">
        <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
        Services // What runs here
      </span>
      <h2 className="heading-section text-white">
        One core. <span className={GRADIENT_ON_DARK}>{count} modules.</span>
      </h2>
    </div>
  );
}

/** Shortcuts between stops. On its own, so that passing a stop while scrolling doesn't re-render the whole scene. */
function StopsNav({ hasClients, stopChangedRef, onGo }: { hasClients: boolean; stopChangedRef: RefObject<(i: number) => void>; onGo: (p: number) => void }) {
  const [stop, setStop] = useState(0);
  useEffect(() => {
    stopChangedRef.current = setStop;
  }, [stopChangedRef]);

  return (
    <nav aria-label="Stops on the map" className="absolute right-4 xl:right-6 top-1/2 -translate-y-1/2 hidden flex-col items-end gap-3 [@media(min-width:1024px)_and_(min-height:640px)_and_(prefers-reduced-motion:no-preference)]:flex">
      {STOPS.map((s, i) => (s.name === 'Clients' && !hasClients ? null : (
        <button key={s.name} type="button" onClick={() => onGo(s.p)} aria-current={stop === i ? 'true' : undefined} className="group flex items-center gap-2.5 rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#7fa6ff]">
          <span className="font-mono text-[9px] xl:text-[10px] uppercase tracking-wider rounded bg-[#050d3a]/85 px-1.5 py-0.5 text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
            {s.name}
          </span>
          <span className={`block rounded-full transition-[width,height,background-color] duration-300 ${stop === i ? 'h-2.5 w-2.5 bg-[#9dbbff]' : 'h-1.5 w-1.5 bg-white/40 group-hover:bg-white'}`} />
        </button>
      )))}
    </nav>
  );
}

/** The About page as one live system: zoom from the whole planet into the office coordinates, then travel across the board. */
export default function SystemMap({ services, clients: initialClients }: { services: MapService[]; clients: MapClient[] }) {
  const clients = useClients(initialClients);
  const boardStale = useRef(false);
  const modules: MapService[] = services.length ? services : SERVICES.map((s) => ({ title: s.name, slug: s.slug, description: '' }));
  const half = Math.ceil(modules.length / 2);
  const ref = useRef<HTMLDivElement>(null);
  const activeRef = useRef(-1);
  const [active, setActive] = useState(-1);
  const introRef = useRef<gsap.core.Timeline | null>(null);
  const { isIntroReady } = useReveal();
  const stopChangedRef = useRef<(i: number) => void>(() => {});
  const [credits, setCredits] = useState(false);
  const scrollToStop = useRef<(p: number) => void>(() => {});
  const current = active >= 0 ? modules[active] : null;

  const select = (i: number) => {
    activeRef.current = i;
    setActive(i);
  };

  // ---- The opening text rises in once the page loader has cleared ----
  useGSAP(
    () => {
      if (window.matchMedia(CALM).matches) return;
      introRef.current = gsap
        .timeline({ paused: true, defaults: { ease: 'expo.out' } })
        .from('[data-sm="kicker"]', { y: 12, autoAlpha: 0, duration: 0.8 }, 0)
        .from('[data-sm="word"]', { yPercent: 110, duration: 1.2, stagger: 0.12 }, 0.1)
        .from('[data-sm="copy"]', { y: 18, autoAlpha: 0, duration: 0.9, stagger: 0.1 }, 0.5)
        .from('[data-sm="canvas"], [data-sm="gl"]', { autoAlpha: 0, scale: 0.92, duration: 1.8 }, 0)
        .from('[data-sm="hud"]', { autoAlpha: 0, duration: 0.8 }, 0.8);
    },
    { scope: ref },
  );
  useEffect(() => {
    if (isIntroReady) introRef.current?.restart();
  }, [isIntroReady]);
  // (the real logos can arrive after the first paint: the traces to them are measured again)
  useEffect(() => {
    boardStale.current = true;
  }, [clients]);

  // ---- Canvas + scroll ----
  useGSAP(
    () => {
      const root = ref.current!;
      const canvas = root.querySelector<HTMLCanvasElement>('[data-sm="canvas"]')!;
      const stage = root.querySelector<HTMLElement>('[data-sm="stage"]')!;
      const track = root.querySelector<HTMLElement>('[data-sm="track"]')!;
      const hud = root.querySelector<HTMLElement>('[data-sm="hud"]')!;
      const fovEl = root.querySelector<HTMLElement>('[data-sm="fov"]')!;
      const placeEl = root.querySelector<HTMLElement>('[data-sm="place"]')!;
      const placeText = root.querySelector<HTMLElement>('[data-sm="placetext"]')!;
      const world = root.querySelector<HTMLElement>('[data-sm="world"]')!;
      const ctx = canvas.getContext('2d')!;
      const glCanvas = root.querySelector<HTMLCanvasElement>('[data-sm="gl"]')!;
      // Imagery arrives after the first paint: the drawn globe shows until then, then it dissolves into the real one
      const imagery = { v: 0 };
      let redrawStill: () => void = () => {};
      const globe = createGlobe(glCanvas, window.innerWidth < 768, () => {
        if (globe?.isReady() && imagery.v === 0) gsap.to(imagery, { v: 1, duration: window.matchMedia(CALM).matches ? 0 : 1.2, ease: 'power2.out', onUpdate: () => redrawStill() });
        redrawStill();
      });
      const font = `10px ${getComputedStyle(hud).fontFamily}`;

      let land: number[][] = [];
      let detail: LandDetail | null = null;
      const aborter = new AbortController();

      const setup = (mode: 'scene' | 'route' | 'calm') => {
        const u = (v: number) => (mode === 'scene' ? v * BOARD_UNIT : v); // a stretch of the zoom-and-board part, on the whole scroll
        const zoomEnd = mode === 'scene' ? u(ZOOM_END) : ROUTE_ZOOM_END;
        const landAt = mode === 'scene' ? zoomEnd + STORY_LENGTH : ROUTE_LAND; // the imagery has dissolved and the core lands
        const state = { p: 0, cam: 0, camClients: 0, zOut: 0 };
        const box = mode === 'scene' ? '[data-sm="system"]' : '[data-sm="core"]';
        const chip = root.querySelector<HTMLElement>(`${box} [data-sm="chip"]`)!;
        let w = 0;
        let h = 0;
        let radius0 = 0;
        let start: Point = [0, 0];
        let center: Point = [0, 0];
        let traces: Trace[] = [];
        let orbitAt: Point = [0, 0];
        let shownStop = 0;
        let lastZ = 0;
        let lastFov = '';
        let lastPlace = '';
        let lastTime = 0;
        let glIdle = false;
        let clientsAt: Point = [0, 0];
        let cards: { el: HTMLElement; at: number; side: number; shown: number }[] = [];
        let clientWords: HTMLElement[] = [];
        let wordsShown = -1;
        let panX = NaN;
        let panY = NaN;
        let tagW = 0;
        let tagTransform = '';
        let tagOpacity = '';
        const spin = { lon: REST_LON, lat: REST_LAT, vel: AUTO_SPIN };
        let drag: { id: number; x: number; y: number; t: number } | null = null;

        const measure = () => {
          const s = stage.getBoundingClientRect();
          w = s.width;
          h = s.height;
          const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
          canvas.width = Math.round(w * dpr);
          canvas.height = Math.round(h * dpr);
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          globe?.resize(w, h, Math.min(dpr, 1.5));
          glIdle = false;
          tagW = placeEl.offsetWidth;
          if (mode === 'scene') {
            const zoom = screenZoom(w, h);
            root.querySelectorAll<HTMLElement>(ZOOMED).forEach((el) => {
              el.style.zoom = zoom;
            });
          }
          // (its size at rest, not its on-screen box: the scroll timeline may have it scaled down right now)
          const atRest = (el: HTMLElement) => {
            const scale = Number(gsap.getProperty(el, 'scale')) || 1;
            const box = el.getBoundingClientRect();
            return { box, width: box.width / scale, height: box.height / scale };
          };
          const { box: c, width: chipW, height: chipH } = atRest(chip);
          // On the board, everything is measured against the moving layer, wherever the camera is right now
          const o = mode === 'scene' ? world.getBoundingClientRect() : s;
          center = [c.left + c.width / 2 - o.left, c.top + c.height / 2 - o.top];

          if (mode === 'scene') {
            radius0 = Math.min(w * 0.3, h * 0.4);
            start = [w * 0.68, h * 0.54];

            // Circuit traces: pin on the core, out to a channel beside the middle column, across to the module
            const mid = root.querySelector<HTMLElement>('[data-sm="mid"]')!.getBoundingClientRect();
            const slots = gsap.utils.toArray<HTMLElement>('[data-sm="slot"]', root);
            const sides = [slots.slice(0, half), slots.slice(half)];
            traces = [];
            let index = 0;
            sides.forEach((column, sideIndex) => {
              const side = sideIndex === 0 ? -1 : 1;
              const edge = center[0] + (side * chipW) / 2;
              const midEdge = side < 0 ? mid.left - o.left : mid.right - o.left;
              const n = column.length;
              const pinGap = n > 1 ? (chipH * 0.72) / (n - 1) : 0;
              const lines = column.map((slot, k) => {
                const r = slot.getBoundingClientRect();
                const end: Point = [(side < 0 ? r.right : r.left) - o.left, r.top + r.height / 2 - o.top];
                return { end, pinY: center[1] + (k - (n - 1) / 2) * pinGap };
              });
              // Staircase so the traces never cross: of those heading down, the top pin turns farthest out;
              // of those heading up, the top pin turns closest in
              const down = lines.filter((l) => l.end[1] >= l.pinY);
              const up = lines.filter((l) => l.end[1] < l.pinY);
              const stair = (i: number, m: number) => (m > 1 ? i / (m - 1) : 0.5);
              lines.forEach((l) => {
                const heading = l.end[1] >= l.pinY;
                const frac = heading ? 0.8 - 0.6 * stair(down.indexOf(l), down.length) : 0.2 + 0.6 * stair(up.indexOf(l), up.length);
                const bendX = midEdge + (l.end[0] - midEdge) * frac;
                const from = landAt + u(TRACE_START + index * TRACE_STEP);
                traces.push(makeTrace([[edge, l.pinY], [bendX, l.pinY], [bendX, l.end[1]], l.end], from, from + u(TRACE_LENGTH), index / modules.length));
                index += 1;
              });
            });

            // The long line the camera follows from the services board to the orbit's core
            const panel = root.querySelector<HTMLElement>('[data-sm="panel-stack"]')!.getBoundingClientRect();
            orbitAt = [panel.left - o.left, panel.top - o.top];
            const orbitCore = root.querySelector<HTMLElement>('[data-sm="panel-stack"] [data-orb="core"]')!;
            const { box: oc, height: orbitCoreH } = atRest(orbitCore);
            const coreX = oc.left + oc.width / 2 - o.left;
            const coreTop = oc.top + oc.height / 2 - o.top - orbitCoreH / 2;
            const chipTop = center[1] - chipH / 2;
            const firstCard = slots[0].getBoundingClientRect().top - o.top;
            const overBoard = Math.min(chipTop, firstCard) - 14;
            // (above the orbit's text, so it never runs through the heading)
            const overOrbit = root.querySelector<HTMLElement>('[data-sm="panel-stack"] section')!.getBoundingClientRect().top - o.top - 18;
            const beside = orbitAt[0] - w * 0.06;
            traces.push(makeTrace([[center[0], chipTop], [center[0], overBoard], [beside, overBoard], [beside, overOrbit], [coreX, overOrbit], [coreX, coreTop]], PAN_START, PAN_START + PAN_LENGTH, 0, true));

            // The clients' board: a line down from the orbit's core to one end of the bus, then a branch to each socket as the bus passes it.
            // (With no logos yet there is no board, and the camera simply stays on the orbit.)
            const sockets = gsap.utils.toArray<HTMLElement>('[data-sm="socket"]', root);
            clientsAt = orbitAt;
            cards = [];
            clientWords = gsap.utils.toArray<HTMLElement>('[data-sm="clients-head"], [data-sm="client-readout"]', root);
            wordsShown = -1;
            if (sockets.length) {
              const board = root.querySelector<HTMLElement>('[data-sm="panel-clients"]')!.getBoundingClientRect();
              clientsAt = [board.left - o.left, board.top - o.top];
              const gap = root.querySelector<HTMLElement>('[data-sm="client-bus"]')!.getBoundingClientRect();
              const busY = gap.top + gap.height / 2 - o.top;
              const boxes = sockets.map((el) => el.getBoundingClientRect());
              const busFrom = Math.min(...boxes.map((b) => b.left)) - o.left - 26;
              const busTo = Math.max(...boxes.map((b) => b.right)) - o.left + 26;
              const between = clientsAt[1] - h * 0.09; // the space between the two boards
              const coreBottom = oc.top + oc.height / 2 - o.top + orbitCoreH / 2;
              traces.push(makeTrace([[coreX, coreBottom], [coreX, between], [busFrom, between], [busFrom, busY]], CLIENTS_PAN_START, CLIENTS_BUS_START, 0, true));
              traces.push(makeTrace([[busFrom, busY], [busTo, busY]], CLIENTS_BUS_START, CLIENTS_BUS_START + CLIENTS_BUS_LENGTH, 0, true));
              boxes.forEach((b, i) => {
                const x = b.left + b.width / 2 - o.left;
                const above = b.top < gap.top;
                const from = CLIENTS_BUS_START + (CLIENTS_BUS_LENGTH * (x - busFrom)) / (busTo - busFrom);
                traces.push(makeTrace([[x, busY], [x, (above ? b.bottom : b.top) - o.top]], from, from + CLIENTS_STUB_LENGTH, i / boxes.length));
                cards.push({ el: sockets[i].querySelector<HTMLElement>('[data-sm="client-card"]')!, at: from + CLIENTS_STUB_LENGTH * 0.5, side: above ? -1 : 1, shown: -1 });
              });
            }
          } else if (mode === 'route') {
            const wide = w > h;
            radius0 = Math.min(w * 0.44, h * (wide ? 0.34 : 0.24));
            start = wide ? [w * 0.74, h * 0.58] : [w * 0.5, h * 0.68];
          } else {
            radius0 = Math.min(w * 0.4, h * 0.42);
            start = center = [w * 0.5, h * 0.5];
          }
        };

        // The clients' board: worked out from the scroll, because the logos can arrive after the timeline is built
        const showClients = (p: number) => {
          const words = smooth(CLIENTS_HEAD_IN, CLIENTS_HEAD_IN + 0.3 * SCREEN, p);
          if (words !== wordsShown) {
            wordsShown = words;
            clientWords.forEach((el) => {
              el.style.visibility = words > 0 ? 'visible' : 'hidden';
              el.style.opacity = words.toFixed(3);
              el.style.transform = `translateY(${(24 * (1 - words)).toFixed(1)}px)`;
            });
          }
          cards.forEach((card) => {
            // plugged in from the outside, towards the bus
            const t = clamp01((p - card.at) / CLIENTS_PLUG_LENGTH);
            if (t === card.shown) return;
            card.shown = t;
            const { el, side } = card;
            el.style.visibility = t > 0 ? 'visible' : 'hidden';
            el.style.opacity = t.toFixed(3);
            el.style.transform = t < 1 ? `translateY(${(side * 22 * (1 - t) * (1 - t)).toFixed(1)}px) scale(${(0.94 + 0.06 * t).toFixed(3)})` : '';
          });
        };

        const render = (time: number) => {
          if (mode === 'scene' && boardStale.current) {
            boardStale.current = false;
            measure();
          }
          const p = state.p;
          const z = mode === 'calm' ? 0.26 : clamp01(p / zoomEnd) * (1 - state.zOut);
          lastZ = z;
          const leaving = mode === 'scene' ? smooth(OUT_START, OUT_START + 0.22 * SCREEN, p) : 0; // the board fades away on the way back up
          const marker = Math.max(1 - smooth(landAt - u(0.02), landAt + u(0.05), p), leaving);

          // The camera moving across the board, from the services to the orbit
          let pan: Point = [0, 0];
          if (mode === 'scene') {
            pan = [-orbitAt[0] * state.cam - (clientsAt[0] - orbitAt[0]) * state.camClients, -orbitAt[1] * state.cam - (clientsAt[1] - orbitAt[1]) * state.camClients];
            if (pan[0] !== panX || pan[1] !== panY) {
              panX = pan[0];
              panY = pan[1];
              world.style.transform = `translate3d(${pan[0].toFixed(1)}px, ${pan[1].toFixed(1)}px, 0)`;
            }
            let at = 0;
            STOPS.forEach((s, i) => {
              if (p >= s.p - 0.05) at = i;
            });
            if (at !== shownStop) {
              shownStop = at;
              stopChangedRef.current(at);
            }
          }

          // The globe keeps turning at rest and carries on from a flick; scrolling takes over the camera
          const dt = Math.min(0.05, Math.max(0, time - lastTime));
          lastTime = time;
          // (on the way back up the globe faces the coordinates, then turns on from there)
          if (state.zOut > 0 && z > 0.03) {
            spin.lon = REST_LON;
            spin.lat = REST_LAT;
          }
          if (!drag && mode !== 'calm') {
            spin.vel += (AUTO_SPIN - spin.vel) * (1 - Math.exp(-dt * 1.5));
            spin.lon += spin.vel * dt * (1 - smooth(0, 0.03, z));
            spin.lat += (REST_LAT - spin.lat) * (1 - Math.exp(-dt * 0.3));
          }

          // Satellite imagery dissolves into the blueprint as the core lands
          const fade = mode === 'calm' ? 0.6 : smooth(landAt - u(0.07), landAt - u(0.005), p) * (1 - smooth(OUT_START + 0.07 * SCREEN, OUT_START + 0.44 * SCREEN, mode === 'scene' ? p : 0));
          const camera = { w, z, radius0, start, center: [center[0] + pan[0], center[1] + pan[1]] as Point, spinLon: spin.lon, spinLat: spin.lat };
          if (globe) {
            if (fade < 1) {
              const v = viewOf(camera);
              globe.draw({ cx: v.cx, cy: v.cy, R: v.R, lon0: v.lon0, lat0: v.lat0, fov: v.fov, time, fade: Math.max(fade, 1 - imagery.v) });
              glIdle = false;
            } else if (!glIdle) {
              globe.clear();
              glIdle = true;
            }
          }
          const hasImagery = globe?.isReady() ? imagery.v : 0;

          const { fov, tx, ty, facing } = drawMap(ctx, {
            ...camera,
            h,
            vector: 1 - hasImagery,
            p,
            time,
            pan,
            traceAlpha: 1 - leaving,
            land,
            detail,
            font,
            marker: mode === 'calm' ? 1 : marker,
            // faint over the imagery, stronger as it becomes the blueprint
            grid: (1 - 0.5 * smooth(landAt, landAt + u(0.1), p)) * (1 - hasImagery * 0.6 * (1 - fade)),
            labels: 1,
            traces,
            active: activeRef.current,
            pulses: mode === 'scene',
          });

          if (mode === 'scene') showClients(p);

          // Readouts: written only when they change
          const km = formatKm(fov);
          if (km !== lastFov) {
            lastFov = km;
            fovEl.textContent = km;
          }
          const name = placeName(fov);
          if (name !== lastPlace) {
            lastPlace = name;
            placeText.textContent = name;
            tagW = placeEl.offsetWidth;
            if (mode !== 'calm') gsap.fromTo(placeText, { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: 'power2.out', overwrite: true });
          }
          // Beside the marker where it fits, otherwise on the other side, otherwise centred underneath
          let tagX = tx + 20;
          let tagY = ty - 8;
          if (tagX + tagW > w - 8) tagX = tx - 20 - tagW;
          if (tagX < 8) {
            tagX = Math.max(8, Math.min(w - 8 - tagW, tx - tagW / 2));
            tagY = ty + 30;
          }
          const nextTransform = `translate(${Math.round(tagX)}px, ${Math.round(tagY)}px)`;
          if (nextTransform !== tagTransform) {
            tagTransform = nextTransform;
            placeEl.style.transform = nextTransform;
          }
          const nextOpacity = (marker * facing).toFixed(2);
          if (nextOpacity !== tagOpacity) {
            tagOpacity = nextOpacity;
            placeEl.style.opacity = nextOpacity;
          }
        };

        measure();
        const ro = new ResizeObserver(() => {
          measure();
          if (mode === 'calm') render(0);
        });
        ro.observe(stage);
        if (mode === 'calm') redrawStill = () => render(0);
        document.fonts?.ready.then(() => {
          measure();
          if (mode === 'calm') render(0);
        });

        fetch('/about/land.json', { signal: aborter.signal })
          .then((r) => r.json())
          .then((rings: number[][]) => {
            land = rings;
            if (mode === 'calm') render(0);
          })
          .catch(() => {});
        // The drawn close-up coast is only for browsers without WebGL; everyone else zooms into the imagery
        if (mode !== 'calm' && !globe) {
          fetch('/about/land-detail.json', { signal: aborter.signal })
            .then((r) => r.json())
            .then((d: LandDetail) => {
              detail = d;
            })
            .catch(() => {});
        }

        // Reduced motion: one still frame, and the layout flows as a plain page
        if (mode === 'calm') {
          render(0);
          return () => ro.disconnect();
        }

        // Everything is a function of scroll position, so it all reverses on the way back up
        const rise = { y: 0, scale: 1, autoAlpha: 1, ease: 'power2.out' };
        // (with a mouse the smooth scrolling already glides, so the scene follows it exactly; touch scrolling gets a little easing of its own)
        const scrub = window.matchMedia('(pointer: fine)').matches ? true : 0.3;
        const tl = gsap
          .timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: track, start: 'top top', end: 'bottom bottom', scrub, invalidateOnRefresh: true } })
          .to(state, { p: 1, duration: 1 }, 0)
          .to('[data-sm="intro"]', { y: -60, autoAlpha: 0, duration: u(0.08), ease: 'power2.in' }, u(0.02))
          // the story, over the real terrain, while the camera holds on the coordinates
          .fromTo('[data-sm="story"]', { y: 30, autoAlpha: 0 }, { ...rise, duration: u(0.05) }, zoomEnd - u(0.04))
          .to('[data-sm="story"]', { y: -24, autoAlpha: 0, duration: u(0.04), ease: 'power2.in' }, landAt - u(0.08))
          .to([hud, '[data-sm="credit"]'], { autoAlpha: 0, duration: u(0.05) }, landAt + u(0.01))
          .fromTo(chip, { scale: 0.08, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: u(0.08), ease: 'back.out(1.5)' }, landAt - u(0.01))
          .fromTo(`${box} [data-sm="status"]`, { y: 14, autoAlpha: 0 }, { ...rise, duration: u(0.05) }, landAt + u(0.06))
          .fromTo(`${box} [data-sm="head"]`, { y: 30, autoAlpha: 0 }, { ...rise, duration: u(0.07) }, landAt + u(0.05));

        if (mode === 'scene') {
          tl.fromTo('[data-sm="readout"]', { y: 14, autoAlpha: 0 }, { ...rise, duration: u(0.05) }, landAt + u(0.08));
          gsap.utils.toArray<HTMLElement>('[data-sm="mod"]', root).forEach((mod, i) => {
            const landed = landAt + u(TRACE_START + i * TRACE_STEP + TRACE_LENGTH);
            tl.fromTo(mod, { x: i < half ? 28 : -28, scale: 0.94, autoAlpha: 0 }, { x: 0, scale: 1, autoAlpha: 1, duration: u(0.05), ease: 'power2.out' }, landed - u(0.03));
          });

          // The camera follows the long line across to the orbit, which builds itself as it arrives
          const orbit = '[data-sm="panel-stack"]';
          gsap.set(`${orbit} [data-orb="ring"]`, { scale: 0.4, autoAlpha: 0, transformOrigin: '50% 50%' });
          gsap.set(`${orbit} [data-orb="pop"]`, { scale: 0, autoAlpha: 0 });
          tl.to(state, { cam: 1, duration: PAN_LENGTH, ease: 'power2.inOut' }, PAN_START)
            .fromTo(`${orbit} [data-orb="stage"]`, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, PAN_START + 0.04 * ORBIT_UNIT)
            .fromTo(`${orbit} [data-orb="header"]`, { y: 30, autoAlpha: 0 }, { ...rise, duration: 0.05 * ORBIT_UNIT }, PAN_START + 0.09 * ORBIT_UNIT)
            .fromTo(`${orbit} [data-orb="core"]`, { scale: 0.08, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.04 * ORBIT_UNIT, ease: 'back.out(1.6)' }, PAN_START + PAN_LENGTH - 0.03 * ORBIT_UNIT)
            .to(`${orbit} [data-orb="ring"]`, { scale: 1, autoAlpha: 1, duration: 0.05 * ORBIT_UNIT, stagger: 0.01 * ORBIT_UNIT, ease: 'power2.out' }, PAN_START + PAN_LENGTH - 0.02 * ORBIT_UNIT)
            .to(`${orbit} [data-orb="pop"]`, { scale: 1, autoAlpha: 1, duration: 0.025 * ORBIT_UNIT, stagger: 0.006 * ORBIT_UNIT, ease: 'back.out(2)' }, PAN_START + PAN_LENGTH);

          // Down the line from the orbit to the clients' board
          tl.to(state, { camClients: 1, duration: CLIENTS_PAN_LENGTH, ease: 'power2.inOut' }, CLIENTS_PAN_START);

          // Back to Earth: the boards fade, the satellite view returns, and the camera rises to the whole planet
          tl.to(world, { autoAlpha: 0, duration: 0.19 * SCREEN }, OUT_START)
            .to(state, { cam: 0, camClients: 0, duration: 0.6 * SCREEN, ease: 'power2.inOut' }, OUT_START)
            .to(state, { zOut: 1, duration: 1.1 * SCREEN }, OUT_START + 0.15 * SCREEN)
            .to([hud, '[data-sm="credit"]'], { autoAlpha: 1, duration: 0.22 * SCREEN }, OUT_START + 0.22 * SCREEN)
            .fromTo('[data-sm="outro"]', { y: 30, autoAlpha: 0 }, { ...rise, duration: 0.26 * SCREEN }, OUT_START + 1.0 * SCREEN);

          scrollToStop.current = (at: number) => {
            const r = track.getBoundingClientRect();
            scrollToY(r.top + window.scrollY + at * (track.offsetHeight - window.innerHeight));
          };
        } else {
          tl.fromTo('[data-sm="stem"]', { scaleY: 0 }, { scaleY: 1, duration: 0.08 }, 0.92);
          // The route: each module arrives as the line reaches it
          gsap.utils.toArray<HTMLElement>('[data-sm="row"]', root).forEach((row) => {
            gsap.fromTo(row.querySelector('[data-sm="link"]'), { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: row, start: 'top 96%', end: 'top 76%', scrub: 0.4 } });
            gsap.fromTo(row.querySelector('[data-sm="card"]'), { y: 26, scale: 0.97, autoAlpha: 0 }, { y: 0, scale: 1, autoAlpha: 1, ease: 'power2.out', scrollTrigger: { trigger: row, start: 'top 90%', end: 'top 68%', scrub: 0.4 } });
          });
          gsap.fromTo('[data-sm="dot"]', { y: -6 }, { y: 30, duration: 0.9, repeat: -1, ease: 'none', stagger: 0.12, scrollTrigger: { trigger: '[data-sm="route"]', toggleActions: 'play pause resume pause' } });
        }

        // Drag the globe to spin it (on touch: sideways swipes spin, vertical swipes still scroll the page)
        const overGlobe = (e: PointerEvent) => {
          const s = stage.getBoundingClientRect();
          const v = viewOf({ w, z: lastZ, radius0, start, center, spinLon: spin.lon, spinLat: spin.lat });
          return Math.hypot(e.clientX - s.left - v.cx, e.clientY - s.top - v.cy) <= v.R * 1.02;
        };
        const canSpin = () => lastZ < 0.03; // at rest, at the start and again at the end
        const onDown = (e: PointerEvent) => {
          if (e.button !== 0 || !canSpin() || !overGlobe(e)) return;
          drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() };
          spin.vel = 0;
          canvas.setPointerCapture(e.pointerId);
          canvas.style.cursor = 'grabbing';
        };
        const onMove = (e: PointerEvent) => {
          if (!drag) {
            if (e.pointerType === 'mouse') canvas.style.cursor = canSpin() && overGlobe(e) ? 'grab' : '';
            return;
          }
          const degPerPx = 57.3 / radius0;
          const dx = e.clientX - drag.x;
          const dy = e.clientY - drag.y;
          const now = performance.now();
          spin.lon -= dx * degPerPx;
          spin.lat = Math.max(-60, Math.min(60, spin.lat + dy * degPerPx));
          const dtMs = Math.max(8, now - drag.t);
          spin.vel = gsap.utils.clamp(-160, 160, spin.vel * 0.6 + ((-dx * degPerPx) / dtMs) * 1000 * 0.4); // carried on as a flick
          drag = { ...drag, x: e.clientX, y: e.clientY, t: now };
        };
        const onUp = () => {
          if (!drag) return;
          drag = null;
          canvas.style.cursor = 'grab';
        };
        canvas.addEventListener('pointerdown', onDown);
        canvas.addEventListener('pointermove', onMove);
        canvas.addEventListener('pointerup', onUp);
        canvas.addEventListener('pointercancel', onUp);

        // Only draw while the scene is on screen
        let onScreen = false;
        const seen = new IntersectionObserver(([e]) => {
          onScreen = e.isIntersecting;
        });
        seen.observe(track);
        // Well past the scene, its sharp imagery is let go (phones hold a second planet for the closing section)
        const far = new IntersectionObserver(
          ([e]) => {
            if (!e.isIntersecting) globe?.sleep();
          },
          { rootMargin: '100% 0px' },
        );
        far.observe(track);
        const tick = (time: number) => {
          if (onScreen) render(time);
        };
        gsap.ticker.add(tick);

        return () => {
          gsap.ticker.remove(tick);
          seen.disconnect();
          far.disconnect();
          root.querySelectorAll<HTMLElement>(ZOOMED).forEach((el) => {
            el.style.zoom = '';
          });
          ro.disconnect();
          canvas.removeEventListener('pointerdown', onDown);
          canvas.removeEventListener('pointermove', onMove);
          canvas.removeEventListener('pointerup', onUp);
          canvas.removeEventListener('pointercancel', onUp);
          canvas.style.cursor = '';
        };
      };

      const mm = gsap.matchMedia(root);
      mm.add(SCENE, () => setup('scene'));
      mm.add(ROUTE, () => setup('route'));
      mm.add(CALM, () => setup('calm'));
      return () => {
        aborter.abort();
        mm.revert();
        globe?.destroy();
      };
    },
    { scope: ref },
  );

  const hover = (i: number) => ({
    onPointerEnter: (e: ReactPointerEvent) => {
      if (e.pointerType === 'mouse') select(i);
    },
    onPointerLeave: (e: ReactPointerEvent) => {
      if (e.pointerType === 'mouse') select(-1);
    },
    onFocus: (e: FocusEvent<HTMLElement>) => {
      if (e.target.matches(':focus-visible')) select(i);
    },
    onBlur: () => select(-1),
    // touch on a large screen: the first tap reads the module, the second opens it
    onClick: (e: MouseEvent) => {
      if (window.matchMedia('(pointer: coarse)').matches && activeRef.current !== i) {
        e.preventDefault();
        select(i);
      }
    },
  });

  const moduleCard = (m: MapService, i: number) => {
    const on = active === i;
    return (
      <li key={m.slug} data-sm="slot">
        <div data-sm="mod" className="pointer-events-auto">
          <Link
            href={`/services/${m.slug}`}
            {...hover(i)}
            className={`group flex min-h-[clamp(3.25rem,7.8vh,5rem)] items-center gap-3 rounded-2xl border px-4 py-2.5 transition-[background-color,border-color,box-shadow] duration-300
              focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7fa6ff]
              ${on ? 'border-[#9dbbff] bg-[#0a2a80] shadow-[0_0_34px_-6px_rgb(59_123_247/0.8)]' : 'border-white/12 bg-[#050d3a]'}`}
          >
            <span className={`font-mono text-[10px] font-bold shrink-0 transition-colors duration-300 ${on ? 'text-white' : 'text-[#7fa6ff]'}`}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className="min-w-0 flex-1 font-display font-bold text-white leading-tight text-sm xl:text-[17px]">
              {m.title}
              {m.description && <span className="sr-only">: {m.description}</span>}
            </span>
            <Icon name="north_east" className={`text-[16px] shrink-0 transition-[rotate,color] duration-300 ${on ? 'rotate-45 text-white' : 'text-white/35'}`} />
          </Link>
        </div>
      </li>
    );
  };

  return (
    <div ref={ref} className="bg-midnight text-white">
      <section
        data-sm="track"
        aria-labelledby="sm-title"
        className="relative h-[440svh] [@media(min-width:1024px)_and_(min-height:640px)_and_(prefers-reduced-motion:no-preference)]:h-[1040vh] motion-reduce:h-auto"
      >
        <div data-sm="stage" className="sticky top-0 h-svh overflow-hidden motion-reduce:relative motion-reduce:h-auto motion-reduce:min-h-svh">
          <canvas data-sm="gl" aria-hidden="true" className="absolute inset-0 w-full h-full pointer-events-none" />
          <canvas data-sm="canvas" aria-hidden="true" className="absolute inset-0 w-full h-full touch-pan-y select-none" />

          {/* Name tag that sits on the coordinates and changes as the camera closes in */}
          <div data-sm="place" aria-hidden="true" className="pointer-events-none absolute left-0 top-0 font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.2em] font-bold text-white whitespace-nowrap [text-shadow:0_1px_4px_rgb(1_7_43/0.95)]">
            <span data-sm="placetext" className="inline-block">IN-TA Solutions</span>
          </div>

          {/* ---- Opening ---- */}
          <div
            data-sm="intro"
            className="absolute inset-x-0 top-0 mx-auto max-w-[1520px] px-4 sm:px-6 pt-[calc(var(--header-h)+1.25rem)] pointer-events-none motion-reduce:relative
              [@media(min-width:1024px)_and_(min-height:640px)_and_(prefers-reduced-motion:no-preference)]:inset-y-0 [@media(min-width:1024px)_and_(min-height:640px)_and_(prefers-reduced-motion:no-preference)]:flex [@media(min-width:1024px)_and_(min-height:640px)_and_(prefers-reduced-motion:no-preference)]:items-center"
          >
            <div className="max-w-xl">
              <span data-sm="kicker" className="inline-flex items-center gap-3 font-mono text-[11px] tracking-[0.3em] uppercase font-bold text-[#9dbbff] mb-3 sm:mb-4">
                <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                About // System map
              </span>
              <h1 id="sm-title" className="heading-page text-white">
                <span className="block overflow-hidden pb-[0.05em]"><span data-sm="word" className="block">How we&apos;re</span></span>
                <span className="block overflow-hidden pb-[0.05em]"><span data-sm="word" className={`block pb-[0.05em] ${GRADIENT_ON_DARK}`}>wired</span></span>
              </h1>
              <p data-sm="copy" className="mt-3 sm:mt-5 text-white/75 text-sm sm:text-base lg:text-lg leading-relaxed max-w-md">
                IN-TA Solutions, drawn as what it really is: one system, running from Wayanad, Kerala.
              </p>
              <p data-sm="copy" className="mt-4 sm:mt-6 inline-flex items-center gap-2 font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.2em] font-bold text-[#9dbbff] motion-reduce:hidden">
                <Icon name="south" className="text-[15px] animate-bounce" /> <span className="max-[379px]:hidden">Spin the globe, or scroll to zoom in</span><span className="hidden max-[379px]:inline">Scroll to zoom in</span>
              </p>
            </div>
          </div>

          {/* ---- Where it started: over the real terrain, while the camera holds on the coordinates ---- */}
          <div
            data-sm="story"
            className="pointer-events-none absolute left-4 right-4 bottom-20 [@media(max-height:480px)]:bottom-3 rounded-2xl border border-white/12 bg-[#01072b]/80 p-4 sm:p-6 sm:left-6 sm:right-auto sm:max-w-md [@media(max-height:480px)]:max-w-[20rem] [@media(max-height:480px)]:p-3
              motion-reduce:relative motion-reduce:inset-auto motion-reduce:mx-4 motion-reduce:mt-6
              [@media(min-width:1024px)_and_(min-height:640px)_and_(prefers-reduced-motion:no-preference)]:top-1/2 [@media(min-width:1024px)_and_(min-height:640px)_and_(prefers-reduced-motion:no-preference)]:bottom-auto [@media(min-width:1024px)_and_(min-height:640px)_and_(prefers-reduced-motion:no-preference)]:-translate-y-1/2"
          >
            <span className="inline-flex items-center gap-3 font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.2em] font-bold text-[#9dbbff] [@media(max-height:480px)]:hidden">
              <span className="h-2 w-2 shrink-0 rounded-full bg-current animate-pulse" />
              {ORIGIN.kicker}
            </span>
            <p className={`mt-2 font-display font-extrabold leading-none text-[length:clamp(3rem,7vw,5.5rem)] [@media(max-height:480px)]:mt-0 [@media(max-height:480px)]:text-[2rem] ${GRADIENT_ON_DARK}`}>{ORIGIN.year}</p>
            <p className="mt-2 sm:mt-3 text-sm sm:text-base text-white/85 leading-relaxed [@media(max-height:480px)]:mt-1 [@media(max-height:480px)]:text-[13px] [@media(max-height:480px)]:leading-snug">{ORIGIN.text}</p>
          </div>

          {/* ---- Back to Earth: the closing words, beside the whole planet again ---- */}
          <div
            data-sm="outro"
            className="pointer-events-none absolute inset-x-0 inset-y-0 mx-auto hidden max-w-[1520px] items-center px-6 [@media(min-width:1024px)_and_(min-height:640px)_and_(prefers-reduced-motion:no-preference)]:flex"
          >
            <div className="max-w-xl">
              <span className="mb-3 inline-flex items-center gap-3 font-mono text-[11px] tracking-[0.3em] uppercase font-bold text-[#9dbbff]">
                <span className="h-2 w-2 rounded-full bg-current animate-pulse" />
                {CLOSING.kicker}
              </span>
              <h2 className="heading-section text-white">
                {CLOSING.plain} <span className={GRADIENT_ON_DARK}>{CLOSING.bright}</span>
              </h2>
              <p className="mt-4 max-w-md text-sm sm:text-base lg:text-lg text-white/75 leading-relaxed">{CLOSING.text}</p>
            </div>
          </div>

          {/* Live readout: the true field of view at this zoom */}
          <dl data-sm="hud" className="pointer-events-none absolute left-4 sm:left-6 bottom-4 sm:bottom-6 font-mono text-[10px] sm:text-[11px] uppercase tracking-wider motion-reduce:hidden [@media(max-height:480px)]:hidden [text-shadow:0_1px_4px_rgb(1_7_43/0.95)]">
            <div className="flex gap-3">
              <dt className="w-[10.5em] whitespace-nowrap text-white/70">Target</dt>
              <dd className="text-white">{TARGET.lat}° N, {TARGET.lon}° E</dd>
            </div>
            <div className="flex gap-3 mt-1">
              <dt className="w-[10.5em] whitespace-nowrap text-white/70">Field of view</dt>
              <dd className="text-[#9dbbff] font-bold tabular-nums"><span data-sm="fov">12,740</span> km</dd>
            </div>
          </dl>

          {/* Imagery credits (the Sentinel-2 licence requires attribution; a link to it is allowed) */}
          <div data-sm="credit" className="absolute right-4 sm:right-6 bottom-4 sm:bottom-6 text-right">
            {credits && (
              <p id="sm-credits" className="absolute bottom-full right-0 mb-2 w-[min(19rem,80vw)] rounded-xl border border-white/15 bg-[#050d3a]/95 p-3 text-left text-[11px] leading-relaxed text-white/80">
                World, cloud and night-light imagery: NASA. Close-up imagery:{' '}
                <a href="https://cloudless.eox.at" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-white">EOxCloudless</a> by EOX IT Services GmbH (contains modified Copernicus Sentinel data 2016), adjusted for this page,{' '}
                <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-white">CC BY 4.0</a>.
              </p>
            )}
            <button
              type="button"
              aria-expanded={credits}
              aria-controls="sm-credits"
              onClick={() => setCredits((v) => !v)}
              className="font-mono text-[9px] sm:text-[10px] uppercase tracking-wider text-white/55 underline underline-offset-2 hover:text-white [text-shadow:0_1px_4px_rgb(1_7_43/0.95)]"
            >
              Imagery credits
            </button>
          </div>

          {/* ---- The board (large screens): a layer the camera travels across ---- */}
          <div data-sm="world" className="pointer-events-none absolute inset-0 hidden will-change-transform [@media(min-width:1024px)_and_(min-height:640px)_and_(prefers-reduced-motion:no-preference)]:block">
            {/* ---- Stop: services, with the core the zoom landed on in the middle ---- */}
            <div data-sm="system" className="absolute inset-0 flex flex-col items-center justify-center gap-[clamp(1rem,3.5vh,2.5rem)]">
              <Heading count={modules.length} />
              <div className="w-full max-w-[1360px] px-12 xl:px-6 grid grid-cols-[minmax(0,1fr)_minmax(15rem,20rem)_minmax(0,1fr)] gap-x-[clamp(3.5rem,7vw,7.5rem)] items-center">
                <ul className="flex flex-col gap-[clamp(0.5rem,1.9vh,1.25rem)]">{modules.slice(0, half).map((m, i) => moduleCard(m, i))}</ul>

                <div data-sm="mid" className="flex flex-col items-center text-center">
                  <Core className="w-[clamp(6rem,20vh,11.5rem)] h-[clamp(6rem,20vh,11.5rem)]" />
                  <div className="mt-4">
                    <StatusPill />
                  </div>
                  <div data-sm="readout" className="mt-3 min-h-[6.25rem]">
                    {current ? (
                      <>
                        <p className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.2em] font-bold text-[#9dbbff]">
                          <Scramble text={`Module ${String(active + 1).padStart(2, '0')}`} playKey={active} duration={350} />
                        </p>
                        <p className="mt-1.5 text-[13px] xl:text-sm text-white/75 leading-relaxed line-clamp-4">{current.description || current.title}</p>
                      </>
                    ) : (
                      <p className="text-[13px] xl:text-sm text-white/55 leading-relaxed">
                        <span className="pointer-coarse:hidden">Hover a module to read what it does.</span>
                        <span className="hidden pointer-coarse:inline">Tap a module to read it, tap again to open it.</span>
                      </p>
                    )}
                  </div>
                </div>

                <ul className="flex flex-col gap-[clamp(0.5rem,1.9vh,1.25rem)]">{modules.slice(half).map((m, i) => moduleCard(m, i + half))}</ul>
              </div>
            </div>

            {/* ---- Stop: the orbit ---- */}
            <div data-sm="panel-stack" className="absolute left-[118%] top-0 w-full h-full flex items-center justify-center">
              <TechOrbit tone="dark" embedded titleId="sm-orbit-title" />
            </div>

            {/* ---- Stop: the clients, plugged into a bus. (Their traces come after the modules' and the two long lines.) ---- */}
            <ClientBoard
              clients={clients}
              onActive={(i) => {
                activeRef.current = i < 0 ? -1 : modules.length + 3 + i;
              }}
            />
          </div>

          {/* ---- Shortcuts between stops ---- */}
          <StopsNav hasClients={clients.length > 0} stopChangedRef={stopChangedRef} onGo={(at) => scrollToStop.current(at)} />

          {/* ---- The core on smaller screens: a line runs from it down through the modules ---- */}
          <div
            data-sm="core"
            className="absolute inset-0 flex flex-col items-center px-4 pt-[14svh] pointer-events-none motion-reduce:relative motion-reduce:py-10
              [@media(min-width:1024px)_and_(min-height:640px)_and_(prefers-reduced-motion:no-preference)]:hidden"
          >
            <Heading count={modules.length} />
            <Core className="mt-5 w-24 h-24 sm:w-28 sm:h-28 [@media(max-height:480px)]:mt-2 [@media(max-height:480px)]:w-16 [@media(max-height:480px)]:h-16" />
            <div className="mt-3">
              <StatusPill />
            </div>
            <div data-sm="stem" className="mt-3 w-px flex-1 bg-[#7fa6ff]/50 origin-top motion-reduce:hidden" />
          </div>
        </div>
      </section>

      {/* ---- The route (smaller screens and reduced motion) ---- */}
      <section
        data-sm="route"
        aria-label="Services, technology and clients"
        className="pb-4 [@media(min-width:1024px)_and_(min-height:640px)_and_(prefers-reduced-motion:no-preference)]:hidden"
        style={{ backgroundImage: 'radial-gradient(rgb(127 166 255 / 0.12) 1px, transparent 1px)', backgroundSize: '24px 24px' }}
      >
        <ul className="mx-auto max-w-xl px-4 sm:px-6 pb-8">
          {modules.map((m, i) => (
            <li key={m.slug} data-sm="row">
              <div data-sm="link" aria-hidden="true" className="relative mx-auto h-7 w-px overflow-visible bg-[#7fa6ff]/50 origin-top">
                <span data-sm="dot" className="absolute -left-[1.5px] top-0 h-1.5 w-1 rounded-full bg-white motion-reduce:hidden" />
              </div>
              <div data-sm="card">
                <Link
                  href={`/services/${m.slug}`}
                  className="group block rounded-2xl border border-white/12 bg-[#050d3a] p-4 transition-[background-color,border-color] duration-300 active:bg-[#0a2a80] active:border-[#9dbbff]
                    hover:border-[#7fa6ff]/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7fa6ff]"
                >
                  <span className="flex items-center gap-3">
                    <span className="font-mono text-[10px] font-bold shrink-0 text-[#7fa6ff]">{String(i + 1).padStart(2, '0')}</span>
                    <span className="min-w-0 flex-1 font-display font-bold text-white text-[15px] sm:text-base leading-tight">{m.title}</span>
                    <Icon name="north_east" className="text-[16px] shrink-0 text-white/40 transition-[rotate,color] duration-300 group-hover:rotate-45 group-hover:text-white" />
                  </span>
                  {m.description && <span className="mt-2 block text-[13px] sm:text-sm text-white/65 leading-relaxed line-clamp-3">{m.description}</span>}
                </Link>
              </div>
            </li>
          ))}
        </ul>

        <TechOrbit tone="dark" titleId="sm-orbit-title-route" />
        <ClientRoute clients={clients} />
      </section>

      {/* Back to Earth on those screens (the large-screen version happens inside the scene above) */}
      <div className="[@media(min-width:1024px)_and_(min-height:640px)_and_(prefers-reduced-motion:no-preference)]:hidden">
        <EarthReturn />
      </div>
    </div>
  );
}
