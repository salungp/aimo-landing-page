"use client";

import { useEffect, useRef } from "react";

type ParallaxVideoProps = {
  webm: string;
  mp4: string;
  poster: string;
  fallbackImage: string;
  /** Max travel of the background in px, in any direction. */
  strength?: number;
  className?: string;
};

export default function ParallaxVideo({
  webm,
  mp4,
  poster,
  fallbackImage,
  strength = 16,
  className,
}: ParallaxVideoProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  // The video is rendered oversized by this much on each edge so the
  // translate-based parallax never reveals an edge. No CSS scale() is used
  // for this (unlike a scale-up approach), which would soften/blur the video.
  const bleed = strength + 6;

  // Mouse-follow parallax: lerps toward the pointer target every frame so the
  // motion feels smooth rather than snapping straight to the cursor.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const hasFinePointer = window.matchMedia("(pointer: fine)").matches;
    if (reduceMotion || !hasFinePointer) return;

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let rafId: number;

    function onPointerMove(e: PointerEvent) {
      const rect = wrap!.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width - 0.5; // -0.5..0.5
      const ny = (e.clientY - rect.top) / rect.height - 0.5;
      targetX = -nx * strength;
      targetY = -ny * strength;
    }

    function tick() {
      currentX += (targetX - currentX) * 0.06;
      currentY += (targetY - currentY) * 0.06;
      wrap!.style.setProperty("--px", currentX.toFixed(2));
      wrap!.style.setProperty("--py", currentY.toFixed(2));
      rafId = requestAnimationFrame(tick);
    }

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    rafId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      cancelAnimationFrame(rafId);
    };
  }, [strength]);

  // Pause the loop while the tab is hidden to save battery/CPU.
  useEffect(() => {
    function onVisibility() {
      const video = videoRef.current;
      if (!video) return;
      if (document.hidden) video.pause();
      else video.play().catch(() => {});
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  return (
    <div
      ref={wrapRef}
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        backgroundImage: `url(${fallbackImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <video
        ref={videoRef}
        className="max-w-none object-cover"
        style={{
          position: "absolute",
          top: -bleed,
          left: -bleed,
          width: `calc(100% + ${bleed * 2}px)`,
          height: `calc(100% + ${bleed * 2}px)`,
          transform: "translate3d(calc(var(--px, 0) * 1px), calc(var(--py, 0) * 1px), 0)",
          willChange: "transform",
        }}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster={poster}
      >
        <source src={webm} type="video/webm" />
        <source src={mp4} type="video/mp4" />
      </video>
    </div>
  );
}
