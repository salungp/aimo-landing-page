"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import type { AnimationItem } from "lottie-web";

type InViewLottieProps = {
  /** Public URL of the Lottie JSON — fetched at runtime, never bundled. */
  src: string;
  /** The composition's own size (`w` / `h` in the JSON) — sets the aspect ratio before it loads. */
  width: number;
  height: number;
  /**
   * Size to the container's own width instead of the component's default
   * min(100%, 1400px, 90svh) box — for embedding inside a caller-sized frame
   * (a card, a plate) rather than running a section's own full-bleed scene.
   * Height still follows `width`/`height`'s aspect ratio either way.
   */
  fill?: boolean;
  /** Merged onto the wrapper; use it to override the default rounding/margin. */
  className?: string;
  /**
   * Frame held for reduced-motion visitors, in the composition's own frame
   * numbers. Defaults to `STILL_FRAME` (an early, arbitrary moment) — pass one
   * explicitly when the composition fades in from nothing (an early frame is
   * blank) or has an obvious "point" it should be caught making.
   */
  stillFrame?: number;
};

/** Default frame shown (paused) for reduced-motion users — a moment with content on screen. */
const STILL_FRAME = 60;

/**
 * A looping Lottie that plays on its own. By default it fills the width up to
 * 1400px (never taller than ~90% of the viewport), with 64px rounded corners
 * and no edge mask, for a section's own full-bleed scene; pass `fill` to size
 * to whatever container the caller already built instead — a card or plate
 * with its own radius and clip.
 *
 * Built for a heavy composition (the biggest of these has ~1,700 layers and
 * ~6MB of embedded images):
 * - SVG renderer, via lottie-web's `lottie_svg` build. The canvas renderer
 *   draws this file blank (its track mattes drop every visible layer), and the
 *   smaller `lottie_light` build silently skips effects — this file's 27
 *   Gaussian blurs (the soft green glows) render as hard-edged shapes there.
 *   `lottie_svg` keeps the blurs and only ships the SVG renderer.
 * - The JSON and the player code both load only once the section is within a
 *   screen of the viewport, so neither touches the initial page load.
 * - Plays while at least 20% is visible; pauses when scrolled away or when the
 *   tab is hidden, resuming where it left off.
 *
 * Nothing is recompressed: vector shapes render at native sharpness and the
 * embedded PNGs are used as-is.
 */
export default function InViewLottie({ src, width, height, fill, className, stillFrame }: InViewLottieProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let anim: AnimationItem | null = null;
    let cancelled = false;
    let visible = false;

    const tryPlay = () => {
      if (!anim || reduceMotion || !visible || document.hidden) return;
      anim.play();
    };

    const load = async () => {
      const [{ default: lottie }, response] = await Promise.all([
        import("lottie-web/build/player/lottie_svg"),
        fetch(src),
      ]);
      const animationData = await response.json();
      if (cancelled) return;
      anim = lottie.loadAnimation({
        container,
        renderer: "svg",
        loop: true,
        autoplay: false,
        animationData,
        rendererSettings: { preserveAspectRatio: "xMidYMid meet" },
      });
      anim.addEventListener("DOMLoaded", () => {
        if (cancelled || !anim) return;
        if (reduceMotion) anim.goToAndStop(stillFrame ?? STILL_FRAME, true);
        setReady(true);
        tryPlay();
      });
    };

    const near = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        near.disconnect();
        load().catch(() => {});
      },
      { rootMargin: "100% 0px" },
    );

    const onScreen = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) tryPlay();
        else anim?.pause();
      },
      { threshold: 0.2 },
    );

    const onVisibility = () => {
      if (document.hidden) anim?.pause();
      else tryPlay();
    };

    near.observe(container);
    onScreen.observe(container);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      near.disconnect();
      onScreen.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      anim?.destroy();
    };
  }, [src, stillFrame]);

  return (
    <div
      ref={containerRef}
      aria-hidden
      className={clsx(
        "overflow-hidden transition-opacity duration-500 [&>canvas]:block",
        fill ? "w-full" : "mx-auto rounded-[64px]",
        className,
      )}
      style={{
        // Default box: fill the width up to 1400px, but never taller than
        // ~90% of the viewport. `fill` defers entirely to the container.
        width: fill ? undefined : `min(100%, 1400px, calc(90svh * ${width / height}))`,
        aspectRatio: `${width} / ${height}`,
        opacity: ready ? 1 : 0,
      }}
    />
  );
}
