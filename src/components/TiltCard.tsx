"use client";

import { useRef, type PointerEvent, type ReactNode } from "react";

/**
 * transitions.dev "3D tilt", ported by hand: the card tilts toward the cursor
 * with a glare following it, and eases back to flat on leave. CSS and motion
 * tokens are `.t-tilt*` in globals.css.
 *
 * Mouse and pen only. The original captures touch drags (`touch-action:
 * none`) so a finger can tilt the card, but these cards fill most of a phone
 * screen inside a pinned, scroll-driven section — capturing touch there would
 * stop the page from scrolling. `enabled` lets a caller switch it off while
 * the card is somewhere a tilt makes no sense (tucked in the wallet).
 */
export default function TiltCard({
  children,
  radius,
  enabled = true,
}: {
  children: ReactNode;
  /** The card's corner radius, so the glare is clipped to its shape. */
  radius: number;
  enabled?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);

  const reset = () => {
    wrapRef.current?.classList.remove("is-hover");
    const card = cardRef.current;
    if (!card) return;
    card.classList.remove("is-tilting");
    card.style.transform = "";
  };

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch") return;
    const wrap = wrapRef.current;
    const card = cardRef.current;
    const glare = glareRef.current;
    if (!wrap || !card || !glare) return;
    if (!enabled) {
      reset();
      return;
    }
    const max = parseFloat(getComputedStyle(wrap).getPropertyValue("--tilt-max")) || 32;
    const r = wrap.getBoundingClientRect();
    const px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    wrap.classList.add("is-hover");
    card.classList.add("is-tilting");
    card.style.transform = `perspective(var(--tilt-perspective)) rotateX(${((0.5 - py) * max).toFixed(2)}deg) rotateY(${((px - 0.5) * max).toFixed(2)}deg)`;
    glare.style.setProperty("--gx", `${(px * 100).toFixed(1)}%`);
    glare.style.setProperty("--gy", `${(py * 100).toFixed(1)}%`);
  };

  return (
    <div ref={wrapRef} className="t-tilt" onPointerMove={onMove} onPointerLeave={reset}>
      <div ref={cardRef} className="t-tilt-card" style={{ "--tilt-radius": `${radius}px` } as React.CSSProperties}>
        {children}
        <div ref={glareRef} className="t-tilt-glare" aria-hidden />
      </div>
    </div>
  );
}
