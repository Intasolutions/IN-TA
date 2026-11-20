// The website guide: a small 3D character standing on his chat button in the corner (components/guide/Guide.tsx).
//
// It's drawn with three.js into a transparent canvas whose units are CSS pixels (an orthographic camera), so the
// character's position is simply where he stands on the screen. Docked, the canvas is a small box by the button; while
// he's carried, falling or walking home it grows to the whole window, then shrinks back. The canvas never takes clicks:
// the page under it stays usable, and the engine tests the pointer against the character itself.
//
// The character is the robot (robot.ts, a small CC0 model in IN-TA colours, public/guide/robot.glb); character.ts
// says what the engine asks of him.

import * as THREE from 'three';
import { LOOPS, type Clip, type Feeling } from './character';
import { loadRobot } from './robot';
import type { Gesture, Mood, PagePlan, PlanBeat } from './chatTypes';

/** Each moment's lines from the admin: one is picked at random each time (the pokes go round in a shuffled order) */
export type GuideLines = {
  welcome: string[];
  back: string[];
  tab: string[];
  hover: () => string[];
  pokes: string[];
  /** clicking him also brings lines about IN-TA, and lines about one of our services ({service} is its name) */
  about: string[];
  serviceLines: string[];
  services: string[];
  dropped: string[];
  missed: string[];
  madeIt: string[];
  /** his walks: setting off, and heading back to the button */
  stroll: string[];
  strollHome: string[];
  /** lines for a part of the page, by its key (a section's id, else the page: "services", "faq", "contact"…) */
  section: (key: string) => string[];
  /** for any part of the page without its own lines; {section} is the part's own title */
  sectionAny: string[];
  /** standing under something on the screen and looking up at it; {text} is its own words */
  look: Record<SpotKind, string[]>;
  /** clicking him: an invitation to ask him something in the chat (empty while the chat can't be used) */
  invite: string[];
  /** Gemini's plan for this page (null without one: then the lines above are all he has) */
  plan: PagePlan | null;
  /** the thing on the page a beat of the plan points at */
  resolve: (beat: PlanBeat) => Element | null;
};

export type SpotKind = 'heading' | 'button' | 'image' | 'field';

export type GuideHooks = {
  /** a speech bubble over his head, at this point on the screen (force: even while the chat is open) */
  say: (text: string, at: { x: number; y: number }, ms?: number, force?: boolean) => void;
  hush: () => void;
  /** where his head is now, every frame: the speech bubble and the z's ride along with him */
  anchor: (at: { x: number; y: number }) => void;
  /** z's while he naps */
  sleeping: (on: boolean, at: { x: number; y: number }) => void;
  /** docked (the small box) or free (the whole window) */
  mode: (m: 'dock' | 'free') => void;
  /** the pointer is over him: he can be picked up */
  hot: (on: boolean) => void;
  /** where his home on the button is (the middle of the button, at the top of his head): the "Hide" pill sits by it */
  dock: (at: { x: number; y: number }) => void;
  /** a cartoon effect at this point: stars round his head, the button wobbling, or a puff of dust (size 0–1) */
  fx: (kind: 'stars' | 'wobble' | 'dust', at: { x: number; y: number }, size?: number) => void;
  firstVisit: boolean;
  lines: () => GuideLines;
  /** This device can't draw him without slowing the page down: he has stopped, and the chat button carries on alone */
  tooSlow: () => void;
};

export type Guide = {
  stop: () => void; pause: (on: boolean) => void; greetTab: () => void; moved: () => void;
  /** the chat is open (he stays on his button and keeps an eye on it, panel) or closed */
  chat: (on: boolean, panel: Element | null) => void;
  /** working on an answer: a thoughtful look up and away */
  think: (on: boolean) => void;
  /** a move an answer asked for, and the face he makes */
  gesture: (g: Gesture, mood?: Mood) => void;
  /**
   * walk down to this (on screen now) and look up at it, saying the caption when he gets there. On a walk already, he
   * goes straight on to it. hold: he waits there (for the next stop of a tour) until release(). False if he can't now.
   */
  show: (el: Element, opts?: { caption?: string; hold?: boolean }) => boolean;
  /** the tour is over (or stopped): back to his button */
  release: () => void;
  /** what he's doing, for the chat's status line */
  status: () => 'home' | 'walking' | 'looking' | 'away';
  /** a new page's plan has come: he greets the page with its line (false if he's busy) */
  announce: (text: string) => boolean;
};

// docked: a box standing on top of the WhatsApp button, his feet just on it (this size at his full size)
const DOCK = { w: 150, h: 170 };
const SLEEP_AFTER = 45000; // ms with no pointer movement before he may doze (he stays lively a good while first)
const GRAVITY = 2600; // px/s²
const WALK = 150; // px/s
const FLOOR_GAP = 10; // px from the bottom of the window to where his feet touch the floor

// How often he falls: 2 or 3 times in 10, whether it's the jump back onto the button falling short (never twice in a
// row) or a hard landing after being thrown (otherwise he lands on his feet, knees well bent)
const FALL_CHANCE = 0.25;

export async function startGuide(host: HTMLElement, canvas: HTMLCanvasElement, hooks: GuideHooks): Promise<Guide> {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(0, 1, 1, 0, -2000, 2000);
  camera.position.set(0, 0, 1000);

  // light: a soft sky, a warm key from the upper left, a cool rim from behind on the right
  scene.add(new THREE.HemisphereLight(0xeaf2ff, 0x3a3f55, 1.6));
  const key = new THREE.DirectionalLight(0xfff3e6, 2.6);
  key.position.set(-300, 500, 700);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x8fb4ff, 2.2);
  rim.position.set(400, 200, -500);
  scene.add(rim);

  const ch = await loadRobot();
  // His size follows the screen: full size on a computer, smaller on a tablet, smaller again on a phone (or a short,
  // landscape one). S is that share of his full size; distances he moves and jumps scale with it.
  const FULL = ch.height;
  const sizeFor = () => (window.innerWidth < 640 || window.innerHeight < 560 ? 0.68 : window.innerWidth < 1024 ? 0.82 : 1);
  let S = sizeFor();
  let HEIGHT = Math.round(FULL * S);
  const model = ch.root;
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const rig = new THREE.Group(); // feet at its origin
  const fit = () => {
    const scale = HEIGHT / size.y;
    model.scale.setScalar(scale);
    model.position.set(-((box.min.x + box.max.x) / 2) * scale, -box.min.y * scale, -((box.min.z + box.max.z) / 2) * scale);
  };
  fit();
  rig.add(model);
  const actor = new THREE.Group(); // where he stands, how he leans and turns
  actor.add(rig);
  scene.add(actor);

  // a soft contact shadow under his feet
  const shadowTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d')!;
    const grd = g.createRadialGradient(32, 32, 2, 32, 32, 32);
    grd.addColorStop(0, 'rgba(1,7,43,0.32)');
    grd.addColorStop(1, 'rgba(1,7,43,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(70, 16), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
  scene.add(shadow);

  // ---- animations and the face, played on the character ----
  let base: Clip = 'Idle';
  const play = (name: Clip, { fade = 0.3, speed = 1, then, from }: { fade?: number; speed?: number; then?: () => void; from?: number } = {}) => {
    ch.play(name, speed, fade, LOOPS.has(name) || speed === 0 ? null : () => { if (then) then(); else play(base); }, from);
  };
  let feltAt = 0;
  const feel = (name: Feeling, v = 1, ms = 0) => {
    const me2 = ++feltAt;
    ch.feel(name, v);
    if (ms) window.setTimeout(() => { if (feltAt === me2) ch.feel(null, 0); }, ms);
  };
  const look = { yaw: 0, pitch: 0, toYaw: 0, toPitch: 0, on: true, hold: 0, at: null as { x: number; y: number } | null };

  // ---- where things are, in screen pixels ----
  // The outer box always covers the window and never moves; the canvas inside it stays anchored at its top-left
  // corner. Docked it's a small box moved into place with a transform, free it fills the window. Its top-left corner
  // never moves, so growing and shrinking it is never counted as a layout shift.
  // His chat button's place on the screen ([data-guide-dock]), read from the page's layout (so not moved by its hover
  // lift or its tuck-away slide). Without it, where it stands on a computer and on a phone.
  const waButton = () => {
    const el = document.querySelector<HTMLElement>('[data-guide-dock]');
    if (!el || !el.offsetWidth) return null;
    let x = 0, y = 0;
    for (let n: HTMLElement | null = el; n; n = n.offsetParent as HTMLElement | null) { x += n.offsetLeft; y += n.offsetTop; }
    return { cx: x + el.offsetWidth / 2, top: y };
  };
  const dockBox = () => {
    const w = Math.round(DOCK.w * S), h = Math.round(DOCK.h * S);
    const wide = window.innerWidth >= 768;
    const wa = waButton() ?? { cx: window.innerWidth - (wide ? 64 : 50), top: window.innerHeight - (wide ? 96 : 80) };
    return { left: Math.round(wa.cx - w / 2), top: Math.round(wa.top + 8 * S - h), w, h };
  };
  let dock = dockBox();
  const place = () => {
    if (host.dataset.mode === 'dock') {
      dock = dockBox();
      canvas.style.width = `${dock.w}px`; canvas.style.height = `${dock.h}px`;
      canvas.style.transform = `translate(${dock.left}px, ${dock.top}px)`;
      hooks.dock({ x: dock.left + dock.w / 2, y: dock.top + dock.h - 6 * S - HEIGHT });
    } else {
      canvas.style.width = '100%'; canvas.style.height = '100%'; canvas.style.transform = 'none';
    }
  };
  let rect = canvas.getBoundingClientRect();
  const measure = () => {
    place();
    rect = canvas.getBoundingClientRect();
    renderer.setSize(rect.width, rect.height, false);
    camera.left = 0; camera.right = rect.width; camera.top = rect.height; camera.bottom = 0;
    camera.updateProjectionMatrix();
  };
  const homeOf = () => {
    // docked, he stands at the middle of the small box, near its bottom
    const r = host.dataset.mode === 'dock' ? canvas.getBoundingClientRect() : dockRect;
    return { x: r.left + r.width / 2, y: r.bottom - 6 * S };
  };
  host.dataset.mode = 'dock';
  place();
  let dockRect = canvas.getBoundingClientRect();
  measure();

  // spin: tilt in the screen's plane (+ leans his head to the left); omega: how fast it's turning, rad/s
  const me = { x: 0, y: 0, vx: 0, vy: 0, lean: 0, turn: 0, spin: 0, omega: 0, squash: 1, squashV: 0 };
  ({ x: me.x, y: me.y } = homeOf());
  const pointer = { x: -9999, y: -9999, moved: performance.now(), vx: 0 };
  // the last tenth of a second of pointer positions: how fast he was thrown when let go
  const trail: { t: number; x: number; y: number }[] = [];

  type State = 'intro' | 'home' | 'carried' | 'falling' | 'landed' | 'walking' | 'hopping' | 'bonked' | 'dazed' | 'asleep' | 'strolling';
  let state: State = 'intro';
  let stateWas: State = state;
  let stateSince = 0; // in animation time (simT), so a slow computer or a busy tab never trips the safety net
  let simT = 0;
  let ground = 0; // where this fall ends
  let bounced = false; // a hard landing bounces once
  // up onto the button, or (down) off it to the floor at the start of a walk
  const hop = { t: 0, x0: 0, y0: 0, x1: 0, y1: 0, peak: 70, miss: false, side: -1, down: false };
  let missedLast = false; // a miss is always followed by a jump that makes it
  let retrying = false;
  const floorY = () => window.innerHeight - FLOOR_GAP;
  // the spot on the floor beside the button he walks to before hopping up (on the side he comes from)
  const besideButton = () => { const h = homeOf(); return { x: h.x + (me.x > h.x ? 44 : -48) * S, y: floorY() }; };
  let busyUntil = 0;
  let paused = false;
  let waveCooldown = 0;
  let redockAt = 0;
  let arriving = false; // the first-visit drop-in lands without the "dropped" grumble
  const now = () => performance.now();
  const rand = (a: number, b: number) => a + Math.random() * (b - a);
  const any = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];
  // the top of his head on the screen, wherever it is (standing, tipped over, lying on the floor); world units are
  // screen pixels measured up from the canvas's bottom-left corner
  const crownAt = new THREE.Vector3();
  const headAt = () => {
    if (!ch.crown) return { x: me.x, y: me.y - HEIGHT * 1.02 };
    ch.crown.getWorldPosition(crownAt);
    return { x: rect.left + crownAt.x, y: rect.bottom - crownAt.y - 4 };
  };

  const setMode = (m: 'dock' | 'free') => {
    if (host.dataset.mode === m) return;
    if (m === 'free') dockRect = canvas.getBoundingClientRect();
    host.dataset.mode = m;
    hooks.mode(m);
    measure();
  };

  // ---- hit test: is this screen point on him? (a box around his body, then the meshes) ----
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const onHim = (x: number, y: number) => {
    if (Math.abs(x - me.x) > Math.max(30, 40 * S) || y < me.y - HEIGHT - 10 || y > me.y + 6) return false;
    ndc.set(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    return ray.intersectObject(model, true).length > 0;
  };

  // ---- the visitor's pointer ----
  let hotNow = false;
  let grab: { dx: number; dy: number; t: number; x: number; y: number } | null = null;
  const onMove = (e: PointerEvent) => {
    const t = now();
    pointer.vx = (e.clientX - pointer.x) / Math.max(8, t - pointer.moved) * 16;
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.moved = t;
    trail.push({ t, x: e.clientX, y: e.clientY });
    while (trail.length > 2 && t - trail[0].t > 100) trail.shift();
    strollsSinceMove = 0;
    wake();
    if (grab) return;
    const hot = state !== 'falling' && state !== 'walking' && onHim(e.clientX, e.clientY);
    if (hot !== hotNow) { hotNow = hot; hooks.hot(hot); }
  };
  // A press on him is his alone: the click that follows (with a mouse) is swallowed, or it would also open whatever
  // link is behind him; with a finger, the touch is held so the page doesn't scroll while he's carried.
  const swallowClick = (ev: MouseEvent) => { ev.preventDefault(); ev.stopPropagation(); };
  const onDown = (e: PointerEvent) => {
    if (e.button !== 0 || state === 'intro' || !onHim(e.clientX, e.clientY)) return;
    e.preventDefault();
    e.stopPropagation();
    window.addEventListener('click', swallowClick, { capture: true, once: true });
    grab = { dx: me.x - e.clientX, dy: me.y - e.clientY, t: now(), x: e.clientX, y: e.clientY };
  };
  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    if (e.touches.length === 1 && t && state !== 'intro' && onHim(t.clientX, t.clientY)) e.preventDefault();
  };
  const onUp = (e: PointerEvent) => {
    if (!grab) return;
    window.setTimeout(() => window.removeEventListener('click', swallowClick, { capture: true }), 0);
    const g = grab;
    grab = null;
    const moved = Math.hypot(e.clientX - g.x, e.clientY - g.y);
    if (state !== 'carried' && moved < 6) {
      pokeHim();
      // a finger can't hover, so a tap also shows the "Hide" pill for a moment
      if (e.pointerType !== 'mouse') { hooks.hot(true); hooks.hot(false); }
      return;
    }
    if (state === 'carried') drop();
  };
  // the browser took the touch over (a scroll or a system gesture): let go of him where he is
  const onCancel = () => {
    if (!grab) return;
    window.removeEventListener('click', swallowClick, { capture: true });
    grab = null;
    if (state === 'carried') drop();
  };
  // pointing at WhatsApp in the header: he looks up at it and says so; at his chat button: he looks down and invites you
  const onWaHover = (e: PointerEvent) => {
    const target = e.target as Element | null;
    const wa = target?.closest?.('a[aria-label="Chat on WhatsApp"], a[data-whatsapp]');
    const mine = wa ? null : target?.closest?.('[data-guide-dock]');
    if ((!wa && !mine) || state !== 'home' || now() < busyUntil || chat.on) return;
    busyUntil = now() + rand(2000, 2600);
    feel(null);
    play(any(['ThumbsUp', 'ThumbsUp', 'Wave', 'Yes'] as const));
    lookAt(wa ?? mine!, rand(2000, 2800));
    if (wa) speak('hover', hooks.lines().hover(), { delay: rand(80, 260) });
    else speak('invite', hooks.lines().invite, { delay: rand(80, 260) });
  };
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerdown', onDown, { capture: true });
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onCancel);
  window.addEventListener('touchstart', onTouchStart, { passive: false, capture: true });
  window.addEventListener('pointerover', onWaHover, { passive: true });
  const onResize = () => {
    // a new screen size (a phone turned round, a window resized): his size, then his place
    S = sizeFor(); HEIGHT = Math.round(FULL * S); fit();
    measure();
    if (host.dataset.mode === 'dock') { dockRect = canvas.getBoundingClientRect(); ({ x: me.x, y: me.y } = homeOf()); }
  };
  window.addEventListener('resize', onResize);

  // ---- what he says ----
  // Every moment has its own shuffled bag: each line comes once, in a fresh random order every round, and a new round
  // never opens with the line that closed the last one. The last line of each moment is kept for the visit, so a
  // reload doesn't open with the line just heard. {text} and {section} are filled from the page; a line whose
  // placeholder has nothing to fill is skipped.
  const SAID = 'inta-guide-said';
  const lastSaid = new Map<string, string>(((): [string, string][] => {
    try { return Object.entries(JSON.parse(sessionStorage.getItem(SAID) || '{}')); } catch { return []; }
  })());
  const bags = new Map<string, { of: string; left: string[] }>();
  const fill = (line: string, vars: Record<string, string>) => {
    let ok = true;
    const out = line.replace(/\{(\w+)\}/g, (_, k: string) => { const v = vars[k]; if (!v) ok = false; return v ?? ''; });
    return ok ? out : '';
  };
  const pick = (moment: string, list: string[], vars: Record<string, string> = {}) => {
    const usable = list.filter((l) => fill(l, vars));
    if (!usable.length) return '';
    const of = usable.join('\n');
    let bag = bags.get(moment);
    if (!bag || bag.of !== of) { bag = { of, left: [] }; bags.set(moment, bag); }
    if (!bag.left.length) {
      const left = [...usable];
      for (let i = left.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [left[i], left[j]] = [left[j], left[i]]; }
      if (left.length > 1 && left[left.length - 1] === lastSaid.get(moment)) left.unshift(left.pop()!);
      bag.left = left;
    }
    const line = bag.left.pop()!;
    lastSaid.set(moment, line);
    try { sessionStorage.setItem(SAID, JSON.stringify(Object.fromEntries(lastSaid))); } catch { /* private mode */ }
    return fill(line, vars);
  };
  // how long a line stays up once typed: time to read it, not a fixed figure
  const readFor = (text: string) => clamp(900 + text.length * 48, 1500, 4600);
  let sayTimer = 0;
  let saying = 0; // each line said gets a number: a line still waiting is dropped when a newer one starts
  /** say a line for this moment, after a short, human pause; gesture plays as he speaks. Returns how long it's on screen (ms) */
  const speak = (moment: string, list: string[], { vars = {}, delay = rand(120, 380), gesture, text: given, force }:
    { vars?: Record<string, string>; delay?: number; gesture?: () => void; text?: string; force?: boolean } = {}) => {
    const text = given ?? pick(moment, list, vars);
    if (!text) return 0;
    const mine = ++saying;
    window.clearTimeout(sayTimer);
    sayTimer = window.setTimeout(() => {
      if (mine !== saying) return;
      hooks.say(text, headAt(), readFor(text), force);
      gesture?.();
    }, delay);
    return delay + text.length * 32 + readFor(text);
  };

  // ---- behaviours ----
  // A click: the kinds of line take turns (a fun one, then one of our services, then one about us), each kind from its
  // own shuffled bag, and the services themselves come round one by one in a shuffled order, each with its own name.
  const CLICK_ORDER = ['fun', 'service', 'about', 'ask'] as const;
  const CLICK_MOVES: Record<(typeof CLICK_ORDER)[number], Clip[]> = { fun: ['Jump', 'Yes', 'Wave'], service: ['ThumbsUp', 'Yes'], about: ['Yes', 'Wave', 'ThumbsUp'], ask: ['Wave', 'ThumbsUp'] };
  let clicks = 0;
  let lastPoke: Clip | null = null;
  function pokeHim() {
    const L = hooks.lines();
    let kind: (typeof CLICK_ORDER)[number] = 'fun';
    let text = '';
    let service = '';
    for (let i = 0; i < CLICK_ORDER.length && !text; i++) {
      kind = CLICK_ORDER[(clicks + i) % CLICK_ORDER.length];
      if (kind === 'fun') text = L.plan?.pokes.length ? pick('click:plan', L.plan.pokes) : pick('click:fun', L.pokes);
      else if (kind === 'about') text = pick('click:about', L.about);
      else if (kind === 'ask') text = chat.on ? '' : pick('click:ask', L.invite);
      else if (L.services.length) {
        service = pick('click:service-name', L.services);
        text = pick('click:service', L.serviceLines, { service });
      }
    }
    clicks += 1;
    lookAt(null, rand(1800, 2800)); // a click gets your attention: he looks out at you
    // a move that suits the line, not the same as last time, and never quite the same timing
    const move = any(CLICK_MOVES[kind].filter((m) => m !== lastPoke));
    lastPoke = move;
    play(move, { speed: rand(0.9, 1.15) });
    feel('Surprised', rand(0.5, 0.9), rand(550, 850));
    speak(`click:${kind}`, [], { text, delay: rand(60, 200) });
    busyUntil = now() + rand(1500, 2100) + (text ? text.length * 20 : 0);
  }
  function endStroll() { stroll.spot = null; stroll.silent = false; stroll.hold = false; stroll.caption = ''; stroll.beat = null; look.at = null; }

  // ---- Gemini's plan for the page: its beats in order, each once, whichever are on screen when he's ready ----
  const beatsDone = new WeakSet<PlanBeat>();
  const CLIPS: Record<Exclude<Gesture, 'none'>, Clip> = { wave: 'Wave', nod: 'Yes', shake_head: 'No', thumbs_up: 'ThumbsUp', jump: 'Jump', dance: 'Dance', sit: 'Sitting' };
  const moodOf = (m: Mood) => {
    if (m === 'surprised') feel('Surprised', 0.9, 1300);
    else if (m === 'sad') feel('Sad', 0.6, 1800);
    else if (m === 'happy') feel('Surprised', 0.3, 900);
  };
  /** a move from the plan or the chat; Sitting and Dance loop, so they're ended by hand */
  const playGesture = (g: Gesture) => {
    const clip = g === 'none' ? null : CLIPS[g];
    if (!clip) return;
    play(clip, { speed: clip === 'Sitting' ? 1 : rand(0.95, 1.1), then: () => play('Idle') });
    if (clip === 'Dance') window.setTimeout(() => { if (ch.is('Dance')) play('Idle'); }, rand(2400, 3000));
    if (clip === 'Sitting') window.setTimeout(() => { if (ch.is('Sitting') && state === 'home') play('Idle', { fade: 0.5 }); }, 3400);
  };
  /** the next beat not yet played: a move where he stands, or something on screen now to walk to */
  function nextBeat(walksOnly = false): { beat: PlanBeat; el: Element | null } | null {
    const L = hooks.lines();
    for (const beat of L.plan?.beats ?? []) {
      if (beatsDone.has(beat)) continue;
      if (!beat.target) { if (walksOnly) continue; return { beat, el: null }; }
      const el = L.resolve(beat);
      if (el && inView(el, el.getBoundingClientRect())) return { beat, el };
    }
    return null;
  }
  /** a beat where he stands: the move and the line */
  function beatHere(beat: PlanBeat) {
    beatsDone.add(beat);
    busyUntil = now() + 2600;
    lookAt(null, rand(1500, 2200));
    moodOf(beat.mood);
    playGesture(beat.gesture);
    speak('plan', [], { text: beat.say, delay: rand(150, 350) });
    nextStrollAt = now() + rand(9000, 14000);
  }
  function pickUp() {
    state = 'carried';
    endStroll();
    me.spin = 0; me.omega = 0;
    retrying = false;
    hooks.hush();
    hooks.sleeping(false, headAt());
    setMode('free');
    ch.plant?.(false);
    play('Running', { fade: 0.15, speed: 1.5 });
    feel('Surprised', 1);
    look.on = false;
  }
  /** how fast the pointer was moving as he was let go, px/s (nothing if it was held still first) */
  const throwSpeed = () => {
    const t = now();
    const recent = trail.filter((p) => t - p.t < 100);
    if (recent.length < 2 || t - recent[recent.length - 1].t > 60) return { vx: 0, vy: 0 };
    const a = recent[0], b = recent[recent.length - 1];
    const s = Math.max(16, b.t - a.t) / 1000;
    return { vx: (b.x - a.x) / s, vy: (b.y - a.y) / s };
  };
  /** in the air: arms up, legs tucked (the Jump clip held at its highest point), his feet kept at his lowest point */
  function fallPose() {
    ch.plant?.(true);
    play('Jump', { fade: 0.18, speed: 0, from: 0.3 });
  }
  function drop() {
    state = 'falling';
    // let go right above the button, he lands back on it; anywhere else, on the floor
    const home = homeOf();
    ground = Math.abs(me.x - home.x) < 30 && me.y < home.y ? home.y : floorY();
    // he keeps the speed he was thrown with, and tumbles the way he was flung
    const v = throwSpeed();
    me.vx = clamp(v.vx * 0.7, -1300, 1300);
    me.vy = clamp(v.vy * 0.7, -1100, 900);
    me.omega = clamp(-me.vx / 260, -5, 5) + rand(-0.5, 0.5);
    bounced = false;
    fallPose();
  }
  /** his feet reach the ground (or the button): what follows depends on how hard and how crooked he came down */
  function touchDown(onFloor: boolean) {
    const impact = Math.max(0, me.vy);
    me.y = ground;
    hooks.fx('dust', { x: me.x, y: me.y }, clamp(impact / 1600, 0.25, 1));
    if (arriving) { arriving = false; land(Math.min(impact, 500)); return; }
    if (onFloor && (impact > 1500 || Math.abs(me.spin) > 0.85) && Math.random() < FALL_CHANCE) {
      fallOver('dropped', me.spin > 0.3 ? 1 : me.spin < -0.3 ? -1 : me.vx < 0 ? 1 : -1);
      return;
    }
    if (impact > 750 && !bounced) {
      // a hard landing bounces him once, a little
      bounced = true;
      me.vy = -impact * 0.2;
      me.vx *= 0.7;
      me.omega *= 0.5;
      me.squashV = -clamp(impact / 120, 6, 14);
      return;
    }
    land(impact);
  }
  function land(impact: number) {
    // on his feet: the knees give more the harder he lands, and a sideways throw becomes a skid (slowed in the loop)
    state = 'landed';
    me.vy = 0;
    me.omega = 0;
    me.squashV = -clamp(impact / 110, 5, 13);
    ch.plant?.(false);
    const home = homeOf();
    const onButton = Math.abs(home.y - me.y) < 4 && Math.abs(home.x - me.x) < 30;
    play('Jump', { from: 0.5, fade: 0.08, speed: rand(0.9, 1.1), then: () => {
      if (state !== 'landed') return;
      if (onButton || ground !== floorY()) { settle(); return; }
      feel('Angry', rand(0.25, 0.45), rand(700, 1100));
      play(Math.random() < 0.7 ? 'No' : 'ThumbsUp', { then: () => { if (state === 'landed') walkHome(); } });
      speak('dropped', hooks.lines().dropped);
    } });
  }
  function fallOver(kind: 'dropped' | 'missed', dir: 1 | -1) {
    // over he goes; the tilt he had carries on into the fall instead of snapping upright first
    state = 'dazed';
    me.vy = 0;
    me.squashV = -8;
    ch.plant?.(false);
    ch.fallSide(dir);
    feel('Surprised', 1);
    play('Death', { fade: 0.14, speed: rand(1.4, 1.75), then: () => {} });
    // stars and a puff of dust where his head actually comes to rest
    window.setTimeout(() => {
      if (state !== 'dazed') return;
      const h = headAt();
      hooks.fx('stars', h);
      hooks.fx('dust', { x: h.x, y: me.y }, 0.55);
    }, 430);
    const said = speak(kind, kind === 'missed' ? hooks.lines().missed : hooks.lines().dropped, { delay: rand(520, 820) });
    // he lies there a moment, then gets up the way he went down (the fall played backwards), cross, and heads back
    window.setTimeout(() => {
      if (state !== 'dazed') return;
      feel('Angry', rand(0.35, 0.5));
      play('Death', { speed: -rand(1.0, 1.3), from: 0.84, fade: 0.2, then: () => {
        if (state !== 'dazed') return;
        play('Idle', { fade: 0.25 });
        window.setTimeout(() => { if (state !== 'dazed') return; retrying = kind === 'missed'; walkHome(); }, rand(350, 700));
      } });
    }, clamp(said, 1600, 2600));
  }
  function walkHome() {
    state = 'walking';
    feel(null);
    look.on = false;
    const far = Math.abs(besideButton().x - me.x) > 260;
    play(far ? 'Running' : 'Walking', { speed: far ? rand(0.95, 1.05) : rand(1.15, 1.3) });
  }
  function hopUp() {
    // a jump from the floor up onto the button; now and then it falls short and he bonks into its side
    state = 'hopping';
    const h = homeOf();
    const side = me.x > h.x ? 1 : -1;
    const miss = !retrying && !missedLast && Math.random() < FALL_CHANCE;
    missedLast = miss;
    Object.assign(hop, { t: 0, x0: me.x, y0: me.y, x1: miss ? h.x + side * 30 * S : h.x, y1: miss ? h.y + 40 * S : h.y, peak: (miss ? 46 : 70) * S, miss, side, down: false });
    play('Jump', { fade: 0.15, then: () => {} });
  }
  function bonk() {
    // smack into the side of the button: the button wobbles, and he tumbles back down, turning as he goes
    state = 'bonked';
    feel('Surprised', 1);
    hooks.fx('wobble', homeOf());
    me.vx = hop.side * rand(130, 210);
    me.vy = -rand(200, 280);
    me.omega = -hop.side * rand(5, 8);
    bounced = false;
    fallPose();
  }
  function settle() {
    state = 'home';
    endStroll();
    me.turn = 0;
    me.spin = 0; me.omega = 0; me.vx = 0; me.vy = 0;
    ch.plant?.(false);
    setMode('dock');
    ({ x: me.x, y: me.y } = homeOf());
    look.on = true;
    play(base = 'Idle');
    nextStrollAt = now() + rand(9000, 15000);
  }
  function wake() {
    if (state === 'asleep') {
      state = 'home';
      hooks.sleeping(false, headAt());
      base = 'Idle';
      feel('Surprised', 1, 900);
      play('Jump', { fade: 0.2 });
      busyUntil = now() + 1300;
      look.on = true;
    }
  }

  // ---- where he looks: his own choice, a few seconds at a time ----
  // something on the page (a heading, a picture, a button), you (straight out of the screen, with a little drift), or
  // nothing in particular (the Idle clip's own glances about)
  const gaze = { el: null as Element | null, viewer: false, dx: 0, dy: 0, until: now() + rand(1500, 3000) };
  let fidgetAt = now() + rand(8000, 14000);
  function lookAt(el: Element | null, ms: number) {
    Object.assign(gaze, { el, viewer: !el, dx: rand(-40, 40), dy: rand(-30, 10), until: now() + ms });
  }
  function chooseGaze() {
    const r = Math.random();
    if (chat.thinking) { Object.assign(gaze, { el: null, viewer: true, dx: rand(-60, -30), dy: rand(-150, -110), until: now() + rand(900, 1600) }); return; }
    if (chat.on) { if (r < 0.7 && chat.panel?.isConnected) lookAt(chat.panel, rand(2500, 4500)); else lookAt(null, rand(1500, 2500)); return; }
    const spot = r < 0.5 ? pickSpot(sectionNow()) : null;
    if (spot) lookAt(spot.el, rand(1600, 3400));
    else if (r < 0.75) lookAt(null, rand(1800, 3600));
    else Object.assign(gaze, { el: null, viewer: false, until: now() + rand(2500, 5000) });
  }

  // ---- walks: off the button, along the bottom of the screen to something on it, a look and a word, then back ----
  type Spot = { el: Element; kind: SpotKind; text: string };
  const stroll = { spot: null as Spot | null, x: 0, phase: 'walk' as 'walk' | 'look', until: 0, visits: 0, silent: false, hold: false, caption: '', beat: null as PlanBeat | null };
  // the chat: open (he stays on his button watching it, no walks, remarks or naps), and working on an answer
  const chat = { on: false, panel: null as Element | null, thinking: false };
  let nextStrollAt = now() + rand(5000, 8000); // soon after he arrives, he goes to show something
  let strollsSinceMove = 0;
  let lastScroll = 0;
  const looked = new WeakSet<Element>(); // each thing on the page gets one look per visit
  const talkedAbout = new Set<string>(); // and each part of a page one remark
  let sectionCheck = 0, sectionId = '', sectionSince = 0, talkCooldown = 0;
  const onScroll = () => { lastScroll = now(); };
  window.addEventListener('scroll', onScroll, { passive: true });

  const SKIP = 'header, footer, nav, [aria-hidden="true"], [data-guide-dock], .guide-chat';
  const shortText = (s: string, max: number) => {
    const t = s.replace(/\s+/g, ' ').trim();
    if (t.length <= max) return t;
    const cut = t.slice(0, max);
    return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), 12)).replace(/[\s,.;:–-]+$/, '')}…`;
  };
  // An element's words as a visitor reads them: icons drawn from an icon font (their names are text, e.g. "east" for an
  // arrow) and hidden bits left out, a leading item number ("01") dropped, and SHOUTED labels in normal capitals
  const ICONS = '[class*="material-symbols"], [class*="material-icons"], [aria-hidden="true"], svg, script, style';
  const wordsOf = (el: Element) => {
    const copy = el.cloneNode(true) as Element;
    copy.querySelectorAll(ICONS).forEach((n) => n.remove());
    let t = (copy.textContent ?? '').replace(/\s+/g, ' ').trim().replace(/^\d{1,3}[.)]?\s+/, '');
    if (t.length > 3 && t === t.toUpperCase() && /[A-Z]/.test(t)) {
      t = t.toLowerCase().replace(/(^|[\s("'])(\p{L})/gu, (_m, a: string, c: string) => a + c.toUpperCase());
    }
    return t;
  };
  const labelOf = (el: Element) => {
    const by = el.getAttribute('aria-labelledby');
    const named = by
      ? by.split(/\s+/).map((id) => { const n = document.getElementById(id); return n ? wordsOf(n) : ''; }).join(' ')
      : el.getAttribute('aria-label') ?? '';
    return shortText(named, 40);
  };
  const pageKey = () => location.pathname.split('/').filter(Boolean)[0]?.toLowerCase() ?? 'home';
  /** the part of the page across the middle of the screen: its key for the admin lines, and its own title */
  const sectionNow = () => {
    const probe = window.innerHeight * 0.45;
    let best: Element | null = null;
    for (const s of document.querySelectorAll('section')) {
      if (s.closest(SKIP) || s.querySelector('[data-floating-clear]')) continue; // he steps aside where these show
      const r = s.getBoundingClientRect();
      if (r.top <= probe && r.bottom >= probe && r.height > 160) best = s; // the innermost one comes last
    }
    if (!best) return null;
    const id = best.id.toLowerCase();
    return { el: best, key: /(^|-)faq$/.test(id) ? 'faq' : id, page: pageKey(), title: labelOf(best) };
  };
  type Section = NonNullable<ReturnType<typeof sectionNow>>;
  const sectionKeyOf = (s: Section) => `${s.page}#${s.key}#${s.title}`;
  /** a remark about this part of the page: its own lines, else the page's, else the general ones with its title */
  function sayAboutSection(s: Section, gesture?: () => void) {
    talkedAbout.add(sectionKeyOf(s));
    const L = hooks.lines();
    const planned = s.el.id ? L.plan?.sections[s.el.id] : '';
    if (planned) return speak('section:plan', [], { text: planned, gesture });
    const own = s.key ? L.section(s.key) : [];
    const page = own.length ? own : L.section(s.page);
    const [moment, list] = page.length ? [`section:${own.length ? s.key : s.page}`, page] : ['section:any', L.sectionAny];
    return speak(moment, list, { vars: { section: s.title }, gesture });
  }

  /** on screen, clear of the header and of the strip he walks along, not hidden, not part of the site's frame */
  const inView = (el: Element, r: DOMRect) => {
    if (r.width < 24 || r.height < 12) return false;
    if (r.top < 90 || r.bottom > window.innerHeight - HEIGHT - 40 || r.left < 8 || r.right > window.innerWidth - 8) return false;
    const check = (el as Element & { checkVisibility?: (o: object) => boolean }).checkVisibility;
    if (check && !check.call(el, { opacityProperty: true, visibilityProperty: true })) return false;
    return !el.closest(SKIP);
  };
  /** what's worth a look in this part of the page: headings, buttons and links, pictures, form boxes */
  const spotsIn = (root: ParentNode) => {
    const out: (Spot & { w: number })[] = [];
    const add = (sel: string, kind: SpotKind, w: number, words: (el: Element) => string, max: number) => {
      root.querySelectorAll(sel).forEach((el) => {
        if (looked.has(el) || !inView(el, el.getBoundingClientRect())) return;
        const raw = words(el).replace(/\s+/g, ' ').trim();
        if ((kind === 'heading' || kind === 'button') && (raw.length < 2 || raw.length > max)) return;
        out.push({ el, kind, text: raw.length > max ? '' : shortText(raw, max), w });
      });
    };
    add('h1, h2, h3', 'heading', 3, wordsOf, 60);
    add('a[href], button', 'button', 3, (el) => el.getAttribute('aria-label') || wordsOf(el), 30);
    add('img', 'image', 2, (el) => el.getAttribute('alt') ?? '', 40);
    add('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), textarea, select', 'field', 2,
      (el) => el.getAttribute('placeholder') || el.getAttribute('aria-label') || '', 40);
    return out;
  };
  const pickSpot = (s: Section | null) => {
    let list = spotsIn(s?.el ?? document);
    if (!list.length && s) list = spotsIn(document);
    if (!list.length) return null;
    let r = Math.random() * list.reduce((sum, x) => sum + x.w, 0);
    for (const x of list) { r -= x.w; if (r <= 0) return x; }
    return list[list.length - 1];
  };
  // Where he stands is never in front of something to click or type in (a button, a link, a form box): on a short
  // screen the page's buttons can sit in the strip he walks along. He takes the nearest clear place beside it.
  const CLICKABLE = 'a, button, input, select, textarea, label, summary, [role="button"], [tabindex]:not([tabindex="-1"])';
  const OURS = '[data-guide-dock], [data-whatsapp]'; // the floating buttons are no reason to step aside
  const clearAt = (x: number) => {
    const top = floorY() - HEIGHT;
    for (const dx of [-30 * S, 0, 30 * S]) {
      for (const share of [0.2, 0.55, 0.9]) {
        const hit = document.elementFromPoint(x + dx, top + HEIGHT * share);
        if (hit && hit.closest(CLICKABLE) && !hit.closest(OURS)) return false;
      }
    }
    return true;
  };
  const standX = (el: Element) => {
    const r = el.getBoundingClientRect();
    const lo = 50 * S, hi = Math.min(window.innerWidth - 170 * S, homeOf().x - 70 * S);
    const want = clamp(r.left + r.width / 2 + rand(-24, 24), lo, hi);
    for (let step = 0; step <= 10; step++) {
      for (const x of step ? [want - step * 40 * S, want + step * 40 * S] : [want]) {
        if (x >= lo && x <= hi && clearAt(x)) return x;
      }
    }
    return want; // nowhere clear: he'll only stand there for a moment
  };

  function startStroll() {
    const sec = sectionNow();
    const planned = nextBeat();
    if (planned && !planned.el) { beatHere(planned.beat); return; }
    if (planned) beatsDone.add(planned.beat);
    const spot: Spot | null = planned?.el ? { el: planned.el, kind: 'heading', text: '' } : pickSpot(sec);
    if (!spot) { nextStrollAt = now() + rand(8000, 12000); return; }
    stroll.spot = spot; stroll.visits = 0; stroll.phase = 'walk'; stroll.silent = false; stroll.beat = planned?.beat ?? null;
    strollsSinceMove += 1;
    busyUntil = Infinity;
    hooks.hush();
    feel('Surprised', 0.4, 500);
    // a word about this part of the page first if he hasn't had one yet; otherwise, now and then, "back soon"
    const wave = () => play(any(['Wave', 'Yes', 'ThumbsUp'] as const));
    const said = sec && !talkedAbout.has(sectionKeyOf(sec)) ? sayAboutSection(sec, wave)
      : Math.random() < 0.5 ? speak('stroll', hooks.lines().stroll, { gesture: wave }) : 0;
    const side = standX(spot.el) < homeOf().x ? -1 : 1;
    window.setTimeout(() => { if (state === 'home' && stroll.spot === spot) hopDown(side); }, said ? clamp(said * 0.55, 900, 2200) : rand(200, 500));
  }
  function hopDown(side: number) {
    // off the button and down to the floor, on the side he's heading for
    setMode('free');
    state = 'hopping';
    look.on = false;
    const h = homeOf();
    Object.assign(hop, { t: 0, x0: me.x, y0: me.y, x1: h.x + side * 70 * S, y1: floorY(), peak: 36 * S, miss: false, side, down: true });
    play('Jump', { fade: 0.12, then: () => {} });
  }
  function strollWalk() {
    state = 'strolling';
    stroll.phase = 'walk';
    stroll.x = standX(stroll.spot!.el);
    look.on = false;
    play('Walking', { fade: 0.25, speed: rand(1.05, 1.2) });
  }
  function arrive() {
    // under it: turn to the screen, look up at it, a gesture and a word about it
    const spot = stroll.spot!;
    stroll.phase = 'look';
    looked.add(spot.el);
    look.on = true;
    play('Idle', { fade: 0.25 });
    if (stroll.silent) {
      // showing what the chat is talking about: a nod up at it and the caption, then back (or, on a tour, he waits)
      const nod = () => { if (state === 'strolling' && stroll.spot === spot) play(any(['Yes', 'ThumbsUp'] as const)); };
      const said = stroll.caption ? speak('caption', [], { text: stroll.caption, force: true, delay: rand(250, 400), gesture: nod }) : 0;
      if (!said) window.setTimeout(nod, rand(300, 500));
      stroll.until = now() + (stroll.hold ? 16000 : Math.max(said, 3200) + rand(200, 600));
      return;
    }
    if (stroll.beat) {
      // a beat from the plan: its own line, move and face
      const beat = stroll.beat;
      stroll.beat = null;
      moodOf(beat.mood);
      const said = speak('plan', [], { text: beat.say, delay: rand(400, 700),
        gesture: () => { if (state === 'strolling' && stroll.spot === spot) playGesture(beat.gesture === 'none' || beat.gesture === 'sit' ? 'nod' : beat.gesture); } });
      stroll.until = now() + Math.max(said, 1800) + rand(300, 900);
      return;
    }
    const gesture: Clip = spot.kind === 'button' ? any(['ThumbsUp', 'Wave', 'Jump'] as const)
      : spot.kind === 'image' ? any(['Yes', 'ThumbsUp'] as const)
      : spot.kind === 'field' ? 'Wave' : any(['Yes', 'ThumbsUp', 'Wave'] as const);
    const said = speak(`look:${spot.kind}`, hooks.lines().look[spot.kind], {
      vars: { text: spot.text }, delay: rand(400, 700),
      gesture: () => { if (state === 'strolling' && stroll.spot === spot) play(gesture, { speed: rand(0.9, 1.1) }); },
    });
    stroll.until = now() + Math.max(said, 1800) + rand(300, 900);
  }
  function strollOn() {
    // sometimes one more thing nearby, otherwise back to the button
    look.at = null;
    stroll.visits += 1;
    let next: Spot | null = null;
    if (!stroll.silent && stroll.visits < 3) {
      // one more thing nearby now and then: the plan's next beat on screen if there is one, else anything worth a look
      const planned = nextBeat(true);
      if (planned?.el) { if (Math.random() < 0.55) { beatsDone.add(planned.beat); stroll.beat = planned.beat; next = { el: planned.el, kind: 'heading', text: '' }; } }
      else if (Math.random() < 0.45) next = pickSpot(sectionNow());
    }
    if (next) { stroll.spot = next; strollWalk(); return; }
    stroll.spot = null;
    if (!stroll.silent && Math.random() < 0.45) speak('strollHome', hooks.lines().strollHome);
    stroll.silent = false;
    walkHome();
  }
  function intro() {
    const lines = hooks.lines();
    if (hooks.firstVisit) {
      // he drops in from above the screen, lands, looks about and waves
      setMode('free');
      const home = homeOf();
      me.x = home.x; me.y = -40; me.vy = 0; me.vx = 0;
      state = 'falling';
      ground = home.y;
      arriving = true;
      bounced = true;
      fallPose();
      const wait = window.setInterval(() => {
        if (state !== 'home' && state !== 'walking') return;
        window.clearInterval(wait);
        window.setTimeout(() => {
          feel('Surprised', 0.6, 600);
          play('Wave', { then: () => { play('ThumbsUp'); } });
          speak('welcome', lines.welcome, { delay: 0 });
        }, rand(250, 500));
      }, 100);
    } else {
      state = 'home';
      play('Wave');
      speak('back', lines.back, { delay: rand(100, 300) });
    }
    busyUntil = now() + 2600;
  }

  // compile the shaders in the background before the first frame: done on the first draw instead, it froze the page
  // for over half a second
  await renderer.compileAsync(scene, camera);

  // ---- the loop: animate, place, turn the head, draw ----
  // every frame, at the screen's own rate: the box is small, and anything less shows as a stutter while he stands still.
  // That holds where a frame is cheap. Each frame's own work is timed: on a slower phone he is drawn every 2nd, 3rd or
  // 4th frame instead, so he never takes the whole processor (on a 4x slower CPU he used to keep the page from ever
  // going idle), and where even that is too much he leaves the page to the chat button alone (hooks.tooSlow).
  let last = performance.now();
  let cost = 0; // ms of work per drawn frame, smoothed
  let drawn = 0;
  let every = 1; // drawn once in this many frames
  let skipped = 0;
  renderer.setAnimationLoop((t) => {
    if (paused) { last = t; return; }
    if (++skipped < every) return; // (last stays put, so the next drawn frame moves him on by the whole time)
    skipped = 0;
    const began = performance.now();
    const dt = Math.min(0.05 * every, Math.max(0, (t - last) / 1000));
    last = t;
    host.dataset.state = state;
    hooks.anchor(headAt());
    // a safety net: whatever happens, he never stays stuck between places; mid-move too long, he hops straight home
    simT += dt * 1000;
    if (state !== stateWas) { stateWas = state; stateSince = simT; }
    const stuckAfter = state === 'strolling' ? 30000 : 9000;
    if ((state === 'landed' || state === 'falling' || state === 'walking' || state === 'hopping' || state === 'bonked' || state === 'dazed' || state === 'strolling') && simT - stateSince > stuckAfter) {
      me.squashV = -6; retrying = false; settle();
    }

    // where he is
    if (state === 'carried' && grab) {
      const tx = pointer.x + grab.dx, ty = pointer.y + grab.dy;
      me.lean += (clamp((tx - me.x) * 0.02, -0.5, 0.5) - me.lean) * 0.2; // swings as he's carried
      me.x = tx; me.y = ty;
    } else if (state === 'falling' || state === 'bonked') {
      // thrown or knocked off: gravity, a little air drag, and the tumble he was given, slowing as he goes
      me.vy += GRAVITY * dt;
      const drag = Math.exp(-0.35 * dt);
      me.vx *= drag;
      me.x += me.vx * dt; me.y += me.vy * dt;
      me.spin += me.omega * dt;
      me.omega *= Math.exp(-0.6 * dt);
      me.lean += (Math.sin(t / 70) * 0.05 - me.lean) * Math.min(1, dt * 6); // arms and legs flail a little
      // the sides of the window are walls: he bounces off them, losing most of his speed
      if (me.x < 36 || me.x > window.innerWidth - 36) { me.x = clamp(me.x, 36, window.innerWidth - 36); me.vx *= -0.35; me.omega *= -0.5; }
      const floor = state === 'bonked' ? floorY() : ground;
      if (me.vy > 0 && me.y >= floor) {
        if (state === 'falling') touchDown(ground === floorY());
        else if (me.vy > 450 && !bounced) { bounced = true; me.y = floor; me.vy *= -0.25; me.omega *= 0.6; me.squashV = -8; hooks.fx('dust', { x: me.x, y: me.y }, 0.5); }
        else { me.y = floor; hooks.fx('dust', { x: me.x, y: me.y }, 0.8); fallOver('missed', hop.side > 0 ? -1 : 1); }
      }
    } else if (state === 'landed') {
      // a skid: the floor slows him down, he leans back against it, and he rights himself
      me.x = clamp(me.x + me.vx * dt, 36, window.innerWidth - 36);
      me.vx *= Math.exp(-7 * dt);
      if (Math.abs(me.vx) < 4) me.vx = 0;
      me.spin *= Math.exp(-12 * dt);
      me.lean += (clamp(me.vx * 0.0007, -0.3, 0.3) - me.lean) * Math.min(1, dt * 12);
      if (Math.abs(me.vx) > 160 && Math.random() < dt * 14) hooks.fx('dust', { x: me.x - Math.sign(me.vx) * 14, y: me.y }, 0.3);
    } else if (state === 'walking') {
      const to = besideButton();
      const dx = to.x - me.x;
      const fast = ch.is('Running') ? 1.9 : 1;
      me.turn += ((dx > 0 ? 1 : -1) * Math.PI / 2 - me.turn) * 0.15;
      me.x += Math.sign(dx) * Math.min(Math.abs(dx), WALK * S * fast * dt);
      me.y += (to.y - me.y) * 0.2;
      me.lean *= 0.85; me.spin *= 0.8;
      if (Math.abs(dx) < 1.5) hopUp();
    } else if (state === 'hopping') {
      hop.t = Math.min(1, hop.t + dt / (hop.down ? 0.48 : 0.55));
      const e = hop.t;
      me.turn += (0 - me.turn) * 0.2;
      me.x = hop.x0 + (hop.x1 - hop.x0) * e;
      me.y = hop.y0 + (hop.y1 - hop.y0) * e - Math.sin(Math.PI * e) * hop.peak;
      if (hop.t >= 1) {
        if (hop.down) {
          // down on the floor: off he goes
          me.squashV = -7;
          hooks.fx('dust', { x: me.x, y: me.y }, 0.35);
          if (stroll.spot) strollWalk(); else walkHome();
        } else if (hop.miss) bonk();
        else {
          me.squashV = -7;
          const made = retrying;
          settle();
          if (made) {
            // made it on the second go
            retrying = false;
            feel(null);
            busyUntil = now() + 2000;
            play('Yes');
            speak('madeIt', hooks.lines().madeIt, { delay: rand(100, 250) });
          }
        }
      }
    } else if (state === 'strolling') {
      const spot = stroll.spot;
      const r = spot && spot.el.isConnected ? spot.el.getBoundingClientRect() : null;
      if (!spot || !r || !inView(spot.el, r)) {
        // scrolled away or gone: something else, or home; on a tour he waits where he is for the next stop
        if (stroll.hold && spot && now() < stroll.until) {
          look.at = null;
          me.turn += (0 - me.turn) * 0.12;
          if (stroll.phase === 'walk') { stroll.phase = 'look'; play('Idle', { fade: 0.25 }); }
        } else strollOn();
      } else if (stroll.phase === 'walk') {
        const dx = stroll.x - me.x;
        me.turn += ((dx > 0 ? 1 : -1) * Math.PI / 2 - me.turn) * 0.15;
        me.x += Math.sign(dx) * Math.min(Math.abs(dx), WALK * S * 0.9 * dt);
        if (Math.abs(dx) < 1.5) arrive();
      } else {
        me.turn += (0 - me.turn) * 0.12; // turned to the screen, looking up at it
        look.at = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        if (now() > stroll.until) strollOn();
      }
      me.lean *= 0.85;
    } else if (state === 'dazed') {
      // the tilt he came down with eases into the fall instead of snapping upright
      me.lean *= 0.85;
      me.spin *= Math.exp(-10 * dt);
    } else {
      me.lean *= 0.85;
      me.spin *= 0.8;
      me.turn += (look.yaw * 0.25 - me.turn) * 0.08;
    }
    if (grab && state !== 'carried' && Math.hypot(pointer.x - grab.x, pointer.y - grab.y) > 6) pickUp();

    // squash and stretch on landing
    me.squashV += (1 - me.squash) * 0.35; me.squashV *= 0.72; me.squash += me.squashV * dt * 10;
    actor.position.set(me.x - rect.left, rect.bottom - me.y, 0);
    actor.rotation.set(0, me.turn, -me.lean + me.spin);
    rig.scale.set(1 / Math.sqrt(Math.max(0.6, me.squash)), Math.max(0.6, me.squash), 1);
    shadow.position.set(actor.position.x, rect.bottom - me.y + 1, -50);
    shadow.scale.set(S, S, 1);
    shadow.visible = state === 'home' || state === 'asleep' || state === 'walking' || state === 'landed' || state === 'dazed' || state === 'strolling';

    // He doesn't follow the cursor: he looks where he chooses (gaze, below), or at what he stopped under on a walk,
    // and otherwise lets the clip's own glances play. Measured from his eye height; the yaw from the way his body faces.
    {
      const eyeX = me.x, eyeY = me.y - HEIGHT * 0.75;
      let at: { x: number; y: number } | null = look.at;
      if (!at && gaze.el?.isConnected) { const r = gaze.el.getBoundingClientRect(); at = { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
      if (!at && gaze.viewer) at = { x: eyeX + gaze.dx, y: eyeY + gaze.dy };
      const dx = at ? at.x - eyeX : 0, dy = at ? at.y - eyeY : 0;
      const watching = look.on && !!at;
      look.toYaw = watching ? clamp(Math.atan2(dx, 420), -0.55, 0.55) : 0;
      look.toPitch = watching ? clamp(Math.atan2(dy, 420), -0.32, 0.38) : 0;
      look.yaw += (look.toYaw - look.yaw) * 0.12;
      look.pitch += (look.toPitch - look.pitch) * 0.12;
      look.hold += ((watching ? 1 : 0) - look.hold) * 0.08;
      ch.update(dt, { yaw: look.yaw - me.turn, pitch: look.pitch, hold: look.hold });
    }

    // at home he keeps himself busy: a look at something on the page, at you, or his own glances; a word when a new
    // part of the page comes up, a walk now and then, a fidget, a nap when nobody's around; a wave if you come close
    // the button can move (the page's layout settling, a bar appearing or going): he follows it
    if (host.dataset.mode === 'dock' && (state === 'home' || state === 'asleep') && now() > redockAt) {
      redockAt = now() + 1000;
      const d = dockBox();
      if (Math.abs(d.left - dock.left) > 1 || Math.abs(d.top - dock.top) > 1 || d.w !== dock.w) {
        measure(); dockRect = canvas.getBoundingClientRect(); ({ x: me.x, y: me.y } = homeOf());
      }
    }
    if (state === 'home' && now() > busyUntil) {
      const h = headAt();
      const quiet = now() - pointer.moved;
      const pointerNear = Math.hypot(pointer.x - h.x, pointer.y - h.y) < 220;
      const scrolling = now() - lastScroll < 1200;
      let sec: Section | null = null;
      if (now() > sectionCheck) {
        sectionCheck = now() + 600;
        sec = sectionNow();
        const id = sec ? sectionKeyOf(sec) : '';
        if (id !== sectionId) { sectionId = id; sectionSince = now(); }
      }
      if (pointerNear && Math.hypot(pointer.x - h.x, pointer.y - h.y) < 150 && now() > waveCooldown) {
        waveCooldown = now() + rand(8000, 12000);
        busyUntil = now() + 1800;
        play('Wave', { speed: rand(0.9, 1.1) });
      } else if (!chat.on && sec && !scrolling && now() - sectionSince > 900 && now() > talkCooldown && !talkedAbout.has(sectionKeyOf(sec))) {
        // settled on a new part of the page: most of the time a word about it (once each), a gesture to go with it
        talkCooldown = now() + rand(5000, 8000);
        if (Math.random() < 0.9) {
          const said = sayAboutSection(sec, () => play(any(['Wave', 'ThumbsUp', 'Yes'] as const)));
          if (said) busyUntil = now() + Math.min(said, 3500);
        } else talkedAbout.add(sectionKeyOf(sec));
      } else if (!chat.on && now() > nextStrollAt && !scrolling && !pointerNear && strollsSinceMove < 5 && document.visibilityState === 'visible') {
        startStroll();
      } else if (!chat.on && ((quiet > SLEEP_AFTER && strollsSinceMove >= 4) || quiet > SLEEP_AFTER * 3)) {
        state = 'asleep';
        look.on = false;
        feel('Sad', 0.5);
        play(base = 'Sitting', { fade: 0.6 });
        hooks.sleeping(true, headAt());
      } else if (base === 'Idle' && !chat.thinking && now() > fidgetAt) {
        // fidgets: a little dance step, a nod, a thumbs up to nobody in particular
        fidgetAt = now() + rand(10000, 18000);
        busyUntil = now() + 2500;
        const move = any(['Dance', 'Yes', 'ThumbsUp', 'Dance'] as const);
        play(move, { then: () => play('Idle') });
        if (move === 'Dance') window.setTimeout(() => { if (ch.is('Dance')) play('Idle'); }, rand(1800, 2600));
      } else if (now() > gaze.until) chooseGaze();
    }

    renderer.render(scene, camera);

    // the frame budget (see above): judged after a short warm-up, on a slowly moving average, so one busy frame changes nothing
    const spent = performance.now() - began;
    cost = drawn ? cost * 0.95 + spent * 0.05 : spent;
    if (++drawn > 40) {
      every = cost > 18 ? 4 : cost > 10 ? 3 : cost > 5 ? 2 : 1;
      if (cost > 30 && drawn > 120) {
        renderer.setAnimationLoop(null);
        hooks.tooSlow();
      }
    }
  });

  intro();

  return {
    stop() {
      renderer.setAnimationLoop(null);
      window.clearTimeout(sayTimer);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown, { capture: true });
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('touchstart', onTouchStart, { capture: true });
      window.removeEventListener('click', swallowClick, { capture: true });
      window.removeEventListener('pointerover', onWaHover);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.geometry.dispose();
          (Array.isArray(m.material) ? m.material : [m.material]).forEach((mat) => mat.dispose());
        }
      });
      shadowTex.dispose();
      renderer.dispose();
    },
    pause(on) { paused = on; },
    greetTab() {
      if (state !== 'home' && state !== 'asleep') return;
      wake();
      busyUntil = now() + 1800;
      play('Wave');
      speak('tab', hooks.lines().tab);
    },
    chat(on, panel) {
      chat.on = on; chat.panel = panel; chat.thinking = false;
      if (on) { wake(); gaze.until = 0; }
      else nextStrollAt = Math.max(nextStrollAt, now() + rand(8000, 13000));
    },
    think(on) {
      chat.thinking = on;
      gaze.until = 0;
      if (on && state === 'home') { wake(); feel('Surprised', 0.3, 700); }
    },
    gesture(g, mood = 'neutral') {
      // the face first (the model has no smile: happy is a bright, open look), then the move
      moodOf(g === 'shake_head' && mood === 'neutral' ? 'sad' : mood);
      if (g === 'none' || (state !== 'home' && state !== 'asleep')) return;
      wake();
      busyUntil = now() + (g === 'sit' ? 3600 : 2000);
      lookAt(null, rand(1500, 2200)); // to the visitor as he answers
      playGesture(g);
    },
    announce(text) {
      // a new page's plan: its greeting now (if he's free), and his first walk soon after
      nextStrollAt = Math.min(nextStrollAt, now() + rand(9000, 15000));
      if (!text || state !== 'home' || chat.on || now() < busyUntil) return false;
      busyUntil = now() + 2400;
      lookAt(null, rand(1500, 2200));
      play(any(['Wave', 'ThumbsUp', 'Yes'] as const));
      speak('intro', [], { text, delay: rand(150, 300) });
      return true;
    },
    show(el, { caption = '', hold = false } = {}) {
      if (state === 'asleep') wake();
      const r = el.getBoundingClientRect();
      if (!inView(el, r)) return false;
      const spot: Spot = { el, kind: 'heading', text: '' };
      if (state === 'strolling' && stroll.silent) {
        // already out on a walk for the chat: straight on to the next thing
        Object.assign(stroll, { spot, caption, hold, visits: 0 });
        stateSince = simT; // a new stop: the safety net counts from here, so a long tour isn't cut short
        hooks.hush();
        strollWalk();
        return true;
      }
      if (state !== 'home') return false;
      Object.assign(stroll, { spot, caption, hold, visits: 0, phase: 'walk', silent: true });
      busyUntil = Infinity;
      hooks.hush();
      hopDown(standX(el) < homeOf().x ? -1 : 1);
      return true;
    },
    release() {
      stroll.hold = false;
      if (state === 'strolling' && stroll.silent) { stroll.until = 0; if (stroll.phase === 'walk') strollOn(); }
    },
    status() {
      if (state === 'home' || state === 'asleep' || state === 'intro') return 'home';
      if (state === 'strolling') return stroll.phase === 'look' ? 'looking' : 'walking';
      if (state === 'hopping' && hop.down) return 'walking';
      return 'away';
    },
    moved() {
      // a new page: a walk in progress ends (what he was looking at has gone), and new parts of the page get remarks
      sectionId = ''; sectionSince = now();
      if (state === 'strolling' || (state === 'hopping' && hop.down)) { hooks.hush(); settle(); return; }
      if (host.dataset.mode === 'dock' && state === 'home') { dockRect = canvas.getBoundingClientRect(); ({ x: me.x, y: me.y } = homeOf()); }
    },
  };
}

function clamp(v: number, a: number, b: number) { return Math.max(a, Math.min(b, v)); }
