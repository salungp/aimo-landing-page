"use client";

import type { CSSProperties } from "react";
import { useCardActive } from "./BentoCard";

function Row({
  top,
  label,
  value,
  labelMuted = true,
  valueMuted = false,
  className,
  style,
}: {
  top: number;
  label: string;
  value: string;
  /** The design sets every label to 50% except AIMO's own line. */
  labelMuted?: boolean;
  valueMuted?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`absolute flex items-center justify-between text-xs leading-[normal] font-medium whitespace-nowrap ${className ?? ""}`}
      style={{ left: 14, top, width: 172, letterSpacing: "-0.24px", ...style }}
    >
      <span className={labelMuted ? "opacity-50" : undefined}>{label}</span>
      <span className={`text-right ${valueMuted ? "opacity-50" : ""}`}>{value}</span>
    </div>
  );
}

/**
 * Gasless (Figma 285:24938). The receipt edits itself: the network fee is
 * struck through — with Figma's own hand-drawn strike, not a border — and
 * AIMO's line lifts in underneath to take it to zero.
 *
 * The total never moves during that, on purpose. A total that animated would
 * read as the price changing; the claim is that it does not.
 */
export default function GaslessArt() {
  const active = useCardActive();
  const play: CSSProperties = { animationPlayState: active ? "running" : "paused" };

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div
        className="absolute left-1/2 -translate-x-1/2 overflow-hidden rounded-[16px] border-2 border-[rgba(255,255,255,0.06)] bg-gradient-to-b bg-origin-border from-[rgba(255,255,255,0.12)] to-[rgba(255,255,255,0.02)]"
        style={{ top: 0, width: 204, height: 139 }}
      >
        <Row top={14} label="Trade" value="$250.00" className="text-white" />
        <Row top={37} label="Fee" value="$2.41" valueMuted className="text-white" />

        <img
          src="/images/bento/fee-strike.svg"
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          className="bento-strike absolute origin-left"
          style={{ left: 14, top: 44.2, width: 172.5, height: 1.56, ...play }}
        />

        <Row
          top={60}
          label="Covered by AIMO"
          value="$0.00"
          labelMuted={false}
          className="bento-covered text-primary"
          style={play}
        />
        <Row top={83} label="Total" value="$250.00" className="text-white" />
      </div>
    </div>
  );
}
