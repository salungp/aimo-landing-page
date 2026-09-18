"use client";

import { useEffect, useRef, type CSSProperties } from "react";

// Brand strip (Figma 225:4156). Heights are Figma's; mobile renders them at
// 80%. The SVGs ship with the design's 40% white baked in; Privy is a raster
// brandmark, so its 40% is applied here instead.
const brands: { name: string; src: string; w: number; h: number; opacity?: number }[] = [
  { name: "Polymarket", src: "/images/hero/polymarket.svg", w: 150, h: 28 },
  { name: "Hyperliquid", src: "/images/hero/hyperliquid.svg", w: 150, h: 27 },
  { name: "BNB Chain", src: "/images/hero/bnb-chain.svg", w: 148, h: 26 },
  { name: "Robinhood", src: "/images/hero/robinhood.svg", w: 136, h: 26 },
  { name: "Privy", src: "/images/hero/privy.png", w: 115, h: 26, opacity: 0.4 },
  { name: "Base", src: "/images/hero/base.svg", w: 115, h: 26 },
  { name: "Solana", src: "/images/hero/solana.svg", w: 100, h: 24 },
];

/** Both ends of the strip fade into the background (257px of Figma's 1000px row). */
const BRAND_FADE =
  "linear-gradient(to right, transparent, #000 25.7%, #000 74.3%, transparent)";

/**
 * Copies of the row. The drift carries the track one copy to the left, and the
 * reader can scroll it by roughly another, and the strip has to stay covered at
 * every combination of the two — so it needs a copy for the drift, a copy of
 * scrolling slack, and enough left over to fill the visible width. Four copies
 * leave about a screen's worth of travel each way before a wrap is needed.
 */
const COPIES = 4;
/** Resume the drift this long after the reader lets go. */
const RESUME_AFTER = 900;
/** Keep the wrap points this far inside the usable range, as a share of a copy. */
const WRAP_MARGIN = 0.35;

/**
 * The logo row drifts in a seamless loop and can also be dragged or swiped.
 * Both are the same motion in different hands, so they are left on separate
 * layers rather than merged: the drift stays a CSS animation on the track, with
 * nothing on the main thread, and the scrolling is the browser's own, with its
 * momentum and rubber-banding for free. All this has to do is keep them from
 * running off the end of the content.
 */
export default function BrandStrip() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const track = trackRef.current;
    if (!scroller || !track) return;

    let copyW = 0;
    let low = 0;
    let high = 0;
    let holdTimer = 0;

    const measure = () => {
      const next = track.scrollWidth / COPIES;
      if (next <= 0) return;
      // The drift can already have carried the content a whole copy leftwards,
      // so scrolling has to stop a copy short of the end or the right-hand
      // edge runs dry.
      const span = (COPIES - 1) * next - scroller.clientWidth;
      const margin = next * WRAP_MARGIN;
      low = margin;
      // Never let the window close to less than one copy, or a wrap would land
      // outside it and bounce straight back.
      high = Math.max(margin + next, span - margin);
      if (Math.abs(next - copyW) < 0.5) return;
      copyW = next;
      // Park exactly one copy in. That is a whole number of copies, so the
      // strip is framed just as it was before it could be scrolled, with room
      // to travel in both directions.
      scroller.scrollLeft = copyW;
    };

    // Pausing the drift while the reader has hold of the strip keeps the two
    // from fighting: grab it and it stops, let go and it picks up again.
    const hold = () => {
      scroller.dataset.holding = "true";
      window.clearTimeout(holdTimer);
      holdTimer = window.setTimeout(() => {
        delete scroller.dataset.holding;
      }, RESUME_AFTER);
    };

    const onScroll = () => {
      if (copyW <= 0) return;
      hold();
      // The copies are identical, so stepping by exactly one is invisible. Walk
      // all the way back in one event rather than a step per event: a hard
      // fling can land several copies out, and anything left outside the range
      // would show as a bare edge for that frame.
      let sl = scroller.scrollLeft;
      while (sl < low) sl += copyW;
      while (sl > high) sl -= copyW;
      if (sl !== scroller.scrollLeft) scroller.scrollLeft = sl;
    };

    // A trackpad's sideways swipe arrives as a wheel event, which Lenis would
    // otherwise swallow on its way up to the window. Keep the sideways ones
    // here and let the browser scroll the strip with them; the vertical ones
    // carry on to Lenis and move the page, so the strip never traps the reader.
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) e.stopPropagation();
    };

    // Drag with a mouse or pen. Touch already pans the strip natively.
    let dragging = false;
    let dragFrom = 0;
    let dragScroll = 0;
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "touch" || e.button !== 0) return;
      dragging = true;
      dragFrom = e.clientX;
      dragScroll = scroller.scrollLeft;
      scroller.setPointerCapture(e.pointerId);
      scroller.dataset.dragging = "true";
      hold();
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      scroller.scrollLeft = dragScroll - (e.clientX - dragFrom);
    };
    const endDrag = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      delete scroller.dataset.dragging;
      if (scroller.hasPointerCapture(e.pointerId)) scroller.releasePointerCapture(e.pointerId);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(scroller);
    observer.observe(track);
    scroller.addEventListener("scroll", onScroll, { passive: true });
    scroller.addEventListener("wheel", onWheel, { passive: true });
    scroller.addEventListener("pointerdown", onPointerDown);
    scroller.addEventListener("pointermove", onPointerMove, { passive: true });
    scroller.addEventListener("pointerup", endDrag);
    scroller.addEventListener("pointercancel", endDrag);
    return () => {
      window.clearTimeout(holdTimer);
      observer.disconnect();
      scroller.removeEventListener("scroll", onScroll);
      scroller.removeEventListener("wheel", onWheel);
      scroller.removeEventListener("pointerdown", onPointerDown);
      scroller.removeEventListener("pointermove", onPointerMove);
      scroller.removeEventListener("pointerup", endDrag);
      scroller.removeEventListener("pointercancel", endDrag);
    };
  }, []);

  return (
    <div
      ref={scrollerRef}
      className="brand-marquee mx-auto w-full max-w-[1000px] select-none"
      style={
        {
          maskImage: BRAND_FADE,
          WebkitMaskImage: BRAND_FADE,
          "--brand-copies": COPIES,
        } as CSSProperties
      }
    >
      <div ref={trackRef} className="brand-marquee-track flex w-max">
        {Array.from({ length: COPIES }, (_, copy) => (
          <ul
            key={copy}
            aria-hidden={copy > 0 ? true : undefined}
            aria-label={copy === 0 ? "Connected markets" : undefined}
            className="flex shrink-0 items-center gap-10 pr-10 tablet:gap-[70px] tablet:pr-[70px]"
          >
            {brands.map((brand) => (
              <li key={brand.name} className="shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={brand.src}
                  alt={copy === 0 ? brand.name : ""}
                  width={brand.w}
                  height={brand.h}
                  draggable={false}
                  className="h-[calc(var(--h)*0.8)] w-auto tablet:h-[var(--h)]"
                  style={{ "--h": `${brand.h}px`, opacity: brand.opacity } as CSSProperties}
                />
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}
