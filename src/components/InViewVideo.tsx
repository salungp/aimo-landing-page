"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";

type VideoSource = {
  mp4: string;
  poster: string;
  /** Intrinsic video size — sets the aspect ratio so nothing jumps before metadata loads. */
  width: number;
  height: number;
};

type InViewVideoProps = {
  /** Used at tablet and desktop widths. */
  desktop: VideoSource;
  /** Portrait cut served below the tablet breakpoint (768px); falls back to `desktop`. */
  mobile?: VideoSource;
};

/** Matches the Tailwind `tablet:` breakpoint. */
const MOBILE_QUERY = "(max-width: 767.98px)";

/** Fades all four edges so the video's own background melts into the page. */
const EDGE_MASK =
  "linear-gradient(to right, transparent, #000 12%, #000 88%, transparent), linear-gradient(to bottom, transparent, #000 14%, #000 86%, transparent)";

function useIsMobile() {
  const subscribe = useCallback((onChange: () => void) => {
    const mql = window.matchMedia(MOBILE_QUERY);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(MOBILE_QUERY).matches,
    () => false,
  );
}

/**
 * A muted, looping video that plays on its own — no scroll control. It only
 * starts downloading once the section is within a screen of the viewport,
 * plays while at least a third of it is visible, and pauses when scrolled
 * away or when the tab is hidden (resuming where it left off). Reduced-motion
 * users get the poster frame instead of autoplay.
 *
 * MP4 only, on purpose: a WebM alongside it would be picked first by Chrome
 * and Firefox and looked visibly worse, so every browser gets the same file.
 */
export default function InViewVideo({ desktop, mobile }: InViewVideoProps) {
  const isMobile = useIsMobile();
  const source = mobile && isMobile ? mobile : desktop;
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let visible = false;

    const tryPlay = () => {
      if (reduceMotion || !visible || document.hidden) return;
      video.play().catch(() => {});
    };

    // Start fetching a screen ahead so playback begins promptly on arrival.
    const near = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        video.preload = "auto";
        if (!video.currentSrc) video.load();
        near.disconnect();
      },
      { rootMargin: "100% 0px" },
    );

    const onScreen = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) tryPlay();
        else video.pause();
      },
      { threshold: 0.35 },
    );

    const onVisibility = () => {
      if (document.hidden) video.pause();
      else tryPlay();
    };

    near.observe(video);
    onScreen.observe(video);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      near.disconnect();
      onScreen.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [source.mp4]);

  return (
    <video
      // Remount when switching between the desktop and mobile cut so the new
      // file loads cleanly with its own poster and aspect ratio.
      key={source.mp4}
      ref={videoRef}
      muted
      loop
      playsInline
      preload="none"
      poster={source.poster}
      width={source.width}
      height={source.height}
      aria-hidden
      className="mx-auto block h-auto object-contain"
      style={{
        // Fill the width up to 1400px, but never taller than ~90% of the
        // viewport, so the masked edges always sit on the video itself.
        width: `min(100%, 1400px, calc(90svh * ${source.width / source.height}))`,
        maskImage: EDGE_MASK,
        WebkitMaskImage: EDGE_MASK,
        maskComposite: "intersect",
        WebkitMaskComposite: "source-in",
      }}
    >
      <source src={source.mp4} type="video/mp4" />
    </video>
  );
}
