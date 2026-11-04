// Draws the Services page's circuit board. Everything the page decides arrives through frame(), once per screen refresh.

import {
  ARC_FS,
  ARC_VS,
  BLUR_FS,
  BOARD_FS,
  BRIGHT_FS,
  COLUMN_FS,
  COLUMN_VS,
  COMPOSITE_FS,
  FIELD_FS,
  FLOOR_FS,
  FLOOR_VS,
  FULL_VS,
  MESH_FS,
  MESH_VS,
  NODE_FS,
  NODE_VS,
  PAGE_FS,
  PLANE_VS,
} from './chipShaders';
import { buildFixed, buildLids, buildNetwork, buildWebArcs, drawBoardArt, drawLidPrint, drawShadows, drawWord, LID_TOP } from './chipModel';
import { BOARD, KIND, RECTS, WEB_TILES, type Point } from './floorplan';
import { FOV, type Camera } from './score';
import { releaseContext } from '../releaseContext';

export type ChipFrame = {
  time: number;
  dt: number;
  cam: Camera;
  /** how far the power has spread across the board */
  boot: number;
  /** how far each part's lid has come off */
  open: Float32Array;
  on: Float32Array;
  prog: Float32Array;
  hand: [number, number, number];
  arrow: [number, number];
  /** a ring going out from a tap: where, and how long ago */
  tap: [number, number, number];
  /** the part with a hand over it, and how much */
  hover: { rect: [number, number, number, number]; kind: number; on: number };
  /** dark, the first switch, how far the rest have woken, and how far they have fallen into step */
  ai: [number, number, number, number];
  form: number;
  net: number;
  web: number;
  /** the AI part as a landscape of error: how far it has become one, and how far down it training has come */
  learn: [number, number];
  /** the copper being followed, how far along the light has got, and how strongly it shows */
  link: { path: Point[] | null; t: number; alpha: number };
  /** how much the rest of the board calms down around the part in view */
  quiet: number;
  /** the lights inside the parts: 1 is fully up */
  room: number;
};

export type ChipEngine = {
  frame: (f: ChipFrame) => void;
  resize: () => void;
  spell: (word: string) => void;
  /** where a point in the world is on screen, in CSS pixels */
  project: (x: number, y: number, z: number) => [number, number];
  /** where a point on the screen falls on the board, if it does */
  onBoard: (clientX: number, clientY: number) => [number, number] | null;
  destroy: () => void;
};

const QUALITY = [
  { scale: 1, bloom: true, msaa: true, budget: 1 },
  { scale: 0.9, bloom: true, msaa: false, budget: 0.8 },
  { scale: 0.78, bloom: true, msaa: false, budget: 0.6 },
  { scale: 0.64, bloom: false, msaa: false, budget: 0.45 },
];
const WATCH_FRAMES = 40;
const SLOW_FRAME_MS = 26;

type Target = { fbo: WebGLFramebuffer; tex: WebGLTexture; w: number; h: number };
type Program = { p: WebGLProgram; v: WebGLShader; f: WebGLShader; u: (name: string) => WebGLUniformLocation | null };
type Vec3 = [number, number, number];

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: Vec3): Vec3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

function mul(a: Float32Array, b: Float32Array, out: Float32Array) {
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      out[c * 4 + r] = a[r] * b[c * 4] + a[r + 4] * b[c * 4 + 1] + a[r + 8] * b[c * 4 + 2] + a[r + 12] * b[c * 4 + 3];
    }
  }
}

const COMPLETION_STATUS = 0x91b1; // COMPLETION_STATUS_KHR

/** Where the light comes from, for the lids' shadows */
const SUN: Vec3 = norm([-0.6, 0.5, -0.56]);

export function createChip(canvas: HTMLCanvasElement, onLost: () => void, onFail: () => void): ChipEngine | null {
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, powerPreference: 'high-performance' });
  if (!gl) return null;

  // Phones can take the graphics context back when they run short of memory
  let destroyed = false;
  const lost = (e: Event) => {
    e.preventDefault();
    if (!destroyed) onLost();
  };
  canvas.addEventListener('webglcontextlost', lost);

  // ---- Shaders compile in the background where the browser can, so that the page doesn't stop while they do ----
  const parallel = gl.getExtension('KHR_parallel_shader_compile');
  const build = (vs: string, fs: string): Program => {
    const shader = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const v = shader(gl.VERTEX_SHADER, vs);
    const f = shader(gl.FRAGMENT_SHADER, fs);
    const p = gl.createProgram()!;
    gl.attachShader(p, v);
    gl.attachShader(p, f);
    gl.linkProgram(p);
    const cache = new Map<string, WebGLUniformLocation | null>();
    const u = (name: string) => {
      if (!cache.has(name)) cache.set(name, gl.getUniformLocation(p, name));
      return cache.get(name)!;
    };
    return { p, v, f, u };
  };
  const field = build(FULL_VS, FIELD_FS);
  const column = build(COLUMN_VS, COLUMN_FS);
  const floor = build(FLOOR_VS, FLOOR_FS);
  const mesh = build(MESH_VS, MESH_FS);
  const boardP = build(PLANE_VS, BOARD_FS);
  const pageP = build(PLANE_VS, PAGE_FS);
  const arc = build(ARC_VS, ARC_FS);
  const node = build(NODE_VS, NODE_FS);
  const bright = build(FULL_VS, BRIGHT_FS);
  const blur = build(FULL_VS, BLUR_FS);
  const composite = build(FULL_VS, COMPOSITE_FS);
  const programs = [field, column, floor, mesh, boardP, pageP, arc, node, bright, blur, composite];
  let compiled = false;
  const checkCompiled = () => {
    if (compiled) return true;
    if (parallel && !programs.every((pr) => gl.getProgramParameter(pr.p, COMPLETION_STATUS))) return false;
    for (const pr of programs) {
      if (!gl.getProgramParameter(pr.p, gl.LINK_STATUS)) {
        console.warn('Board shader:', gl.getShaderInfoLog(pr.v), gl.getShaderInfoLog(pr.f), gl.getProgramInfoLog(pr.p));
        onFail();
        return false;
      }
    }
    compiled = true;
    return true;
  };

  const small = Math.min(window.innerWidth, window.innerHeight) < 600;
  // Fine enough to draw the services, and coarse enough that each pin is still a pin on this screen
  const N = (() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const wide = w / h > 1.15;
    const perWorld = (wide ? Math.min(h * 0.86, w * 0.54) : Math.min(h * 0.42, w * 0.98)) / 0.86;
    return Math.round(Math.min(680, Math.max(280, (2 * perWorld) / (wide ? 3.4 : 2.6))));
  })();
  const CELL = 2 / N;
  const baseBudget = small ? 24000 : window.innerWidth < 1100 ? 40000 : 70000;
  const emptyVao = gl.createVertexArray();

  // ---- Render targets ----
  const texture = (w: number, h: number, filter: number) => {
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  };
  const makeTarget = (w: number, h: number, filter: number = gl.LINEAR): Target => {
    const tex = texture(w, h, filter);
    const fbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return { fbo, tex, w, h };
  };
  const freeTarget = (t: Target | null) => {
    if (!t) return;
    gl.deleteFramebuffer(t.fbo);
    gl.deleteTexture(t.tex);
  };

  // Two copies of the field: each frame reads the last and writes the next
  const fieldA = makeTarget(N, N);
  const fieldB = makeTarget(N, N);
  gl.bindFramebuffer(gl.FRAMEBUFFER, fieldA.fbo);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.bindFramebuffer(gl.FRAMEBUFFER, fieldB.fbo);
  gl.clear(gl.COLOR_BUFFER_BIT);
  let fieldFront = fieldA;
  let fieldBack = fieldB;

  let scene: Target | null = null;
  let glowA: Target | null = null;
  let glowB: Target | null = null;
  let msFbo: WebGLFramebuffer | null = null;
  let msColor: WebGLRenderbuffer | null = null;
  let depthRb: WebGLRenderbuffer | null = null;
  let cssW = 1;
  let cssH = 1;
  let quality = 0;
  const maxSamples = gl.getParameter(gl.MAX_SAMPLES) as number;

  const resize = () => {
    cssW = canvas.clientWidth || window.innerWidth;
    cssH = canvas.clientHeight || window.innerHeight;
    const maxPixels = small ? 2.3e6 : 5.6e6;
    const dpr = Math.min(window.devicePixelRatio || 1, Math.sqrt(maxPixels / (cssW * cssH)));
    const q = QUALITY[quality];
    const scale = dpr * q.scale;
    const w = Math.max(2, Math.round(cssW * scale));
    const h = Math.max(2, Math.round(cssH * scale));
    canvas.width = w;
    canvas.height = h;
    [scene, glowA, glowB].forEach(freeTarget);
    if (msFbo) gl.deleteFramebuffer(msFbo);
    if (msColor) gl.deleteRenderbuffer(msColor);
    if (depthRb) gl.deleteRenderbuffer(depthRb);
    msFbo = null;
    msColor = null;

    scene = makeTarget(w, h);
    depthRb = gl.createRenderbuffer()!;
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthRb);
    const samples = q.msaa ? Math.min(small ? 2 : 4, maxSamples) : 0;
    if (samples > 0) {
      gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.DEPTH_COMPONENT24, w, h);
      msColor = gl.createRenderbuffer()!;
      const depth = depthRb;
      gl.bindRenderbuffer(gl.RENDERBUFFER, msColor);
      gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.RGBA8, w, h);
      msFbo = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, msFbo);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, msColor);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);
    } else {
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
      gl.bindFramebuffer(gl.FRAMEBUFFER, scene.fbo);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthRb);
    }
    const bw = Math.max(2, Math.round(w / 4));
    const bh = Math.max(2, Math.round(h / 4));
    glowA = makeTarget(bw, bh);
    glowB = makeTarget(bw, bh);
  };

  // ---- The solid parts ----
  const meshVao = (data: Float32Array) => {
    const vao = gl.createVertexArray()!;
    const buf = gl.createBuffer()!;
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 40, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 40, 12);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 40, 24);
    gl.bindVertexArray(null);
    return { vao, buf, count: data.length / 10 };
  };
  const fixed = meshVao(buildFixed(small));
  const lidData = buildLids();
  const lidMesh = meshVao(lidData.data);

  const arcVao = (data: Float32Array) => {
    const vao = gl.createVertexArray()!;
    const buf = gl.createBuffer()!;
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    [
      [0, 3, 0],
      [1, 3, 12],
      [2, 2, 24],
    ].forEach(([loc, size, offset]) => {
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 32, offset);
      gl.vertexAttribDivisor(loc, 1);
    });
    gl.bindVertexArray(null);
    return { vao, buf, count: data.length / 8 };
  };
  const webArcs = arcVao(buildWebArcs());
  const network = buildNetwork();
  const netArcs = arcVao(network.arcs);
  const nodeVao = gl.createVertexArray()!;
  const nodeBuf = gl.createBuffer()!;
  gl.bindVertexArray(nodeVao);
  gl.bindBuffer(gl.ARRAY_BUFFER, nodeBuf);
  gl.bufferData(gl.ARRAY_BUFFER, network.nodes, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 16, 0);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 16, 12);
  gl.bindVertexArray(null);
  const nodeCount = network.nodes.length / 4;

  const fontFamily = () => getComputedStyle(canvas).getPropertyValue('--font-space-grotesk').trim() || 'sans-serif';
  const monoFamily = () => getComputedStyle(canvas).getPropertyValue('--font-jetbrains-mono').trim() || 'monospace';

  // ---- Everything printed: drawn once the site's fonts are in, so the first sight of the board is the sharp one ----
  const aniso = gl.getExtension('EXT_texture_filter_anisotropic');
  const sharpen = () => {
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(16, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT) as number));
  };
  const artTex = gl.createTexture()!;
  const flowTex = gl.createTexture()!;
  const shadowTex = gl.createTexture()!;
  const printTex = gl.createTexture()!;
  const maxTexture = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
  const artSize = Math.min(maxTexture, small ? 2048 : window.innerWidth > 2000 ? 4096 : 3072);
  const printSize = Math.min(maxTexture, small ? 1536 : 3072);
  let printed = false;
  const uploadPrint = (logo: HTMLImageElement | null) => {
    if (destroyed) return;
    gl.bindTexture(gl.TEXTURE_2D, printTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, drawLidPrint(printSize, fontFamily(), monoFamily(), logo));
    sharpen();
  };
  const logoImage = new window.Image();
  let logoReady = false;
  logoImage.onload = () => {
    logoReady = true;
    if (printed) uploadPrint(logoImage);
  };
  logoImage.src = '/logo/logo-inta.png';
  const printAll = () => {
    if (destroyed || gl.isContextLost()) return;
    const { art, flow } = drawBoardArt(artSize, small ? 1024 : 2048, fontFamily(), monoFamily());
    gl.bindTexture(gl.TEXTURE_2D, artTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, art);
    sharpen();
    gl.bindTexture(gl.TEXTURE_2D, flowTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, flow);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, shadowTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, drawShadows(small ? 512 : 1024));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    uploadPrint(logoReady ? logoImage : null);
    printed = true;
  };
  document.fonts.ready.then(printAll, printAll);

  // The word the AI part is spelling
  const wordCanvas = document.createElement('canvas');
  wordCanvas.width = 768;
  wordCanvas.height = 768;
  const wordTex = gl.createTexture()!;
  const spell = (word: string) => {
    drawWord(wordCanvas, word, fontFamily());
    gl.bindTexture(gl.TEXTURE_2D, wordTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, wordCanvas);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  };
  spell('AI');

  const rectData = new Float32Array(RECTS.flat());
  const tileData = new Float32Array(WEB_TILES.flat());
  const linkData = new Float32Array(8);

  // ---- Watching how the device copes: fewer pixels, then no glow, before it drops frames ----
  let lastDraw = 0;
  let watched = 0;
  let slow = 0;
  let spent = 0;
  let settle = 90;
  let locked = false;
  let paceBefore = 0;
  const changeQuality = (to: number) => {
    quality = to;
    resize();
    settle = 24;
  };
  const watch = () => {
    const now = performance.now();
    const gap = now - lastDraw;
    lastDraw = now;
    if (locked || gap > 250) return;
    if (settle > 0) {
      settle -= 1;
      return;
    }
    watched += 1;
    spent += gap;
    if (gap > SLOW_FRAME_MS) slow += 1;
    if (watched < WATCH_FRAMES) return;
    const pace = spent / watched;
    const struggling = slow > watched * 0.6;
    watched = 0;
    spent = 0;
    slow = 0;
    if (paceBefore && pace > paceBefore * 0.92) {
      changeQuality(quality - 1);
      locked = true;
      return;
    }
    paceBefore = 0;
    if (!struggling) return;
    if (quality === QUALITY.length - 1) {
      locked = true;
      return;
    }
    paceBefore = pace;
    changeQuality(quality + 1);
  };

  const bind = (unit: number, tex: WebGLTexture | null) => {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
  };

  // ---- The camera ----
  const view = new Float32Array(16);
  const proj = new Float32Array(16);
  const vp = new Float32Array(16);
  const identity = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  const lidModel = new Float32Array(identity);
  let eye: Vec3 = [0, 1, 1];
  let right: Vec3 = [1, 0, 0];
  let trueUp: Vec3 = [0, 1, 0];
  let forward: Vec3 = [0, 0, -1];
  let shiftX = 0;
  let shiftY = 0;
  let tanY = Math.tan(FOV / 2);
  let tanX = tanY;

  const setCamera = (c: Camera) => {
    eye = c.eye;
    forward = norm(sub(c.target, eye));
    right = norm(cross(forward, c.up));
    trueUp = cross(right, forward);
    view.set([right[0], trueUp[0], -forward[0], 0, right[1], trueUp[1], -forward[1], 0, right[2], trueUp[2], -forward[2], 0, -dot(right, eye), -dot(trueUp, eye), dot(forward, eye), 1]);
    const aspect = cssW / cssH;
    const near = Math.max(0.01, c.dist * 0.08);
    const far = c.dist + 42;
    const f = 1 / Math.tan(FOV / 2);
    tanY = 1 / f;
    tanX = aspect / f;
    shiftX = c.sx;
    shiftY = c.sy;
    proj.fill(0);
    proj[0] = f / aspect;
    proj[5] = f;
    // a shift of the lens: the subject sits in the part of the screen the words leave free
    proj[8] = -c.sx;
    proj[9] = -c.sy;
    proj[10] = (far + near) / (near - far);
    proj[11] = -1;
    proj[14] = (2 * far * near) / (near - far);
    mul(proj, view, vp);
  };

  const rayToPlane = (nx: number, ny: number, maxT: number): [number, number, boolean] => {
    const tx = (nx - shiftX) * tanX;
    const ty = (ny - shiftY) * tanY;
    const d: Vec3 = [forward[0] + right[0] * tx + trueUp[0] * ty, forward[1] + right[1] * tx + trueUp[1] * ty, forward[2] + right[2] * tx + trueUp[2] * ty];
    const hits = d[1] < -1e-3;
    const t = hits ? Math.min(maxT, -eye[1] / d[1]) : maxT;
    return [eye[0] + d[0] * t, eye[2] + d[2] * t, hits];
  };

  const project = (x: number, y: number, z: number): [number, number] => {
    const cx = vp[0] * x + vp[4] * y + vp[8] * z + vp[12];
    const cy = vp[1] * x + vp[5] * y + vp[9] * z + vp[13];
    const cw = vp[3] * x + vp[7] * y + vp[11] * z + vp[15];
    return [(cx / cw) * 0.5 * cssW + cssW * 0.5, (-cy / cw) * 0.5 * cssH + cssH * 0.5];
  };

  const onBoard = (clientX: number, clientY: number): [number, number] | null => {
    const [x, z, hits] = rayToPlane((clientX / cssW) * 2 - 1, 1 - (clientY / cssH) * 2, 200);
    return hits && Math.abs(x) <= BOARD.half && Math.abs(z) <= BOARD.half ? [x, z] : null;
  };

  let keyLight: Vec3 = [0, 1, 0];
  let stripLight = 0;
  const setSurface = (p: Program, c: Camera, room: number) => {
    gl.useProgram(p.p);
    gl.uniformMatrix4fv(p.u('uVP'), false, vp);
    gl.uniform3fv(p.u('uCam'), eye);
    gl.uniform3fv(p.u('uKey'), keyLight);
    gl.uniform1f(p.u('uStrip'), stripLight);
    gl.uniform1f(p.u('uFocus'), c.dist);
    gl.uniform1f(p.u('uRoom'), room);
  };

  let fade = 0;
  const lidShade: [number, number, number, number] = [0, 0, 0, 0];
  const lidHalf: [number, number] = [1, 1];

  const frame = (f: ChipFrame) => {
    if (gl.isContextLost() || !scene || !glowA || !glowB) return;
    if (!checkCompiled() || !printed) return;
    watch();
    // the picture comes up as soon as it is ready
    fade = Math.min(1, fade + f.dt / 0.9);

    setCamera(f.cam);
    const c = f.cam;
    const q = QUALITY[quality];

    // ---- What part of the pins' area is in view ----
    const reach = c.dist * 4;
    const corners = [rayToPlane(-1, -1, reach), rayToPlane(1, -1, reach), rayToPlane(1, 1, reach), rayToPlane(-1, 1, reach)];
    const xs = corners.map((k) => k[0]);
    const zs = corners.map((k) => k[1]);
    const toCell = (v: number) => (v + 1) / CELL;
    const clampCell = (v: number) => Math.max(0, Math.min(N, Math.round(v)));
    const margin = 26;
    const x0 = clampCell(toCell(Math.min(...xs)) - margin);
    const x1 = clampCell(toCell(Math.max(...xs)) + margin);
    const z0 = clampCell(toCell(Math.min(...zs)) - margin);
    const z1 = clampCell(toCell(Math.max(...zs)) + margin);
    const inView = x1 > x0 && z1 > z0;

    // ---- The field: every pin in view works out where it should be ----
    if (inView) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, fieldBack.fbo);
      gl.viewport(0, 0, N, N);
      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(x0, z0, x1 - x0, z1 - z0);
      gl.disable(gl.BLEND);
      gl.disable(gl.DEPTH_TEST);
      gl.useProgram(field.p);
      gl.bindVertexArray(emptyVao);
      bind(0, fieldFront.tex);
      bind(1, wordTex);
      const u = field.u;
      gl.uniform1i(u('uPrev'), 0);
      gl.uniform1i(u('uWord'), 1);
      gl.uniform1f(u('uN'), N);
      gl.uniform1f(u('uTime'), f.time);
      gl.uniform1f(u('uDt'), Math.min(0.25, f.dt));
      gl.uniform1f(u('uForm'), f.form);
      gl.uniform1f(u('uQuiet'), f.quiet);
      gl.uniform2fv(u('uLearn'), f.learn);
      gl.uniform3fv(u('uTap'), f.tap);
      gl.uniform4fv(u('uRect'), rectData);
      gl.uniform1fv(u('uOpen'), f.open);
      gl.uniform1fv(u('uOn'), f.on);
      gl.uniform1fv(u('uProg'), f.prog);
      gl.uniform3fv(u('uHand'), f.hand);
      gl.uniform2fv(u('uArrow'), f.arrow);
      gl.uniform4fv(u('uAi'), f.ai);
      gl.uniform4fv(u('uTiles'), tileData);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.disable(gl.SCISSOR_TEST);
      const swap = fieldFront;
      fieldFront = fieldBack;
      fieldBack = swap;
    }

    // ---- A light that travels, from a little off the mirror direction: it slides across the metal as the camera moves ----
    const toCam = norm(sub(eye, c.target));
    const mirror: Vec3 = [-toCam[0], toCam[1], -toCam[2]];
    keyLight = norm([mirror[0] + Math.sin(f.time * 0.27) * 0.42 + 0.06, mirror[1] + 0.05, mirror[2] + Math.cos(f.time * 0.19) * 0.3]);
    stripLight = mirror[0] * 0.9 + mirror[2] * 0.4 + Math.sin(f.time * 0.13) * 0.22 - 0.12;

    // ---- The scene ----
    gl.bindFramebuffer(gl.FRAMEBUFFER, msFbo ?? scene.fbo);
    gl.viewport(0, 0, scene.w, scene.h);
    gl.clearColor(1, 1, 1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);
    gl.disable(gl.BLEND);

    // the lids: closed, they hide what's under them
    setSurface(mesh, c, 1);
    bind(0, printTex);
    gl.uniform1i(mesh.u('uPrint'), 0);
    gl.uniform1f(mesh.u('uLid'), 1);
    gl.uniform1f(mesh.u('uTop'), LID_TOP);
    gl.bindVertexArray(lidMesh.vao);
    let shadowLid = -1;
    let shadowOpen = 0;
    lidData.ranges.forEach((lid, i) => {
      const k = f.open[KIND[lid.block.kind]];
      if (k > shadowOpen && k < 0.995) {
        shadowOpen = k;
        shadowLid = i;
      }
      if (k >= 0.995) return;
      const [x0r, z0r, x1r, z1r] = lid.block.rect;
      const lift = k * k * 1.5;
      const tilt = k * 0.5;
      const yaw = k * 0.26;
      const ct = Math.cos(tilt);
      const st = Math.sin(tilt);
      const cy = Math.cos(yaw);
      const sy = Math.sin(yaw);
      // (a turn about y, then a tilt about x, then up and away)
      lidModel.set([cy, st * sy, -ct * sy, 0, 0, ct, st, 0, sy, -st * cy, ct * cy, 0, (x0r + x1r) / 2 + k * 0.26, lift, (z0r + z1r) / 2 - k * k * 0.8, 1]);
      gl.uniformMatrix4fv(mesh.u('uModel'), false, lidModel);
      gl.uniform2f(mesh.u('uLidHalf'), lid.hx, lid.hz);
      gl.uniform4fv(mesh.u('uCell'), lid.cell);
      gl.uniform1f(mesh.u('uGlow'), f.hover.kind === KIND[lid.block.kind] ? f.hover.on : 0);
      gl.drawArrays(gl.TRIANGLES, lid.first, lid.count);
    });

    // the pins, as many as the device can draw
    if (inView) {
      let wx = x1 - x0;
      let wz = z1 - z0;
      let ox = x0;
      let oz = z0;
      const budget = baseBudget * q.budget;
      if (wx * wz > budget) {
        const k = Math.sqrt(budget / (wx * wz));
        const nx = Math.max(32, Math.round(wx * k));
        const nz = Math.max(32, Math.round(wz * k));
        // centred a little on the camera's side of the subject
        const mx = toCell(c.target[0] + (eye[0] - c.target[0]) * 0.06);
        const mz = toCell(c.target[2] + (eye[2] - c.target[2]) * 0.06);
        ox = Math.max(x0, Math.min(x1 - nx, Math.round(mx - nx / 2)));
        oz = Math.max(z0, Math.min(z1 - nz, Math.round(mz - nz / 2)));
        wx = nx;
        wz = nz;
      }
      setSurface(column, c, f.room);
      bind(0, fieldFront.tex);
      gl.uniform1i(column.u('uField'), 0);
      gl.uniform4i(column.u('uWin'), ox, oz, wx, wz);
      gl.uniform1f(column.u('uN'), N);
      gl.uniform1f(column.u('uHMax'), 0.2);
      gl.uniform1f(column.u('uGap'), 0.84);
      gl.bindVertexArray(emptyVao);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 18, wx * wz);

      // the floors of the open parts
      setSurface(floor, c, f.room);
      bind(0, fieldFront.tex);
      gl.uniform1i(floor.u('uField'), 0);
      gl.uniform1f(floor.u('uN'), N);
      gl.uniform4fv(floor.u('uRects'), rectData);
      gl.uniform1fv(floor.u('uOpen'), f.open);
      gl.bindVertexArray(emptyVao);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, 9);
    }

    // the modules' bodies and the parts round them
    setSurface(mesh, c, 1);
    gl.uniformMatrix4fv(mesh.u('uModel'), false, identity);
    gl.uniform1f(mesh.u('uLid'), 0);
    gl.uniform1f(mesh.u('uGlow'), 0);
    gl.bindVertexArray(fixed.vao);
    gl.drawArrays(gl.TRIANGLES, 0, fixed.count);

    // the board's surface
    if (shadowLid >= 0) {
      const lid = lidData.ranges[shadowLid];
      const k = shadowOpen;
      const lifted = k * k * 1.5 + 0.05;
      const flat = Math.hypot(SUN[0], SUN[2]);
      const away = (lifted * flat) / SUN[1];
      lidShade[0] = (lid.block.rect[0] + lid.block.rect[2]) / 2 + k * 0.26 - (SUN[0] / flat) * away;
      lidShade[1] = (lid.block.rect[1] + lid.block.rect[3]) / 2 - k * k * 0.8 - (SUN[2] / flat) * away;
      lidShade[2] = 0.02 + lifted * 0.26;
      lidShade[3] = 0.42 / (1 + lifted * 1.4);
      lidHalf[0] = lid.hx;
      lidHalf[1] = lid.hz;
    } else {
      lidShade[3] = 0;
    }
    setSurface(boardP, c, 1);
    bind(0, artTex);
    bind(1, flowTex);
    bind(2, shadowTex);
    gl.uniform1i(boardP.u('uArt'), 0);
    gl.uniform1i(boardP.u('uFlow'), 1);
    gl.uniform1i(boardP.u('uShadows'), 2);
    gl.uniform1f(boardP.u('uHalf'), BOARD.half);
    gl.uniform1f(boardP.u('uCorner'), BOARD.corner);
    gl.uniform1f(boardP.u('uTime'), f.time);
    gl.uniform1f(boardP.u('uBoot'), f.boot);
    gl.uniform4fv(boardP.u('uLidShade'), lidShade);
    gl.uniform2fv(boardP.u('uLidHalf'), lidHalf);
    gl.uniform4fv(boardP.u('uHover'), f.hover.rect);
    gl.uniform1f(boardP.u('uHoverOn'), f.hover.on);
    if (f.link.path && f.link.alpha > 0.001) {
      for (let i = 0; i < 4; i++) {
        const p = f.link.path[Math.min(i, f.link.path.length - 1)];
        linkData[i * 2] = p[0];
        linkData[i * 2 + 1] = p[1];
      }
      gl.uniform2fv(boardP.u('uLink'), linkData);
      gl.uniform1f(boardP.u('uLinkT'), f.link.t);
      gl.uniform1f(boardP.u('uLinkAlpha'), f.link.alpha);
    } else {
      gl.uniform1f(boardP.u('uLinkAlpha'), 0);
    }
    gl.uniform4f(boardP.u('uPlane'), 0, 0, BOARD.half, BOARD.half);
    gl.uniform1f(boardP.u('uY'), BOARD.top);
    gl.bindVertexArray(emptyVao);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // the white page under it all, with the board's shadow on it
    gl.useProgram(pageP.p);
    gl.uniformMatrix4fv(pageP.u('uVP'), false, vp);
    gl.uniform1f(pageP.u('uHalf'), BOARD.half);
    gl.uniform4f(pageP.u('uPlane'), 0, 0, BOARD.half + 1.2, BOARD.half + 1.2);
    gl.uniform1f(pageP.u('uY'), BOARD.bottom);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // ---- Lines over the surface ----
    if (f.web > 0.004 || f.net > 0.004) {
      gl.enable(gl.BLEND);
      gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE);
      gl.depthMask(false);
      const SEGMENTS = 22;
      gl.useProgram(arc.p);
      gl.uniformMatrix4fv(arc.u('uVP'), false, vp);
      gl.uniform2f(arc.u('uRes'), scene.w / 2, scene.h / 2);
      gl.uniform1f(arc.u('uSegments'), SEGMENTS);
      gl.uniform1f(arc.u('uTime'), f.time);
      if (f.web > 0.004) {
        gl.uniform1f(arc.u('uWidth'), 1.9 * (scene.h / 900));
        gl.uniform1f(arc.u('uLift'), f.web);
        gl.uniform1f(arc.u('uAlpha'), f.web);
        gl.uniform1f(arc.u('uBase'), 0.32);
        gl.uniform1f(arc.u('uSpeed'), 0.42);
        gl.uniform3f(arc.u('uColor'), 0.36, 0.56, 1);
        gl.bindVertexArray(webArcs.vao);
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, (SEGMENTS + 1) * 2, webArcs.count);
      }
      if (f.net > 0.004) {
        gl.uniform1f(arc.u('uWidth'), 1.25 * (scene.h / 900));
        gl.uniform1f(arc.u('uLift'), f.net);
        gl.uniform1f(arc.u('uAlpha'), f.net);
        gl.uniform1f(arc.u('uBase'), 0.14);
        gl.uniform1f(arc.u('uSpeed'), 0.34);
        gl.uniform3f(arc.u('uColor'), 0.42, 0.62, 1);
        gl.bindVertexArray(netArcs.vao);
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, (SEGMENTS + 1) * 2, netArcs.count);
        gl.useProgram(node.p);
        gl.uniformMatrix4fv(node.u('uVP'), false, vp);
        gl.uniform1f(node.u('uTime'), f.time);
        gl.uniform1f(node.u('uPx'), (scene.h / (2 * Math.tan(FOV / 2))) * 0.075);
        gl.uniform1f(node.u('uLift'), f.net);
        gl.uniform1f(node.u('uAlpha'), f.net);
        gl.bindVertexArray(nodeVao);
        gl.drawArrays(gl.POINTS, 0, nodeCount);
      }
      gl.disable(gl.BLEND);
      gl.depthMask(true);
    }

    if (msFbo) {
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, msFbo);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, scene.fbo);
      gl.blitFramebuffer(0, 0, scene.w, scene.h, 0, 0, scene.w, scene.h, gl.COLOR_BUFFER_BIT, gl.NEAREST);
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    }

    // ---- The glow of what's lit, inside the dark parts ----
    gl.disable(gl.DEPTH_TEST);
    gl.bindVertexArray(emptyVao);
    gl.viewport(0, 0, glowA.w, glowA.h);
    if (q.bloom) {
      gl.useProgram(bright.p);
      gl.bindFramebuffer(gl.FRAMEBUFFER, glowA.fbo);
      bind(0, scene.tex);
      gl.uniform1i(bright.u('uTex'), 0);
      gl.uniform1f(bright.u('uThreshold'), 0.5);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.useProgram(blur.p);
      gl.uniform1i(blur.u('uTex'), 0);
      const rounds = small ? 2 : 3;
      for (let i = 0; i < rounds; i++) {
        const spread = 1 + i * 1.5;
        gl.bindFramebuffer(gl.FRAMEBUFFER, glowB.fbo);
        bind(0, glowA.tex);
        gl.uniform2f(blur.u('uDir'), spread / glowA.w, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.bindFramebuffer(gl.FRAMEBUFFER, glowA.fbo);
        bind(0, glowB.tex);
        gl.uniform2f(blur.u('uDir'), 0, spread / glowA.h);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(composite.p);
    bind(0, scene.tex);
    bind(1, glowA.tex);
    gl.uniform1i(composite.u('uScene'), 0);
    gl.uniform1i(composite.u('uBloom'), 1);
    gl.uniform1f(composite.u('uBloomAmt'), q.bloom ? 0.8 : 0);
    gl.uniform1f(composite.u('uFade'), fade);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  resize();

  return {
    frame,
    resize,
    spell,
    project,
    onBoard,
    destroy: () => {
      destroyed = true;
      canvas.removeEventListener('webglcontextlost', lost);
      releaseContext(gl, canvas);
    },
  };
}
