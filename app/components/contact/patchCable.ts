// The patch cable on the contact page: a rope of points that hangs, swings and settles, drawn on a canvas. One end stays
// in the console's jack, the other is fixed to the plug. Light can run along it either way. It stops itself when nothing
// is moving, so a page left open costs nothing.

export type Cable = {
  setAnchor: (x: number, y: number) => void;
  setHead: (x: number, y: number) => void;
  setPlugged: (plugged: boolean) => void;
  setFloor: (y: number) => void;
  pulse: (dir: 'up' | 'down', strong?: boolean) => void;
  kick: (amount: number) => void;
  blow: (x: number, y: number) => void;
  resize: (w: number, h: number) => void;
  destroy: () => void;
};

const N = 26;
const STEP = 1 / 120;
const GRAVITY = 1500;
const DAMP = 0.994;
const SOLVES = 10;
const LEAD = 18; // the stiff bit where the cable leaves the plug
const LEAD_JACK = 9; // and where it leaves the jack
const AIR = 46; // how close the cursor has to come to push it
const PULSE_SPAN = 0.07;
const MAX_PULSES = 24;
const MOST_LEAN = (70 * Math.PI) / 180; // a plug on a cable doesn't turn upside down
const CALM_FRAMES = 8; // this many still frames running and it can stop
const RIPPLE = 0.14;

type Options = {
  still: boolean; // animations off: it just hangs where it's put
  onFrame: (x: number, y: number, angle: number) => void; // where the plug should be
  onArrive: (dir: 'up' | 'down', strong: boolean) => void; // light reached the end
};

export function createCable(canvas: HTMLCanvasElement, { still, onFrame, onArrive }: Options): Cable {
  const ctx = canvas.getContext('2d')!;
  const x = new Float32Array(N);
  const y = new Float32Array(N);
  const px = new Float32Array(N);
  const py = new Float32Array(N);
  const anchor = { x: 0, y: 0 };
  const head = { x: 0, y: 0 };
  const pulses: { t: number; dir: 1 | -1; strong: boolean }[] = [];
  let W = 1;
  let H = 1;
  let dpr = 1;
  let width = 7;
  let length = 120;
  let plugged = false;
  let floor = Infinity;
  let angle = 0;
  let lean = 0;
  let placed = false;
  let raf = 0;
  let last = 0;
  let spare = 0;
  let calm = 0;
  let parked = false;
  let moved = false; // the plug or the jack has been moved since the wire last took a step
  let gone = false;
  let onScreen = true;

  // a little slack, always: enough to hang, and less the closer the plug is to the jack, or there's nowhere for it to go
  const wanted = () => {
    const dist = Math.hypot(head.x - anchor.x, head.y - anchor.y);
    return Math.max(30, dist * 1.07 + Math.min(18, dist * 0.18));
  };

  const place = () => {
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      x[i] = px[i] = anchor.x + (head.x - anchor.x) * t;
      y[i] = py[i] = Math.min(floor, anchor.y + (head.y - anchor.y) * t + Math.sin(Math.PI * t) * 26);
    }
    length = wanted();
    placed = true;
  };

  // Both ends are part of something solid: the jack, and the plug. The plug's end follows its axis, so the wire always leaves it straight
  const pin = () => {
    x[0] = anchor.x;
    y[0] = anchor.y;
    x[1] = anchor.x;
    y[1] = anchor.y - LEAD_JACK;
    x[N - 1] = head.x;
    y[N - 1] = head.y;
    x[N - 2] = head.x - Math.sin(angle) * LEAD;
    y[N - 2] = head.y + Math.cos(angle) * LEAD;
  };

  const step = () => {
    // it gives up slack quickly and takes it up gently: spare wire with nowhere to go would bunch into curls
    const want = wanted();
    length += (want - length) * (want < length ? 0.3 : 0.06);
    const seg = length / (N - 1);
    const fall = GRAVITY * STEP * STEP;
    for (let i = 2; i < N - 2; i++) {
      const vx = (x[i] - px[i]) * DAMP;
      const vy = (y[i] - py[i]) * DAMP;
      px[i] = x[i];
      py[i] = y[i];
      x[i] += vx;
      y[i] += vy + fall;
    }
    // the plug hangs off the cable when free, and is square to the panel when in
    lean = plugged ? 0 : Math.max(-MOST_LEAN, Math.min(MOST_LEAN, Math.atan2(head.x - x[N - 4], y[N - 4] - head.y)));
    angle += (lean - angle) * (plugged ? 0.16 : 0.14);
    for (let k = 0; k < SOLVES; k++) {
      pin();
      for (let i = 1; i < N - 2; i++) {
        const dx = x[i + 1] - x[i];
        const dy = y[i + 1] - y[i];
        const d = Math.hypot(dx, dy) || 1;
        const pull = (d - seg) / d;
        // the held points don't give: a free point next to one takes all of the correction
        const a = i === 1 ? 0 : i + 1 === N - 2 ? 1 : 0.5;
        const b = i === 1 ? 1 : i + 1 === N - 2 ? 0 : 0.5;
        x[i] += dx * pull * a;
        y[i] += dy * pull * a;
        x[i + 1] -= dx * pull * b;
        y[i + 1] -= dy * pull * b;
      }
      // it can bend, but not fold: stiffness, from keeping every other point a little apart
      for (let i = 2; i < N - 4; i++) {
        const dx = x[i + 2] - x[i];
        const dy = y[i + 2] - y[i];
        const d = Math.hypot(dx, dy) || 1;
        if (d < seg * 1.93) {
          const push = ((seg * 1.93 - d) / d) * 0.45;
          x[i] -= dx * push;
          y[i] -= dy * push;
          x[i + 2] += dx * push;
          y[i + 2] += dy * push;
        }
      }
      // it lies along the console's top edge rather than falling through it, unless it's being carried down past it;
      // eased, so that it doesn't snap up when the plug comes back over the edge
      if (head.y < floor) {
        for (let i = 2; i < N - 2; i++) {
          if (y[i] > floor) y[i] += (floor - y[i]) * 0.07;
        }
      }
    }
    // a patch cable is stiff: short ripples die away at once, and only the long curves remain
    for (let i = 2; i < N - 2; i++) {
      x[i] += (x[i - 1] + x[i + 1] - 2 * x[i]) * RIPPLE;
      y[i] += (y[i - 1] + y[i + 1] - 2 * y[i]) * RIPPLE;
    }
    pin();
    for (let i = pulses.length - 1; i >= 0; i--) {
      const p = pulses[i];
      p.t += STEP * (p.strong ? 1.15 : 1.7) * p.dir;
      if (p.t > 1 + PULSE_SPAN || p.t < -PULSE_SPAN) {
        pulses.splice(i, 1);
        onArrive(p.dir === 1 ? 'up' : 'down', p.strong);
      }
    }
  };

  const trace = () => {
    ctx.beginPath();
    ctx.moveTo(x[0], y[0]);
    for (let i = 1; i < N - 1; i++) ctx.quadraticCurveTo(x[i], y[i], (x[i] + x[i + 1]) / 2, (y[i] + y[i + 1]) / 2);
    ctx.lineTo(x[N - 1], y[N - 1]);
  };

  const sampleX = (t: number) => {
    const f = Math.max(0, Math.min(1, t)) * (N - 1);
    const i = Math.min(N - 2, Math.floor(f));
    return x[i] + (x[i + 1] - x[i]) * (f - i);
  };
  const sampleY = (t: number) => {
    const f = Math.max(0, Math.min(1, t)) * (N - 1);
    const i = Math.min(N - 2, Math.floor(f));
    return y[i] + (y[i + 1] - y[i]) * (f - i);
  };

  // The wire and the plug are only ever drawn together, from the same numbers
  const draw = () => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // its shadow on what's behind it
    ctx.save();
    ctx.translate(0, 7);
    trace();
    ctx.strokeStyle = 'rgba(1, 4, 26, 0.5)';
    ctx.lineWidth = width + 1;
    ctx.stroke();
    ctx.restore();
    // the jacket, and the light along the top of it
    trace();
    ctx.strokeStyle = '#123aa8';
    ctx.lineWidth = width;
    ctx.stroke();
    trace();
    ctx.strokeStyle = '#2f6bff';
    ctx.lineWidth = width * 0.62;
    ctx.stroke();
    ctx.save();
    ctx.translate(-width * 0.12, -width * 0.14);
    trace();
    ctx.strokeStyle = 'rgba(205, 222, 255, 0.55)';
    ctx.lineWidth = Math.max(1, width * 0.16);
    ctx.stroke();
    ctx.restore();
    // the light running along it
    pulses.forEach((p) => {
      const size = p.strong ? PULSE_SPAN * 1.6 : PULSE_SPAN;
      const from = p.t - size * p.dir;
      ctx.beginPath();
      ctx.moveTo(sampleX(from), sampleY(from));
      for (let k = 1; k <= 5; k++) {
        const t = from + (p.t - from) * (k / 5);
        ctx.lineTo(sampleX(t), sampleY(t));
      }
      ctx.strokeStyle = 'rgba(127, 166, 255, 0.35)';
      ctx.lineWidth = width + (p.strong ? 9 : 6);
      ctx.stroke();
      ctx.strokeStyle = '#eef4ff';
      ctx.lineWidth = Math.max(2, width * 0.5);
      ctx.stroke();
    });
    onFrame(head.x, head.y, (angle * 180) / Math.PI);
  };

  const hangStill = () => {
    angle = 0;
    place();
    pin();
    draw();
  };

  // Still means all of it: the wire at rest, at its full length, with the plug square
  const atRest = () => {
    if (pulses.length) return false;
    if (Math.abs(wanted() - length) > 0.5 || Math.abs(lean - angle) > 0.003) return false;
    let energy = 0;
    for (let i = 2; i < N - 2; i++) energy += Math.abs(x[i] - px[i]) + Math.abs(y[i] - py[i]);
    return energy < 0.6;
  };

  const frame = (now: number) => {
    raf = 0;
    if (gone) return;
    spare = Math.min(0.05, spare + (now - last) / 1000);
    last = now;
    // If the plug has moved the wire takes a step, however short the frame: a frame that moved only the plug would
    // leave the wire behind it. What's borrowed comes off the next frame, so a fast screen doesn't run the cable fast
    if (moved && spare < STEP) {
      step();
      spare = Math.max(-STEP, spare - STEP);
    }
    while (spare >= STEP) {
      step();
      spare -= STEP;
    }
    moved = false;
    draw();
    calm = atRest() ? calm + 1 : 0;
    if (calm >= CALM_FRAMES) return;
    if (onScreen && !document.hidden) raf = requestAnimationFrame(frame);
    else parked = true;
  };

  const rouse = () => {
    calm = 0;
    if (gone || still || raf || !placed) return;
    parked = false;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };

  const seen = new IntersectionObserver(([e]) => {
    onScreen = e.isIntersecting;
    if (onScreen && parked) rouse();
  });
  seen.observe(canvas);
  const onVisible = () => {
    if (!document.hidden && parked) rouse();
  };
  document.addEventListener('visibilitychange', onVisible);

  return {
    setAnchor: (ax, ay) => {
      anchor.x = ax;
      anchor.y = ay;
      moved = true;
      if (!placed) return;
      if (still) hangStill();
      else rouse();
    },
    setHead: (hx, hy) => {
      head.x = hx;
      head.y = hy;
      moved = true;
      if (!placed) place();
      if (still) hangStill();
      else rouse();
    },
    setPlugged: (value) => {
      plugged = value;
      moved = true;
      rouse();
    },
    setFloor: (value) => {
      floor = value;
    },
    pulse: (dir, strong = false) => {
      if (still || pulses.length >= MAX_PULSES) return;
      pulses.push({ t: dir === 'up' ? 0 : 1, dir: dir === 'up' ? 1 : -1, strong });
      rouse();
    },
    kick: (amount) => {
      if (still || !placed) return;
      for (let i = 2; i < N - 2; i++) py[i] += amount * 0.5 * Math.sin((Math.PI * i) / (N - 1));
      rouse();
    },
    blow: (bx, by) => {
      if (still || !placed) return;
      let touched = false;
      for (let i = 2; i < N - 2; i++) {
        const dx = x[i] - bx;
        const dy = y[i] - by;
        const d = Math.hypot(dx, dy);
        if (d < AIR && d > 0.01) {
          const push = ((AIR - d) / d) * 0.1;
          x[i] += dx * push;
          y[i] += dy * push;
          touched = true;
        }
      }
      if (touched) rouse();
    },
    resize: (w, h) => {
      W = w;
      H = h;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      width = w < 640 ? 5 : 7;
      if (placed) {
        // resizing a canvas wipes it, so it's drawn straight away
        draw();
        rouse();
      }
    },
    destroy: () => {
      gone = true;
      if (raf) cancelAnimationFrame(raf);
      seen.disconnect();
      document.removeEventListener('visibilitychange', onVisible);
    },
  };
}
