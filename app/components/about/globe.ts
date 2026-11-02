// The realistic earth behind the About page's system map: a WebGL2 sphere with satellite imagery, drifting clouds,
// the sun where it really is right now, city lights on the night side, and sharper imagery tiers for the zoom.
//
// Imagery: NASA Blue Marble / Black Marble (public domain) and Sentinel-2 cloudless 2016 by EOX (CC BY 4.0).

import { smooth, TARGET } from './mapCanvas';

export type GlobeFrame = {
  cx: number;
  cy: number;
  R: number;
  lon0: number;
  lat0: number;
  fov: number; // km across the view
  time: number;
  fade: number; // 0 = full imagery, 1 = faded into the page background
};

export type Globe = {
  resize: (w: number, h: number, dpr: number) => void;
  draw: (f: GlobeFrame) => void;
  clear: () => void;
  isReady: () => boolean;
  sleep: () => void; // frees the sharp imagery while the planet is far off screen; it comes back on its own
  destroy: () => void;
};

type Box = [number, number, number, number]; // minLon, minLat, maxLon, maxLat

// Sharper imagery as the camera closes in: squares centred on the office, each half the size of the last, so there is
// always one sharp enough for the current zoom. (Keep the spans in step with the image files in public/about/earth.)
const TIERS: { file: string; box: Box; km: number }[] = [72, 36, 18, 9, 4.5, 2.25, 1.125, 0.5625, 0.28125].map((span, i) => ({
  file: `tier${i}`,
  box: [TARGET.lon - span / 2, TARGET.lat - span / 2, TARGET.lon + span / 2, TARGET.lat + span / 2],
  km: span * 111.32,
}));

const DEG = Math.PI / 180;

// Weaker devices: the earth drops to fewer pixels rather than dropping frames. The lines and text on top stay sharp.
const QUALITY = [1, 0.85, 0.7, 0.55];
const WATCH_FRAMES = 45;
const SLOW_FRAME_MS = 26;

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
out vec4 outColor;

uniform vec2 uCenter;
uniform float uR;
uniform float uDpr;
uniform float uHeight;
uniform float uLon0;      // degrees
uniform float uSin0;
uniform float uCos0;
uniform vec3 uSun;        // in view space
uniform float uDaylight;  // 0 = the real sun, 1 = lit everywhere (close-ups)
uniform float uClouds;
uniform float uGlint;     // sun on the water, only on the whole-planet view
uniform float uSea;       // colour for the base image's dark oceans (close-ups bring their own)
uniform float uTime;
uniform float uFade;
uniform sampler2D uWorld;
uniform sampler2D uCloudTex;
uniform sampler2D uNight;
${TIERS.map((_, i) => `uniform sampler2D uTier${i};`).join('\n')}
uniform vec4 uBox[${TIERS.length}];     // lon0 - minLon, maxLat, span, opacity

const vec3 BG = vec3(0.0039, 0.0275, 0.1686); // --color-midnight

// A sharper image laid over part of the planet, feathered at its edges (only read where it actually shows)
void tier(inout vec3 col, sampler2D t, vec4 box, float dLon, float lat, vec2 ddx, vec2 ddy) {
  if (box.w <= 0.0) return;
  float u = (box.x + dLon) / box.z;
  float v = (box.y - lat) / box.z;
  float edge = min(min(u, 1.0 - u), min(v, 1.0 - v));
  if (edge <= 0.0) return;
  vec3 c = textureGrad(t, vec2(u, v), ddx / box.z, ddy / box.z).rgb;
  float a = smoothstep(0.0, 0.1, edge) * box.w;
  col = mix(col, c, a);
}

float stars(vec2 p) {
  vec2 cell = floor(p / 3.0);
  float h = fract(sin(dot(cell, vec2(127.1, 311.7))) * 43758.5453);
  if (h < 0.9965) return 0.0;
  vec2 f = fract(p / 3.0) - 0.5;
  float tw = 0.65 + 0.35 * sin(uTime * (0.6 + h * 2.0) + h * 90.0);
  return smoothstep(0.5, 0.05, length(f)) * (h - 0.9965) / 0.0035 * tw;
}

void main() {
  vec2 px = vec2(gl_FragCoord.x, uHeight - gl_FragCoord.y) / uDpr;
  float x = (px.x - uCenter.x) / uR;
  float y = (uCenter.y - px.y) / uR;
  float r2 = x * x + y * y;
  float r = sqrt(r2);
  vec3 col = BG;

  // Space and the glow of the atmosphere around the planet
  vec3 sunXY = normalize(vec3(uSun.xy, 0.001));
  vec2 dir = r > 0.0 ? vec2(x, y) / r : vec2(0.0);
  float sunSide = smoothstep(-0.6, 0.7, dot(dir, sunXY.xy));
  if (r >= 0.985) {
    col += vec3(0.8, 0.88, 1.0) * stars(px) * 0.85;
    float halo = exp(-max(r - 1.0, 0.0) * 20.0) * (0.14 + 0.86 * sunSide * mix(1.0, 0.65, smoothstep(0.0, 1.0, -uSun.z)));
    col = mix(col, vec3(0.34, 0.6, 1.0), clamp(halo, 0.0, 1.0) * 0.8);
  }

  // Work the lookups out everywhere so the mipmap slopes stay valid; the images themselves are only read on the planet
  float z = sqrt(max(0.0, 1.0 - r2));
  float yw = y * uCos0 + z * uSin0;
  float zw = z * uCos0 - y * uSin0;
  float lat = asin(clamp(yw, -1.0, 1.0)) / ${DEG};
  float dLon = atan(x, zw) / ${DEG};
  float u = (uLon0 + dLon + 180.0) / 360.0;
  float v = (90.0 - lat) / 180.0;

  // (the slopes that keep mipmaps correct across the date line)
  float a = fract(u);
  float b = fract(u + 0.5) - 0.5;
  float ax = dFdx(a), bx = dFdx(b), ay = dFdy(a), by = dFdy(b);
  vec2 wx = vec2(abs(ax) < abs(bx) ? ax : bx, dFdx(v));
  vec2 wy = vec2(abs(ay) < abs(by) ? ay : by, dFdy(v));
  vec2 tx = vec2(dFdx(dLon), -dFdx(lat));
  vec2 ty = vec2(dFdy(dLon), -dFdy(lat));

  if (r < 1.0) {
    vec3 surface = textureGrad(uWorld, vec2(u, v), wx, wy).rgb;
    ${TIERS.map((_, i) => `tier(surface, uTier${i}, uBox[${i}], dLon, lat, tx, ty);`).join('\n    ')}
    float lights = uDaylight < 1.0 ? textureGrad(uNight, vec2(u, v), wx, wy).r : 0.0;
    float cloud = uClouds > 0.0 ? textureGrad(uCloudTex, vec2(u + uTime * 0.00022, v), wx, wy).r : 0.0;

    vec3 n = vec3(x, y, z);
    float sun = dot(n, uSun);
    float day = mix(smoothstep(-0.1, 0.24, sun), 1.0, uDaylight);

    // daylight with a soft night side and a warm line along the sunset
    vec3 lit = surface * (0.05 + 1.12 * day) + vec3(0.006, 0.016, 0.05) * (1.0 - day);
    float dusk = smoothstep(0.0, 0.1, sun + 0.06) * smoothstep(0.26, 0.04, sun) * (1.0 - uDaylight);
    lit += surface * vec3(0.5, 0.2, 0.05) * dusk;

    // sun glinting off the water (the imagery itself tells us what is ocean)
    float water = smoothstep(0.012, 0.05, surface.b - max(surface.r, surface.g * 0.92)) * (1.0 - smoothstep(0.14, 0.32, dot(surface, vec3(0.333))));
    lit += water * vec3(0.012, 0.06, 0.15) * day * uSea;
    vec3 hv = normalize(uSun + vec3(0.0, 0.0, 1.0));
    float glint = pow(max(dot(n, hv), 0.0), 160.0) * water * day * uGlint;
    lit += vec3(0.85, 0.92, 1.0) * glint * 0.4;

    // cities at night
    lit += vec3(1.0, 0.76, 0.42) * lights * lights * 1.5 * (1.0 - day);

    // clouds, catching the same light
    float c = smoothstep(0.18, 0.82, cloud) * uClouds;
    lit = mix(lit, vec3(0.96, 0.98, 1.0) * (0.035 + 1.02 * day), c * 0.92);

    // the air thickens towards the edge of the disc
    float rim = pow(1.0 - z, 3.2);
    vec3 air = vec3(0.32, 0.58, 1.0) * (0.08 + 1.05 * day);
    lit = mix(lit, air, clamp(rim * 1.05, 0.0, 0.9));
    lit *= mix(0.78, 1.0, smoothstep(0.0, 0.42, z));

    // crisp edge against space
    float edge = smoothstep(1.0, 1.0 - 1.6 / uR, r);
    col = mix(col, lit, edge);
  }

  outColor = vec4(mix(col, BG, uFade), 1.0);
}`;

/** Where the sun is overhead right now (degrees) */
function subSolarPoint(now: Date) {
  const start = Date.UTC(now.getUTCFullYear(), 0, 0);
  const day = (now.getTime() - start) / 86400000;
  const lat = -23.44 * Math.cos(((2 * Math.PI) / 365) * (day + 10));
  const hours = now.getUTCHours() + now.getUTCMinutes() / 60;
  return { lat, lon: -(hours - 12) * 15 };
}

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const s = gl.createShader(type);
  if (!s) return null;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.warn('Globe shader:', gl.getShaderInfoLog(s));
    return null;
  }
  return s;
}

/** Returns null where WebGL2 isn't available; the map then keeps its drawn line globe. */
export function createGlobe(canvas: HTMLCanvasElement, small: boolean, onChange: () => void): Globe | null {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance' });
  if (!gl) return null;
  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  const program = gl.createProgram();
  if (!vs || !fs || !program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const pos = gl.getAttribLocation(program, 'aPos');
  gl.enableVertexAttribArray(pos);
  gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

  const u = (n: string) => gl.getUniformLocation(program, n);
  const uni = {
    center: u('uCenter'), r: u('uR'), dpr: u('uDpr'), height: u('uHeight'), lon0: u('uLon0'), sin0: u('uSin0'), cos0: u('uCos0'),
    sun: u('uSun'), daylight: u('uDaylight'), clouds: u('uClouds'), glint: u('uGlint'), sea: u('uSea'), time: u('uTime'), fade: u('uFade'), box: u('uBox'),
  };
  const aniso = gl.getExtension('EXT_texture_filter_anisotropic');

  // A placeholder pixel in every slot so the shader is valid before anything has loaded
  const slots = ['uWorld', 'uCloudTex', 'uNight', ...TIERS.map((_, i) => `uTier${i}`)];
  const textures = slots.map((name, i) => {
    const tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + i);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([1, 7, 43, 255]));
    gl.uniform1i(u(name), i);
    return tex;
  });
  const loaded = slots.map(() => false);

  const aborter = new AbortController();
  let destroyed = false;
  let dirty = true; // something changed that the last picture doesn't show
  let settle = 60; // frames to ignore before judging the device: the page is still starting up
  const upload = (slot: number, img: TexImageSource, repeat: boolean) => {
    if (destroyed) return;
    gl.activeTexture(gl.TEXTURE0 + slot);
    gl.bindTexture(gl.TEXTURE_2D, textures[slot]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(small ? 2 : 4, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
    loaded[slot] = true;
    dirty = true;
    settle = Math.max(settle, 12); // (the upload itself can make a frame or two slow; that says nothing about the device)
    onChange();
  };
  // Decoding already happens off the main thread; handing the image to the GPU is the part that can hold up a frame, so it waits for a quiet moment
  const quietMoment = () => new Promise<void>((done) => {
    if ('requestIdleCallback' in window) window.requestIdleCallback(() => done(), { timeout: 200 });
    else setTimeout(done, 0);
  });
  const fetchImage = async (file: string, slot: number, repeat: boolean, stillWanted: () => boolean = () => true) => {
    try {
      const res = await fetch(`/about/earth/${file}.webp`, { signal: aborter.signal });
      if (!res.ok) return;
      const bitmap = await createImageBitmap(await res.blob());
      await quietMoment();
      if (stillWanted()) upload(slot, bitmap, repeat);
      bitmap.close();
    } catch {
      // the planet simply stays one level less detailed
    }
  };
  const suffix = small ? '-s' : '';
  const tooBig = gl.getParameter(gl.MAX_TEXTURE_SIZE) < 4096;
  (async () => {
    await fetchImage(small || tooBig ? 'world-s' : 'world', 0, true);
    await Promise.all([fetchImage('clouds', 1, true), fetchImage('night', 2, true)]);
  })();

  let width = 1;
  let height = 1;
  let cssHeight = 1;
  let dpr = 1;
  let lastTime = 0;
  let nextTier = 0; // sharper imagery is fetched one tier at a time, just ahead of where the camera is heading
  let fetching = false;
  let generation = 0; // goes up when the sharp imagery is freed, so anything still on its way is dropped
  const ramp = TIERS.map(() => 0); // each tier fades in once it arrives
  const boxes = new Float32Array(TIERS.length * 4);
  const last = { cx: 0, cy: 0, R: 0, lon0: 0, lat0: 0, fade: -1 };
  let sun = subSolarPoint(new Date());
  let sunAt = 0;

  // Watches how the device is coping. A lower step that doesn't help means the frame rate is capped (a phone's
  // low-power mode, say), not struggling, so it goes back up and stops trying.
  let quality = 0;
  let locked = false;
  let lastDraw = 0;
  let watched = 0;
  let slowFrames = 0;
  let watchedMs = 0;
  let paceBefore = 0;
  const applySize = () => {
    const scale = dpr * QUALITY[quality];
    height = Math.round(cssHeight * scale);
    canvas.width = Math.round(width * scale);
    canvas.height = height;
    gl.viewport(0, 0, canvas.width, canvas.height);
    dirty = true;
  };
  const changeQuality = (to: number) => {
    quality = to;
    applySize();
    settle = 20;
  };
  const watchDevice = () => {
    const now = performance.now();
    const gap = now - lastDraw;
    lastDraw = now;
    if (locked || gap > 250) return; // (a pause, not a slow frame)
    if (settle > 0) {
      settle -= 1;
      return;
    }
    watched += 1;
    watchedMs += gap;
    if (gap > SLOW_FRAME_MS) slowFrames += 1;
    if (watched < WATCH_FRAMES) return;
    const pace = watchedMs / watched;
    const slow = slowFrames > watched * 0.6;
    watched = 0;
    watchedMs = 0;
    slowFrames = 0;
    if (paceBefore && pace > paceBefore * 0.92) {
      changeQuality(quality - 1);
      locked = true;
      return;
    }
    paceBefore = 0;
    if (!slow) return;
    if (quality === QUALITY.length - 1) {
      locked = true;
      return;
    }
    paceBefore = pace;
    changeQuality(quality + 1);
  };

  return {
    resize(w, h, d) {
      dpr = d;
      width = w;
      cssHeight = h;
      applySize();
    },
    draw(f) {
      if (!loaded[0] || gl.isContextLost()) return;

      // How much ground the view covers, out to its farthest corner
      const far = Math.max(Math.hypot(f.cx, f.cy), Math.hypot(width - f.cx, f.cy), Math.hypot(f.cx, cssHeight - f.cy), Math.hypot(width - f.cx, cssHeight - f.cy));
      const viewKm = ((2 * far) / (f.R * DEG)) * 111.32;
      if (!fetching && loaded[0] && nextTier < TIERS.length && viewKm < TIERS[nextTier].km * 6) {
        fetching = true;
        const asked = generation;
        fetchImage(TIERS[nextTier].file + suffix, 3 + nextTier, false, () => asked === generation).finally(() => {
          if (asked !== generation) return;
          fetching = false;
          nextTier += 1;
        });
      }
      const dt = Math.max(0, f.time - lastTime);
      lastTime = f.time;
      TIERS.forEach((t, i) => {
        if (loaded[3 + i] && ramp[i] < 1) {
          ramp[i] = f.time === 0 ? 1 : Math.min(1, ramp[i] + dt / 0.5);
          dirty = true;
        }
        boxes[i * 4] = f.lon0 - t.box[0];
        boxes[i * 4 + 1] = t.box[3];
        boxes[i * 4 + 2] = t.box[2] - t.box[0];
        // comes in while it only covers the middle of the view: the middle is what the eye is on
        boxes[i * 4 + 3] = ramp[i] * (1 - smooth(t.km * 1.2, t.km * 1.8, viewKm));
      });

      // When the camera is still and nothing on the planet is moving, the last picture is still right
      const clouds = loaded[1] ? smooth(5500, 9500, f.fov) : 0;
      const glint = smooth(9000, 12000, f.fov);
      const space = far >= f.R * 0.98; // stars twinkling beyond the edge of the disc
      if (!dirty && !clouds && !glint && !space && f.cx === last.cx && f.cy === last.cy && f.R === last.R && f.lon0 === last.lon0 && f.lat0 === last.lat0 && f.fade === last.fade) {
        lastDraw = performance.now();
        return;
      }
      dirty = false;
      Object.assign(last, { cx: f.cx, cy: f.cy, R: f.R, lon0: f.lon0, lat0: f.lat0, fade: f.fade });
      watchDevice();

      gl.uniform2f(uni.center, f.cx, f.cy);
      gl.uniform1f(uni.r, f.R);
      gl.uniform1f(uni.dpr, dpr * QUALITY[quality]);
      gl.uniform1f(uni.height, height);
      gl.uniform1f(uni.lon0, f.lon0);
      const sin0 = Math.sin(f.lat0 * DEG);
      const cos0 = Math.cos(f.lat0 * DEG);
      gl.uniform1f(uni.sin0, sin0);
      gl.uniform1f(uni.cos0, cos0);

      // (the sun barely moves in a minute)
      if (Math.abs(f.time - sunAt) > 60) {
        sun = subSolarPoint(new Date());
        sunAt = f.time;
      }
      const sp = Math.sin(sun.lat * DEG);
      const cp = Math.cos(sun.lat * DEG);
      const l = (sun.lon - f.lon0) * DEG;
      gl.uniform3f(uni.sun, cp * Math.sin(l), cos0 * sp - sin0 * cp * Math.cos(l), sin0 * sp + cos0 * cp * Math.cos(l));

      // As the camera descends it's always daylight, and it flies down through the clouds
      gl.uniform1f(uni.daylight, 1 - smooth(2600, 7500, f.fov));
      gl.uniform1f(uni.clouds, clouds);
      gl.uniform1f(uni.glint, glint);
      gl.uniform1f(uni.time, f.time);
      gl.uniform1f(uni.fade, f.fade);
      gl.uniform1f(uni.sea, 1 - boxes[3]);
      gl.uniform4fv(uni.box, boxes);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    clear() {
      gl.clearColor(0.0039, 0.0275, 0.1686, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      dirty = true;
    },
    sleep() {
      generation += 1;
      fetching = false;
      nextTier = 0;
      TIERS.forEach((_, i) => {
        if (!loaded[3 + i]) return;
        loaded[3 + i] = false;
        ramp[i] = 0;
        gl.activeTexture(gl.TEXTURE0 + 3 + i);
        gl.bindTexture(gl.TEXTURE_2D, textures[3 + i]);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([1, 7, 43, 255]));
      });
      dirty = true;
    },
    isReady: () => loaded[0] && !gl.isContextLost(),
    destroy() {
      destroyed = true;
      aborter.abort();
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}
