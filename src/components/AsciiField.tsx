"use client";

import { useEffect, useRef } from "react";

type AsciiFieldProps = {
  className?: string;
  /** Character ramp, sparse -> dense. */
  ramp?: string;
  /** Cell font size in px. */
  cell?: number;
  /** Drift speed, 0-120. 0 holds the field still. */
  speed?: number;
  /** Noise feature size — larger means broader cloud shapes. */
  scale?: number;
  /** Share of the field left empty, 8-88. Higher reads sparser. */
  coverage?: number;
  /** Pointer bloom radius, in cells. */
  radius?: number;
  /** How long the pointer trail lingers, 0-100. */
  trail?: number;
  /** Layer opacity on top of whatever sits behind it. */
  opacity?: number;
  /** Heat gradient — accent is the outer glow, hot is the core. */
  accent?: string;
  accentHot?: string;
  /** Resting field colours, sparse to dense. */
  dim?: string;
  bright?: string;
  /** Fade the field out under centred hero copy so text stays readable. */
  centerFade?: boolean;
};

const BASE_LEVELS = 6;
const HEAT_LEVELS = 8;

/**
 * A drifting field of characters rendered to canvas, with a pointer that
 * burns heat into the grid and a click that drops a ripple.
 *
 * The layer is decorative and sits behind content, so it listens for pointer
 * events on the window rather than on the canvas — otherwise the hero copy
 * sitting on top of it would swallow every move.
 */
export default function AsciiField({
  className,
  ramp = "  ..::--==++**##",
  cell = 14,
  speed = 26,
  scale = 46,
  coverage = 54,
  radius = 9,
  trail = 62,
  opacity = 0.6,
  accent = "#a7f932",
  accentHot = "#e8ffb0",
  dim = "#16281a",
  bright = "#7c9e82",
  centerFade = true,
}: AsciiFieldProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Settings are read every frame from a ref so prop tweaks never restart the
  // animation loop (and never re-seed the noise).
  const cfg = useRef({ ramp, cell, speed, scale, coverage, radius, trail, accent, accentHot, dim, bright });

  useEffect(() => {
    cfg.current = { ramp, cell, speed, scale, coverage, radius, trail, accent, accentHot, dim, bright };
  });

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;

    let cols = 0;
    let rows = 0;
    let cw = 8;
    let chh = 18;
    let aspect = 2;
    let dpr = 1;
    let heat = new Float32Array(0);
    let lut: string[] = [];
    let t = 0;
    let last = 0;
    let running = true;
    let visible = true;
    let raf = 0;
    let fontFamily = "ui-monospace, monospace";
    let measuredCell = 0;

    const ripples: { x: number; y: number; age: number }[] = [];
    const pointer = { x: -1e4, y: -1e4, px: -1e4, py: -1e4, inside: false };

    /* ---------- value noise ---------- */
    const hash3 = (x: number, y: number, z: number) => {
      let n = (x * 1597334677) ^ (y * 3812015801) ^ (z * 2654435761);
      n = Math.imul(n ^ (n >>> 13), 1274126177);
      return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
    };
    const smooth = (a: number) => a * a * (3 - 2 * a);

    const vnoise = (x: number, y: number, z: number) => {
      const xi = Math.floor(x);
      const yi = Math.floor(y);
      const zi = Math.floor(z);
      const xf = smooth(x - xi);
      const yf = smooth(y - yi);
      const zf = smooth(z - zi);
      const c000 = hash3(xi, yi, zi);
      const c100 = hash3(xi + 1, yi, zi);
      const c010 = hash3(xi, yi + 1, zi);
      const c110 = hash3(xi + 1, yi + 1, zi);
      const c001 = hash3(xi, yi, zi + 1);
      const c101 = hash3(xi + 1, yi, zi + 1);
      const c011 = hash3(xi, yi + 1, zi + 1);
      const c111 = hash3(xi + 1, yi + 1, zi + 1);
      const x00 = c000 + (c100 - c000) * xf;
      const x10 = c010 + (c110 - c010) * xf;
      const x01 = c001 + (c101 - c001) * xf;
      const x11 = c011 + (c111 - c011) * xf;
      const y0 = x00 + (x10 - x00) * yf;
      const y1 = x01 + (x11 - x01) * yf;
      return y0 + (y1 - y0) * zf;
    };

    const fbm = (x: number, y: number, z: number) =>
      vnoise(x, y, z) * 0.5333 +
      vnoise(x * 2.03, y * 2.03, z * 1.7) * 0.2667 +
      vnoise(x * 4.11, y * 4.11, z * 2.6) * 0.1333 +
      vnoise(x * 8.07, y * 8.07, z * 3.4) * 0.0667;

    /* ---------- colour ---------- */
    const hex2rgb = (h: string): [number, number, number] => [
      parseInt(h.slice(1, 3), 16),
      parseInt(h.slice(3, 5), 16),
      parseInt(h.slice(5, 7), 16),
    ];
    const mix = (a: number[], b: number[], k: number) => [
      a[0] + (b[0] - a[0]) * k,
      a[1] + (b[1] - a[1]) * k,
      a[2] + (b[2] - a[2]) * k,
    ];
    const css = (c: number[]) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;

    let lutKey = "";
    const buildLut = () => {
      const c = cfg.current;
      const key = c.dim + c.bright + c.accent + c.accentHot;
      if (key === lutKey) return;
      lutKey = key;
      const lo = hex2rgb(c.dim);
      const hi = hex2rgb(c.bright);
      const acc = hex2rgb(c.accent);
      const hot = hex2rgb(c.accentHot);
      lut = [];
      for (let s = 0; s < BASE_LEVELS; s++) {
        const base = mix(lo, hi, Math.pow(s / (BASE_LEVELS - 1), 0.85));
        for (let h = 0; h < HEAT_LEVELS; h++) {
          const k = h / (HEAT_LEVELS - 1);
          const target = mix(acc, hot, Math.max(0, (k - 0.62) / 0.38));
          lut.push(css(mix(base, target, Math.pow(k, 0.6))));
        }
      }
    };

    /* ---------- render buckets ---------- */
    const nBuckets = BASE_LEVELS * HEAT_LEVELS;
    const bChar: string[][] = [];
    const bX: number[][] = [];
    const bY: number[][] = [];
    const bN = new Int32Array(nBuckets);
    for (let i = 0; i < nBuckets; i++) {
      bChar.push([]);
      bX.push([]);
      bY.push([]);
    }

    /* ---------- layout ---------- */
    const measure = () => {
      const c = cfg.current;
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      if (!w || !h) return;
      dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = `${c.cell}px ${fontFamily}`;
      ctx.textBaseline = "middle";
      measuredCell = c.cell;
      cw = ctx.measureText("M").width || c.cell * 0.6;
      chh = Math.round(c.cell * 1.32);
      aspect = chh / cw;
      cols = Math.ceil(w / cw) + 1;
      rows = Math.ceil(h / chh) + 1;
      if (heat.length !== cols * rows) heat = new Float32Array(cols * rows);
    };

    /* ---------- heat ---------- */
    const stamp = (cx: number, cy: number, strength: number) => {
      const r = cfg.current.radius;
      const r2 = r * r;
      const x0 = Math.max(0, Math.floor(cx - r));
      const x1 = Math.min(cols - 1, Math.ceil(cx + r));
      const y0 = Math.max(0, Math.floor(cy - r / aspect));
      const y1 = Math.min(rows - 1, Math.ceil(cy + r / aspect));
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const dx = x - cx;
          const dy = (y - cy) * aspect;
          const d2 = dx * dx + dy * dy;
          if (d2 > r2) continue;
          const f = 1 - d2 / r2;
          const i = y * cols + x;
          heat[i] = Math.min(1.35, heat[i] + f * f * strength);
        }
      }
    };

    const ripple = (cx: number, cy: number, age: number) => {
      const rad = age * 34;
      const band = 2.4 + age * 3;
      const life = Math.max(0, 1 - age / 1.5);
      if (life <= 0) return false;
      const reach = rad + band;
      const x0 = Math.max(0, Math.floor(cx - reach));
      const x1 = Math.min(cols - 1, Math.ceil(cx + reach));
      const y0 = Math.max(0, Math.floor(cy - reach / aspect));
      const y1 = Math.min(rows - 1, Math.ceil(cy + reach / aspect));
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const dx = x - cx;
          const dy = (y - cy) * aspect;
          const d = Math.sqrt(dx * dx + dy * dy);
          const off = Math.abs(d - rad);
          if (off > band) continue;
          const f = (1 - off / band) * life;
          const i = y * cols + x;
          heat[i] = Math.min(1.35, heat[i] + f * f * 0.5);
        }
      }
      return true;
    };

    /* ---------- frame ---------- */
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (!running || !visible || !cols || !rows) {
        last = now;
        return;
      }

      const c = cfg.current;
      if (c.cell !== measuredCell) measure();
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
      last = now;
      if (!reduceMotion) t += dt * (c.speed / 100) * 0.9;

      const decay = Math.pow(0.86 + (c.trail / 100) * 0.135, dt * 60);
      for (let i = 0, n = heat.length; i < n; i++) {
        if (heat[i] > 0.0015) heat[i] *= decay;
        else heat[i] = 0;
      }

      if (pointer.inside) {
        const cx = pointer.x / cw;
        const cy = pointer.y / chh;
        const pcx = pointer.px / cw;
        const pcy = pointer.py / chh;
        const steps = Math.min(12, Math.ceil(Math.hypot(cx - pcx, cy - pcy) / 1.2));
        if (steps <= 1) {
          stamp(cx, cy, 0.75);
        } else {
          for (let s = 1; s <= steps; s++) {
            const k = s / steps;
            stamp(pcx + (cx - pcx) * k, pcy + (cy - pcy) * k, (0.75 / steps) * 1.7);
          }
        }
        pointer.px = pointer.x;
        pointer.py = pointer.y;
      }

      for (let r = ripples.length - 1; r >= 0; r--) {
        ripples[r].age += dt;
        if (!ripple(ripples[r].x, ripples[r].y, ripples[r].age)) ripples.splice(r, 1);
      }

      buildLut();
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

      const chars = c.ramp;
      const L = chars.length;
      const freq = 1 / (c.scale * 1.6);
      const floorT = c.coverage / 100;
      const span = 1 / Math.max(0.12, 1 - floorT);
      bN.fill(0);

      for (let y = 0; y < rows; y++) {
        const py = y * chh + chh * 0.5;
        const ny = y * chh * freq;
        for (let x = 0; x < cols; x++) {
          let v = fbm(x * cw * freq, ny, t);
          v = ((v - 0.5) * 1.85 + 0.5 - floorT) * span;
          const h = heat[y * cols + x];
          const total = v + h * 1.05;
          if (total <= 0.015) continue;
          let idx = Math.floor(total * L);
          if (idx < 0) idx = 0;
          else if (idx > L - 1) idx = L - 1;
          const glyph = chars.charAt(idx);
          if (glyph === " ") continue;

          const sLvl = Math.min(BASE_LEVELS - 1, Math.max(0, Math.floor(Math.max(0, v) * BASE_LEVELS)));
          const hLvl = Math.min(HEAT_LEVELS - 1, Math.max(0, Math.floor(h * (HEAT_LEVELS - 1))));
          const bi = sLvl * HEAT_LEVELS + hLvl;
          const k = bN[bi]++;
          bChar[bi][k] = glyph;
          bX[bi][k] = x * cw;
          bY[bi][k] = py;
        }
      }

      for (let b = 0; b < nBuckets; b++) {
        const count = bN[b];
        if (!count) continue;
        ctx.fillStyle = lut[b];
        const cs = bChar[b];
        const xs = bX[b];
        const ys = bY[b];
        for (let j = 0; j < count; j++) ctx.fillText(cs[j], xs[j], ys[j]);
      }
    };

    /* ---------- pointer (listened on window: the field sits behind content) ---------- */
    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const nx = e.clientX - rect.left;
      const ny = e.clientY - rect.top;
      const within = nx >= 0 && ny >= 0 && nx <= rect.width && ny <= rect.height;
      if (!within) {
        pointer.inside = false;
        return;
      }
      if (!pointer.inside) {
        pointer.px = nx;
        pointer.py = ny;
      }
      pointer.x = nx;
      pointer.y = ny;
      pointer.inside = true;
    };

    const onDown = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const nx = e.clientX - rect.left;
      const ny = e.clientY - rect.top;
      if (nx < 0 || ny < 0 || nx > rect.width || ny > rect.height) return;
      ripples.push({ x: nx / cw, y: ny / chh, age: 0 });
      if (ripples.length > 5) ripples.shift();
    };

    /* ---------- lifecycle ---------- */
    const onVisibility = () => {
      running = !document.hidden;
      last = 0;
    };

    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? true;
        last = 0;
      },
      { rootMargin: "120px" }
    );
    io.observe(wrap);

    const ro = new ResizeObserver(() => measure());
    ro.observe(wrap);

    if (!coarse) window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);

    const start = () => {
      const family = getComputedStyle(document.documentElement)
        .getPropertyValue("--font-jetbrains-mono")
        .trim();
      if (family) fontFamily = `${family}, ui-monospace, monospace`;
      buildLut();
      measure();
      raf = requestAnimationFrame(draw);
    };

    if (document.fonts && document.fonts.ready) document.fonts.ready.then(start, start);
    else start();

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const fade = centerFade
    ? "radial-gradient(54% 40% at 50% 50%, transparent 0%, rgba(0,0,0,0.55) 46%, #000 88%)"
    : undefined;

  return (
    <div ref={wrapRef} className={className} aria-hidden="true">
      <canvas
        ref={canvasRef}
        className="h-full w-full"
        style={{
          display: "block",
          opacity,
          mixBlendMode: "screen",
          maskImage: fade,
          WebkitMaskImage: fade,
        }}
      />
    </div>
  );
}
