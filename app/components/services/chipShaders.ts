// The Services page's circuit board, drawn live. Each service is a dark module on a white board, full of metal pins that
// reshape themselves into the service. One "field" pass works out every pin's height and light; the geometry reads it.

export const FULL_VS = `#version 300 es
out vec2 vUv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

/** Every pin on the die: r height, g light, b hue, a saturation. Heights ease towards where they are going, each pin at its own speed. */
export const FIELD_FS = `#version 300 es
precision highp float;
precision highp int;
in vec2 vUv;
out vec4 o;

uniform sampler2D uPrev, uWord;
uniform float uN, uTime, uDt, uForm, uQuiet;
uniform vec2 uLearn;
uniform vec3 uTap;
uniform vec4 uRect[9];
uniform float uOpen[9];
uniform float uOn[9];
uniform float uProg[9];
uniform vec3 uHand;
uniform vec2 uArrow;
uniform vec4 uAi;
uniform vec4 uTiles[5];

float C, T;

float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}
float box(vec2 p, vec2 b) {
  vec2 d = abs(p) - b;
  return length(max(d, vec2(0.0))) + min(max(d.x, d.y), 0.0);
}
float rbox(vec2 p, vec2 b, float r) { return box(p, b - r) - r; }

// ---- How each block looks at rest: what a real die shot shows, a different texture for every part of the chip ----
vec4 yours(vec2 q, vec2 size, float on) {
  vec2 d = min(q, size - q);
  float m = min(d.x, d.y);
  float line = step(2.0, m) * step(m, 4.0);
  float dash = step(mod(q.x + q.y, 14.0), 8.0);
  float corner = line * step(max(d.x, d.y), 28.0);
  float pulse = 0.5 + 0.5 * sin(T * 2.2);
  float e = line * dash * (0.14 + 0.42 * on * pulse) + corner * (0.32 + 0.6 * on);
  float h = line * dash * 0.05 + corner * 0.1;
  vec2 c = q - size * 0.5;
  float caret = step(abs(c.x), 1.6) * step(abs(c.y), 16.0) * step(0.5, fract(T * 1.1));
  e = max(e, caret * (0.25 + 0.75 * on));
  h = max(h, caret * (0.1 + 0.4 * on));
  float inner = step(5.0, m) * (1.0 - caret);
  float breathe = 0.5 + 0.5 * sin(T * 1.3 - length(c) * 0.09);
  vec2 g = mod(q, 5.0);
  float contact = step(g.x, 1.4) * step(g.y, 1.4) * inner;
  e = max(e, contact * (0.14 + 0.18 * on + 0.22 * on * breathe));
  e = max(e, inner * on * 0.04);
  return vec4(h, e, 0.61, line > 0.5 || caret > 0.5 ? 0.3 : 0.8);
}

vec4 idle(int id, vec2 q, vec2 size, vec2 cell, float r) {
  float flow = 0.5 + 0.5 * sin(T * 0.6 + cell.x * 0.018 - cell.y * 0.013 + float(id) * 1.7);
  float spark = pow(fract(r * 7.3 + T * (0.05 + r * 0.09)), 18.0);
  float h = 0.0, e = 0.0, hue = 0.615, sat = 0.8;
  if (id == 0) {
    vec2 m = mod(q, vec2(46.0, 34.0));
    float core = step(3.0, m.x) * step(3.0, m.y);
    float row = step(mod(q.y, 4.0), 2.0);
    h = core * (0.03 + 0.03 * row);
    e = core * row * (0.05 + 0.12 * flow) + core * spark * 0.9;
  } else if (id == 1) {
    vec2 m = mod(q, 6.0);
    float t = step(m.x, 4.0) * step(m.y, 4.0);
    h = t * 0.035;
    e = t * (0.04 + 0.14 * flow * flow) + t * spark * 0.6;
  } else if (id == 2) {
    vec2 m = mod(q, 12.0);
    float line = max(step(m.x, 1.5), step(m.y, 1.5));
    float node = step(m.x, 3.0) * step(m.y, 3.0);
    h = line * 0.02 + node * 0.05;
    e = line * 0.04 + node * (0.12 + 0.34 * flow) + spark * line;
    hue = 0.62;
  } else if (id == 3) {
    float d = length(q - size * 0.5);
    float ring = step(mod(d, 11.0), 3.0);
    h = ring * 0.04;
    e = ring * (0.04 + 0.18 * (0.5 + 0.5 * sin(d * 0.12 - T * 1.1))) + ring * spark * 0.6;
  } else if (id == 4) {
    float row = floor(q.y / 7.0);
    float on = step(mod(q.y, 7.0), 3.0) * step(0.35, hash(vec2(floor(q.x / 16.0), row)));
    h = on * 0.04;
    e = on * (0.04 + 0.12 * flow) + on * spark * 0.7;
  } else if (id == 5) {
    vec2 m = mod(q, vec2(40.0, 24.0));
    float f = step(3.0, m.x) * step(3.0, m.y);
    float g = hash(floor(q / vec2(40.0, 24.0)));
    h = f * (0.03 + 0.03 * g);
    e = f * (0.04 + 0.18 * g * flow);
  } else if (id == 6) {
    vec2 m = mod(q, vec2(18.0, 34.0));
    float f = step(3.0, m.x) * step(3.0, m.y);
    h = f * 0.045;
    e = f * (0.04 + 0.12 * flow) + f * spark * 0.7;
  } else if (id == 7) {
    vec2 c = abs(q - size * 0.5);
    float ring = max(c.x, c.y);
    float fl = pow(0.5 + 0.5 * sin(ring * 0.42 - T * 1.15), 4.0);
    vec2 m = mod(q, 3.0);
    float pin = step(m.x, 1.5) * step(m.y, 1.5);
    float core = exp(-ring * ring / (size.x * size.x * 0.05));
    h = 0.02 + 0.03 * fl;
    e = (0.1 + 0.62 * fl + 0.5 * core) * (0.45 + 0.55 * pin) + spark * 0.7;
    sat = 0.82;
  } else {
    return yours(q, size, 0.0);
  }
  return vec4(h, e, hue, sat);
}

// ---- Software: the block types out its own source code, and scrolling is what types it ----
vec4 software(vec2 q, vec2 size, float prog) {
  const float RH = 4.0;
  float unit = size.x / 42.0;
  float rows = floor(size.y / RH);
  float row = floor(q.y / RH);
  float tall = step(mod(q.y, RH), 2.5);
  float x = q.x - unit * 1.5;
  float typed = (0.3 + prog * 0.7) * rows;
  float cur = floor(typed);
  vec4 t = vec4(0.0, 0.015, 0.61, 0.7);
  float blank = step(0.86, hash(vec2(row, 1.0)));
  float cx = floor(hash(vec2(row, 2.0)) * 4.0) * unit * 2.0;
  float n = 2.0 + floor(hash(vec2(row, 3.0)) * 5.0);
  float tok = -1.0;
  for (int i = 0; i < 7; i++) {
    if (float(i) >= n) break;
    float wd = floor(unit * (2.0 + hash(vec2(row, float(i) + 11.0)) * 6.0));
    if (x >= cx && x < cx + wd) tok = float(i);
    cx += wd + unit;
  }
  float head = fract(typed) * cx;
  bool shown = row < cur || (row == cur && x < head);
  if (tok >= 0.0 && tall > 0.5 && blank < 0.5 && shown) {
    float k = hash(vec2(row, tok + 31.0));
    t.z = 0.615;
    t.w = k < 0.36 ? 0.92 : k < 0.74 ? 0.55 : 0.04;
    float exec = exp(-pow((row - mod(T * 7.0, rows)) / 1.6, 2.0));
    t.x = 0.035 + 0.05 * hash(vec2(row, tok + 5.0)) + exec * 0.09;
    t.y = 0.46 + 0.28 * k + exec * 0.6;
  }
  if (row == cur && abs(x - head) < 1.6 && tall > 0.5) {
    float blink = step(0.5, fract(T * 1.6));
    t = vec4(0.16 + 0.1 * blink, 0.5 + 0.5 * blink, 0.61, 0.2);
  }
  return t;
}

// ---- UI/UX: a wireframe becomes a finished screen, and the arrow on it is the visitor's own ----
void el(inout vec4 t, float d, float px, float k, float hf, float ef, float hue, float sat) {
  float edge = 1.0 - smoothstep(px * 0.6, px * 1.6, abs(d));
  float fill = step(d, 0.0);
  float h = mix(edge * 0.035, fill * hf + edge * 0.012, k);
  float e = mix(edge * 0.66, fill * ef + edge * 0.22, k);
  if (h > t.x || e > t.y) {
    t.x = max(t.x, h);
    t.y = max(t.y, e);
    t.z = hue;
    t.w = mix(0.55, sat, k);
  }
}
vec4 uiux(vec2 u, float px, float prog, vec2 cur) {
  vec4 t = vec4(0.0, 0.012, 0.61, 0.7);
  float k = smoothstep(0.1, 0.56, prog);
  el(t, rbox(u, vec2(1.2, 0.93), 0.07), px, k, 0.03, 0.07, 0.62, 0.7);
  // title bar, with its three lights
  el(t, box(u - vec2(0.0, -0.82), vec2(1.2, 0.105)), px, k, 0.05, 0.14, 0.62, 0.6);
  for (int i = 0; i < 3; i++) {
    float d = length(u - vec2(-1.1 + float(i) * 0.09, -0.82)) - 0.03;
    if (d < 0.0) t = vec4(mix(0.03, 0.09, k), mix(0.4, 0.95, k), 0.615, float(i) == 0.0 ? 0.05 : float(i) == 1.0 ? 0.45 : 0.85);
  }
  // sidebar
  el(t, box(u - vec2(-0.97, 0.1), vec2(0.22, 0.82)), px, k, 0.05, 0.12, 0.615, 0.8);
  if (k > 0.3 && abs(u.x + 0.97) < 0.15) {
    for (int i = 0; i < 5; i++) {
      float y = -0.55 + float(i) * 0.2;
      if (abs(u.y - y) < 0.04) t = vec4(0.07, i == 1 ? 0.95 : 0.3, 0.61, i == 1 ? 0.35 : 0.6);
    }
  }
  // the large picture, with the cross every wireframe has
  vec2 c0 = vec2(0.26, -0.36);
  vec2 b0 = vec2(0.86, 0.3);
  vec2 q0 = u - c0;
  float over = step(box(cur - c0, b0), 0.0);
  float grad = smoothstep(-0.9, 0.9, q0.x + q0.y * 0.6);
  el(t, rbox(q0, b0, 0.04), px, k, 0.1 + over * 0.07 + grad * 0.05, 0.34 + grad * 0.5 + over * 0.14, mix(0.625, 0.6, grad), mix(0.95, 0.5, grad));
  if (box(q0, b0) < 0.0 && k < 0.98) {
    float cross1 = abs(q0.y - q0.x * b0.y / b0.x);
    float cross2 = abs(q0.y + q0.x * b0.y / b0.x);
    float line = 1.0 - smoothstep(px * 0.5, px * 1.4, min(cross1, cross2));
    t.y = max(t.y, line * 0.55 * (1.0 - k));
    t.x = max(t.x, line * 0.03 * (1.0 - k));
  }
  // three cards
  for (int i = 0; i < 3; i++) {
    vec2 c = vec2(-0.325 + float(i) * 0.6, 0.27);
    vec2 b = vec2(0.27, 0.27);
    vec2 q = u - c;
    float ov = step(box(cur - c, b), 0.0);
    el(t, rbox(q, b, 0.04), px, k, 0.08 + ov * 0.16, 0.14 + ov * 0.32, 0.62, 0.55);
    if (box(q, b) < 0.0 && k > 0.5) {
      if (abs(q.y + 0.12) < 0.05 && abs(q.x) < 0.19) t = vec4(t.x + 0.025, 0.55 + ov * 0.3, 0.6, 0.4);
      if (abs(q.y - 0.05) < 0.022 && abs(q.x) < 0.19) t = vec4(t.x + 0.012, 0.34, 0.6, 0.3);
      if (abs(q.y - 0.14) < 0.022 && q.x > -0.19 && q.x < 0.08) t = vec4(t.x + 0.012, 0.34, 0.6, 0.3);
    }
  }
  // the button
  vec2 c1 = vec2(-0.3, 0.73);
  vec2 b1 = vec2(0.29, 0.1);
  float ovb = step(box(cur - c1, b1), 0.0);
  el(t, rbox(u - c1, b1, 0.1), px, k, 0.16 - ovb * 0.07, 0.9, 0.61, 0.4 - ovb * 0.3);
  el(t, rbox(u - vec2(0.33, 0.73), vec2(0.27, 0.1), 0.1), px, k, 0.05, 0.14, 0.62, 0.6);
  // the arrow, standing above everything
  vec2 a = u - cur;
  if (a.y >= 0.0 && a.y < 0.34 && a.x >= 0.0 && a.x <= a.y * 0.78) t = vec4(0.2, 1.0, 0.61, 0.04);
  if (a.y >= 0.2 && a.y < 0.46 && a.x >= 0.04 + (a.y - 0.2) * 0.42 && a.x <= 0.11 + (a.y - 0.2) * 0.42) t = vec4(0.2, 1.0, 0.61, 0.04);
  return t;
}

// ---- Web: pages of the web load up, and links run between them ----
vec4 webPages(vec2 w, vec2 cell, float prog, float r) {
  vec4 t = vec4(0.0, 0.01, 0.61, 0.7);
  vec2 g = mod(cell, 7.0);
  if (g.x < 1.0 && g.y < 1.0) t = vec4(0.012, 0.1 + 0.34 * pow(fract(r * 5.0 + T * 0.2), 8.0), 0.61, 0.6);
  for (int i = 0; i < 5; i++) {
    vec4 tl = uTiles[i];
    vec2 q = w - tl.xy;
    float k = smoothstep(float(i) * 0.12, float(i) * 0.12 + 0.2, prog);
    if (k < 0.01) continue;
    float d = rbox(q, tl.zw, 0.014);
    if (d < 0.0) {
      float down = (q.y + tl.w) / (2.0 * tl.w);
      float across = (q.x + tl.z) / (2.0 * tl.z);
      if (down > k * 1.02) {
        t = vec4(0.02, 0.05, 0.61, 0.6);
      } else if (down < 0.14) {
        // the bar at the top, with its address
        t = vec4(0.13, 0.34, 0.61, 0.5);
        if (abs(down - 0.07) < 0.035 && across > 0.22 && across < 0.92) t = vec4(0.15, 0.75, 0.61, 0.15);
        if (abs(down - 0.07) < 0.045 && across < 0.15 && mod(across * 30.0, 2.0) < 1.0) t = vec4(0.15, 0.9, 0.61, 0.6);
      } else if (down < 0.56) {
        float grad = across * 0.7 + down * 0.5 + sin(T * 0.8 + float(i)) * 0.14;
        t = vec4(0.09 + grad * 0.05, 0.36 + grad * 0.55, mix(0.63, 0.6, grad), mix(0.95, 0.55, grad));
      } else {
        // lines of text
        float line = step(mod(down * 26.0, 2.0), 0.9);
        float len = 0.5 + 0.42 * hash(vec2(floor(down * 13.0), float(i)));
        t = vec4(0.06 + line * 0.03 * step(across, len), 0.08 + line * 0.5 * step(across, len), 0.61, 0.35);
      }
      break;
    }
    // the edge of the page, lit
    if (d < 0.006) t = vec4(0.1, 0.55, 0.61, 0.5);
  }
  return t;
}

// ---- Marketing: a signal goes out, and more and more people pick it up ----
vec4 marketing(vec2 p, float s, vec2 cell, float prog, float r) {
  float d = length(p) / s;
  float reach = mix(0.1, 1.5, prog);
  float inside = 1.0 - smoothstep(reach - 0.14, reach, d);
  float wave = pow(0.5 + 0.5 * sin(d * 15.0 - T * 3.4), 6.0);
  vec2 g = floor(cell / 5.0);
  vec2 m = mod(cell, 5.0);
  float person = step(m.x, 2.5) * step(m.y, 2.5);
  float who = hash(g + 3.0);
  float joined = person * step(who, 0.74) * (1.0 - smoothstep(reach - 0.1 - who * 0.2, reach - 0.02 - who * 0.2, d));
  float star = person * step(who, 0.09) * (1.0 - smoothstep(reach - 0.42, reach - 0.3, d));
  float h = 0.008 + wave * inside * 0.03 + joined * (0.05 + 0.09 * wave) + star * 0.16;
  float e = 0.02 + wave * inside * 0.14 + joined * (0.34 + 0.56 * wave) + star * 0.5;
  vec4 t = vec4(h, e, 0.615, 0.86 - joined * 0.14 - star * 0.75);
  if (d < 0.07) t = vec4(0.34, 1.0, 0.61, 0.15);
  if (abs(d - 0.12) < 0.016) t = vec4(0.1, 0.8, 0.61, 0.3);
  return t;
}

// ---- SEO: a list of results, and one result climbing to the top of it ----
vec4 seo(vec2 u, float px, float prog) {
  vec4 t = vec4(0.0, 0.012, 0.61, 0.7);
  vec2 qb = u - vec2(0.0, -0.8);
  float bar = rbox(qb, vec2(1.02, 0.13), 0.13);
  if (bar < 0.0) {
    t = vec4(0.08, 0.14, 0.61, 0.5);
    float typed = smoothstep(0.0, 0.3, prog);
    if (abs(qb.y) < 0.042 && u.x > -0.78 && u.x < -0.78 + 1.45 * typed && mod(u.x * 16.0, 2.0) < 1.35) t = vec4(0.12, 0.9, 0.61, 0.1);
    if (abs(u.x - (-0.78 + 1.45 * typed)) < px && abs(qb.y) < 0.07) t = vec4(0.14, step(0.5, fract(T * 1.5)), 0.61, 0.1);
    float ring = abs(length(u - vec2(-0.9, -0.8)) - 0.042);
    if (ring < 0.02) t = vec4(0.14, 1.0, 0.61, 0.25);
    if (abs((u.x + 0.9) - (u.y + 0.8)) < 0.022 && u.x > -0.87 && u.x < -0.83) t = vec4(0.14, 1.0, 0.61, 0.25);
  }
  if (abs(bar) < px * 1.1) t = vec4(0.11, 0.7, 0.61, 0.35);

  float climb = 1.0 - smoothstep(0.26, 0.92, prog);
  float hp = 4.0 * climb;
  const float Y0 = -0.42;
  const float GAP = 0.33;
  for (int j = 0; j < 4; j++) {
    float pos = float(j) + smoothstep(hp - 0.5, hp + 0.5, float(j) + 0.5);
    vec2 q = u - vec2(0.0, Y0 + pos * GAP);
    float seed = hash(vec2(float(j), 4.0));
    if (length(q - vec2(-0.93, 0.0)) < 0.052) t = vec4(0.05, 0.42, 0.61, 0.6);
    if (rbox(q - vec2(-0.32, -0.05), vec2(0.5 + seed * 0.22, 0.04), 0.02) < 0.0) t = vec4(0.05, 0.34, 0.61, 0.62);
    if (rbox(q - vec2(-0.14, 0.055), vec2(0.68, 0.022), 0.012) < 0.0) t = vec4(0.03, 0.17, 0.61, 0.5);
  }
  vec2 hq = u - vec2(0.0, Y0 + hp * GAP);
  float won = smoothstep(0.86, 1.0, prog);
  float glow = 0.75 + 0.25 * sin(T * 2.4);
  if (rbox(hq, vec2(1.06, 0.135), 0.05) < 0.0) t = vec4(0.05 + won * 0.04, 0.14 + 0.1 * glow, 0.61, 0.85);
  if (abs(rbox(hq, vec2(1.06, 0.135), 0.05)) < px * 1.1) t = vec4(0.15, 0.95, 0.59, 0.4);
  if (length(hq - vec2(-0.93, 0.0)) < 0.062) t = vec4(0.26, 1.0, 0.59, 0.2);
  if (rbox(hq - vec2(-0.24, -0.05), vec2(0.62, 0.045), 0.02) < 0.0) t = vec4(0.22 + won * 0.1, 0.95, 0.6, 0.15);
  if (rbox(hq - vec2(-0.14, 0.06), vec2(0.72, 0.024), 0.012) < 0.0) t = vec4(0.14, 0.6, 0.6, 0.3);
  // the crawler passing over the page
  float beam = exp(-pow((u.y - (mod(T * 0.42, 2.6) - 1.3)) / 0.05, 2.0));
  t.y = min(1.0, t.y + beam * (0.02 + t.y * 0.5));
  return t;
}

// ---- Media: a picture on the move, its soundtrack and its timeline ----
vec4 media(vec2 u, float px, float prog, vec2 cell) {
  vec4 t = vec4(0.0, 0.012, 0.61, 0.7);
  vec2 q = u - vec2(0.0, -0.15);
  vec2 fr = vec2(1.17, 0.66);
  float d = rbox(q, fr, 0.05);
  if (d < 0.0) {
    vec2 v = q * 1.4;
    float w1 = sin(v.x * 2.3 + T * 0.55 + sin(v.y * 3.1 - T * 0.4) * 1.3);
    float w2 = sin(v.y * 3.7 - T * 0.35 + sin(v.x * 2.9 + T * 0.27) * 1.7);
    float l = clamp(0.5 + 0.33 * w1 + 0.33 * w2, 0.0, 1.0);
    float hue = mix(0.635, 0.6, 0.5 + 0.5 * w2);
    t = vec4(0.03 + 0.16 * l * l, 0.14 + l * l * 0.95, hue, mix(0.95, 0.12, smoothstep(0.62, 1.0, l)));
    // rule of thirds, when the viewfinder is up
    vec2 third = abs(mod(q + fr, fr * 2.0 / 3.0));
    float k = 1.0 - smoothstep(0.1, 0.4, prog);
    if (min(third.x, third.y) < px * 1.1) t.y = max(t.y, 0.5 * k);
    // play: gone as soon as it starts
    float pk = 1.0 - smoothstep(0.12, 0.34, prog);
    if (q.x > -0.2 && abs(q.y) < (0.3 - q.x) * 0.62 && pk > 0.01) t = mix(t, vec4(0.34, 1.0, 0.61, 0.0), pk);
  }
  if (abs(d) < px * 1.2) t = vec4(0.09, 0.6, 0.61, 0.35);
  // the sprocket holes of old film, running along it
  vec2 s = vec2(mod(q.x + T * 0.06, 0.14) - 0.07, abs(q.y) - 0.75);
  if (abs(q.x) < 1.17 && box(s, vec2(0.036, 0.035)) < 0.0) t = vec4(0.05, 0.36, 0.61, 0.4);
  // sound
  float wy = 0.81;
  float along = (u.x + 1.17) / 2.34;
  if (along > 0.0 && along < 1.0) {
    float column = floor(along * 56.0);
    float a = 0.018 + 0.09 * pow(abs(sin(column * 1.7 + T * 1.5) * sin(column * 0.31 - T * 0.7)), 1.4);
    if (abs(u.y - wy) < a && mod(along * 56.0, 1.0) < 0.62) {
      float done = step(along, prog);
      t = vec4(0.05 + 0.09 * done, 0.2 + 0.62 * done, done > 0.5 ? 0.61 : 0.62, done > 0.5 ? 0.45 : 0.7);
    }
  }
  float head = length(u - vec2(-1.17 + 2.34 * prog, wy)) - 0.055;
  if (abs(u.x - (-1.17 + 2.34 * prog)) < 0.012 && abs(u.y - wy) < 0.15) t = vec4(0.22, 1.0, 0.61, 0.06);
  if (head < 0.0) t = vec4(0.28, 1.0, 0.61, 0.06);
  return t;
}

// ---- Mobile: a phone rises out of the chip, its apps arrive and one opens ----
vec4 mobile(vec2 u, float px, float prog) {
  vec2 ph = vec2(0.56, 1.14);
  float dOut = rbox(u, ph, 0.16);
  vec4 t = vec4(0.0, 0.012, 0.61, 0.7);
  if (dOut > 0.0) {
    t.y += exp(-dOut * dOut * 26.0) * 0.14;
    return t;
  }
  vec2 sc = ph - 0.055;
  float dIn = rbox(u, sc, 0.115);
  if (dIn > 0.0) return vec4(0.5, 0.14 + 0.36 * smoothstep(0.0, 0.02, dIn), 0.61, 0.25);

  float down = u.y / sc.y * 0.5 + 0.5;
  t = vec4(0.28, 0.12 + 0.2 * (1.0 - down), mix(0.635, 0.6, down), 0.9);
  // the apps
  vec2 grid = vec2(4.0, 5.0);
  vec2 area = vec2(0.45, 0.68);
  vec2 g = (u - vec2(0.0, -0.22)) / area * 0.5 + 0.5;
  vec2 id = floor(g * grid);
  if (id.x >= 0.0 && id.x < grid.x && id.y >= 0.0 && id.y < grid.y) {
    vec2 f = (fract(g * grid) - 0.5) * (area * 2.0 / grid);
    float n = id.y * 4.0 + id.x;
    float k = smoothstep(n * 0.028 + 0.04, n * 0.028 + 0.1, prog);
    float seed = hash(id + 2.0);
    if (rbox(f, vec2(0.085) * k, 0.03) < 0.0) t = vec4(0.28 + 0.1 * k, 0.42 + 0.46 * seed, 0.615, 0.08 + seed * 0.86);
  }
  // the dock
  vec2 dock = vec2(mod(u.x + 0.5, 0.225) - 0.1125, u.y - 0.89);
  if (abs(u.x) < 0.44 && rbox(dock, vec2(0.082), 0.03) < 0.0) t = vec4(0.37, 0.72, 0.6, 0.4);
  // one of them opens
  float open = smoothstep(0.66, 0.92, prog);
  if (open > 0.0) {
    vec2 from = vec2(0.112, -0.22 - 0.136);
    vec2 c = mix(from, vec2(0.0), open);
    vec2 b = mix(vec2(0.085), sc - 0.005, open);
    float dA = rbox(u - c, b, mix(0.03, 0.11, open));
    if (dA < 0.0) {
      t = vec4(0.38 - 0.06 * open, 0.2, 0.61, 0.75);
      vec2 a = u - c;
      if (open > 0.55) {
        if (abs(a.y + 0.72) < 0.14 && abs(a.x) < 0.38) t = vec4(0.37, 0.72 + 0.2 * sin(T * 1.4 + a.x * 3.0), 0.615, mix(0.95, 0.45, a.x + 0.5));
        for (int i = 0; i < 5; i++) {
          vec2 r2 = a - vec2(0.0, -0.36 + float(i) * 0.28);
          if (rbox(r2, vec2(0.4, 0.11), 0.04) < 0.0) t = vec4(0.35, 0.3, 0.61, 0.6);
          if (length(r2 + vec2(0.29, 0.0)) < 0.06) t = vec4(0.38, 0.9, 0.61, 0.5);
          if (rbox(r2 - vec2(0.07, -0.03), vec2(0.24, 0.024), 0.012) < 0.0) t = vec4(0.37, 0.72, 0.6, 0.2);
          if (rbox(r2 - vec2(0.02, 0.04), vec2(0.19, 0.016), 0.01) < 0.0) t = vec4(0.36, 0.5, 0.6, 0.3);
        }
      }
    }
  }
  // the island, and the bar at the bottom
  if (rbox(u - vec2(0.0, -0.99), vec2(0.15, 0.04), 0.04) < 0.0) t = vec4(0.44, 0.0, 0.61, 0.0);
  if (rbox(u - vec2(0.0, 1.03), vec2(0.15, 0.016), 0.016) < 0.0) t = vec4(0.4, 0.85, 0.61, 0.05);
  return t;
}

// ---- Training: the block becomes a landscape of its own error, and a marker walks down to where the error is smallest ----
float lossAt(vec2 q) {
  vec2 v = q - vec2(-0.16, 0.2);
  float bowl = 1.0 - exp(-dot(v, v) * 1.5);
  float rough = sin(q.x * 6.0 + 1.3) * sin(q.y * 5.2 - 0.7) * 0.5 + sin(q.x * 11.0 + q.y * 4.0) * 0.22;
  return clamp(bowl * (0.82 + rough * 0.3), 0.0, 1.0);
}
vec2 walk(float t) {
  vec2 from = vec2(0.72, -0.74);
  vec2 d = vec2(-0.16, 0.2) - from;
  float e = 1.0 - pow(1.0 - t, 2.2);
  return from + d * e + vec2(-d.y, d.x) * sin(e * 11.0) * (1.0 - e) * 0.22;
}

// ---- AI: alive, then dark. One switch; then the rest; then they learn in time with one another; then they answer. ----
vec4 neural(vec2 w, vec2 p, vec2 hs, vec2 ctr, vec2 cell, float r) {
  float d = length(p);
  float cheb = max(abs(p.x), abs(p.y));
  float flow = pow(0.5 + 0.5 * sin(cheb * 46.0 - T * 1.7), 3.0) * (0.5 + 0.5 * sin(p.x * 13.0 + p.y * 17.0 + T * 0.6));
  float base = (0.05 + 0.9 * flow) * (1.0 - uAi.x);
  float hgt = (0.02 + 0.16 * flow) * (1.0 - uAi.x * 0.9);
  float alive = (1.0 - smoothstep(uAi.z - 0.12, uAi.z, d)) * step(0.0001, uAi.z);
  float own = pow(max(0.0, sin(T * (0.7 + r * 1.6) + r * 90.0)), 8.0);
  float wv = pow(0.5 + 0.5 * sin(T * 2.1 - d * 22.0), 8.0);
  float fire = mix(own, wv, smoothstep(r * 0.5, r * 0.5 + 0.5, uAi.w));
  float e = max(base, alive * (0.03 + fire * 0.97));
  float h = max(hgt, alive * (0.012 + fire * 0.15));
  // the first one
  vec2 first = floor((ctr * 0.5 + 0.5) * uN);
  float one = uAi.y;
  float pale = 0.0;
  if (cell == first) {
    e = max(e, one * (0.92 + 0.08 * sin(T * 2.4)));
    h = max(h, one * 0.2);
    pale = one;
  } else if (one > 0.0) {
    // its light on the metal round it
    e = max(e, one * exp(-dot(cell - first, cell - first) / 60.0) * 0.26);
  }
  float tone = 0.82 * (1.0 - pale * 0.85);
  // training
  if (uLearn.x > 0.001) {
    vec2 b = p / hs;
    float px = C / min(hs.x, hs.y);
    float loss = lossAt(b);
    float kL = smoothstep(r * 0.35, r * 0.35 + 0.65, uLearn.x);
    float contour = step(fract(loss * 11.0), 0.2);
    float ground = 0.016 + loss * 0.36;
    float paintL = 0.1 + (1.0 - loss) * (1.0 - loss) * 0.5 + contour * 0.16;
    // the way it has come so far
    float trail = 9.0;
    vec2 last = walk(0.0);
    for (int i = 1; i <= 14; i++) {
      vec2 next = walk(uLearn.y * float(i) / 14.0);
      vec2 seg = next - last;
      float along = clamp(dot(b - last, seg) / max(dot(seg, seg), 1e-5), 0.0, 1.0);
      trail = min(trail, length(b - last - seg * along));
      last = next;
    }
    float onTrail = 1.0 - smoothstep(px * 1.1, px * 2.2, trail);
    float marker = 1.0 - smoothstep(px * 3.0, px * 4.2, length(b - last));
    h = mix(h, ground + onTrail * 0.03 + marker * 0.3, kL);
    e = mix(e, max(paintL, max(onTrail * 0.95, marker)), kL);
    tone = mix(tone, mix(0.92, 0.06, max(onTrail, marker)), kL);
  }
  // a word
  vec2 uv = (p + hs) / (2.0 * hs);
  float m = smoothstep(0.35, 0.65, textureLod(uWord, uv, 0.0).r);
  float halo = textureLod(uWord, uv, 4.5).r * (1.0 - m);
  float kF = smoothstep(r * 0.45, r * 0.45 + 0.55, uForm);
  float wh = 0.012 + halo * 0.02 + m * (0.24 + 0.04 * sin(T * 1.4 + p.x * 14.0 + p.y * 9.0));
  float we = 0.018 + 0.05 * flow + halo * 0.5 + m * (0.92 + 0.08 * sin(T * 2.0 + p.x * 10.0));
  return vec4(mix(h, wh, kF), mix(e, we, kF), 0.615, mix(tone, 0.42 * m + 0.86 * (1.0 - m), kF));
}

float approach(float a, float b, float rate) {
  float d = b - a;
  // (at least one step of the 8-bit texture per frame, or small differences would never finish)
  float move = max(abs(d) * rate, 1.01 / 255.0);
  return abs(d) <= move ? b : a + sign(d) * move;
}

void main() {
  T = uTime;
  C = 2.0 / uN;
  vec2 cell = floor(vUv * uN);
  vec2 w = (cell + 0.5) * C - 1.0;
  o = vec4(0.0);
  int id = -1;
  for (int i = 0; i < 9; i++) {
    vec4 B = uRect[i];
    if (w.x >= B.x && w.x <= B.z && w.y >= B.y && w.y <= B.w) {
      id = i;
      break;
    }
  }
  // only what's inside an open part has any pins
  if (id < 0 || uOpen[id] <= 0.001) return;
  float r = hash(cell);
  vec4 R = uRect[id];
  vec2 lo = R.xy;
  vec2 hi = R.zw;
  vec2 hs = (hi - lo) * 0.5;
  vec2 ctr = (lo + hi) * 0.5;
  vec2 p = w - ctr;
  vec2 q = (w - lo) / C;
  vec2 size = (hi - lo) / C;
  float on = uOn[id];
  float prog = uProg[id];
  float s = min(hs.x, hs.y);
  vec2 local = uHand.xy - ctr;
  float handHere = uHand.z * step(abs(local.x), hs.x) * step(abs(local.y), hs.y);
  vec4 t = idle(id, q, size, cell, r);
  t.y *= 1.0 - uQuiet * 0.7;
  if (id == 8) {
    t = yours(q, size, on);
  } else if (on > 0.002) {
    vec2 u = p / s;
    float px = C / s;
    vec4 a;
    if (id == 0) a = software(q, size, prog);
    else if (id == 1) a = uiux(u, px, prog, (uArrow - ctr) / s);
    else if (id == 2) a = webPages(w, cell, prog, r);
    // (the signal goes out from wherever the visitor's hand is)
    else if (id == 3) a = marketing(p - local * handHere, s, cell, prog, r);
    else if (id == 4) a = seo(u, px, prog);
    else if (id == 5) a = media(u, px, prog, cell);
    else if (id == 6) a = mobile(u, px, prog);
    else a = neural(w, p, hs, ctr, cell, r);
    // it rises from the middle of the part outwards
    float reach = length(p / hs) * 0.42;
    t = mix(t, a, smoothstep(reach, reach + 0.42, on));
  }

  // A tap: a ring goes out across the pins
  if (uTap.z >= 0.0 && uTap.z < 2.2) {
    float d = distance(w, uTap.xy);
    float ring = exp(-pow((d - uTap.z * 0.62) / 0.035, 2.0)) * exp(-uTap.z * 1.5);
    t.x += ring * 0.2;
    t.y = max(t.y, ring);
  }
  // The visitor's hand: the pins come up to meet it, and it leaves a wake
  if (uHand.z > 0.001) {
    vec2 hd = w - uHand.xy;
    float near = exp(-dot(hd, hd) / 0.0028);
    t.x += near * 0.15 * uHand.z;
    t.y = max(t.y, t.y + near * 0.42 * uHand.z);
  }
  t.x = clamp(t.x, 0.0, 1.0) * smoothstep(0.0, 0.7, uOpen[id]);
  t.y = clamp(t.y, 0.0, 1.0);

  vec4 prev = texelFetch(uPrev, ivec2(cell), 0);
  // each pin at its own speed, so that changes flow rather than switch
  o = vec4(approach(prev.r, t.x, 1.0 - exp(-uDt * (3.5 + r * 5.0))), approach(prev.g, t.y, 1.0 - exp(-uDt * 8.0)), t.z, t.w);
}`;

/** What every surface shares */
const SURFACE = `
uniform vec3 uCam, uKey;
uniform float uStrip, uFocus, uRoom;
const vec3 PAGE = vec3(1.0);
const vec3 AZURE = vec3(0.044, 0.198, 0.93);
const vec3 BRAND = vec3(0.0003, 0.058, 0.462);

vec3 hsv(float h, float s, float v) {
  vec3 k = abs(fract(h + vec3(0.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0) - 1.0;
  return v * mix(vec3(1.0), clamp(k, 0.0, 1.0), s);
}
float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}
// What the pins reflect, down inside a dark part
vec3 envInside(vec3 R) {
  float up = R.y * 0.5 + 0.5;
  vec3 c = mix(vec3(0.0006, 0.002, 0.012), vec3(0.003, 0.012, 0.075), up * up);
  float a = max(dot(R, uKey), 0.0);
  c += vec3(0.62, 0.78, 1.0) * pow(a, 90.0) * 2.4 + vec3(0.07, 0.24, 1.0) * pow(a, 16.0) * 0.3;
  float s = exp(-pow((R.x * 0.9 + R.z * 0.4 - uStrip) / 0.14, 2.0)) * smoothstep(0.1, 0.7, R.y);
  c += vec3(0.08, 0.28, 1.0) * s * 0.62;
  return c * uRoom;
}
// What the metal reflects, out in the white room
vec3 envStudio(vec3 R) {
  float top = R.y * 0.5 + 0.5;
  vec3 room = mix(vec3(0.24, 0.29, 0.42), vec3(0.8, 0.84, 0.92), top * top);
  float k = max(dot(R, uKey), 0.0);
  room += vec3(1.0) * pow(k, 70.0) * 1.8;
  float band = exp(-pow((R.x * 0.9 + R.z * 0.4 - uStrip) / 0.14, 2.0)) * smoothstep(0.1, 0.7, R.y);
  return room + vec3(0.9, 0.95, 1.0) * band * 0.8;
}
vec4 finish(vec3 col, vec3 P) {
  col = pow(clamp(col, 0.0, 1.0), vec3(0.4545));
  // only a long way off does the board fade into the page
  return vec4(mix(col, PAGE, smoothstep(uFocus * 2.6, uFocus * 5.0, distance(P, uCam))), 1.0);
}
vec3 inside(vec3 c) { return 1.0 - exp(-c); }
vec3 topColor(vec3 P, float r1, float r2, float h, float e, float hue, float sat, float detail) {
  vec3 V = normalize(uCam - P);
  // every pin sits a hair off true, and a few rather more, so that they catch the light one by one as the camera moves
  float tilt = (r1 > 0.93 ? 0.34 : 0.05) * detail;
  vec3 N = normalize(vec3((r2 - 0.5) * tilt, 1.0, (fract(r2 * 7.31) - 0.5) * tilt));
  float nv = max(dot(N, V), 0.0);
  vec3 R = reflect(-V, N);
  float fres = 0.04 + 0.96 * pow(1.0 - nv, 5.0);
  float shim = 0.5 + 0.5 * sin((P.x * 0.55 - P.z * 0.4 + nv * 1.4) * 6.2832);
  vec3 tint = mix(vec3(0.3, 0.52, 1.0), vec3(0.62, 0.78, 1.0), shim);
  vec3 col = vec3(0.0005, 0.0026, 0.024) + envInside(R) * tint * (fres * 0.9 + 0.05);
  col *= 1.0 + h * 1.6;
  vec3 lit = hsv(hue, sat, 1.0);
  lit *= lit;
  col += lit * e * 0.3 + lit * e * e * 2.0 + mix(lit, vec3(1.0), 0.5) * e * e * e * e * 1.5;
  return inside(col);
}
`;

/** The pins: each draws its top and the two sides facing the camera. Pins lying flat aren't drawn: the floor of the part shows them. */
export const COLUMN_VS = `#version 300 es
precision highp float;
precision highp int;
uniform highp sampler2D uField;
uniform mat4 uVP;
uniform vec3 uCam;
uniform ivec4 uWin;
uniform float uN, uHMax, uGap;
out vec3 vW;
out vec3 vN;
out vec2 vQ;
out float vY;
flat out vec4 vF;
flat out vec2 vR;
flat out float vH;

const vec2 Q[6] = vec2[6](vec2(0.0, 0.0), vec2(1.0, 0.0), vec2(1.0, 1.0), vec2(0.0, 0.0), vec2(1.0, 1.0), vec2(0.0, 1.0));

float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

void main() {
  int face = gl_VertexID / 6;
  vec2 q = Q[gl_VertexID % 6];
  ivec2 cell = uWin.xy + ivec2(gl_InstanceID % uWin.z, gl_InstanceID / uWin.z);
  vec4 f = texelFetch(uField, cell, 0);
  float C = 2.0 / uN;
  vec2 c = (vec2(cell) + 0.5) * C - 1.0;
  float h = f.r * uHMax;
  if (h < C * 0.14) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    return;
  }
  float hw = C * 0.5 * uGap;
  vec3 P;
  if (face == 0) {
    P = vec3(c.x + (q.x - 0.5) * 2.0 * hw, h, c.y + (q.y - 0.5) * 2.0 * hw);
    vN = vec3(0.0, 1.0, 0.0);
    vY = 1.0;
  } else if (face == 1) {
    float s = uCam.x >= c.x ? 1.0 : -1.0;
    P = vec3(c.x + s * hw, q.y * h, c.y + (q.x - 0.5) * 2.0 * hw);
    vN = vec3(s, 0.0, 0.0);
    vY = q.y;
  } else {
    float s = uCam.z >= c.y ? 1.0 : -1.0;
    P = vec3(c.x + (q.x - 0.5) * 2.0 * hw, q.y * h, c.y + s * hw);
    vN = vec3(0.0, 0.0, s);
    vY = q.y;
  }
  vW = P;
  vQ = q;
  vF = f;
  vH = f.r;
  vR = vec2(hash(vec2(cell)), hash(vec2(cell) + 7.0));
  gl_Position = uVP * vec4(P, 1.0);
}`;

export const COLUMN_FS = `#version 300 es
precision highp float;
in vec3 vW;
in vec3 vN;
in vec2 vQ;
in float vY;
flat in vec4 vF;
flat in vec2 vR;
flat in float vH;
out vec4 o;
${SURFACE}
void main() {
  vec3 col;
  if (vN.y > 0.5) {
    col = topColor(vW, vR.x, vR.y, vH, vF.g, vF.b, vF.a, 1.0);
    // the machined edge of each pin
    vec2 e = abs(vQ - 0.5);
    float rim = smoothstep(0.38, 0.5, max(e.x, e.y));
    col += inside(envInside(reflect(normalize(vW - uCam), normalize(vec3(vQ.x - 0.5, 1.4, vQ.y - 0.5))))) * rim * 0.34;
  } else {
    vec3 V = normalize(uCam - vW);
    vec3 R = reflect(-V, vN);
    float nv = max(dot(vN, V), 0.0);
    vec3 c = vec3(0.0005, 0.002, 0.016) + envInside(R) * (0.05 + 0.36 * pow(1.0 - nv, 4.0));
    c *= mix(0.14, 1.0, vY);
    vec3 lit = hsv(vF.b, vF.a, 1.0);
    lit *= lit;
    c += lit * vF.g * vF.g * 1.5 * vY * vY;
    col = inside(c);
  }
  o = finish(col, vW);
}`;

/** The floor of each open part */
export const FLOOR_VS = `#version 300 es
precision highp float;
uniform mat4 uVP;
uniform vec4 uRects[9];
uniform float uOpen[9];
out vec3 vW;
void main() {
  if (uOpen[gl_InstanceID] <= 0.001) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    return;
  }
  vec4 R = uRects[gl_InstanceID];
  vec2 q = vec2(float(gl_VertexID & 1), float(gl_VertexID >> 1));
  vW = vec3(mix(R.x, R.z, q.x), 0.0, mix(R.y, R.w, q.y));
  gl_Position = uVP * vec4(vW, 1.0);
}`;

export const FLOOR_FS = `#version 300 es
precision highp float;
in vec3 vW;
out vec4 o;
uniform sampler2D uField;
uniform float uN;
${SURFACE}
void main() {
  vec2 cc = (vW.xz * 0.5 + 0.5) * uN;
  vec2 cell = floor(cc);
  vec2 f = fract(cc) - 0.5;
  float px = max(length(dFdx(cc)), length(dFdy(cc)));
  float detail = 1.0 - smoothstep(0.32, 0.62, px);
  vec4 t;
  if (px < 1.0) {
    t = texelFetch(uField, ivec2(clamp(cell, vec2(0.0), vec2(uN - 1.0))), 0);
  } else {
    vec2 uv = cc / uN;
    float o1 = 0.35 * px / uN;
    t = (texture(uField, uv + vec2(o1, o1)) + texture(uField, uv + vec2(-o1, o1)) + texture(uField, uv + vec2(o1, -o1)) + texture(uField, uv - vec2(o1, o1))) * 0.25;
  }
  float r1 = mix(0.5, hash(cell), detail);
  float r2 = mix(0.5, hash(cell + 7.0), detail);
  vec3 col = topColor(vW, r1, r2, t.r, t.g, t.b, t.a, detail);
  col *= 1.0 - smoothstep(0.34, 0.5, max(abs(f.x), abs(f.y))) * detail * 0.72;
  o = finish(col, vW);
}`;

/** The modules' bodies, the lids and the parts on the board: real geometry, in metal and ceramic */
export const MESH_VS = `#version 300 es
precision highp float;
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNor;
layout(location = 2) in vec4 aCol;
uniform mat4 uVP, uModel;
out vec3 vW;
out vec3 vN;
out vec3 vL;
out vec4 vC;
void main() {
  vec4 w = uModel * vec4(aPos, 1.0);
  vW = w.xyz;
  vN = mat3(uModel) * aNor;
  vL = aPos;
  vC = aCol;
  gl_Position = uVP * w;
}`;

export const MESH_FS = `#version 300 es
precision highp float;
in vec3 vW;
in vec3 vN;
in vec3 vL;
in vec4 vC;
out vec4 o;
uniform sampler2D uPrint;
uniform float uLid, uTop, uGlow;
uniform vec2 uLidHalf;
uniform vec4 uCell;
${SURFACE}
void main() {
  vec3 N = normalize(vN);
  float mark = 0.0;
  if (uLid > 0.5) {
    // brushed metal: fine scratches, all one way
    float brush = hash(vec2(floor(vL.z * 900.0), 3.0)) + hash(vec2(floor(vL.z * 2400.0), 8.0)) * 0.6 - 0.8;
    N = normalize(N + vec3(0.0, 0.0, brush * 0.03));
    if (vL.y > uTop - 0.0015) {
      vec2 uv = uCell.xy + (vL.xz / (2.0 * uLidHalf) + 0.5) * uCell.zw;
      mark = texture(uPrint, uv).a;
    }
  }
  vec3 V = normalize(uCam - vW);
  float nv = max(dot(N, V), 0.0);
  vec3 R = reflect(-V, N);
  vec3 F0 = mix(vec3(0.03), vC.rgb, vC.a);
  vec3 F = F0 + (1.0 - F0) * pow(1.0 - nv, 5.0);
  vec3 toSun = normalize(vec3(-0.6, 0.5, -0.56));
  vec3 sky = mix(vec3(0.44, 0.5, 0.68), vec3(0.76, 0.78, 0.82), N.y * 0.5 + 0.5);
  vec3 col = vC.rgb * (1.0 - vC.a) * (sky + vec3(0.36) * max(dot(N, toSun), 0.0)) + envStudio(R) * F * mix(0.5, 0.86, vC.a);
  col = mix(col, vec3(0.98, 0.985, 1.0), mark * 0.98);
  // a hand over this part: its edge lights up
  if (uGlow > 0.0) col += AZURE * uGlow * (1.0 - smoothstep(0.5, 0.98, N.y)) * 2.2 + AZURE * uGlow * 0.16;
  o = finish(col, vW);
}`;

/** A flat rectangle in the world: the board's surface, and the page it casts its shadow on */
export const PLANE_VS = `#version 300 es
precision highp float;
uniform mat4 uVP;
uniform vec4 uPlane;
uniform float uY;
out vec3 vW;
void main() {
  vec2 q = vec2(float(gl_VertexID & 1), float(gl_VertexID >> 1)) * 2.0 - 1.0;
  vW = vec3(uPlane.x + q.x * uPlane.z, uY, uPlane.y + q.y * uPlane.w);
  gl_Position = uVP * vec4(vW, 1.0);
}`;

/** The board: white solder mask, navy copper, the signals running along it and the path the camera is following */
export const BOARD_FS = `#version 300 es
precision highp float;
in vec3 vW;
out vec4 o;
uniform sampler2D uArt, uFlow, uShadows;
uniform float uHalf, uCorner, uTime, uBoot, uLinkT, uLinkAlpha, uHoverOn;
uniform vec2 uLink[4];
uniform vec4 uHover, uLidShade;
uniform vec2 uLidHalf;
${SURFACE}
float lidShadow(vec3 P) {
  if (uLidShade.w <= 0.0) return 1.0;
  vec2 d = abs(P.xz - uLidShade.xy);
  float s = uLidShade.z;
  vec2 k = 1.0 - smoothstep(uLidHalf - s, uLidHalf + s, d);
  return 1.0 - uLidShade.w * k.x * k.y;
}
void main() {
  vec2 P = vW.xz;
  vec2 e = abs(P) - vec2(uHalf - uCorner);
  if (length(max(e, vec2(0.0))) > uCorner) discard;
  vec2 uv = P / (2.0 * uHalf) + 0.5;
  vec3 art = pow(texture(uArt, uv).rgb, vec3(2.2));
  float baked = texture(uShadows, uv).r;
  vec3 col = art * mix(0.5, 1.0, baked) * lidShadow(vW);
  // the sheen of the solder mask, sliding as the camera moves
  vec3 V = normalize(uCam - vW);
  float sheen = pow(max(dot(reflect(-V, vec3(0.0, 1.0, 0.0)), uKey), 0.0), 40.0);
  col += vec3(0.05, 0.06, 0.08) * sheen;
  // signals on the copper
  vec4 f = texture(uFlow, uv);
  float cu = smoothstep(0.2, 0.8, f.r);
  float run = fract(f.g * 3.0 - uTime * (0.09 + f.b * 0.08) + f.b * 13.0);
  float awake = 0.55 + 0.45 * (1.0 - smoothstep(uBoot - 0.3, uBoot, length(P)));
  col = mix(col, AZURE, cu * pow(run, 18.0) * awake);
  col = mix(col, vec3(0.75, 0.88, 1.0), cu * pow(run, 90.0) * awake);
  // the power coming on: a wave running out over the copper
  float front = exp(-pow((length(P) - uBoot) / 0.09, 2.0));
  col = mix(col, AZURE, cu * front);
  // a hand over a part: a halo round it on the board
  if (uHoverOn > 0.001) {
    vec2 hc = (uHover.xy + uHover.zw) * 0.5;
    vec2 hs = (uHover.zw - uHover.xy) * 0.5;
    vec2 hd = abs(P - hc) - hs;
    float away = length(max(hd, vec2(0.0)));
    col = mix(col, AZURE, uHoverOn * 0.5 * exp(-away / 0.026));
  }
  // the path being followed: a bright run along the copper, ahead of the camera
  if (uLinkAlpha > 0.001) {
    float best = 9.0;
    float along = 0.0;
    float walked = 0.0;
    for (int i = 0; i < 3; i++) {
      vec2 a = uLink[i];
      vec2 sg = uLink[i + 1] - a;
      float L = length(sg);
      if (L < 0.0001) continue;
      float t = clamp(dot(P - a, sg) / (L * L), 0.0, 1.0);
      float d = length(P - a - sg * t);
      if (d < best) {
        best = d;
        along = walked + t * L;
      }
      walked += L;
    }
    float reach = uLinkT * walked;
    float shown = 1.0 - smoothstep(reach - 0.004, reach + 0.004, along);
    float core = 1.0 - smoothstep(0.022, 0.034, best);
    float moving = pow(fract(along * 7.0 - uTime * 1.7), 4.0);
    col = mix(col, mix(AZURE, vec3(0.6, 0.8, 1.0), moving), core * shown * uLinkAlpha);
    col = mix(col, AZURE, 0.22 * exp(-best * best / 0.004) * shown * uLinkAlpha);
  }
  o = finish(col, vW);
}`;

/** The white page under the board, with the board's soft shadow on it */
export const PAGE_FS = `#version 300 es
precision highp float;
in vec3 vW;
out vec4 o;
uniform float uHalf;
void main() {
  vec2 d = abs(vW.xz - vec2(0.05, 0.06)) - vec2(uHalf - 0.02);
  float r = length(max(d, vec2(0.0))) + min(max(d.x, d.y), 0.0);
  float k = 1.0 - smoothstep(-0.05, 0.3, r);
  o = vec4(mix(vec3(1.0), vec3(0.66, 0.72, 0.85), k * k), 1.0);
}`;

/** A line of light over the surface: the links on the web part, the connections in the network */
export const ARC_VS = `#version 300 es
precision highp float;
layout(location = 0) in vec3 aA;
layout(location = 1) in vec3 aB;
layout(location = 2) in vec2 aSeed;
uniform mat4 uVP;
uniform vec2 uRes;
uniform float uWidth, uSegments, uLift;
out float vT;
out float vSide;
out float vSeed;
vec3 at(float t) {
  vec3 p = mix(aA, aB, t);
  p.y = (p.y + sin(t * 3.14159) * aSeed.y) * uLift;
  return p;
}
void main() {
  float t = float(gl_VertexID / 2) / uSegments;
  float side = float(gl_VertexID & 1) * 2.0 - 1.0;
  vec4 c0 = uVP * vec4(at(t), 1.0);
  float e = t < 0.98 ? 0.02 : -0.02;
  vec4 c1 = uVP * vec4(at(t + e), 1.0);
  vec2 dir = normalize(((c1.xy / c1.w) - (c0.xy / c0.w)) * uRes * sign(e) + vec2(1e-5, 0.0));
  c0.xy += vec2(-dir.y, dir.x) * side * uWidth / uRes * c0.w;
  vT = t;
  vSide = side;
  vSeed = aSeed.x;
  gl_Position = c0;
}`;

export const ARC_FS = `#version 300 es
precision highp float;
in float vT;
in float vSide;
in float vSeed;
out vec4 o;
uniform float uTime, uAlpha, uSpeed, uBase;
uniform vec3 uColor;
void main() {
  float core = exp(-vSide * vSide * 3.4);
  float x = fract(vT - uTime * uSpeed * (0.7 + vSeed * 0.6) + vSeed * 7.0);
  float pulse = pow(x, 14.0);
  o = vec4(mix(uColor, vec3(0.75, 0.88, 1.0), pulse), clamp(core * uAlpha * (uBase * 2.2 + pulse * 1.4), 0.0, 1.0));
}`;

/** The network's neurons */
export const NODE_VS = `#version 300 es
precision highp float;
layout(location = 0) in vec3 aPos;
layout(location = 1) in float aSeed;
uniform mat4 uVP;
uniform float uTime, uPx, uLift, uAlpha;
out float vGlow;
void main() {
  vec3 p = vec3(aPos.x, aPos.y * uLift, aPos.z);
  vec4 c = uVP * vec4(p, 1.0);
  float fire = 0.45 + 0.55 * pow(0.5 + 0.5 * sin(uTime * 2.1 - aPos.x * 7.0 + aSeed * 2.0), 3.0);
  vGlow = fire * uAlpha;
  gl_PointSize = uPx * (0.7 + fire * 0.55) / c.w;
  gl_Position = c;
}`;

export const NODE_FS = `#version 300 es
precision highp float;
in float vGlow;
out vec4 o;
void main() {
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float d = dot(q, q);
  if (d > 1.0) discard;
  float solid = 1.0 - smoothstep(0.05, 0.12, d);
  o = vec4(mix(vec3(0.23, 0.48, 0.97), vec3(0.92, 0.96, 1.0), solid), clamp(solid + exp(-d * 5.0) * 0.4, 0.0, 1.0) * clamp(vGlow * 1.8, 0.0, 1.0));
}`;

/** What glows: colour only, so that the white board doesn't flood its own edges with light */
export const BRIGHT_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uTex;
uniform float uThreshold;
void main() {
  vec3 c = texture(uTex, vUv).rgb;
  float hi = max(c.r, max(c.g, c.b));
  float lo = min(c.r, min(c.g, c.b));
  outColor = vec4(c * smoothstep(uThreshold, 1.0, hi) * smoothstep(0.08, 0.3, hi - lo), 1.0);
}`;

export const BLUR_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uTex;
uniform vec2 uDir;
void main() {
  vec3 c = texture(uTex, vUv).rgb * 0.227027;
  c += (texture(uTex, vUv + uDir * 1.384615).rgb + texture(uTex, vUv - uDir * 1.384615).rgb) * 0.316216;
  c += (texture(uTex, vUv + uDir * 3.230769).rgb + texture(uTex, vUv - uDir * 3.230769).rgb) * 0.070270;
  outColor = vec4(c, 1.0);
}`;

/** The finish: the glow, and the picture coming up out of the white page */
export const COMPOSITE_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uScene, uBloom;
uniform float uBloomAmt, uFade;
void main() {
  vec3 col = texture(uScene, vUv).rgb;
  if (uBloomAmt > 0.0) {
    vec3 b = texture(uBloom, vUv).rgb * uBloomAmt;
    col = 1.0 - (1.0 - clamp(col, 0.0, 1.0)) * (1.0 - clamp(b, 0.0, 1.0));
  }
  outColor = vec4(mix(vec3(1.0), col, uFade), 1.0);
}`;
