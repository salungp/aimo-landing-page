"use client";

import type { CSSProperties } from "react";
import { useCardActive } from "./BentoCard";

/** x/y from the Figma frame — the row alternates 8/28 to sit on a shallow arc. */
const ICONS = [
  { src: "/images/bento/icon-target.svg", x: 17, y: 8 },
  { src: "/images/bento/icon-coins.svg", x: 85, y: 28 },
  { src: "/images/bento/icon-wallet.svg", x: 153, y: 8 },
  { src: "/images/bento/icon-lightning.svg", x: 221, y: 28 },
  { src: "/images/bento/checkmark-circle.svg", x: 289, y: 8 },
];

/**
 * Unified balance (Figma 285:24942). Five glass discs — one per wallet —
 * ending on the check.
 *
 * A green light walks the row on a loop, left to right: each disc's ring
 * warms for a beat as the light reaches it, which is the "five feed one"
 * reading the card's headline is making. It is one shared keyframe on an
 * overlay, so the discs themselves never repaint.
 *
 * Positioning splits at `tablet`. From there up the row keeps the design's
 * own absolute coordinates (a shallow arc, alternating 8/28) against a box
 * pinned to the desktop slot's width — that box is narrower than a stacked
 * mobile card, so below `tablet` the same fixed offsets would push the last
 * disc off the card. Below `tablet` it's a flex row instead: no arc (Figma's
 * mobile frame doesn't have one), evenly spaced across whatever the card
 * actually is, at any phone width rather than one this was measured against.
 */
export default function UnifiedBalanceArt() {
  const active = useCardActive();

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="flex h-full items-center justify-between px-5 tablet:block tablet:h-auto tablet:px-0">
        {ICONS.map((icon, i) => {
          const play: CSSProperties = {
            animationDelay: `${i * 0.38}s`,
            animationPlayState: active ? "running" : "paused",
          };

          return (
            <span
              key={icon.src}
              // `relative`, not `static`, below `tablet` — it's still a
              // positioning context there for the absolutely-positioned
              // shadow/sweep overlays below, just not itself taken out of the
              // flex flow the way `tablet:absolute` does from `tablet` up.
              // `left`/`top` only take effect from `tablet` (`.bento-icon-pos`
              // in globals.css) — on a `position:relative` element they'd
              // otherwise apply as an offset from the flex-flow position
              // instead of sitting inert the way they do once `position` is
              // `static`.
              className="bento-icon-pos relative block size-[58px] shrink-0 overflow-hidden rounded-full tablet:absolute"
              style={{ "--icon-x": `${icon.x}px`, "--icon-y": `${icon.y}px` } as CSSProperties}
            >
              <span
                aria-hidden
                // Flat, not frosted. Figma's disc carries a 6px backdrop blur,
                // but it sits on the card's own flat face — there is nothing
                // behind it to blur, and five live backdrop filters in one row
                // is a real cost for no pixels.
                className="pointer-events-none absolute inset-0 rounded-full bg-[rgba(255,255,255,0.06)]"
              />
              <img
                src={icon.src}
                alt=""
                aria-hidden
                loading="lazy"
                decoding="async"
                className="absolute top-1/2 left-1/2 size-5 -translate-x-1/2 -translate-y-1/2"
              />
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0px_2px_3px_0px_rgba(255,255,255,0.4),inset_0px_0px_2px_0px_rgba(255,255,255,0.25),inset_0px_-8px_12px_-4px_rgba(255,255,255,0.3),inset_0px_4px_8px_-4px_rgba(255,255,255,0.12)]"
              />
              <span
                aria-hidden
                className="bento-wallet-sweep pointer-events-none absolute inset-0 rounded-[inherit]"
                style={play}
              />
            </span>
          );
        })}
      </div>
    </div>
  );
}
