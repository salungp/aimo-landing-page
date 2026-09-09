"use client";

import { useEffect, useRef } from "react";

type LoopVideoProps = {
  webm: string;
  mp4: string;
  poster: string;
  className?: string;
};

/**
 * A simple autoplaying, looping, muted background video — no parallax, just
 * the perf/accessibility basics: skips playback for prefers-reduced-motion
 * (shows the poster frame only) and pauses while the tab is hidden.
 */
export default function LoopVideo({ webm, mp4, poster, className }: LoopVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduceMotion) {
      video.pause();
      return;
    }

    function onVisibility() {
      if (document.hidden) video!.pause();
      else video!.play().catch(() => {});
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  return (
    <video
      ref={videoRef}
      className={className}
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
  );
}
