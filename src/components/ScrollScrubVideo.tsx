"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { useScroll } from "framer-motion";

type VideoSource = {
  mp4: string;
  poster: string;
  /** Intrinsic video size — sets the aspect ratio so nothing jumps before metadata loads. */
  width: number;
  height: number;
};

type ScrollScrubVideoProps = {
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
 * A video whose playhead is driven by scroll instead of time. The tall track
 * gives the scroll distance; the stage inside it sticks to the viewport while
 * the track scrolls past, mapping 0→1 progress onto 0→duration.
 *
 * MP4 only, on purpose: a WebM alongside it would be picked first by Chrome
 * and Firefox and looked visibly worse, so every browser gets the same file.
 *
 * Smoothness depends on the file as much as the code: sources are encoded
 * with a keyframe every 10 frames (at full resolution and near-lossless
 * quality) so each seek decodes only a few frames, and the file is fetched
 * whole into a blob URL so seeks never wait on range requests. The playhead
 * eases toward the scroll target each frame rather than jumping, and a new
 * seek is only issued once the previous one has landed.
 */
export default function ScrollScrubVideo({ desktop, mobile }: ScrollScrubVideoProps) {
  const isMobile = useIsMobile();
  const source = mobile && isMobile ? mobile : desktop;

  const trackRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { scrollYProgress } = useScroll({ target: trackRef, offset: ["start start", "end end"] });

  useEffect(() => {
    const track = trackRef.current;
    const video = videoRef.current;
    if (!track || !video) return;

    let objectUrl: string | null = null;
    let loading = false;
    let cancelled = false;
    let raf = 0;
    let shown = 0;

    function load() {
      if (loading) return;
      loading = true;
      fetch(source.mp4)
        .then((res) => {
          if (!res.ok) throw new Error(`${res.status}`);
          return res.blob();
        })
        .then((blob) => {
          if (cancelled) return;
          objectUrl = URL.createObjectURL(blob);
          video!.src = objectUrl;
        })
        .catch(() => {
          if (!cancelled) video!.src = source.mp4;
        });
    }

    function tick() {
      raf = requestAnimationFrame(tick);
      const duration = video!.duration;
      if (!duration || video!.readyState < HTMLMediaElement.HAVE_METADATA) return;

      const target = scrollYProgress.get() * (duration - 1 / 60);
      shown += (target - shown) * 0.12;
      if (Math.abs(target - shown) < 0.002) shown = target;

      if (!video!.seeking && Math.abs(video!.currentTime - shown) > 0.01) {
        video!.currentTime = shown;
      }
    }

    // Only download and run the loop when the section is within a screen of
    // the viewport — no large video fetch or per-frame work for the rest of the page.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          load();
          if (!raf) raf = requestAnimationFrame(tick);
        } else if (raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      },
      { rootMargin: "100% 0px" },
    );
    observer.observe(track);

    return () => {
      cancelled = true;
      observer.disconnect();
      cancelAnimationFrame(raf);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [source.mp4, scrollYProgress]);

  return (
    // Track height sets the scrub speed: the video plays across (height − 100vh)
    // of scrolling. 1900vh ≈ 18 screens for the 28s cut, about 1.55s of video per
    // screen — slow enough to follow each interaction. Raise it to slow down further.
    <div ref={trackRef} className="relative h-[1300vh] tablet:h-[1900vh]">
      <div className="sticky top-0 flex h-svh items-center justify-center">
        <video
          // Remount when switching between the desktop and mobile cut so the
          // new file loads cleanly with its own poster and aspect ratio.
          key={source.mp4}
          ref={videoRef}
          muted
          playsInline
          preload="auto"
          poster={source.poster}
          width={source.width}
          height={source.height}
          aria-hidden
          className="h-auto object-contain"
          style={{
            // Fill the width up to 1400px, but never taller than ~90% of the
            // viewport, so the masked edges always sit on the video itself.
            width: `min(100%, 1400px, calc(90svh * ${source.width / source.height}))`,
            maskImage: EDGE_MASK,
            WebkitMaskImage: EDGE_MASK,
            maskComposite: "intersect",
            WebkitMaskComposite: "source-in",
          }}
        />
      </div>
    </div>
  );
}
