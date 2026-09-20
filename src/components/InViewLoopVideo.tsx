"use client";

import { useEffect, useRef, useState } from "react";

type InViewLoopVideoProps = {
  mp4: string;
  /** Optional smaller encode, offered first. */
  webm?: string;
  poster: string;
  /** The source's own size — fixes the box's aspect ratio before anything loads. */
  width: number;
  height: number;
  /**
   * Seconds into the clip to hold, paused, for reduced-motion visitors — the
   * still frame a paused animation would hold. Only needed when the poster is
   * not itself a representative image: a composition that fades in from nothing
   * has an empty first frame, and without this those visitors would be left
   * looking at it. Omit it and the poster simply stays.
   */
  stillTime?: number;
  className?: string;
};

/**
 * A looping, muted video that is only fetched once it is near the viewport and
 * only decoded while it is on screen.
 *
 * This is how the heavy scenes reach a phone. Rendering the same animation as a
 * Lottie meant shipping megabytes of JSON to be parsed on the main thread, then
 * re-rasterising a few thousand SVG nodes every frame — and the soft glows in
 * these compositions are Gaussian blur filters, which is the most expensive
 * thing an SVG can ask a phone's compositor to redraw. Pre-rendered, the same
 * seconds of animation are a few hundred KB, the hardware decoder does all of
 * the work, and the main thread does none of it.
 *
 * The box is sized from the source's own dimensions, so it holds its space
 * before a byte arrives and the poster paints into exactly the final layout.
 */
export default function InViewLoopVideo({
  mp4,
  webm,
  poster,
  width,
  height,
  stillTime,
  className,
}: InViewLoopVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [sourced, setSourced] = useState(false);
  const [showingStill, setShowingStill] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let visible = false;

    const tryPlay = () => {
      if (reduceMotion || !visible || document.hidden) return;
      video.play().catch(() => {});
    };

    // Seek to the still and only then drop the poster: a video that has been
    // seeked but never played still shows its poster, so swapping the two in
    // the other order would flash the empty first frame.
    const onLoadedData = () => {
      video.currentTime = stillTime as number;
    };
    const onSeeked = () => setShowingStill(true);

    if (reduceMotion && stillTime !== undefined) {
      video.addEventListener("loadeddata", onLoadedData, { once: true });
      video.addEventListener("seeked", onSeeked, { once: true });
    }

    // Fetch nothing until the section is within a screen of the viewport.
    const near = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        near.disconnect();
        setSourced(true);
      },
      { rootMargin: "100% 0px" },
    );

    // Decode nothing while it is scrolled away: a paused video off screen costs
    // the phone no decode work and no battery.
    const onScreen = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) tryPlay();
        else video.pause();
      },
      { threshold: 0.15 },
    );

    const onVisibility = () => {
      if (document.hidden) video.pause();
      else tryPlay();
    };

    near.observe(video);
    onScreen.observe(video);
    document.addEventListener("visibilitychange", onVisibility);
    video.addEventListener("canplay", tryPlay);

    return () => {
      near.disconnect();
      onScreen.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      video.removeEventListener("canplay", tryPlay);
      video.removeEventListener("loadeddata", onLoadedData);
      video.removeEventListener("seeked", onSeeked);
    };
  }, [stillTime]);

  // `preload="none"` keeps the element quiet until the sources appear, so this
  // has to ask for the fetch itself once they do.
  useEffect(() => {
    if (sourced) videoRef.current?.load();
  }, [sourced]);

  // The poster waits for the same cue as the sources. A `poster` is fetched the
  // moment it is set, so leaving it on would cost every visitor the image even
  // on a breakpoint where this element is display:none and never plays. It
  // still lands first and fills the box while the video's opening chunk
  // arrives, which is all it is there for.

  return (
    <video
      ref={videoRef}
      aria-hidden
      muted
      loop
      playsInline
      preload="none"
      poster={sourced && !showingStill ? poster : undefined}
      className={className}
      width={width}
      height={height}
    >
      {sourced && webm ? <source src={webm} type="video/webm" /> : null}
      {sourced ? <source src={mp4} type="video/mp4" /> : null}
    </video>
  );
}
