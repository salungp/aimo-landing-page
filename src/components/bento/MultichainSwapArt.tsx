"use client";

import type { CSSProperties } from "react";

function Leg({
  top,
  icon,
  iconStyle,
  amount,
  chain,
  side,
}: {
  top: number;
  icon: string;
  iconStyle: CSSProperties;
  amount: string;
  chain: string;
  side: string;
}) {
  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 overflow-hidden rounded-[12px] border border-[rgba(255,255,255,0.06)] bg-gradient-to-b from-[rgba(255,255,255,0.12)] to-[rgba(255,255,255,0.02)] shadow-[0px_2px_6px_0px_rgba(0,0,0,0.12)] backdrop-blur-[12px]"
      style={{ top, width: 220, height: 48 }}
    >
      <span
        className="absolute overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]"
        style={{ left: 9, top: 9, width: 28, height: 28 }}
      >
        <img src={icon} alt="" aria-hidden loading="lazy" decoding="async" className="absolute" style={iconStyle} />
      </span>
      <p
        className="absolute text-xs leading-[normal] font-semibold whitespace-nowrap text-white"
        style={{ left: 45, top: 9, letterSpacing: "-0.24px" }}
      >
        {amount}
      </p>
      <p
        className="absolute text-[10px] whitespace-nowrap text-white opacity-50"
        style={{ left: 45, top: 25, letterSpacing: "-0.2px" }}
      >
        {chain}
      </p>
      <p
        className="absolute top-1/2 -translate-y-1/2 text-[10px] whitespace-nowrap text-white opacity-50"
        style={{ right: 11, letterSpacing: "-0.2px" }}
      >
        {side}
      </p>
    </div>
  );
}

/**
 * Multichain swap (Figma 285:25030). A static frame: funds leave Base, a
 * found route with two hops, and the same value lands on Solana.
 */
export default function MultichainSwapArt() {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <Leg
        top={8}
        icon="/images/bento/token-usdc.svg"
        iconStyle={{ left: 7, top: 6, width: 14, height: 16 }}
        amount="250.00 USDC"
        chain="Base"
        side="From"
      />

      {/* The route: a green rail and three hops. */}
      <span
        aria-hidden
        className="absolute block w-px bg-primary"
        style={{ left: 50, top: 56, height: 68, opacity: 0.45 }}
      />
      {[66, 87, 108].map((top) => (
        <span
          key={top}
          aria-hidden
          className="absolute block size-[6px] rounded-full bg-primary"
          style={{ left: 47, top }}
        />
      ))}
      <span
        aria-hidden
        className="absolute block rounded-full border border-primary bg-[#18201B]"
        style={{ left: 45, top: 85, width: 10, height: 10 }}
      />

      <div
        className="absolute flex h-[22px] items-center justify-center gap-[6px] rounded-full border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.06)] px-[6px] shadow-[0px_2px_6px_0px_rgba(0,0,0,0.12)]"
        style={{ left: 61, top: 80 }}
      >
        <span className="text-[10px] whitespace-nowrap text-white opacity-50" style={{ letterSpacing: "-0.2px" }}>
          Route found
        </span>
        <span aria-hidden className="size-[2px] shrink-0 rounded-full bg-primary" />
        <span className="text-[10px] whitespace-nowrap text-primary" style={{ letterSpacing: "-0.2px" }}>
          2 hops
        </span>
      </div>

      <Leg
        top={124}
        icon="/images/bento/token-solana.svg"
        iconStyle={{ left: 7, top: 7, width: 14, height: 14 }}
        amount="1.42 SOL"
        chain="Solana"
        side="To"
      />

      <p
        className="absolute left-1/2 -translate-x-1/2 text-center text-[10px] whitespace-nowrap text-white opacity-50"
        style={{ top: 186, letterSpacing: "-0.2px" }}
      >
        1 confirmation · settles in ~4s
      </p>
    </div>
  );
}
