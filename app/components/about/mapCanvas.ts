// Drawing for the About page's system map: a real orthographic globe that zooms into the office coordinates and
// settles into a blueprint grid, with circuit traces running out from the core. Pure canvas, no DOM.

export const TARGET = { lon: 76.0232, lat: 11.8021 };

const DEG = Math.PI / 180;
const TAU = Math.PI * 2;
const KM_PER_DEG = 111.32;
const EARTH_KM = 12742;
const LEVELS = [30, 10, 5, 1, 0.1, 0.01]; // grid spacing in degrees, finer ones fade in as the camera closes in

// The closest the camera gets: the 0.01° grid lines sit 72px apart
const FINAL_RADIUS = 72 / (0.01 * DEG);
const MIN_VIEW_KM = 16; // ...but never closer than this across the screen, where the imagery would start to blur

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const wrapLon = (lon: number) => ((((lon + 180) % 360) + 360) % 360) - 180;

export type Point = [number, number];
type Box = [number, number, number, number];
export type LandDetail = { box: Box; rings: number[][] };

export type Trace = {
  pts: Point[];
  len: number;
  from: number; // scroll progress where this trace starts drawing
  to: number; // ...and where it reaches its module
  phase: number;
  bus: boolean; // a long line between stops, rather than a short one to a module
  box: Box; // the area it covers, to skip it when the camera is elsewhere
};

export const makeTrace = (pts: Point[], from: number, to: number, phase: number, bus = false): Trace => {
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  const xs = pts.map((pt) => pt[0]);
  const ys = pts.map((pt) => pt[1]);
  return { pts, len, from, to, phase, bus, box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] };
};

export type Frame = {
  w: number;
  h: number;
  z: number; // zoom progress, 0 = whole globe, 1 = on the coordinates
  p: number; // overall scroll progress (drives the traces)
  time: number; // seconds, for the ambient motion
  radius0: number; // globe radius at z = 0
  start: Point; // globe centre at z = 0
  center: Point; // where the coordinates end up (the core's centre)
  land: number[][];
  detail: LandDetail | null;
  font: string;
  spinLon: number; // where the globe faces at rest (drag / auto rotation)
  spinLat: number;
  vector: number; // 0..1 strength of the drawn planet (before the imagery loads, or without WebGL)
  marker: number; // 0..1 visibility of the location marker
  grid: number; // 0..1 overall grid strength
  labels: number; // 0..1 visibility of the lat/long labels
  traces: Trace[];
  pan: Point; // how far the camera has moved across the board
  traceAlpha: number; // 0..1 the board's lines, faded out on the way back to Earth
  active: number; // highlighted trace, or -1
  pulses: boolean;
};

/** Field of view in km at this zoom (the true figure, shown in the readout) */
const fieldOfView = (w: number, radius: number) => Math.min(EARTH_KM, (w / (radius * DEG)) * KM_PER_DEG);

function tracePath(ctx: CanvasRenderingContext2D, pts: Point[], r: number) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) ctx.arcTo(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], r);
  ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
}

function pointAlong(t: Trace, dist: number): Point {
  let left = dist;
  for (let i = 1; i < t.pts.length; i++) {
    const [ax, ay] = t.pts[i - 1];
    const [bx, by] = t.pts[i];
    const seg = Math.hypot(bx - ax, by - ay);
    if (left <= seg) return [ax + ((bx - ax) * left) / seg, ay + ((by - ay) * left) / seg];
    left -= seg;
  }
  return t.pts[t.pts.length - 1];
}

function drawTraces(ctx: CanvasRenderingContext2D, f: Frame) {
  ctx.lineCap = 'round';
  f.traces.forEach((t, i) => {
    const done = clamp01((f.p - t.from) / (t.to - t.from));
    if (done <= 0) return;
    if (t.box[2] + f.pan[0] < -8 || t.box[0] + f.pan[0] > f.w + 8 || t.box[3] + f.pan[1] < -8 || t.box[1] + f.pan[1] > f.h + 8) return;
    const on = i === f.active;

    // the pin on the core
    ctx.fillStyle = on ? '#b9ceff' : 'rgba(127,166,255,0.7)';
    ctx.fillRect(t.pts[0][0] - 1.5, t.pts[0][1] - 1.5, 3, 3);

    // the trace, drawn out by scrolling
    tracePath(ctx, t.pts, 10);
    ctx.lineWidth = on ? 2 : t.bus ? 2 : 1.25;
    ctx.strokeStyle = on ? 'rgba(185,206,255,0.95)' : t.bus ? 'rgba(127,166,255,0.6)' : 'rgba(127,166,255,0.38)';
    ctx.setLineDash([t.len * done * 1.02, t.len * 2]);
    ctx.lineDashOffset = 0;
    ctx.stroke();

    if (done < 1) {
      // bright head while it's still travelling
      const [hx, hy] = pointAlong(t, t.len * done);
      ctx.setLineDash([]);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(hx, hy, 2.5, 0, TAU);
      ctx.fill();
      return;
    }

    // the pad where it meets the module
    const [ex, ey] = t.pts[t.pts.length - 1];
    ctx.setLineDash([]);
    ctx.fillStyle = on ? '#ffffff' : '#7fa6ff';
    ctx.beginPath();
    ctx.arc(ex, ey, on ? 4 : 3, 0, TAU);
    ctx.fill();

    if (!f.pulses) return;
    if (t.bus) {
      // long lines carry a steady stream
      tracePath(ctx, t.pts, 10);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = 'rgba(185,206,255,0.95)';
      ctx.setLineDash([26, 214]);
      ctx.lineDashOffset = -(f.time * 190) % 240;
      ctx.stroke();
      return;
    }

    // data pulses running outward from the core
    const size = on ? 34 : 20;
    const speed = on ? 340 : 130;
    const cycle = t.len + size;
    tracePath(ctx, t.pts, 10);
    ctx.lineWidth = on ? 2.5 : 1.75;
    ctx.strokeStyle = on ? '#ffffff' : 'rgba(185,206,255,0.9)';
    ctx.setLineDash([size, cycle * 2]);
    ctx.lineDashOffset = -(((f.time * speed + t.phase * cycle) % cycle) - size);
    ctx.stroke();
  });
  ctx.setLineDash([]);
}

/** The camera for this frame, shared by the drawn layer and the WebGL earth */
export function viewOf(f: Pick<Frame, 'w' | 'z' | 'radius0' | 'start' | 'center' | 'spinLon' | 'spinLat'>) {
  const { z } = f;
  const eased = z * z * (3 - 2 * z);
  const final = Math.min(FINAL_RADIUS, f.w / ((MIN_VIEW_KM / KM_PER_DEG) * DEG));
  const R = f.radius0 * Math.pow(final / f.radius0, eased);
  const move = smooth(0, 0.3, z);
  // Wherever the globe has been spun to, it turns the short way round to face the coordinates as the zoom begins
  const turn = smooth(0, 0.34, z);
  const toTarget = wrapLon(TARGET.lon - f.spinLon);
  return {
    R,
    fov: fieldOfView(f.w, R),
    cx: lerp(f.start[0], f.center[0], move),
    cy: lerp(f.start[1], f.center[1], move),
    lon0: wrapLon(f.spinLon + toTarget * turn), // always -180..180, however far the globe has been spun
    lat0: lerp(f.spinLat, TARGET.lat, turn),
  };
}

export function drawMap(ctx: CanvasRenderingContext2D, f: Frame) {
  const { w, h, z, time } = f;
  ctx.clearRect(0, 0, w, h);

  const { R, fov, cx, cy, lon0, lat0 } = viewOf(f);
  const sp0 = Math.sin(lat0 * DEG);
  const cp0 = Math.cos(lat0 * DEG);

  const diag = Math.hypot(w, h);

  // ---- The planet's body and atmosphere (gone once we're far inside it) ----
  const body = (1 - smooth(diag * 1.2, diag * 5, R)) * f.vector;
  if (body > 0.01) {
    const air = ctx.createRadialGradient(cx, cy, R * 0.94, cx, cy, R * 1.16);
    air.addColorStop(0, 'rgba(59,123,247,0)');
    air.addColorStop(0.3, `rgba(59,123,247,${0.3 * body})`);
    air.addColorStop(1, 'rgba(59,123,247,0)');
    ctx.fillStyle = air;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 1.16, 0, TAU);
    ctx.fill();

    const sphere = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.1, cx, cy, R);
    sphere.addColorStop(0, `rgba(1,68,181,${0.42 * body})`);
    sphere.addColorStop(1, `rgba(1,20,80,${0.3 * body})`);
    ctx.fillStyle = sphere;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = `rgba(127,166,255,${0.4 * body})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // ---- Latitude / longitude grid ----
  const far = Math.max(Math.hypot(cx, cy), Math.hypot(w - cx, cy), Math.hypot(cx, h - cy), Math.hypot(w - cx, h - cy));
  const win = Math.min(90, (far / (R * DEG)) * 1.15); // degrees from the centre to just past the farthest corner
  const whole = win >= 60;
  const latMin = Math.max(-90, lat0 - win);
  const latMax = Math.min(90, lat0 + win);
  const lonWin = whole ? 180 : win / Math.max(0.2, cp0);
  const samples = whole ? 72 : 10;

  for (const step of LEVELS) {
    const gap = step * DEG * R;
    const alpha = smooth(26, 90, gap) * (1 - smooth(1800, 5000, gap)) * f.grid;
    if (alpha < 0.01) continue;
    ctx.beginPath();
    const line = (lonA: number, latA: number, lonB: number, latB: number) => {
      let pen = false;
      for (let s = 0; s <= samples; s++) {
        const k = s / samples;
        const l = (lerp(lonA, lonB, k) - lon0) * DEG;
        const p = lerp(latA, latB, k) * DEG;
        const cosP = Math.cos(p);
        const sinP = Math.sin(p);
        const cosL = Math.cos(l);
        if (sp0 * sinP + cp0 * cosP * cosL < 0) {
          pen = false;
          continue;
        }
        const x = cx + R * cosP * Math.sin(l);
        const y = cy - R * (cp0 * sinP - sp0 * cosP * cosL);
        if (pen) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
        pen = true;
      }
    };
    for (let i = Math.ceil(latMin / step); i <= Math.floor(latMax / step); i++) line(lon0 - lonWin, i * step, lon0 + lonWin, i * step);
    for (let i = Math.ceil((lon0 - lonWin) / step); i <= Math.floor((lon0 + lonWin) / step); i++) line(i * step, latMin, i * step, latMax);
    ctx.lineWidth = 1;
    ctx.strokeStyle = `rgba(127,166,255,${alpha * 0.17})`;
    ctx.stroke();
  }

  // ---- Land: the world outline from afar, then a high-detail coast of the region as the camera closes in ----
  const drawLand = (rings: number[][], alpha: number, box?: Box) => {
    if (alpha < 0.01 || !rings.length) return;
    const coast = new Path2D();
    ctx.fillStyle = `rgba(127,166,255,${0.2 * alpha})`;
    for (const ring of rings) {
      const fill = new Path2D();
      let seen = false;
      let pen = false;
      for (let i = 0; i < ring.length; i += 2) {
        const lon = ring[i];
        const lat = ring[i + 1];
        const l = (lon - lon0) * DEG;
        const p = lat * DEG;
        const cosP = Math.cos(p);
        const sinP = Math.sin(p);
        const cosL = Math.cos(l);
        const x = cosP * Math.sin(l);
        const y = cp0 * sinP - sp0 * cosP * cosL;
        let sx: number;
        let sy: number;
        if (sp0 * sinP + cp0 * cosP * cosL >= 0) {
          sx = cx + R * x;
          sy = cy - R * y;
          // the clip window's own edges are not coastline
          const cut = !!box && i > 0 && ((lon === ring[i - 2] && (lon === box[0] || lon === box[2])) || (lat === ring[i - 1] && (lat === box[1] || lat === box[3])));
          if (pen && !cut) coast.lineTo(sx, sy);
          else coast.moveTo(sx, sy);
          pen = true;
          seen = true;
        } else {
          // behind the horizon: pin it to the globe's edge so the land's fill still closes properly
          const n = Math.hypot(x, y) || 1;
          sx = cx + (R * x) / n;
          sy = cy - (R * y) / n;
          pen = false;
        }
        if (i === 0) fill.moveTo(sx, sy);
        else fill.lineTo(sx, sy);
      }
      if (seen) {
        fill.closePath();
        ctx.fill(fill);
      }
    }
    ctx.strokeStyle = `rgba(157,187,255,${0.65 * alpha})`;
    ctx.lineWidth = 1;
    ctx.stroke(coast);
  };
  const span = win / 1.15; // degrees from the centre to the farthest corner of the view
  const closeUp = 1 - smooth(11, 17, span);
  drawLand(f.land, (1 - closeUp) * f.vector);
  if (f.detail) drawLand(f.detail.rings, closeUp * smooth(0.8, 1.7, span) * f.vector, f.detail.box);

  // ---- Lat / long labels on the edges once we're close ----
  if (f.labels > 0.01 && win < 20) {
    const step = LEVELS.find((s) => s * DEG * R >= 95);
    if (step) {
      const decimals = step >= 1 ? 0 : step >= 0.1 ? 1 : 2;
      ctx.font = f.font;
      ctx.fillStyle = `rgba(157,187,255,${0.55 * f.labels * smooth(95, 150, step * DEG * R)})`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'right';
      for (let i = Math.ceil(latMin / step); i <= Math.floor(latMax / step); i++) {
        const y = cy - R * (i * step - lat0) * DEG;
        if (y > 24 && y < h - 16) ctx.fillText(`${Math.abs(i * step).toFixed(decimals)}°${i * step >= 0 ? 'N' : 'S'}`, w - 10, y);
      }
      ctx.textAlign = 'center';
      for (let i = Math.ceil((lon0 - lonWin) / step); i <= Math.floor((lon0 + lonWin) / step); i++) {
        const x = cx + R * cp0 * (i * step - lon0) * DEG;
        if (x > 30 && x < w - 60) ctx.fillText(`${Math.abs(i * step).toFixed(decimals)}°${i * step >= 0 ? 'E' : 'W'}`, x, h - 12);
      }
    }
  }

  // ---- The location marker ----
  const l = (TARGET.lon - lon0) * DEG;
  const p = TARGET.lat * DEG;
  const tx = cx + R * Math.cos(p) * Math.sin(l);
  const ty = cy - R * (cp0 * Math.sin(p) - sp0 * Math.cos(p) * Math.cos(l));
  const facing = smooth(0, 0.14, sp0 * Math.sin(p) + cp0 * Math.cos(p) * Math.cos(l));
  if (f.marker * facing > 0.01) {
    ctx.globalAlpha = f.marker * facing;
    // crosshair across the view as the camera locks on
    const lock = smooth(0.25, 0.5, z);
    if (lock > 0.01) {
      ctx.strokeStyle = `rgba(157,187,255,${0.28 * lock})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, ty);
      ctx.lineTo(tx - 26, ty);
      ctx.moveTo(tx + 26, ty);
      ctx.lineTo(w, ty);
      ctx.moveTo(tx, 0);
      ctx.lineTo(tx, ty - 26);
      ctx.moveTo(tx, ty + 26);
      ctx.lineTo(tx, h);
      ctx.stroke();
    }
    const bracket = smooth(0.68, 0.9, z);
    if (bracket > 0.01) {
      const d = lerp(240, 74, smooth(0.68, 1, z));
      const arm = 22;
      ctx.strokeStyle = `rgba(185,206,255,${0.9 * bracket})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        ctx.moveTo(tx + sx * d, ty + sy * (d - arm));
        ctx.lineTo(tx + sx * d, ty + sy * d);
        ctx.lineTo(tx + sx * (d - arm), ty + sy * d);
      }
      ctx.stroke();
    }
    for (let i = 0; i < 2; i++) {
      const k = (time * 0.6 + i * 0.5) % 1;
      ctx.strokeStyle = `rgba(185,206,255,${(1 - k) * 0.75})`;
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.arc(tx, ty, 5 + k * 26, 0, TAU);
      ctx.stroke();
    }
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(tx, ty, 3.5, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  if (f.traces.length && f.traceAlpha > 0.01) {
    ctx.save();
    ctx.globalAlpha = f.traceAlpha;
    ctx.translate(f.pan[0], f.pan[1]);
    drawTraces(ctx, f);
    ctx.restore();
  }

  return { fov, tx, ty, facing };
}
