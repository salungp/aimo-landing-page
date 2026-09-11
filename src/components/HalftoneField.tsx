"use client";

import { useEffect, useRef } from "react";

type HalftoneFieldProps = {
  className?: string;
  /** Grid spacing, in px. */
  cell?: number;
  /** Drift speed, 0-120. 0 holds the field still. */
  speed?: number;
  /** Noise feature size — larger means broader, slower-moving blotches. */
  scale?: number;
  /** Dot colour at low brightness (near-invisible against the background). */
  dim?: string;
  /** Dot colour at peak brightness — also what the pointer bloom maxes out
   * at, so hovering only ever pushes dots further up this same ramp rather
   * than introducing a different-coloured highlight. */
  bright?: string;
  /** Pointer bloom radius, in cells. */
  radius?: number;
  /** How long the pointer trail lingers, 0-100. */
  trail?: number;
  /** Layer opacity on top of whatever sits behind it. */
  opacity?: number;
};

/**
 * A grid of square dots, sized and coloured by a drifting noise field —
 * a canvas recreation of Figma's "halftone-field" video loop, at a fraction
 * of the cost: no network fetch, no video decoder running for the life of
 * the page, and it's resolution-independent instead of a fixed 1920x1080
 * source stretched or cropped to fit.
 *
 * Shares its value-noise implementation, pointer-heat bloom, and
 * pause-when-hidden lifecycle with AsciiField (same techniques, a dot per
 * grid cell instead of a character).
 */
export default function HalftoneField({
  className,
  cell = 16,
  speed = 38,
  scale = 70,
  dim = "#122016",
  bright = "#a7f932",
  radius = 7,
  trail = 60,
  opacity = 1,
}: HalftoneFieldProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Settings are read every frame from a ref so prop tweaks never restart the
  // animation loop (and never re-seed the noise) — same reasoning as AsciiField.
  const cfg = useRef({ cell, speed, scale, dim, bright, radius, trail });
  useEffect(() => {
    cfg.current = { cell, speed, scale, dim, bright, radius, trail };
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
    let dpr = 1;
    let t = 0;
    let last = 0;
    let running = true;
    let visible = true;
    let raf = 0;
    let heat = new Float32Array(0);

    const pointer = { x: -1e4, y: -1e4, px: -1e4, py: -1e4, inside: false };

    /* ---------- value noise (identical approach to AsciiField) ---------- */
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

    /* ---------- colour lookup table (32 steps, dim -> bright) ----------
     * Deliberately a single ramp: the pointer bloom feeds into the same
     * brightness value that picks a dot's noise-driven colour (see `eff` in
     * the draw loop below) rather than mixing in a separate highlight hue —
     * hovering pushes a dot further up this ramp, it doesn't recolour it. */
    const hex2rgb = (h: string): [number, number, number] => [
      parseInt(h.slice(1, 3), 16),
      parseInt(h.slice(3, 5), 16),
      parseInt(h.slice(5, 7), 16),
    ];
    const LEVELS = 32;
    let lut: string[] = [];
    let lutKey = "";
    const buildLut = () => {
      const c = cfg.current;
      const key = c.dim + c.bright;
      if (key === lutKey) return;
      lutKey = key;
      const lo = hex2rgb(c.dim);
      const hi = hex2rgb(c.bright);
      lut = [];
      for (let i = 0; i < LEVELS; i++) {
        const k = Math.pow(i / (LEVELS - 1), 0.85);
        const r = lo[0] + (hi[0] - lo[0]) * k;
        const g = lo[1] + (hi[1] - lo[1]) * k;
        const b = lo[2] + (hi[2] - lo[2]) * k;
        lut.push(`rgb(${r | 0},${g | 0},${b | 0})`);
      }
    };

    /* ---------- layout ---------- */
    const measure = () => {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      if (!w || !h) return;
      dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const c = cfg.current;
      cols = Math.ceil(w / c.cell) + 1;
      rows = Math.ceil(h / c.cell) + 1;
      if (heat.length !== cols * rows) heat = new Float32Array(cols * rows);
    };

    /* ---------- pointer heat ---------- */
    const stamp = (cx: number, cy: number, strength: number) => {
      const r = cfg.current.radius;
      const r2 = r * r;
      const x0 = Math.max(0, Math.floor(cx - r));
      const x1 = Math.min(cols - 1, Math.ceil(cx + r));
      const y0 = Math.max(0, Math.floor(cy - r));
      const y1 = Math.min(rows - 1, Math.ceil(cy + r));
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const dx = x - cx;
          const dy = y - cy;
          const d2 = dx * dx + dy * dy;
          if (d2 > r2) continue;
          const f = 1 - d2 / r2;
          const i = y * cols + x;
          heat[i] = Math.min(1, heat[i] + f * f * strength);
        }
      }
    };

    /* ---------- frame ---------- */
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (!running || !visible || !cols || !rows) {
        last = now;
        return;
      }

      const c = cfg.current;
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
      last = now;
      // The x/y noise coordinates are scaled by `freq` (1/scale) below, but z
      // (time) isn't — so at low `speed` values, z crawls through a fraction
      // of one noise cell per second and smoothstep's ease-in/out (used at
      // every cell boundary) flattens that into an almost-imperceptible
      // crawl. The x2.4 keeps `speed` in the same friendly 0-120 range as
      // AsciiField's while actually crossing a full noise cell in a few
      // seconds instead of ten-plus.
      if (!reduceMotion) t += dt * (c.speed / 100) * 2.4;

      // Exponential decay expressed as "keep this fraction per 60fps frame,
      // raised to however many frames dt actually covers" — the shape AsciiField
      // uses so the trail's feel doesn't change with the display's refresh rate.
      const decay = Math.pow(0.86 + (c.trail / 100) * 0.135, dt * 60);
      for (let i = 0, n = heat.length; i < n; i++) {
        if (heat[i] > 0.0015) heat[i] *= decay;
        else heat[i] = 0;
      }

      if (pointer.inside) {
        const cx = pointer.x / c.cell;
        const cy = pointer.y / c.cell;
        const pcx = pointer.px / c.cell;
        const pcy = pointer.py / c.cell;
        // Step along the segment from the last sampled position to the
        // current one so a fast flick still paints a continuous streak
        // instead of leaving gaps between far-apart stamps.
        const steps = Math.min(12, Math.ceil(Math.hypot(cx - pcx, cy - pcy) / 1.2));
        if (steps <= 1) {
          stamp(cx, cy, 0.8);
        } else {
          for (let s = 1; s <= steps; s++) {
            const k = s / steps;
            stamp(pcx + (cx - pcx) * k, pcy + (cy - pcy) * k, (0.8 / steps) * 1.7);
          }
        }
        pointer.px = pointer.x;
        pointer.py = pointer.y;
      }

      buildLut();
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);

      const freq = 1 / c.scale;

      for (let y = 0; y < rows; y++) {
        const py = y * c.cell;
        const ny = py * freq;
        for (let x = 0; x < cols; x++) {
          const px = x * c.cell;
          let v = fbm(px * freq, ny, t);
          v = Math.max(0, Math.min(1, (v - 0.22) * 1.55));
          const heatV = heat[y * cols + x];
          if (v <= 0.02 && heatV <= 0.02) continue;

          // The pointer bloom feeds straight into the same brightness value
          // driving colour and size, so a heated dot just reads as "further
          // up the same dim -> bright ramp", never a different hue.
          const eff = Math.min(1, v + heatV * 0.85);
          const size = eff * c.cell * 0.86;
          const lvl = Math.min(LEVELS - 1, (eff * (LEVELS - 1)) | 0);
          ctx.fillStyle = lut[lvl];
          const inset = (c.cell - size) / 2;
          const r = Math.min(3, size * 0.22);
          roundRect(ctx, px + inset, py + inset, size, size, r);
          ctx.fill();
        }
      }
    };

    const roundRect = (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      w: number,
      h: number,
      r: number
    ) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    };

    /* ---------- pointer (listened on window: the field sits behind content,
     * so listening on the canvas itself would miss every move the moment it's
     * over the CTA card or footer content sitting above it). ---------- */
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
    const onLeave = () => {
      pointer.inside = false;
    };

    /* ---------- lifecycle: pause off-screen / hidden, same as AsciiField ---------- */
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

    document.addEventListener("visibilitychange", onVisibility);
    if (!coarse && !reduceMotion) {
      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerleave", onLeave, { passive: true });
    }

    buildLut();
    measure();
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div ref={wrapRef} className={className} aria-hidden="true">
      <canvas ref={canvasRef} className="block size-full" style={{ opacity }} />
    </div>
  );
}
