"use client";

import { useEffect, useState } from "react";
import { useCardActive } from "./BentoCard";
import RollingNumber from "./RollingNumber";

type Token = {
  symbol: string;
  cap: string;
  price: number;
  /** A logo asset — a plain image, no runtime recolouring. */
  mark: { src: string; size: number };
};

/* Prices are illustrative, and they drift from here rather than from a feed.
 *
 * BTC and LINK carry the two logos the Figma frame itself ships. ETH, SOL and
 * BNB reuse marks this repo already owns (public/images/orbit), which are
 * authored as translucent white glyphs for the hero's glass bubbles — the
 * wrong colour for this card's white disc. They used to be recoloured at
 * runtime with a CSS mask, one per icon, inside a row that is itself
 * continuously translating — every mask forces its own compositing pass on
 * every frame of the marquee, times two for the row's two copies, and WebKit
 * charges far more for it than Chromium does. Baked instead: the three glyphs
 * are copied into this folder with their `fill="white"` swapped for the
 * token's own colour (`token-*-colored.svg`; the fill-opacity facets that
 * gave ETH its two-tone shading are untouched, so the baked version is pixel
 * for pixel what the mask used to produce), and loaded as a plain `<img>` —
 * zero runtime cost, same pixels. The orbit originals are untouched; other
 * sections still want them white. */
const TOKENS: Token[] = [
  {
    symbol: "BTC",
    cap: "$1.2T MC",
    price: 63130,
    mark: { src: "/images/bento/token-btc.svg", size: 38 },
  },
  {
    symbol: "ETH",
    cap: "$380B MC",
    price: 2480.4,
    mark: { src: "/images/bento/token-eth-colored.svg", size: 20 },
  },
  {
    symbol: "SOL",
    cap: "$95B MC",
    price: 148.22,
    mark: { src: "/images/bento/token-sol-colored.svg", size: 20 },
  },
  {
    symbol: "LINK",
    cap: "$12B MC",
    price: 14.83,
    mark: { src: "/images/bento/token-link.webp", size: 24 },
  },
  {
    symbol: "BNB",
    cap: "$88B MC",
    price: 592.1,
    mark: { src: "/images/bento/token-bnb-colored.svg", size: 20 },
  },
];

const ITEM_WIDTH = 240;
const ITEM_GAP = 8;

function formatPrice(value: number) {
  const [whole, cents] = value.toFixed(2).split(".");
  return [Number(whole).toLocaleString("en-US"), cents] as const;
}

/** The 38px disc from the design: a white circle with the token's mark on it. */
function TokenMark({ mark, symbol }: { mark: Token["mark"]; symbol: string }) {
  return (
    <span className="relative block size-[38px] shrink-0 overflow-hidden rounded-full bg-white">
      <img
        src={mark.src}
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ width: mark.size, height: mark.size }}
      />
      <span className="sr-only">{symbol}</span>
    </span>
  );
}

function TokenItem({ token, change, direction }: { token: Token; change: number; direction: number }) {
  const [whole, cents] = formatPrice(token.price);
  const up = change >= 0;

  return (
    <div
      className="flex shrink-0 items-center gap-[10px] rounded-[20px] border border-[rgba(255,255,255,0.08)] bg-gradient-to-r from-[rgba(255,255,255,0.1)] to-[rgba(255,255,255,0.04)] p-[14px]"
      style={{ width: ITEM_WIDTH, height: 66 }}
    >
      <span className="relative block size-[38px] shrink-0">
        <TokenMark mark={token.mark} symbol={token.symbol} />
        <img
          src="/images/bento/star.svg"
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          className="absolute size-4"
          style={{ left: 26, top: 22 }}
        />
      </span>

      <div className="flex min-w-0 flex-1 items-start gap-[10px]">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-sm leading-[normal] font-medium whitespace-nowrap text-white">{token.symbol}</p>
          <p className="text-xs leading-[normal] whitespace-nowrap text-black-50">{token.cap}</p>
        </div>

        <div className="flex w-[84px] shrink-0 flex-col items-end justify-center gap-1">
          <p className="flex items-baseline leading-[normal] tabular-nums whitespace-nowrap text-white">
            <span className="text-sm leading-[normal] font-semibold">$</span>
            <RollingNumber
              value={whole}
              direction={direction}
              className="text-sm leading-[normal] font-semibold"
            />
            <RollingNumber
              value={`.${cents}`}
              direction={direction}
              className="text-[10px] leading-[normal] font-semibold text-black-50"
            />
          </p>
          <span
            className="flex items-center gap-[2px] transition-colors duration-300"
            style={{ color: up ? "#10b93d" : "#e03e3e" }}
          >
            <img
              src={up ? "/images/bento/arrow-up.svg" : "/images/bento/arrow-down.svg"}
              alt=""
              aria-hidden
              loading="lazy"
              decoding="async"
              className="size-[10px] shrink-0"
            />
            <RollingNumber
              value={`${Math.abs(change).toFixed(2)}%`}
              direction={direction}
              className="text-xs leading-[normal] font-medium tabular-nums whitespace-nowrap"
            />
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Performance (Figma 285:24940). The token strip drifts left forever and the
 * quotes move while it goes.
 *
 * Two things are separate on purpose. The drift is a CSS transform on a track
 * holding two identical copies of the row — it never re-renders, so it cannot
 * stutter when React is busy. The quotes are React state on a slow interval;
 * both copies of a token read the same state, so a token never shows two
 * different prices as it wraps.
 *
 * Each quote rolls rather than blinks: see RollingNumber. The direction it
 * rolls is the direction the price moved, and the arrow and its colour come
 * from the same number, so nothing on the row can disagree with itself.
 *
 * The prices random-walk from their starting value and the percentage is
 * derived from that walk, so the arrow, its colour and the number can never
 * disagree with each other.
 */
export default function PerformanceArt() {
  const active = useCardActive();
  const [quotes, setQuotes] = useState(() =>
    TOKENS.map((_, i) => ({ change: 1.44 - i * 0.31, direction: 1 }))
  );

  useEffect(() => {
    if (!active) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const id = window.setInterval(() => {
      setQuotes((previous) =>
        previous.map((quote) => {
          const step = (Math.random() - 0.5) * 0.9;
          // Keep the walk inside a believable day's range, and let it cross
          // zero so the card shows a red tick from time to time.
          const change = Math.max(-4.2, Math.min(5.6, quote.change + step));
          // The direction the price moved, which is the direction the digits
          // roll. Taken from the clamped value, not the step, so a quote
          // pinned at the top of its range doesn't keep rolling upward.
          return { change, direction: change >= quote.change ? 1 : -1 };
        })
      );
      // 2.2s, not the 1.4 this started on: each tick starts ~28 short roll
      // animations across the strip's two copies, and a quote that re-prices
      // every second and a half reads as a stopwatch rather than a market.
    }, 2200);

    return () => window.clearInterval(id);
  }, [active]);

  const row = TOKENS.map((token, i) => ({
    token: { ...token, price: token.price * (1 + quotes[i].change / 100) },
    change: quotes[i].change,
    direction: quotes[i].direction,
  }));

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="bento-fade-x absolute top-[12px] left-1/2 -translate-x-1/2" style={{ width: 434, height: 100 }}>
        <div
          className="bento-token-track absolute flex"
          style={{
            top: 19,
            gap: ITEM_GAP,
            // Left of the box by one item, so the row is already mid-flow at
            // the moment the card first appears rather than starting empty.
            left: -(ITEM_WIDTH + ITEM_GAP),
            animationPlayState: active ? "running" : "paused",
          }}
        >
          {[0, 1].map((copy) => (
            <div key={copy} className="flex shrink-0" style={{ gap: ITEM_GAP, paddingRight: ITEM_GAP }}>
              {row.map(({ token, change, direction }) => (
                <TokenItem
                  key={`${copy}-${token.symbol}`}
                  token={token}
                  change={change}
                  direction={direction}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
