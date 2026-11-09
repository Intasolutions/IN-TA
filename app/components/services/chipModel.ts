// The solid parts of the scene: one circuit board, its modules and their lids, and everything printed on it.
// All of it is generated here: nothing is downloaded.

import { AI_BLOCK, ALL_BLOCKS, BLOCKS, BOARD, centreOf, LINKS, nameOf, WEB_TILES, type Block, type Names, type Point } from './floorplan';

/** How tall a closed lid stands */
export const LID_TOP = 0.03;

type Colour = [number, number, number];
type Rect = [number, number, number, number];

class MeshBuilder {
  data: number[] = [];

  private vert(x: number, y: number, z: number, n: [number, number, number], c: Colour, metal: number) {
    this.data.push(x, y, z, n[0], n[1], n[2], c[0], c[1], c[2], metal);
  }

  private quad(a: number[], b: number[], c: number[], d: number[], n: [number, number, number], col: Colour, metal: number) {
    [a, b, c, a, c, d].forEach((p) => this.vert(p[0], p[1], p[2], n, col, metal));
  }

  box(cx: number, cy: number, cz: number, hx: number, hy: number, hz: number, col: Colour, metal: number) {
    const x0 = cx - hx;
    const x1 = cx + hx;
    const y0 = cy - hy;
    const y1 = cy + hy;
    const z0 = cz - hz;
    const z1 = cz + hz;
    this.quad([x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1], [0, 1, 0], col, metal);
    this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], col, metal);
    this.quad([x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [0, 0, -1], col, metal);
    this.quad([x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0], [1, 0, 0], col, metal);
    this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], col, metal);
  }

  /** A rounded rectangle with a real bevel on its top edge, so that the edge catches the light */
  slab(ox: number, oz: number, hx: number, hz: number, y0: number, y1: number, radius: number, bevel: number, col: Colour, metal: number, corner = 8, bevelSteps = 4) {
    const outline = (inset: number) => {
      const pts: { x: number; z: number; nx: number; nz: number }[] = [];
      const r = Math.max(0.0005, radius - inset);
      const cx = hx - radius;
      const cz = hz - radius;
      [
        [cx, cz, 0],
        [-cx, cz, Math.PI / 2],
        [-cx, -cz, Math.PI],
        [cx, -cz, (3 * Math.PI) / 2],
      ].forEach(([px, pz, start]) => {
        for (let i = 0; i <= corner; i++) {
          const a = start + (i / corner) * (Math.PI / 2);
          const nx = Math.cos(a);
          const nz = Math.sin(a);
          pts.push({ x: ox + px + nx * r, z: oz + pz + nz * r, nx, nz });
        }
      });
      return pts;
    };
    const rings: { pts: ReturnType<typeof outline>; y: number; up: number }[] = [
      { pts: outline(0), y: y0, up: 0 },
      { pts: outline(0), y: y1 - bevel, up: 0 },
    ];
    for (let i = 1; i <= bevelSteps; i++) {
      const a = (i / bevelSteps) * (Math.PI / 2);
      rings.push({ pts: outline(bevel * (1 - Math.cos(a))), y: y1 - bevel + bevel * Math.sin(a), up: a });
    }
    for (let r = 0; r < rings.length - 1; r++) {
      const A = rings[r];
      const B = rings[r + 1];
      const n = A.pts.length;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const normal = (p: { nx: number; nz: number }, up: number): [number, number, number] => [p.nx * Math.cos(up), Math.sin(up), p.nz * Math.cos(up)];
        this.vert(A.pts[i].x, A.y, A.pts[i].z, normal(A.pts[i], A.up), col, metal);
        this.vert(A.pts[j].x, A.y, A.pts[j].z, normal(A.pts[j], A.up), col, metal);
        this.vert(B.pts[j].x, B.y, B.pts[j].z, normal(B.pts[j], B.up), col, metal);
        this.vert(A.pts[i].x, A.y, A.pts[i].z, normal(A.pts[i], A.up), col, metal);
        this.vert(B.pts[j].x, B.y, B.pts[j].z, normal(B.pts[j], B.up), col, metal);
        this.vert(B.pts[i].x, B.y, B.pts[i].z, normal(B.pts[i], B.up), col, metal);
      }
    }
    const top = rings[rings.length - 1];
    for (let i = 0; i < top.pts.length; i++) {
      const j = (i + 1) % top.pts.length;
      this.vert(ox, top.y, oz, [0, 1, 0], col, metal);
      this.vert(top.pts[i].x, top.y, top.pts[i].z, [0, 1, 0], col, metal);
      this.vert(top.pts[j].x, top.y, top.pts[j].z, [0, 1, 0], col, metal);
    }
  }
}

const seeded = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
};

const NAVY: Colour = [0.012, 0.03, 0.1];
const NAVY_LIFT: Colour = [0.03, 0.07, 0.2];
const SILVER: Colour = [0.72, 0.78, 0.9];
const WHITE: Colour = [0.9, 0.92, 0.96];
const SLATE: Colour = [0.05, 0.08, 0.18];

const inRect = (x: number, z: number, r: Rect, pad = 0) => x > r[0] - pad && x < r[2] + pad && z > r[1] - pad && z < r[3] + pad;
const nearLink = (x: number, z: number, reach: number) =>
  LINKS.some(({ path }) =>
    path.slice(1).some((b, i) => {
      const a = path[i];
      const sx = b[0] - a[0];
      const sz = b[1] - a[1];
      const t = Math.max(0, Math.min(1, ((x - a[0]) * sx + (z - a[1]) * sz) / (sx * sx + sz * sz || 1)));
      return Math.hypot(x - a[0] - sx * t, z - a[1] - sz * t) < reach;
    }),
  );

/** The large parts mounted round the edge of the board: x, z, half width, half depth, height */
const EDGE_PARTS: [number, number, number, number, number][] = [
  [0, -1.2, 0.46, 0.035, 0.05],
  [-0.72, -1.2, 0.2, 0.035, 0.05],
  [0.72, -1.2, 0.2, 0.035, 0.05],
  [-1.2, -0.56, 0.035, 0.24, 0.05],
  [-1.2, 0.56, 0.035, 0.24, 0.05],
  [1.2, -0.62, 0.035, 0.2, 0.05],
  [1.2, 0.62, 0.035, 0.26, 0.05],
  [0, 1.2, 0.4, 0.035, 0.05],
];

/** The board, every module's body, and the parts fixed to the board */
export function buildFixed(small: boolean) {
  const m = new MeshBuilder();
  const rand = seeded(11);
  const top = BOARD.top;

  // the board
  m.slab(0, 0, BOARD.half, BOARD.half, BOARD.bottom, top - 0.0008, BOARD.corner, 0.008, WHITE, 0.05, 6, 3);

  // each module's body, standing on the board
  ALL_BLOCKS.forEach((b) => {
    const [cx, cz] = centreOf(b);
    const hx = (b.rect[2] - b.rect[0]) / 2 + 0.017;
    const hz = (b.rect[3] - b.rect[1]) / 2 + 0.017;
    m.slab(cx, cz, hx, hz, top, -0.0006, 0.022, 0.008, b.kind === 'yours' ? NAVY_LIFT : NAVY, 0.7, 6, 3);
  });

  // the empty socket's latches
  const yr = ALL_BLOCKS.find((b) => b.kind === 'yours')!.rect;
  const [ycx, ycz] = [(yr[0] + yr[2]) / 2, (yr[1] + yr[3]) / 2];
  m.box(ycx, 0.006, yr[1] - 0.012, 0.09, 0.006, 0.006, SILVER, 1);
  m.box(ycx, 0.006, yr[3] + 0.012, 0.09, 0.006, 0.006, SILVER, 1);
  m.box(yr[0] - 0.012, 0.006, ycz, 0.006, 0.006, 0.07, SILVER, 1);
  m.box(yr[2] + 0.012, 0.006, ycz, 0.006, 0.006, 0.07, SILVER, 1);

  // tiny parts packed along each module's sides, wherever the copper leaves room
  const step = small ? 0.05 : 0.036;
  ALL_BLOCKS.forEach((b) => {
    const r = b.rect;
    const place = (x: number, z: number, along: 'x' | 'z') => {
      if (rand() < 0.42 || nearLink(x, z, 0.036)) return;
      if (ALL_BLOCKS.some((o) => inRect(x, z, o.rect, 0.022))) return;
      const hx = along === 'x' ? 0.011 : 0.006;
      const hz = along === 'x' ? 0.006 : 0.011;
      m.box(x, top + 0.005, z, hx, 0.005, hz, SLATE, 0.3);
      if (along === 'x') {
        m.box(x - hx, top + 0.0052, z, 0.0026, 0.0052, hz, SILVER, 1);
        m.box(x + hx, top + 0.0052, z, 0.0026, 0.0052, hz, SILVER, 1);
      } else {
        m.box(x, top + 0.0052, z - hz, hx, 0.0052, 0.0026, SILVER, 1);
        m.box(x, top + 0.0052, z + hz, hx, 0.0052, 0.0026, SILVER, 1);
      }
    };
    for (let x = r[0]; x <= r[2]; x += step) {
      place(x, r[1] - 0.045, 'x');
      place(x, r[3] + 0.045, 'x');
    }
    for (let z = r[1]; z <= r[3]; z += step) {
      place(r[0] - 0.045, z, 'z');
      place(r[2] + 0.045, z, 'z');
    }
  });

  // connectors round the edge, with their pins
  EDGE_PARTS.forEach(([x, z, hx, hz, h]) => {
    m.box(x, top + h / 2, z, hx, h / 2, hz, SLATE, 0.5);
    const wide = hx > hz;
    const count = Math.round((wide ? hx : hz) / 0.016);
    for (let i = 0; i < count; i++) {
      const a = ((i + 0.5) / count) * 2 - 1;
      const px = wide ? x + a * hx : x + (x < 0 ? hz + 0.012 : -hz - 0.012);
      const pz = wide ? z + (z < 0 ? hz + 0.012 : -hz - 0.012) : z + a * hz;
      m.box(px, top + 0.004, pz, wide ? 0.005 : 0.012, 0.003, wide ? 0.012 : 0.005, SILVER, 1);
    }
  });

  // mounting holes, in a ring of metal
  const hole = BOARD.half - 0.075;
  [[-hole, -hole], [hole, -hole], [-hole, hole], [hole, hole]].forEach(([x, z]) => {
    m.slab(x, z, 0.034, 0.034, top, top + 0.012, 0.034, 0.005, SILVER, 1, 6, 2);
    m.slab(x, z, 0.016, 0.016, top + 0.012, top + 0.0128, 0.016, 0.0004, NAVY, 0.4, 6, 1);
  });

  return new Float32Array(m.data);
}

export type LidRange = { block: Block; first: number; count: number; hx: number; hz: number; cell: [number, number, number, number] };

/** Each part's metal lid, in its own space: they come off in one piece. Each has a place on the sheet of printing. */
export function buildLids(): { data: Float32Array; ranges: LidRange[] } {
  const m = new MeshBuilder();
  const ranges: LidRange[] = [];
  const lids = [...BLOCKS, AI_BLOCK];
  lids.forEach((block, i) => {
    const first = m.data.length / 10;
    const hx = (block.rect[2] - block.rect[0]) / 2 + 0.006;
    const hz = (block.rect[3] - block.rect[1]) / 2 + 0.006;
    m.slab(0, 0, hx, hz, 0, LID_TOP, 0.02, 0.007, [0.012, 0.028, 0.095], 1, 6, 3);
    ranges.push({ block, first, count: m.data.length / 10 - first, hx, hz, cell: [(i % 3) / 3, Math.floor(i / 3) / 3, 1 / 3, 1 / 3] });
  });
  return { data: new Float32Array(m.data), ranges };
}

/** Splits a name into at most `max` lines that fit `room` at the largest size that allows it */
function fitLines(g: CanvasRenderingContext2D, text: string, font: (px: number) => string, start: number, room: number, max: number) {
  const words = text.split(/\s+/).filter(Boolean);
  for (let fs = start; fs > 4; fs *= 0.92) {
    g.font = font(fs);
    const lines: string[] = [];
    for (const word of words) {
      const line = lines.length ? `${lines[lines.length - 1]} ${word}` : word;
      if (lines.length && g.measureText(line).width <= room) lines[lines.length - 1] = line;
      else lines.push(word);
    }
    if (lines.length <= max && lines.every((l) => g.measureText(l).width <= room)) return { fs, lines };
  }
  return { fs: 4, lines: [text] };
}

/** What's printed on the lids: the name of each part (from the admin). The centre one carries its service's full title. */
export function drawLidPrint(size: number, display: string, mono: string, aiName: string, names: Names) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext('2d')!;
  g.clearRect(0, 0, size, size);
  g.fillStyle = '#fff';
  const cell = size / 3;
  [...BLOCKS, AI_BLOCK].forEach((block, i) => {
    const ox = (i % 3) * cell;
    const oy = Math.floor(i / 3) * cell;
    const w = (block.rect[2] - block.rect[0]) * 1000;
    const h = (block.rect[3] - block.rect[1]) * 1000;
    g.save();
    g.beginPath();
    g.rect(ox, oy, cell, cell);
    g.clip();
    g.translate(ox, oy);
    // (drawn in the lid's own proportions, so that the letters aren't stretched on a lid that isn't square)
    g.scale(cell / w, cell / h);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const isAi = block.kind === 'ai';
    if (isAi) {
      // the full name, on up to three lines, centred a little above the middle
      const { fs, lines } = fitLines(g, aiName.toUpperCase(), (px) => `800 ${px}px ${display}`, h * 0.13, w * 0.84, 3);
      const lead = fs * 1.08;
      lines.forEach((line, n) => g.fillText(line, w / 2, h * 0.43 + (n - (lines.length - 1) / 2) * lead));
    } else {
      let fs = h * 0.17;
      const label = nameOf(block, names).toUpperCase();
      g.font = `800 ${fs}px ${display}`;
      const room = w * 0.84;
      const width = g.measureText(label).width;
      if (width > room) fs *= room / width;
      g.font = `800 ${fs}px ${display}`;
      g.fillText(label, w / 2, h * 0.46);
    }
    g.font = `600 ${Math.min(w, h) * 0.05}px ${mono}`;
    g.fillText(block.part.toUpperCase(), w / 2, isAi ? h * 0.72 : h * 0.62);
    // the mark for pin one
    g.beginPath();
    g.moveTo(w * 0.045, h * 0.05);
    g.lineTo(w * 0.085, h * 0.05);
    g.lineTo(w * 0.045, h * 0.05 + w * 0.04);
    g.closePath();
    g.fill();
    g.restore();
  });
  return canvas;
}

const INK = '#01072b';
const COPPER = '#0a2a80';
const BRAND = '#0144b5';
const SOFT = '#9dbbff';

/** The board's printing, drawn once. The art is what you see; the flow says, for the signals, how far along each trace a point is. */
export function drawBoardArt(size: number, flowSize: number, display: string, mono: string, names: Names) {
  const art = document.createElement('canvas');
  art.width = size;
  art.height = size;
  const flow = document.createElement('canvas');
  flow.width = flowSize;
  flow.height = flowSize;
  const A = art.getContext('2d')!;
  const F = flow.getContext('2d')!;
  const half = BOARD.half;
  const S = size / (2 * half);
  const FS = flowSize / (2 * half);
  const ax = (v: number) => (v + half) * S;
  const fx = (v: number) => (v + half) * FS;
  const rand = seeded(29);

  A.fillStyle = '#f6f8fd';
  A.fillRect(0, 0, size, size);
  F.fillStyle = '#000';
  F.fillRect(0, 0, flowSize, flowSize);
  [A, F].forEach((g) => {
    g.lineCap = 'round';
    g.lineJoin = 'round';
  });

  // the faint dots of the solder mask
  A.fillStyle = '#dfe6f4';
  for (let x = -half + 0.04; x < half; x += 0.05) {
    for (let z = -half + 0.04; z < half; z += 0.05) A.fillRect(ax(x) - 0.0016 * S, ax(z) - 0.0016 * S, 0.0032 * S, 0.0032 * S);
  }

  const hitsPart = (x: number, z: number) => ALL_BLOCKS.some((b) => inRect(x, z, b.rect, 0.024));

  const trace = (points: Point[], width: number, colour: string, carries = true) => {
    A.strokeStyle = colour;
    A.lineWidth = width * S;
    A.beginPath();
    points.forEach(([x, z], i) => (i ? A.lineTo(ax(x), ax(z)) : A.moveTo(ax(x), ax(z))));
    A.stroke();
    if (!carries) return;
    const id = Math.floor(rand() * 255);
    let total = 0;
    for (let i = 1; i < points.length; i++) total += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
    let walked = 0;
    F.lineWidth = Math.max(width * FS, 1.4);
    for (let i = 1; i < points.length; i++) {
      const [x0, z0] = points[i - 1];
      const [x1, z1] = points[i];
      const len = Math.hypot(x1 - x0, z1 - z0);
      const steps = Math.max(1, Math.round(len / 0.03));
      for (let k = 0; k < steps; k++) {
        const t0 = k / steps;
        const t1 = (k + 1) / steps;
        F.strokeStyle = `rgb(255,${Math.round(((walked + len * t0) / total) * 255)},${id})`;
        F.beginPath();
        F.moveTo(fx(x0 + (x1 - x0) * t0), fx(z0 + (z1 - z0) * t0));
        F.lineTo(fx(x0 + (x1 - x0) * t1), fx(z0 + (z1 - z0) * t1));
        F.stroke();
      }
      walked += len;
    }
  };
  const via = (x: number, z: number, r = 0.0065) => {
    A.fillStyle = COPPER;
    A.beginPath();
    A.arc(ax(x), ax(z), r * S, 0, Math.PI * 2);
    A.fill();
    A.fillStyle = '#f6f8fd';
    A.beginPath();
    A.arc(ax(x), ax(z), r * 0.42 * S, 0, Math.PI * 2);
    A.fill();
  };

  // ---- Thin copper fanning out from each module to the edge of the board ----
  const fan = (block: Block, side: 'top' | 'bottom' | 'left' | 'right', count: number) => {
    const [x0, z0, x1, z1] = block.rect;
    const edge = half - 0.1;
    for (let i = 0; i < count; i++) {
      const a = (i + 0.5) / count;
      const end = 0.05 + rand() * 0.012;
      const jog = (i % 7) * 0.006 * (a < 0.5 ? -1 : 1);
      let pts: Point[];
      if (side === 'top' || side === 'bottom') {
        const x = x0 + (x1 - x0) * (0.08 + a * 0.84);
        const zs = side === 'top' ? z0 : z1;
        const dir = side === 'top' ? -1 : 1;
        pts = [[x, zs + dir * 0.02], [x, zs + dir * (0.05 + Math.abs(jog))], [x + jog * 2, zs + dir * (0.05 + Math.abs(jog) * 3)], [x + jog * 2, dir * (edge - end)]];
      } else {
        const z = z0 + (z1 - z0) * (0.08 + a * 0.84);
        const xs = side === 'left' ? x0 : x1;
        const dir = side === 'left' ? -1 : 1;
        pts = [[xs + dir * 0.02, z], [xs + dir * (0.05 + Math.abs(jog)), z], [xs + dir * (0.05 + Math.abs(jog) * 3), z + jog * 2], [dir * (edge - end), z + jog * 2]];
      }
      trace(pts, 0.0032, i % 5 === 0 ? BRAND : COPPER);
      const tip = pts[pts.length - 1];
      via(tip[0], tip[1], 0.0052);
    }
  };
  const parts = Object.fromEntries(ALL_BLOCKS.map((b) => [b.kind, b])) as Record<Block['kind'], Block>;
  fan(parts.software, 'top', 22);
  fan(parts.ui, 'top', 26);
  fan(parts.web, 'top', 22);
  fan(parts.software, 'left', 14);
  fan(parts.yours, 'left', 9);
  fan(parts.mobile, 'left', 18);
  fan(parts.web, 'right', 16);
  fan(parts.marketing, 'right', 11);
  fan(parts.seo, 'right', 14);
  fan(parts.mobile, 'bottom', 18);
  fan(parts.media, 'bottom', 22);
  fan(parts.seo, 'bottom', 18);

  // ---- Short runs filling the channels between the parts ----
  for (let i = 0; i < 260; i++) {
    const x = (rand() * 2 - 1) * (half - 0.14);
    const z = (rand() * 2 - 1) * (half - 0.14);
    const flat = rand() < 0.5;
    const l1 = 0.02 + rand() * 0.07;
    const sign = rand() < 0.5 ? -1 : 1;
    const j = 0.012 + rand() * 0.018;
    const pts: Point[] = flat ? [[x, z], [x + l1, z], [x + l1 + j, z + sign * j], [x + l1 + j + l1 * 0.6, z + sign * j]] : [[x, z], [x, z + l1], [x + sign * j, z + l1 + j], [x + sign * j, z + l1 + j + l1 * 0.6]];
    if (pts.some(([a, b]) => hitsPart(a, b) || nearLink(a, b, 0.038) || Math.abs(a) > half - 0.11 || Math.abs(b) > half - 0.11)) continue;
    trace(pts, 0.0028, SOFT, false);
    via(pts[0][0], pts[0][1], 0.0046);
    via(pts[3][0], pts[3][1], 0.0046);
  }

  // ---- The heavy copper joining the parts: each link a ribbon of parallel traces ----
  LINKS.forEach(({ path }) => {
    const LINES = 7;
    for (let k = 0; k < LINES; k++) {
      const off = (k - (LINES - 1) / 2) * 0.0088;
      const shifted: Point[] = path.map((p, i) => {
        const a = path[Math.max(0, i - 1)];
        const b = path[Math.min(path.length - 1, i + 1)];
        const dx = b[0] - a[0];
        const dz = b[1] - a[1];
        const l = Math.hypot(dx, dz) || 1;
        return [p[0] - (dz / l) * off, p[1] + (dx / l) * off];
      });
      trace(shifted, 0.0044, k === (LINES - 1) / 2 ? BRAND : COPPER);
    }
  });

  // ---- Pads under each module's edge, its outline and its name in white-board print ----
  ALL_BLOCKS.forEach((b, n) => {
    const [x0, z0, x1, z1] = b.rect;
    A.fillStyle = '#b9c7e6';
    for (let x = x0 + 0.01; x < x1; x += 0.02) {
      A.fillRect(ax(x) - 0.0035 * S, ax(z0 - 0.0235) - 0.0035 * S, 0.007 * S, 0.007 * S);
      A.fillRect(ax(x) - 0.0035 * S, ax(z1 + 0.0235) - 0.0035 * S, 0.007 * S, 0.007 * S);
    }
    for (let z = z0 + 0.01; z < z1; z += 0.02) {
      A.fillRect(ax(x0 - 0.0235) - 0.0035 * S, ax(z) - 0.0035 * S, 0.007 * S, 0.007 * S);
      A.fillRect(ax(x1 + 0.0235) - 0.0035 * S, ax(z) - 0.0035 * S, 0.007 * S, 0.007 * S);
    }
    A.fillStyle = INK;
    A.textBaseline = 'alphabetic';
    A.textAlign = 'left';
    A.font = `700 ${0.021 * S}px ${mono}`;
    A.fillText(`U${n + 1}  ${nameOf(b, names).toUpperCase()}`, ax(x0), ax(z0 - 0.036));
  });

  // ---- The maker's name, and the marks a real board carries ----
  A.fillStyle = INK;
  A.textAlign = 'left';
  A.font = `800 ${0.05 * S}px ${display}`;
  A.fillText('IN-TA SOLUTIONS', ax(-half + 0.14), ax(half - 0.09));
  A.font = `600 ${0.022 * S}px ${mono}`;
  A.fillText('ONE BOARD // EIGHT PARTS // ONE EMPTY SOCKET', ax(-half + 0.14), ax(half - 0.058));
  [[-half + 0.05, 0], [half - 0.05, 0], [0, -half + 0.05], [0, half - 0.05]].forEach(([x, z]) => {
    A.strokeStyle = INK;
    A.lineWidth = 0.002 * S;
    A.beginPath();
    A.arc(ax(x), ax(z), 0.012 * S, 0, Math.PI * 2);
    A.stroke();
    A.beginPath();
    A.moveTo(ax(x - 0.018), ax(z));
    A.lineTo(ax(x + 0.018), ax(z));
    A.moveTo(ax(x), ax(z - 0.018));
    A.lineTo(ax(x), ax(z + 0.018));
    A.stroke();
  });

  return { art, flow };
}

/** The soft shadow each thing standing on the board casts on it, drawn once. The light comes from the far left. */
export function drawShadows(size: number) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#fff';
  g.fillRect(0, 0, size, size);
  const half = BOARD.half;
  const S = size / (2 * half);
  const px = (v: number) => (v + half) * S;
  const cast = (x0: number, z0: number, x1: number, z1: number, h: number, strength: number) => {
    const out = size * 2;
    g.shadowColor = `rgba(4,18,70,${strength})`;
    g.shadowBlur = (0.012 + h * 1.5) * S;
    g.shadowOffsetX = out + h * 1.1 * S;
    g.shadowOffsetY = h * 1.05 * S;
    g.fillStyle = '#000';
    g.fillRect(px(x0) - out, px(z0), (x1 - x0) * S, (z1 - z0) * S);
  };
  ALL_BLOCKS.forEach((b) => cast(b.rect[0] - 0.012, b.rect[1] - 0.012, b.rect[2] + 0.012, b.rect[3] + 0.012, 0.05, 0.62));
  EDGE_PARTS.forEach(([x, z, hx, hz, h]) => cast(x - hx, z - hz, x + hx, z + hz, h, 0.5));
  return canvas;
}

/** The links between the web block's pages */
export function buildWebArcs() {
  const lines: number[] = [];
  const links = [[0, 1], [0, 2], [0, 3], [0, 4], [1, 2], [3, 4], [1, 3], [2, 4], [0, 1], [0, 2], [0, 3], [0, 4]];
  const rand = seeded(5);
  links.forEach(([a, b]) => {
    const A = WEB_TILES[a];
    const B = WEB_TILES[b];
    const lift = 0.05 + Math.hypot(A[0] - B[0], A[1] - B[1]) * 0.42;
    lines.push(A[0], 0.05, A[1], B[0], 0.05, B[1], rand(), lift);
  });
  return new Float32Array(lines);
}

const LAYERS = [4, 7, 9, 7, 3];

/** The neural network that rises over the AI part */
export function buildNetwork() {
  const [cx, cz] = centreOf(AI_BLOCK);
  const rand = seeded(17);
  const nodes: number[] = [];
  const layers: [number, number, number][][] = [];
  LAYERS.forEach((count, l) => {
    const x = cx + (l / (LAYERS.length - 1) - 0.5) * 0.58;
    const layer: [number, number, number][] = [];
    for (let i = 0; i < count; i++) {
      const across = count > 1 ? i / (count - 1) - 0.5 : 0;
      const z = cz + across * (0.2 + 0.42 * (count / 9));
      const y = 0.12 + 0.11 * Math.cos(across * 3) * Math.sin((l / (LAYERS.length - 1)) * Math.PI) + rand() * 0.02;
      layer.push([x, y, z]);
      nodes.push(x, y, z, rand());
    }
    layers.push(layer);
  });
  const arcs: number[] = [];
  for (let l = 0; l < layers.length - 1; l++) {
    layers[l].forEach((a) => {
      layers[l + 1].forEach((b) => {
        arcs.push(a[0], a[1], a[2], b[0], b[1], b[2], rand(), 0.01);
      });
    });
  }
  return { nodes: new Float32Array(nodes), arcs: new Float32Array(arcs) };
}

/** The word the AI part spells: white on black, stretched over the part */
export function drawWord(canvas: HTMLCanvasElement, word: string, family: string) {
  const g = canvas.getContext('2d', { willReadFrequently: false })!;
  const W = canvas.width;
  const H = canvas.height;
  g.fillStyle = '#000';
  g.fillRect(0, 0, W, H);
  const words = word.trim().toUpperCase().split(/\s+/);
  const lines: string[] = [];
  let line = '';
  words.forEach((w) => {
    if (line && (line + ' ' + w).length > 9) {
      lines.push(line);
      line = w;
    } else line = line ? `${line} ${w}` : w;
  });
  if (line) lines.push(line);
  const shown = lines.slice(0, 3);
  let size = H * 0.7;
  const fit = () => {
    g.font = `800 ${size}px ${family}`;
    return Math.max(...shown.map((l) => g.measureText(l).width)) <= W * 0.97 && size * 1.05 * shown.length <= H * 0.9;
  };
  while (!fit() && size > 16) size -= 4;
  g.fillStyle = '#fff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  shown.forEach((l, i) => g.fillText(l, W / 2, H / 2 + (i - (shown.length - 1) / 2) * size * 1.05));
}
