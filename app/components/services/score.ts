// The page's timing and its camera. Everything is measured in "screens" of scrolling, so the words, the camera and the
// board's own animation all read from one clock and all run backwards when the visitor scrolls back.

import { AI_BLOCK, BLOCKS, centreOf, linkBetween, YOUR_BLOCK, type Block, type BlockKind, type Point, type Shot } from './floorplan';

export const FOV = (26 * Math.PI) / 180;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const ramp = (x: number, a: number, b: number) => clamp01((x - a) / (b - a));
export const smooth = (x: number, a: number, b: number) => {
  const t = ramp(x, a, b);
  return t * t * (3 - 2 * t);
};
export const smoother = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const mix = (a: number, b: number, k: number) => a + (b - a) * k;
const rad = (d: number) => (d * Math.PI) / 180;

/** Which part of the screen the picture has to itself, because the words have the rest */
type Frame = 'hero' | 'plan' | 'card' | 'free' | 'ask' | 'close' | 'opening' | 'fill' | 'centre';
export type Room = { sx: number; sy: number; fw: number; fh: number };

function roomFor(frame: Frame, aspect: number): Room {
  const wide = aspect > 1.15;
  switch (frame) {
    case 'hero':
      return wide ? { sx: 0.5, sy: -0.08, fw: 0.5, fh: 0.86 } : { sx: 0, sy: -0.72, fw: 1, fh: 0.25 };
    case 'plan':
      return wide ? { sx: 0.36, sy: -0.02, fw: 0.64, fh: 0.94 } : { sx: 0, sy: -0.22, fw: 1, fh: 0.66 };
    case 'card':
      return wide ? { sx: 0.44, sy: 0, fw: 0.54, fh: 0.86 } : { sx: 0, sy: 0.5, fw: 0.98, fh: 0.42 };
    case 'ask':
      return wide ? { sx: 0, sy: 0.22, fw: 0.9, fh: 0.62 } : { sx: 0, sy: 0.3, fw: 0.98, fh: 0.5 };
    case 'close':
      return { sx: 0, sy: 0.07, fw: 0.94, fh: wide ? 0.36 : 0.32 };
    case 'opening':
      return wide ? { sx: 0.5, sy: -0.06, fw: 0.5, fh: 0.86 } : { sx: 0, sy: -0.62, fw: 1, fh: 0.34 };
    case 'fill':
      return wide ? { sx: 0, sy: -0.02, fw: 0.72, fh: 0.86 } : { sx: 0, sy: 0.02, fw: 0.96, fh: 0.6 };
    case 'centre':
      return { sx: 0, sy: 0, fw: 1, fh: 1 };
    default:
      return { sx: 0, sy: 0.14, fw: 0.94, fh: 0.66 };
  }
}

export type Key = {
  s: number;
  t: [number, number, number];
  w: number;
  az: number;
  el: number;
  roll: number;
  frame: Frame;
  /** the room measured on the page, for when it depends on how much the words have taken */
  room?: Room;
  /** the move into this key is a flight rather than a slow drift */
  travel?: boolean;
  hop?: number;
};

const TRAVEL = 0.62;
const DWELL = 0.8;

export type ServiceBeat = { block: Block; from: number; arrive: number; leave: number; link: Point[] | null };

export type Score = {
  total: number;
  keys: Key[];
  /** when the words of each moment come and go */
  hero: { out: number };
  plan: { in: number; out: number };
  services: ServiceBeat[];
  ai: { from: number; arrive: number; factOut: number; dim: [number, number]; oneIn: number; b1: [number, number]; wake: [number, number]; b2: [number, number]; sync: [number, number]; learn: [number, number]; b3: [number, number]; net: [number, number]; card: [number, number]; form: [number, number]; ask: [number, number]; leave: number; link: Point[] | null };
  close: { from: number; arrive: number; link: Point[] | null };
  /** the board powers up: when, as a wave from the centre */
  boot: [number, number];
  /** the moments the side menu can go to */
  stops: { id: string; label: string; s: number }[];
};

/** The timeline, for the services that are switched on in the admin */
export function buildScore(labels: Map<string, string>, aiLabel: string, available: (b: Block) => boolean): Score {
  const keys: Key[] = [];
  const boot: [number, number] = [0.26, 1.02];

  keys.push({ s: 0, t: [0.02, -0.04, 0.02], w: 3.2, az: -30, el: 38, roll: 0, frame: 'hero' });
  keys.push({ s: 0.16, t: [0.02, -0.04, 0.02], w: 3.12, az: -28, el: 39, roll: 0, frame: 'hero' });
  keys.push({ s: 1.04, t: [0, -0.02, 0], w: 2.86, az: -5, el: 70, roll: 0, frame: 'plan', travel: true });
  keys.push({ s: 1.74, t: [0, -0.02, 0], w: 2.8, az: -2, el: 72, roll: 0, frame: 'plan' });

  let s = 1.74;
  const services: ServiceBeat[] = [];
  let last: BlockKind | null = null;
  BLOCKS.filter(available).forEach((block) => {
    const [x, z] = centreOf(block);
    const shot: Shot = block.shot;
    const arrive = s + TRAVEL;
    const leave = arrive + DWELL;
    keys.push({ s: arrive, t: [x, 0.015, z], w: shot.w, az: shot.az, el: shot.el, roll: shot.roll ?? 0, frame: 'card', travel: true, hop: last ? 0.2 : 0 });
    keys.push({ s: leave, t: [x, 0.015, z], w: shot.w * 0.95, az: shot.az + 5, el: shot.el + 1.5, roll: shot.roll ?? 0, frame: 'card' });
    services.push({ block, from: s, arrive, leave, link: last ? linkBetween(last, block.kind) : null });
    last = block.kind;
    s = leave;
  });

  // The centre of the board: the one that gets the most time
  const [ax, az] = centreOf(AI_BLOCK);
  const A = s;
  const ai: Score['ai'] = {
    from: A,
    arrive: A + 0.62,
    factOut: A + 1.12,
    dim: [A + 1.12, A + 1.38],
    oneIn: A + 1.34,
    b1: [A + 1.4, A + 1.76],
    wake: [A + 1.76, A + 2.24],
    b2: [A + 1.88, A + 2.3],
    sync: [A + 2, A + 2.32],
    learn: [A + 2.34, A + 3.16],
    b3: [A + 2.44, A + 3.14],
    net: [A + 3.14, A + 3.44],
    card: [A + 3.4, A + 3.98],
    form: [A + 4.04, A + 4.34],
    ask: [A + 4.16, A + 4.86],
    leave: A + 4.86,
    link: last ? linkBetween(last, 'ai') : null,
  };
  keys.push({ s: ai.arrive, t: [ax, 0.015, az], w: 1, az: 10, el: 42, roll: 0, frame: 'free', travel: true, hop: 0.18 });
  keys.push({ s: ai.factOut, t: [ax, 0.015, az], w: 0.94, az: 15, el: 40, roll: 0, frame: 'free' });
  // right down onto a single switch, in the dark
  keys.push({ s: ai.dim[1] + 0.02, t: [ax, 0.018, az], w: 0.13, az: 24, el: 26, roll: 0, frame: 'free', travel: true });
  keys.push({ s: ai.b1[1], t: [ax, 0.018, az], w: 0.115, az: 32, el: 25, roll: 0, frame: 'free' });
  // and back out as the rest of them wake
  keys.push({ s: ai.wake[1], t: [ax, 0.03, az], w: 1.02, az: -14, el: 29, roll: 0, frame: 'free', travel: true });
  // low over the landscape of its error, while it walks down to the bottom
  keys.push({ s: ai.learn[0] + 0.14, t: [ax, 0.03, az], w: 0.98, az: -24, el: 31, roll: 0, frame: 'free', travel: true });
  keys.push({ s: ai.learn[1], t: [ax, 0.03, az], w: 0.88, az: 12, el: 36, roll: 0, frame: 'free' });
  keys.push({ s: ai.card[0], t: [ax, 0.06, az], w: 1.06, az: -8, el: 30, roll: 0, frame: 'card', travel: true });
  keys.push({ s: ai.card[1], t: [ax, 0.06, az], w: 1, az: 8, el: 33, roll: 0, frame: 'card' });
  // the surface spells: the camera stands up to read it
  keys.push({ s: ai.ask[0], t: [ax, 0.02, az], w: 0.92, az: 0, el: 62, roll: 0, frame: 'ask', travel: true });
  keys.push({ s: ai.ask[1], t: [ax, 0.02, az], w: 0.88, az: 0, el: 64, roll: 0, frame: 'ask' });

  // Along the copper to the one socket with nothing in it
  const [yx, yz] = centreOf(YOUR_BLOCK);
  const C = ai.leave;
  const close = { from: C, arrive: C + 0.72, link: linkBetween('ai', 'yours') };
  keys.push({ s: close.arrive, t: [yx, 0, yz], w: YOUR_BLOCK.shot.w, az: YOUR_BLOCK.shot.az, el: YOUR_BLOCK.shot.el, roll: 0, frame: 'close', travel: true, hop: 0.16 });
  keys.push({ s: close.arrive + 0.5, t: [yx, 0, yz], w: YOUR_BLOCK.shot.w * 0.97, az: YOUR_BLOCK.shot.az + 1, el: YOUR_BLOCK.shot.el, roll: 0, frame: 'close' });

  const stops: Score['stops'] = [
    { id: 'package', label: 'The board', s: 0 },
    { id: 'floorplan', label: 'All the parts', s: 1.4 },
    ...services.map((b) => ({ id: b.block.id, label: labels.get(b.block.id) ?? b.block.short, s: b.arrive + DWELL * 0.5 })),
    { id: AI_BLOCK.id, label: aiLabel, s: ai.arrive + 0.2 },
    { id: YOUR_BLOCK.id, label: 'Your project', s: close.arrive + 0.5 },
  ];

  return { total: close.arrive + 0.5, keys, hero: { out: 0.08 }, plan: { in: 0.84, out: 1.62 }, services, ai, close, boot, stops };
}

/** When an order is given: out to the whole board, then down onto the part that takes it */
export function orderKeys(score: Score, block: Block): Key[] {
  const [x, z] = centreOf(block);
  const shot = block.shot;
  const last = score.keys.filter((k) => k.frame === 'ask').pop()!;
  return [
    { ...last, s: 0 },
    { s: 1, t: [0, -0.02, 0], w: 2.86, az: 0, el: 66, roll: 0, frame: 'free', travel: true },
    { s: 2, t: [x, 0.015, z], w: Math.min(shot.w, 0.98), az: shot.az, el: Math.min(shot.el, 58), roll: 0, frame: 'card', travel: true },
  ];
}

/** One part's own page. Below zero is the arrival, played on a clock as the page opens. From zero it follows the scroll: over to the part, and down into it */
export function partKeys(block: Block, total: number, opening?: Room): Key[] {
  const [x, z] = centreOf(block);
  const { az, el, w, roll = 0 } = block.shot;
  const board: [number, number, number] = [0.02, -0.04, 0.02];
  const part: [number, number, number] = [x, 0.015, z];
  return [
    { s: -1, t: board, w: 3.7, az: -42, el: 30, roll: 0, frame: 'opening', room: opening },
    { s: 0, t: board, w: 3.15, az: -30, el: 38, roll: 0, frame: 'opening', room: opening, travel: true },
    { s: 0.22, t: board, w: 3.08, az: -28, el: 39, roll: 0, frame: 'opening', room: opening },
    { s: 1.05, t: part, w: w * 1.1, az, el, roll, frame: 'fill', travel: true },
    { s: 1.3, t: part, w: w * 1.0, az: az + 4, el: el + 2, roll, frame: 'fill' },
    { s: total, t: part, w: w * 0.13, az: az + 30, el: Math.max(el, 62), roll: 0, frame: 'centre', travel: true },
  ];
}

/** How much of the board is in view, in millimetres (it is drawn as if it were 130 mm across) */
export function fieldOfView(worldWidth: number) {
  const mm = worldWidth * 50;
  return mm >= 10 ? `${Math.round(mm)} mm` : `${mm.toFixed(1)} mm`;
}

export type Camera = {
  eye: [number, number, number];
  target: [number, number, number];
  up: [number, number, number];
  sx: number;
  sy: number;
  dist: number;
  w: number;
};

export function mixCameras(a: Camera, b: Camera, k: number): Camera {
  const lerp = (x: number, y: number) => x + (y - x) * k;
  const v3 = (x: [number, number, number], y: [number, number, number]): [number, number, number] => [lerp(x[0], y[0]), lerp(x[1], y[1]), lerp(x[2], y[2])];
  return { eye: v3(a.eye, b.eye), target: v3(a.target, b.target), up: b.up, sx: lerp(a.sx, b.sx), sy: lerp(a.sy, b.sy), dist: lerp(a.dist, b.dist), w: lerp(a.w, b.w) };
}

/** A jump between two far-apart parts: the camera lifts off, crosses the board and comes down, instead of cutting */
export function flyBetween(a: Camera, b: Camera, k: number): Camera {
  const c = mixCameras(a, b, k);
  const lift = 1 + Math.sin(Math.PI * k) * 0.55;
  c.eye = [c.target[0] + (c.eye[0] - c.target[0]) * lift, c.target[1] + (c.eye[1] - c.target[1]) * lift, c.target[2] + (c.eye[2] - c.target[2]) * lift];
  c.dist *= lift;
  return c;
}

/** Where the camera is at this moment of the scroll */
export function cameraAt(keys: Key[], s: number, aspect: number, lean: [number, number], leanScale: number, orbit = 0): Camera {
  let i = 0;
  while (i < keys.length - 2 && s >= keys[i + 1].s) i += 1;
  const a = keys[i];
  const b = keys[i + 1];
  const raw = clamp01((s - a.s) / (b.s - a.s));
  const k = b.travel ? smoother(raw) : raw;

  const ra = a.room ?? roomFor(a.frame, aspect);
  const rb = b.room ?? roomFor(b.frame, aspect);
  const sx = mix(ra.sx, rb.sx, k);
  const sy = mix(ra.sy, rb.sy, k);
  const fw = mix(ra.fw, rb.fw, k);
  const fh = mix(ra.fh, rb.fh, k);

  let w = Math.exp(mix(Math.log(a.w), Math.log(b.w), k));
  if (b.travel && b.hop) w *= 1 + b.hop * Math.sin(Math.PI * raw);

  const azim = rad(mix(a.az, b.az, k) + lean[0] * leanScale + orbit);
  const elev = rad(Math.min(88, mix(a.el, b.el, k) - lean[1] * leanScale * 0.6));
  const roll = rad(mix(a.roll, b.roll, k));
  const target: [number, number, number] = [mix(a.t[0], b.t[0], k), mix(a.t[1], b.t[1], k), mix(a.t[2], b.t[2], k)];
  const dist = w / (2 * Math.tan(FOV / 2) * Math.min(fh, aspect * fw));
  const ce = Math.cos(elev);
  const eye: [number, number, number] = [target[0] + dist * ce * Math.sin(azim), target[1] + dist * Math.sin(elev), target[2] + dist * ce * Math.cos(azim)];
  const up: [number, number, number] = [Math.sin(roll), Math.cos(roll), 0];
  return { eye, target, up, sx, sy, dist, w };
}
