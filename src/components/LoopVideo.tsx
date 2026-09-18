"use client";

import { useEffect, useRef } from "react";

type LoopVideoProps = {
  /** Optional — omit to serve the mp4 alone (e.g. when the source must stay
   * untranscoded and a re-encoded VP9 copy would be picked in preference). */
  webm?: string;
  mp4: string;
  poster: string;
  className?: string;
};

/**
 * A simple autoplaying, looping, muted background video — no parallax, just
 * the perf/accessibility basics: skips playback for prefers-reduced-motion
 * (shows the poster frame only), pauses while the tab is hidden, and pauses
 * once it has been scrolled off screen.
 *
 * That last one matters more than it sounds. This is the hero's backdrop, and
 * the hero is one screen of a page that is fifteen: left playing, the decoder
 * keeps turning out 24 frames a second of footage nobody can see for as long
 * as the visitor reads the rest of the site — on a phone that is the battery
 * and the thermal headroom that everything below it then has to share. It
 * resumes where it left off on the way back up, so nothing is lost; this is
 * the same treatment `InViewLoopVideo` gives the section videos, minus the
 * deferred fetch, since the hero's own video is wanted immediately.
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

    // Both gates have to agree before it plays again, or leaving a hidden tab
    // would restart a video that is also scrolled out of view.
    let onScreen = true;

    function sync() {
      if (document.hidden || !onScreen) video!.pause();
      else video!.play().catch(() => {});
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        sync();
      },
      { threshold: 0.01 },
    );
    observer.observe(video);
    document.addEventListener("visibilitychange", sync);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
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
      {webm ? <source src={webm} type="video/webm" /> : null}
      <source src={mp4} type="video/mp4" />
    </video>
  );
}
