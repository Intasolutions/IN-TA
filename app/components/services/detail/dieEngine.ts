// The inside of a part: a silicon die drawn live. Everything is worked out per pixel from the zoom, so finer detail
// keeps appearing as the camera comes in, and nothing ever goes soft.

const MAX_BLOCKS = 8;

export type DieRect = [number, number, number, number];
export type DieLayout = { die: DieRect; blocks: DieRect[] };

export type DieFrame = {
  time: number;
  /** where the camera is over the die, and how many world units one CSS pixel covers */
  x: number;
  y: number;
  perPixel: number;
  /** how much each block is lit: 1 is the one being read */
  on: Float32Array;
  /** how far the power has spread out from the centre */
  power: number;
};

export type DieEngine = {
  frame: (f: DieFrame) => void;
  setLayout: (layout: DieLayout) => void;
  resize: () => void;
  destroy: () => void;
};

const hashOf = (text: string) => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967295;
};

/** A floorplan for this many blocks: the die is cut in two again and again, unevenly, the way real ones look. Each service gets its own. */
export function planDie(count: number, wide: boolean, name: string): DieLayout {
  const halfW = wide ? 1.25 : 0.82;
  const halfH = wide ? 0.78 : 1.12;
  const die: DieRect = [-halfW, -halfH, halfW, halfH];
  const inset = 0.085;
  const gap = 0.05;
  const seed = hashOf(name);
  const blocks: DieRect[] = [];
  const cut = (r: DieRect, n: number, depth: number) => {
    if (n <= 1) {
      blocks.push(r);
      return;
    }
    const [x0, y0, x1, y1] = r;
    const across = x1 - x0 > y1 - y0;
    const first = Math.ceil(n / 2);
    const lean = (hashOf(`${name}${depth}${n}${x0.toFixed(2)}`) - 0.5) * 0.14 + (seed - 0.5) * 0.06;
    const share = Math.min(0.72, Math.max(0.28, first / n + lean));
    if (across) {
      const at = x0 + (x1 - x0) * share;
      cut([x0, y0, at - gap / 2, y1], first, depth + 1);
      cut([at + gap / 2, y0, x1, y1], n - first, depth + 1);
    } else {
      const at = y0 + (y1 - y0) * share;
      cut([x0, y0, x1, at - gap / 2], first, depth + 1);
      cut([x0, at + gap / 2, x1, y1], n - first, depth + 1);
    }
  };
  cut([-halfW + inset, -halfH + inset, halfW - inset, halfH - inset], Math.max(1, Math.min(count, MAX_BLOCKS)), 0);
  return { die, blocks };
}

const VS = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const FS = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform vec3 uCam;
uniform float uTime, uPower;
uniform vec4 uDie;
uniform int uCount;
uniform vec4 uBlock[${MAX_BLOCKS}];
uniform float uOn[${MAX_BLOCKS}];
out vec4 outColor;

const vec3 NIGHT = vec3(1.0, 7.0, 43.0) / 255.0;
const vec3 DEEP = vec3(6.0, 22.0, 92.0) / 255.0;
const vec3 BLUE = vec3(37.0, 99.0, 235.0) / 255.0;
const vec3 SKY = vec3(91.0, 140.0, 255.0) / 255.0;
const vec3 PALE = vec3(205.0, 222.0, 255.0) / 255.0;

float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}
float rounded(vec2 p, vec2 c, vec2 h, float r) {
  vec2 d = abs(p - c) - h + r;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r;
}
// how far a detail of this size can be made out at this zoom
float seen(float size, float px) { return smoothstep(1.4, 4.5, size / px); }
float band(float x, float a, float b, float aa) { return smoothstep(a - aa, a + aa, x) * (1.0 - smoothstep(b - aa, b + aa, x)); }

// rows of standard cells: the sea of logic in a real die
vec2 logicCells(vec2 q, float px, float t, float s) {
  float rowH = 0.026;
  float row = floor(q.y / rowH);
  float fy = fract(q.y / rowH);
  float u = q.x / 0.022 + hash(vec2(row, s)) * 91.0;
  float id = floor(u);
  float h = hash(vec2(id, row + s));
  float inRow = band(fy, 0.1, 0.88, px / rowH);
  float cut = band(fract(u), 0.05, 0.97, px / 0.022);
  float cell = mix(0.12, 0.2 + 0.55 * h * h, inRow * cut);
  float fine = seen(0.0034, px);
  float teeth = 0.5 + 0.5 * sin(q.x / 0.0034 * 6.2832 + h * 6.0);
  cell *= mix(1.0, 0.5 + 0.7 * teeth, fine * inRow);
  float finest = seen(0.0007, px);
  cell *= mix(1.0, 0.72 + 0.28 * sin(q.y / 0.0007 * 6.2832), finest);
  float run = fract(u * 0.05 - t * (0.3 + 0.5 * hash(vec2(row, 3.0))) + hash(vec2(row, 7.0)));
  float light = smoothstep(0.92, 1.0, run) * inRow * seen(rowH, px);
  return vec2(mix(0.25, cell, seen(rowH, px)), light);
}

// a memory: the same cell over and over, in banks
vec2 memoryCells(vec2 q, float px, float t, float s) {
  float size = 0.0125;
  vec2 f = abs(fract(q / size) - 0.5) * 2.0;
  float aa = px / size * 2.0;
  float bit = 1.0 - smoothstep(0.6 - aa, 0.6 + aa, max(f.x, f.y));
  float near = seen(size, px);
  float row = floor(q.y / size);
  float on = step(0.45, hash(floor(q / size) + s));
  float tone = mix(0.3, mix(0.11, 0.3 + 0.28 * on, bit), near);
  float fine = seen(0.002, px);
  tone *= mix(1.0, 0.72 + 0.28 * sin(q.x / 0.002 * 6.2832) * sin(q.y / 0.002 * 6.2832), fine * bit);
  vec2 b = abs(fract(q / 0.16) - 0.5) * 0.16;
  float aisle = 1.0 - smoothstep(0.0, 0.0035 + px, 0.08 - max(b.x, b.y));
  tone *= 1.0 - 0.82 * aisle;
  float read = smoothstep(0.965, 1.0, fract(row * 0.0307 - t * 0.2 + s)) * bit * near * (1.0 - aisle);
  return vec2(tone, read);
}

// groups of wires running side by side
vec2 busWires(vec2 q, float px, float t, float s) {
  float pitch = 0.0095;
  float f = abs(fract(q.x / pitch) - 0.5) * 2.0;
  float wire = 1.0 - smoothstep(0.46, 0.46 + 2.0 * px / pitch, f);
  float near = seen(pitch, px);
  float group = band(fract(q.x / 0.13), 0.08, 0.96, px / 0.13);
  float id = floor(q.x / pitch);
  float tone = mix(0.24, mix(0.09, 0.5, wire) * group, near);
  float fine = seen(0.0016, px);
  tone *= mix(1.0, 0.8 + 0.2 * sin(q.y / 0.0016 * 6.2832 + id), fine);
  float run = fract(q.y * 1.15 - t * (0.3 + 0.4 * hash(vec2(id, s))) + hash(vec2(id, 9.0)));
  return vec2(tone, smoothstep(0.95, 1.0, run) * wire * group * near);
}

// large analogue parts: capacitors with guard rings
vec2 analogBanks(vec2 q, float px, float t, float s) {
  vec2 size = vec2(0.092, 0.066);
  vec2 id = floor(q / size);
  vec2 c = (fract(q / size) - 0.5) * size;
  float d = rounded(c, vec2(0.0), size * 0.42, 0.006);
  float inside = 1.0 - smoothstep(-px, px, d);
  float ring = 1.0 - smoothstep(0.0, px * 1.5, abs(d + 0.0055) - 0.0009);
  float h = hash(id + s);
  float tone = mix(0.1, 0.26 + 0.2 * h, inside) + 0.26 * ring * seen(0.006, px);
  float fine = seen(0.0024, px);
  tone *= mix(1.0, 0.78 + 0.22 * sin((q.x + q.y) / 0.0024 * 6.2832), fine * inside);
  float beat = smoothstep(0.86, 1.0, sin(t * (0.5 + h) + h * 40.0)) * inside;
  return vec2(tone, beat * 0.55);
}

vec2 patternOf(int kind, vec2 q, float px, float t, float s) {
  if (kind == 0) return logicCells(q, px, t, s);
  if (kind == 1) return memoryCells(q, px, t, s);
  if (kind == 2) return analogBanks(q, px, t, s);
  return busWires(q, px, t, s);
}

void main() {
  vec2 frag = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  float px = uCam.z;
  vec2 p = uCam.xy + (frag - uRes * 0.5) * px;
  float t = uTime;
  vec3 col = NIGHT;

  float dDie = rounded(p, 0.5 * (uDie.xy + uDie.zw), 0.5 * (uDie.zw - uDie.xy), 0.018);
  float inDie = 1.0 - smoothstep(-px, px, dDie);

  // ---- The wires from the pads out to the edge of the package ----
  if (dDie > 0.0 && dDie < 0.34 && uPower > 0.02) {
    vec2 s = vec2(0.047);
    vec2 g = abs(fract(p / s) - 0.5) * s;
    bool side = abs(p.x) - (uDie.z) > abs(p.y) - (uDie.w);
    float lead = 1.0 - smoothstep(0.0009, 0.0009 + px * 1.5, side ? g.y : g.x);
    float id = side ? floor(p.y / s.y) : floor(p.x / s.x);
    float run = fract(dDie * 2.4 + t * (0.15 + 0.3 * hash(vec2(id, 2.0))) + hash(vec2(id, 5.0)));
    float fade = 1.0 - smoothstep(0.03, 0.34, dDie);
    col += (SKY * 0.34 + PALE * smoothstep(0.93, 1.0, run) * 1.1) * lead * fade * seen(0.047, px);
  }

  // ---- The silicon between the blocks: routing in both directions. Every block is inside it, so nothing further is worked out for pixels outside ----
  if (dDie < px && uPower > 0.02) {
    float tone = 0.07;
    vec2 pitch = vec2(0.0115);
    vec2 line = abs(fract(p / pitch) - 0.5) * pitch;
    float rowId = floor(p.y / pitch.y);
    float colId = floor(p.x / pitch.x);
    float h1 = step(0.56, hash(vec2(rowId, floor(p.x / 0.11) + 1.0)));
    float h2 = step(0.62, hash(vec2(colId, floor(p.y / 0.11) + 4.0)));
    float wiresH = (1.0 - smoothstep(0.0009, 0.0009 + px * 1.5, line.y)) * h1;
    float wiresV = (1.0 - smoothstep(0.0009, 0.0009 + px * 1.5, line.x)) * h2;
    float near = seen(pitch.x, px);
    float wires = max(wiresH, wiresV) * near;
    float runH = smoothstep(0.96, 1.0, fract(p.x * 0.8 - t * (0.2 + 0.5 * hash(vec2(rowId, 1.0))) + hash(vec2(rowId, 8.0))));
    float runV = smoothstep(0.96, 1.0, fract(p.y * 0.8 - t * (0.2 + 0.5 * hash(vec2(colId, 2.0))) + hash(vec2(colId, 6.0))));
    vec3 silicon = mix(DEEP * 0.72, BLUE, tone + 0.3 * wires);
    silicon += PALE * (wiresH * runH + wiresV * runV) * near * 0.9;

    // the bond pads round the edge
    vec2 q = abs(p - 0.5 * (uDie.xy + uDie.zw)) - (0.5 * (uDie.zw - uDie.xy) - 0.042);
    vec2 cellPad = abs(fract(p / 0.047) - 0.5) * 0.047;
    float ringX = band(q.x, -0.015, 0.015, px);
    float ringY = band(q.y, -0.015, 0.015, px);
    float padX = ringX * step(q.y, 0.0) * (1.0 - smoothstep(0.012, 0.012 + px, cellPad.y));
    float padY = ringY * step(q.x, 0.0) * (1.0 - smoothstep(0.012, 0.012 + px, cellPad.x));
    silicon = mix(silicon, mix(BLUE, PALE, 0.42), max(padX, padY) * seen(0.012, px));
    col = mix(col, silicon, inDie);

  // ---- The blocks ----
  for (int i = 0; i < uCount; i++) {
    vec4 r = uBlock[i];
    vec2 c = 0.5 * (r.xy + r.zw);
    vec2 h = 0.5 * (r.zw - r.xy);
    float d = rounded(p, c, h, 0.012);
    float on = uOn[i];
    if (d > 0.0 && d < 0.2 && on > 0.3) {
      col += SKY * exp(-d / 0.04) * on * on * 0.42;
    }
    if (d < px) {
      float s = float(i) * 7.3 + 1.0;
      vec2 q = p - r.xy;
      int kind = i - 4 * (i / 4);
      vec2 main = patternOf(kind, q, px, t, s);
      // part of each block is built differently, as on a real die
      float split = h.y * (1.1 + 0.5 * hash(vec2(s, 1.0)));
      float strip = 1.0 - smoothstep(split - px, split + px, q.y);
      vec2 tl = main;
      if (strip > 0.0 && hash(vec2(s, 2.0)) > 0.5) tl = mix(main, patternOf(kind == 1 ? 0 : 1, q, px, t, s + 3.0), strip);
      vec3 tint = mix(BLUE, vec3(0.2, 0.36, 0.98), hash(vec2(s, 3.0)));
      float lit = mix(0.42, 1.25, on);
      vec3 body = mix(DEEP * 0.8, tint, tl.x * lit) + mix(SKY, PALE, tl.x) * tl.x * tl.x * on * 0.55;
      body += PALE * tl.y * (0.3 + on * 1.3);
      float rim = 1.0 - smoothstep(0.0, px * 1.5, abs(d + 0.0016) - 0.0012);
      body = mix(body, mix(SKY, PALE, on), rim * (0.35 + 0.65 * on));
      col = mix(col, body, 1.0 - smoothstep(-px, px, d));
    }
  }
  }

  // ---- The power comes on from the centre ----
  float reach = uPower * 2.3;
  float lit = 1.0 - smoothstep(reach - 0.3, reach, length(p));
  float front = exp(-pow((length(p) - reach + 0.06) / 0.05, 2.0)) * step(uPower, 0.995) * step(0.001, uPower) * inDie;
  col = mix(NIGHT, col, lit) + PALE * front * 0.5;

  outColor = vec4(col, 1.0);
}`;

/** The die on a canvas, or null if the device can't draw it */
export function createDie(canvas: HTMLCanvasElement, initial: DieLayout, onFail: () => void): DieEngine | null {
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'high-performance' });
  if (!gl) return null;
  const parallel = gl.getExtension('KHR_parallel_shader_compile');
  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  const program = gl.createProgram()!;
  const vs = compile(gl.VERTEX_SHADER, VS);
  const fs = compile(gl.FRAGMENT_SHADER, FS);
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  const vao = gl.createVertexArray();
  const u = (name: string) => gl.getUniformLocation(program, name);
  let uRes: WebGLUniformLocation | null = null;
  let uCam: WebGLUniformLocation | null = null;
  let uTime: WebGLUniformLocation | null = null;
  let uPower: WebGLUniformLocation | null = null;
  let uDie: WebGLUniformLocation | null = null;
  let uCount: WebGLUniformLocation | null = null;
  let uBlock: WebGLUniformLocation | null = null;
  let uOn: WebGLUniformLocation | null = null;

  let destroyed = false;
  const lost = (e: Event) => {
    e.preventDefault();
    if (!destroyed) onFail();
  };
  canvas.addEventListener('webglcontextlost', lost);

  let layout = initial;
  let ready = false;
  const applyLayout = (l: DieLayout) => {
    layout = l;
    if (!ready) return;
    gl.useProgram(program);
    gl.uniform4f(uDie, l.die[0], l.die[1], l.die[2], l.die[3]);
    gl.uniform1i(uCount, l.blocks.length);
    const flat = new Float32Array(4 * MAX_BLOCKS);
    l.blocks.forEach((b, i) => flat.set(b, i * 4));
    gl.uniform4fv(uBlock, flat);
  };

  // The shader compiles in the background where the browser can, so that the page doesn't stop while it does
  const isReady = () => {
    if (ready) return true;
    if (parallel && !gl.getProgramParameter(program, parallel.COMPLETION_STATUS_KHR)) return false;
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program), gl.getShaderInfoLog(fs));
      onFail();
      return false;
    }
    uRes = u('uRes');
    uCam = u('uCam');
    uTime = u('uTime');
    uPower = u('uPower');
    uDie = u('uDie');
    uCount = u('uCount');
    uBlock = u('uBlock');
    uOn = u('uOn');
    ready = true;
    applyLayout(layout);
    return true;
  };

  // Sharp where the device can afford it: a budget of pixels, whatever the screen, and fewer still if frames take too long
  let scale = 1;
  let dpr = 1;
  const resize = () => {
    const cw = Math.max(1, canvas.clientWidth);
    const ch = Math.max(1, canvas.clientHeight);
    const budget = (cw < 700 ? 1.3e6 : 2.8e6) * scale * scale;
    dpr = Math.min(window.devicePixelRatio || 1, Math.sqrt(budget / (cw * ch)));
    const w = Math.max(1, Math.round(cw * dpr));
    const h = Math.max(1, Math.round(ch * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, w, h);
  };
  resize();

  let slow = 0;
  let last = 0;
  let halve = false;
  let odd = false;
  const frame = (f: DieFrame) => {
    if (!isReady()) return;
    const gap = f.time - last;
    last = f.time;
    if (gap > 0.034 && gap < 0.5) slow += 1;
    else slow = Math.max(0, slow - 0.5);
    if (slow > 45) {
      slow = 0;
      if (scale > 0.55) {
        scale *= 0.82;
        resize();
      } else {
        // the last resort, for very slow devices: every other frame, which still moves
        halve = true;
      }
    }
    odd = !odd;
    if (halve && odd) return;
    gl.useProgram(program);
    gl.bindVertexArray(vao);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform3f(uCam, f.x, f.y, f.perPixel / dpr);
    gl.uniform1f(uTime, f.time);
    gl.uniform1f(uPower, f.power);
    gl.uniform1fv(uOn, f.on);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  return {
    frame,
    setLayout: applyLayout,
    resize,
    destroy: () => {
      destroyed = true;
      canvas.removeEventListener('webglcontextlost', lost);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteVertexArray(vao);
      // browsers allow few contexts at a time, so this one is handed back straight away
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}
