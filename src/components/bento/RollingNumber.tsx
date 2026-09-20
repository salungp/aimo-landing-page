"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A quote that rolls to its new value instead of blinking to it: the old
 * reading slides out of a one-line window while the new one slides in behind
 * it, upward when the number went up and downward when it went down.
 *
 * The whole number moves as one line rather than as a column of per-digit
 * reels. Per-digit reels would mean ten stacked glyphs for every character on
 * the card — several hundred elements on a strip that is already drifting —
 * and they read wrong on a price anyway, where a tick can change four digits
 * at once and each reel would spin its own way.
 *
 * The move is a Web Animations transform on one wrapper: it needs no layout,
 * no paint, and no arming frame the way a CSS transition toggled from state
 * would. When it finishes, the outgoing line is dropped from the DOM.
 */
export default function RollingNumber({
  value,
  direction,
  className,
}: {
  value: string;
  /** 1 when the new value is higher than the old one, -1 when lower. */
  direction: number;
  className?: string;
}) {
  const [shown, setShown] = useState(value);
  const [outgoing, setOutgoing] = useState<{ text: string; direction: number } | null>(null);
  const trackRef = useRef<HTMLSpanElement | null>(null);
  const shownRef = useRef(value);

  useEffect(() => {
    if (value === shownRef.current) return;

    const previous = shownRef.current;
    const up = direction >= 0;
    shownRef.current = value;
    setOutgoing({ text: previous, direction: up ? 1 : -1 });
    setShown(value);

    const track = trackRef.current;
    if (!track || typeof track.animate !== "function") {
      setOutgoing(null);
      return;
    }

    // The incoming line is stacked below (rising numbers) or above (falling
    // ones); the track starts shifted so that the OUTGOING line is the one in
    // the window, and slides back to zero.
    const animation = track.animate(
      [{ transform: `translateY(${up ? 100 : -100}%)` }, { transform: "translateY(0)" }],
      { duration: 420, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "none" }
    );

    let cancelled = false;
    animation.finished
      .then(() => {
        if (!cancelled) setOutgoing(null);
      })
      .catch(() => {
        /* Superseded by the next tick; that animation owns the cleanup. */
      });

    return () => {
      cancelled = true;
    };
  }, [value, direction]);

  return (
    <span className={`relative inline-block overflow-hidden align-bottom ${className ?? ""}`}>
      {/* Reserves the line box. The rolling copies are absolute over it, so a
       * tick never changes the row's width mid-drift. */}
      <span className="invisible block">{shown}</span>
      <span ref={trackRef} className="absolute inset-0 block">
        {outgoing && outgoing.direction === -1 && (
          <span className="absolute inset-x-0 bottom-full block">{outgoing.text}</span>
        )}
        <span className="absolute inset-0 block">{shown}</span>
        {outgoing && outgoing.direction === 1 && (
          <span className="absolute inset-x-0 top-full block">{outgoing.text}</span>
        )}
      </span>
    </span>
  );
}
