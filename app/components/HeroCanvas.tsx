'use client';

import { useEffect, useRef } from 'react';
import { releaseContext } from './releaseContext';

const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

// Two layers, tinted brand blue on a transparent canvas:
//  1. tileable water caustics (after Dave Hoskins) that lean towards the cursor
//  2. a blueprint dot grid — dots swell near the cursor, clicks send ripple waves through it
const FRAG = `
precision mediump float;
uniform vec2 u_res;
uniform float u_time;
uniform float u_dpr;
uniform vec2 u_mouse;
uniform vec3 u_ripples[4]; // xy = position (px), z = start time (s)
uniform float u_live;      // 1.0 while any ripple is still travelling

#define TAU 6.28318530718
#define MAX_ITER 5

float rippleAt(vec2 p) {
  float r = 0.0;
  if (u_live < 0.5) return r;
  for (int k = 0; k < 4; k++) {
    float age = u_time - u_ripples[k].z;
    if (age > 0.0 && age < 2.0) {
      float radius = age * 820.0 * u_dpr;
      float d = length(p - u_ripples[k].xy) - radius;
      r += exp(-(d * d) / (2200.0 * u_dpr * u_dpr)) * (1.0 - age / 2.0);
    }
  }
  return r;
}

void main() {
  vec2 fc = gl_FragCoord.xy;
  vec2 mpx = u_mouse * u_res;

  // --- caustics ---
  vec2 uv = fc / u_res.y;
  vec2 m = u_mouse * vec2(u_res.x / u_res.y, 1.0);
  uv += (m - uv) * 0.04;
  float t = u_time * 0.34 + 23.0;
  vec2 p = mod(uv * TAU * 0.9, TAU) - 250.0;
  vec2 i = p;
  float c = 1.0;
  float inten = 0.005;
  for (int n = 0; n < MAX_ITER; n++) {
    float tt = t * (1.0 - (3.5 / float(n + 1)));
    i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
    c += 1.0 / length(vec2(p.x / (sin(i.x + tt) / inten), p.y / (cos(i.y + tt) / inten)));
  }
  c /= float(MAX_ITER);
  c = 1.17 - pow(c, 1.4);
  float v = clamp(pow(abs(c), 8.0), 0.0, 1.0);

  float glow = 0.55 + 0.9 * exp(-distance(uv, m) * 2.2);
  float fade = smoothstep(0.0, 0.12, fc.y / u_res.y); // final fade-out is a CSS mask in Hero.tsx
  float caustic = v * glow * fade * 0.6 * (1.0 + rippleAt(fc) * 0.8);

  // --- blueprint dot grid ---
  float cell = 46.0 * u_dpr;
  vec2 g = fc / cell;
  vec2 center = (floor(g) + 0.5) * cell;
  float near = exp(-length(center - mpx) / (170.0 * u_dpr));
  float wave = rippleAt(center);
  float energy = clamp(near + wave, 0.0, 1.0);
  float radius = (0.9 + 2.0 * energy) * u_dpr;
  float dotMask = 1.0 - smoothstep(radius, radius + u_dpr, length(fc - center));
  float dots = dotMask * (0.16 + 0.84 * energy);

  vec2 f = fract(g);
  float edge = min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y)) * cell;
  float lines = (1.0 - smoothstep(0.0, u_dpr, edge)) * (near * 0.28 + wave * 0.22);

  float a = clamp(caustic + (dots * 0.6 + lines) * fade, 0.0, 1.0);
  vec3 col = mix(vec3(0.004, 0.267, 0.71), vec3(0.15, 0.34, 0.78), v);
  gl_FragColor = vec4(col * a, a);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
}

export default function HeroCanvas({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', { premultipliedAlpha: true, antialias: false });
    if (!gl) return; // no WebGL → the CSS aura behind still looks fine

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, 'u_res');
    const uTime = gl.getUniformLocation(prog, 'u_time');
    const uMouse = gl.getUniformLocation(prog, 'u_mouse');
    const uDpr = gl.getUniformLocation(prog, 'u_dpr');
    const uRipples = gl.getUniformLocation(prog, 'u_ripples');
    const uLive = gl.getUniformLocation(prog, 'u_live');

    // Reduced-motion visitors still get the ambient effect, just calmer
    const speed = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0.6 : 1;
    // Touch screens have no hover, so a "virtual cursor" drifts around until someone touches
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    let lastPointerAt = -1e9;
    const AUTO_RIPPLE_EVERY = 4.5; // seconds, touch screens only
    const mouse = { x: 0.7, y: 0.6 };
    const target = { x: 0.7, y: 0.6 };
    const ripples = new Float32Array([0, 0, -99, 0, 0, -99, 0, 0, -99, 0, 0, -99]);
    const RIPPLE_LIFE = 2.0;
    let lastRippleAt = -99;
    let nextRipple = 0;
    let raf = 0;
    let visible = true;
    let dpr = 1;
    let lastFrame = 0;
    // Cached canvas position, so pointer events never force a layout
    let rect = canvas.getBoundingClientRect();
    const updateRect = () => { rect = canvas.getBoundingClientRect(); };
    const start = performance.now();
    const elapsed = () => (performance.now() - start) / 1000;

    const resize = () => {
      // Soft caustics don't need full retina resolution
      dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 1.25);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      updateRect();
    };

    const addRipple = (x: number, y: number, at: number) => {
      lastRippleAt = at;
      ripples.set([x, y, at], nextRipple * 3);
      nextRipple = (nextRipple + 1) % 4;
    };

    const draw = () => {
      const time = elapsed() * speed;
      if (performance.now() - lastPointerAt > 2500) {
        // Idle: wander on a slow Lissajous path so the dot-grid glow keeps moving
        target.x = 0.5 + 0.34 * Math.sin(time * 0.33);
        target.y = 0.55 + 0.24 * Math.sin(time * 0.47 + 1.2);
      }
      mouse.x += (target.x - mouse.x) * 0.09;
      mouse.y += (target.y - mouse.y) * 0.09;
      // Touch screens: while nobody is touching, the wandering glow sends out a ripple now and then
      if (coarse && performance.now() - lastPointerAt > 2500 && time - lastRippleAt > AUTO_RIPPLE_EVERY) {
        addRipple(mouse.x * canvas.width, mouse.y * canvas.height, time);
      }
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, time);
      gl.uniform1f(uLive, time - lastRippleAt < RIPPLE_LIFE ? 1 : 0);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.uniform1f(uDpr, dpr);
      gl.uniform3fv(uRipples, ripples);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    // Capped at ~60fps so 120/144Hz screens don't render twice the frames
    const loop = (now: number) => {
      if (now - lastFrame >= 15) {
        lastFrame = now;
        draw();
      }
      if (visible) raf = requestAnimationFrame(loop);
    };

    const onPointer = (e: PointerEvent) => {
      if (!visible) return;
      lastPointerAt = performance.now();
      target.x = (e.clientX - rect.left) / rect.width;
      target.y = 1 - (e.clientY - rect.top) / rect.height;
    };

    const onDown = (e: PointerEvent) => {
      if (!visible) return;
      updateRect(); // clicks are rare, so take an exact measurement
      const r = rect;
      if (e.clientY < r.top || e.clientY > r.bottom || e.clientX < r.left || e.clientX > r.right) return;
      lastPointerAt = performance.now();
      target.x = (e.clientX - r.left) / r.width;
      target.y = 1 - (e.clientY - r.top) / r.height;
      addRipple(target.x * canvas.width, target.y * canvas.height, elapsed() * speed);
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible) {
        updateRect();
        raf = requestAnimationFrame(loop);
      }
    });

    const ro = new ResizeObserver(() => {
      resize();
    });

    resize();
    ro.observe(canvas);
    io.observe(canvas);
    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('scroll', updateRect, { passive: true });

    return () => {
      window.removeEventListener('scroll', updateRect);
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('pointerdown', onDown);
      releaseContext(gl, canvas);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className={className} />;
}
