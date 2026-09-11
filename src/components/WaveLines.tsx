"use client";

import { useEffect, useRef } from "react";
import { WAVE_LINES, WAVE_XS } from "./waveLineData";

type WaveLinesProps = {
  className?: string;
  /** Strand colour — defaults to the brand primary green, matching Figma. */
  color?: string;
  /** Wave drift speed, 0-120. 0 holds the strands at their rest shape. */
  speed?: number;
  /** Layer opacity on top of whatever sits behind it. */
  opacity?: number;
};

// Per-strand motion: a slow, broad "sway" (the whole strand rising and
// falling) plus a faster, much finer "ripple" riding on top of it. The 50
// strands are stacked in vertical order (top to bottom), so letting each one
// sway on its own phase/frequency made neighbours cross and read as tangled
// cable rather than a bundle waving together. Instead every strand shares one
// sway frequency and speed, staggered only by a small phase offset tied to
// its stacking order — that reads as a single wave passing through the
// bundle top-to-bottom, the strands stay in relative order, and the ripple
// stays small enough to add texture without introducing new crossings.
const RIPPLE = WAVE_LINES.map((_, i) => {
  const rnd = mulberry32(2024 + i);
  return {
    swayAmp: 0.01 + rnd() * 0.006, // fraction of frame height
    swayFreq: 0.75, // shared — keeps strands moving together
    swayPhase: i * 0.1 + rnd() * 0.15, // stacking-order stagger, wave travels through the bundle
    swayRate: 0.2,
    rippleAmp: 0.003 + rnd() * 0.004,
    rippleFreq: 2 + rnd() * 1.2,
    ripplePhase: rnd() * Math.PI * 2,
    rippleRate: 0.45 + rnd() * 0.3,
  };
});

// Deterministic PRNG so the ripple layout is stable across renders/reloads.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The Transparency card's flowing line bundle, redrawn as an animated canvas
 * from the actual Figma vector data (node 189:65060 — 50 strands sampled at
 * 65 shared x positions) instead of the static wave-lines.webp it replaces.
 * All 50 strands share one faint stroke colour, exactly as in the source
 * file; the "brighter" cables are an emergent effect of several faint
 * strands overlapping, reproduced here by normal alpha compositing rather
 * than hand-picked bold lines.
 *
 * A shared sway (broad, slow, staggered by stacking order so it reads as one
 * wave passing through the bundle) plus a small per-strand ripple (finer,
 * faster) is layered on top of the rest shape so the bundle keeps waving in a
 * smooth, seamless loop (a continuously advancing phase, not a resetting CSS
 * keyframe) instead of sitting frozen — kept coherent and gentle enough that
 * strands don't cross each other into a tangle.
 *
 * Same lifecycle discipline as AsciiField/HalftoneField: pause off-screen or
 * in a hidden tab, and hold a single static frame under reduced motion.
 */
export default function WaveLines({
  className,
  color = "#a7f932",
  speed = 26,
  opacity = 1,
}: WaveLinesProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Settings are read every frame from a ref so prop tweaks never restart the
  // animation loop — same reasoning as AsciiField/HalftoneField.
  const cfg = useRef({ color, speed, opacity });
  useEffect(() => {
    cfg.current = { color, speed, opacity };
  });

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let t = 0;
    let last = 0;
    let visible = true;
    let running = true;
    let raf = 0;

    const measure = () => {
      const cw = wrap.clientWidth;
      const ch = wrap.clientHeight;
      if (!cw || !ch) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      w = cw;
      h = ch;
    };

    const hex2rgb = (hex: string): [number, number, number] => [
      parseInt(hex.slice(1, 3), 16),
      parseInt(hex.slice(3, 5), 16),
      parseInt(hex.slice(5, 7), 16),
    ];

    const draw = () => {
      if (!w || !h) return;
      const [r, g, b] = hex2rgb(cfg.current.color);
      ctx.clearRect(0, 0, w, h);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      // Figma's strands are 0.12-alpha strokes stacked with normal
      // compositing — the bright cables are just several of them lining up.
      // A left-to-right gradient carries that same base alpha down to fully
      // transparent, so the bundle fades out toward the right edge.
      const baseAlpha = 0.12 * cfg.current.opacity;
      const fade = ctx.createLinearGradient(0, 0, w, 0);
      fade.addColorStop(0, `rgba(${r},${g},${b},${baseAlpha})`);
      fade.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.strokeStyle = fade;
      ctx.lineWidth = Math.max(0.75, w / 916);

      const lastPt = WAVE_XS.length - 1;
      for (let i = 0; i < WAVE_LINES.length; i++) {
        const ys = WAVE_LINES[i];
        const rp = RIPPLE[i];
        ctx.beginPath();
        for (let j = 0; j <= lastPt; j++) {
          // Figma mirrors this whole bundle horizontally (-scale-x-100), so
          // the source data's x fraction is flipped to match.
          const nx = j / lastPt;
          const x = (1 - WAVE_XS[j]) * w;
          const sway =
            Math.sin(nx * rp.swayFreq * Math.PI * 2 + rp.swayPhase + t * rp.swayRate) *
            rp.swayAmp *
            h;
          const ripple =
            Math.sin(nx * rp.rippleFreq * Math.PI * 2 + rp.ripplePhase + t * rp.rippleRate) *
            rp.rippleAmp *
            h;
          const y = ys[j] * h + sway + ripple;
          if (j === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (!running || !visible) {
        last = now;
        return;
      }
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
      last = now;
      t += dt * (cfg.current.speed / 100);
      draw();
    };

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

    const ro = new ResizeObserver(() => {
      measure();
      if (reduceMotion) draw();
    });
    ro.observe(wrap);

    document.addEventListener("visibilitychange", onVisibility);

    measure();
    if (reduceMotion) {
      draw();
    } else {
      raf = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <div ref={wrapRef} className={className} aria-hidden="true">
      <canvas ref={canvasRef} className="block size-full" />
    </div>
  );
}
