"use client";

import { useEffect, useRef } from "react";

type DeepDiveFieldProps = {
  className?: string;
  /** Grid spacing, in px. */
  cell?: number;
  /** Drift speed, 0-120. 0 holds the field still. */
  speed?: number;
  /** Noise feature size — larger means broader, slower-moving blotches. */
  scale?: number;
  /** Dot colour at low brightness (near-invisible against the card). */
  dim?: string;
  /** Dot colour at mid brightness — the brand green. */
  bright?: string;
  /** Dot colour at peak brightness — the hottest cells go past green into
   * this near-white tone, matching the source footage. */
  hot?: string;
  /** Layer opacity on top of whatever sits behind it. */
  opacity?: number;
};

/**
 * A canvas recreation of the DeepDive section's "deepdive-bg" video loop —
 * same idea as HalftoneField (which replaces the footer's halftone video):
 * a grid of dots sized and coloured by a drifting noise field, at a fraction
 * of the cost of a decoded video running for the life of the page.
 *
 * Two things set the source footage apart from the footer's dot field, both
 * reproduced here: the brightest cells ramp past the brand green into a
 * near-white "hot" tone (sampled from the video: peak dots land around
 * #e9ffcc, not pure #a7f932), and the whole grid sits inside a soft
 * elliptical falloff rather than filling the box edge-to-edge — measured
 * from the 2200x1376 footage at a 44%/41% (w/h) half-axis, centred, and
 * sized into this box the way `object-cover` would size the video itself
 * (scaled by whichever axis fills the container, not the container's own
 * aspect ratio — so a tall stack of cards still reads as a wide oval cropped
 * top/bottom, not a column). The falloff is applied to each dot's own
 * brightness (not a CSS mask over the canvas), so dots genuinely shrink and
 * dim as they near the edge instead of being clipped.
 *
 * Shares its value-noise implementation and pause-when-hidden lifecycle with
 * AsciiField/HalftoneField; unlike HalftoneField this one has no pointer
 * interaction — the source video didn't react to the cursor either.
 */
export default function DeepDiveField({
  className,
  cell = 14,
  speed = 30,
  scale = 70,
  dim = "#161c19",
  bright = "#a7f932",
  hot = "#e9ffcc",
  opacity = 1,
}: DeepDiveFieldProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Settings are read every frame from a ref so prop tweaks never restart the
  // animation loop (and never re-seed the noise) — same reasoning as
  // AsciiField/HalftoneField.
  const cfg = useRef({ cell, speed, scale, dim, bright, hot });
  useEffect(() => {
    cfg.current = { cell, speed, scale, dim, bright, hot };
  });

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let cols = 0;
    let rows = 0;
    let dpr = 1;
    let t = 0;
    let last = 0;
    let running = true;
    let visible = true;
    let raf = 0;

    /* ---------- value noise (identical approach to AsciiField/HalftoneField) ---------- */
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

    /* ---------- colour lookup table: dim -> bright -> hot ----------
     * Two segments instead of HalftoneField's single lerp, so the top of the
     * ramp keeps climbing past the brand green into the near-white peak the
     * source footage actually hits. */
    const hex2rgb = (h: string): [number, number, number] => [
      parseInt(h.slice(1, 3), 16),
      parseInt(h.slice(3, 5), 16),
      parseInt(h.slice(5, 7), 16),
    ];
    const LEVELS = 40;
    const MID = 0.6; // brightness level the ramp reaches pure `bright` at
    let lut: string[] = [];
    let lutKey = "";
    const buildLut = () => {
      const c = cfg.current;
      const key = c.dim + c.bright + c.hot;
      if (key === lutKey) return;
      lutKey = key;
      const lo = hex2rgb(c.dim);
      const mid = hex2rgb(c.bright);
      const hi = hex2rgb(c.hot);
      lut = [];
      for (let i = 0; i < LEVELS; i++) {
        const t = i / (LEVELS - 1);
        let r: number, g: number, b: number;
        if (t < MID) {
          const k = Math.pow(t / MID, 0.85);
          r = lo[0] + (mid[0] - lo[0]) * k;
          g = lo[1] + (mid[1] - lo[1]) * k;
          b = lo[2] + (mid[2] - lo[2]) * k;
        } else {
          const k = (t - MID) / (1 - MID);
          r = mid[0] + (hi[0] - mid[0]) * k;
          g = mid[1] + (hi[1] - mid[1]) * k;
          b = mid[2] + (hi[2] - mid[2]) * k;
        }
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
      if (!reduceMotion) t += dt * (c.speed / 100) * 2.4;

      buildLut();
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);

      const freq = 1 / c.scale;

      // Elliptical falloff, sized the way `object-cover` would size the
      // source footage (2200x1376) into this box — scale by the container's
      // longer-filling axis, not the container's own aspect ratio, so a tall
      // stack of cards still reads as a wide oval cropped top/bottom rather
      // than the oval getting squeezed into a narrow column. Half-axis
      // fractions (44% / 41% of the source frame) are measured off the video
      // itself — the radius at which dots have faded to background.
      const coverScale = Math.max(w / 2200, h / 1376);
      const ellW = 0.44 * 2200 * coverScale;
      const ellH = 0.41 * 1376 * coverScale;
      const cx = w / 2;
      const cy = h / 2;

      for (let y = 0; y < rows; y++) {
        const py = y * c.cell;
        const ny = py * freq;
        const edy = (py - cy) / ellH;
        for (let x = 0; x < cols; x++) {
          const px = x * c.cell;
          const edx = (px - cx) / ellW;
          const ed = Math.sqrt(edx * edx + edy * edy);
          if (ed > 1) continue;
          const falloff = ed <= 0.5 ? 1 : 1 - smooth((ed - 0.5) / 0.5);
          if (falloff <= 0.02) continue;

          let v = fbm(px * freq, ny, t);
          v = Math.max(0, Math.min(1, (v - 0.22) * 1.55));
          const eff = v * falloff;
          if (eff <= 0.02) continue;

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

    /* ---------- lifecycle: pause off-screen / hidden, same as AsciiField/HalftoneField ---------- */
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

    buildLut();
    measure();
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <div ref={wrapRef} className={className} aria-hidden="true">
      <canvas ref={canvasRef} className="block size-full" style={{ opacity }} />
    </div>
  );
}
