"use client";

import { useEffect, useRef, useState } from "react";
import { useCardActive } from "./BentoCard";

/** The chart's own width at `tablet` and up. Figma 308:283 masks the chart to
 * 229px and centres the head dots at 225.8, clear of the edge; the chart ends
 * where the dots are, so that is the width. */
const DESKTOP_WIDTH = 226;
const HEIGHT = 151;
/** Samples drawn across the chart, plus one waiting off the right edge. */
const POINTS = 47;
const TICK_MS = 1200;

/* One step per gap between samples, with the last sample landing exactly one
 * step past the right edge — that is the one the slide brings in. Getting this
 * wrong by a single step is what put the head dots off their own lines: the
 * head was being drawn outside the SVG's viewBox, so the rightmost sample the
 * chart actually showed was the one before it while the dots showed the head. */
function stepFor(width: number) {
  return width / (POINTS - 2);
}

/* The head dot sits on the chart's right edge, not inside it. That is the one
 * x where the value under the dot and the value the dot is tweening to are
 * the same number at every instant of the slide: the line between the last
 * two samples is straight, and the x under the edge walks it at exactly the
 * rate the dot's own transition does. */
const DOT_R = 6.984 / 2;

/* The two traded outcomes share one linear axis, fixed by the design's own
 * dots: 75% sits at y 25.9 and 24% at y 93.7 of the illustration, which is
 * 11.9 and 79.7 inside the chart box (it starts 14px down). The third line is
 * the residual "everything else" at 0,8%, which the design pins to the floor
 * of the frame rather than to that axis — so it gets its own compressed
 * mapping instead of being drawn ten times further down than the frame is
 * tall. */
const yesY = (p: number) => 111.6 - 1.329 * p;
const restY = (p: number) => 139.7 - 3 * p;

/* Figma 308:287's Yes line swings across ~34px of the frame — roughly 58% to
 * 84% — so the walk is allowed that much room. */
const YES_MIN = 56;
const YES_MAX = 86;
const TOTAL = 99.2;

/** A hash, not a generator: the same index always gives the same number in
 * [-1, 1], which is what lets the opening shape be as jagged as a real tape
 * and still render identically on the server and in the browser.
 *
 * Integer arithmetic on purpose. The usual `fract(sin(x) * 43758)` hash is
 * not safe here: `Math.sin` is allowed to differ in its last bit between two
 * engines, and this hash multiplies that bit by 43758 and then takes the
 * fractional part — so Node and the browser can disagree completely, and
 * React reports a hydration mismatch on every path in the chart. `Math.imul`
 * is exact 32-bit everywhere. */
function jitter(i: number, salt: number) {
  let h = Math.imul(i + 1, 0x27d4eb2d) ^ Math.imul(salt + 1, 0x165667b1);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2545f491);
  h ^= h >>> 13;
  return ((h >>> 0) / 0xffffffff) * 2 - 1;
}

/* A market reads as a slow mean with fast noise on top of it, and that is how
 * both series are built: `mid` walks, every sample is `mid` plus a tick of
 * noise. Drawing the walk alone would give the smooth curve of a sparkline,
 * which is not what the design shows. */
const NOISE = 3.2;

function seedSeries(base: number, salt: number) {
  let mid = base;
  return Array.from({ length: POINTS }, (_, i) => {
    mid += jitter(i, salt + 3) * 3.6;
    mid = Math.max(YES_MIN + 4, Math.min(YES_MAX - 4, mid));
    return mid + jitter(i, salt) * NOISE;
  });
}

function seedRest(base: number, salt: number) {
  return Array.from({ length: POINTS }, (_, i) => base + jitter(i, salt) * 0.12);
}

function buildLine(values: number[], map: (p: number) => number, step: number) {
  return values.map((value, i) => `${i === 0 ? "M" : "L"}${i * step} ${map(value)}`).join(" ");
}

/* The fill under a line is a short ribbon, not a column down to the floor:
 * Figma's own fill vector is only ~56px tall against a 151px frame, with a
 * flat bottom just under the line's lowest point. Its gradient is left in
 * objectBoundingBox units so it re-fits that bottom as the series moves,
 * instead of needing its stops rewritten on every tick. */
function buildArea(values: number[], map: (p: number) => number, step: number) {
  const bottom = Math.max(...values.map(map)) + 12;
  const last = (values.length - 1) * step;
  return `${buildLine(values, map, step)} L${last} ${bottom} L0 ${bottom} Z`;
}

/**
 * Prediction (Figma 285:24939). A market pricing itself, live.
 *
 * The chart scrolls the way a real one does — by adding a sample at the right
 * and sliding everything left one step — but it never animates the `d` of a
 * path, which no browser can do cheaply. Instead the whole series is drawn
 * one step wider than the frame and slid left by exactly one step over the
 * tick; when the tick ends, the oldest sample is dropped and the newest
 * enters, which puts every remaining point back where the slide had just
 * carried it. The swap is therefore invisible, and the motion is a transform
 * on the SVG's wrapper — not on a group inside it, which would repaint every
 * path in the chart on every frame.
 *
 * Yes and No are not decoration on top of that: the top line IS the Yes
 * price, the second line is No, and the two buttons read their numbers off
 * the same series the lines are drawn from. When Yes climbs, No falls by the
 * same amount, the dots move with them and both pills re-price — so nothing
 * on the card can contradict anything else on it.
 */
export default function PredictionArt() {
  const active = useCardActive();
  const trackRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [series, setSeries] = useState(() => ({
    mid: 75,
    yes: seedSeries(75, 1),
    rest: seedRest(0.85, 7),
  }));
  // Below `tablet` the card's `artFillMobile` box is the card's own width
  // (see BentoCard), so measuring this container gives the real slot instead
  // of the fixed desktop one — the chart fills it edge to edge, matching
  // Figma's mobile frame, instead of leaving the dead gap a hardcoded width
  // would on a wider box. At `tablet` and up it's pinned back to the design's
  // 229, matching the fixed slot exactly as before.
  const [width, setWidth] = useState(DESKTOP_WIDTH);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const mq = window.matchMedia("(min-width: 768px)");
    const measure = () => {
      if (mq.matches) {
        setWidth(DESKTOP_WIDTH);
        return;
      }
      // Room for the head dot, which is centred on the chart's right edge.
      const available = el.getBoundingClientRect().width - 8;
      setWidth(Math.max(180, Math.round(available)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    mq.addEventListener("change", measure);
    return () => {
      ro.disconnect();
      mq.removeEventListener("change", measure);
    };
  }, []);

  const step = stepFor(width);

  useEffect(() => {
    if (!active) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const id = window.setInterval(() => {
      setSeries((previous) => {
        // A soft pull back towards the middle of the range keeps the walk from
        // parking against an edge for minutes at a time.
        const drift = (Math.random() - 0.5) * 5 + (72 - previous.mid) * 0.06;
        const mid = Math.max(YES_MIN + 4, Math.min(YES_MAX - 4, previous.mid + drift));
        const next = mid + (Math.random() - 0.5) * 2 * NOISE;
        const rest = Math.max(
          0.3,
          Math.min(1.6, previous.rest[previous.rest.length - 1] + (Math.random() - 0.5) * 0.3)
        );
        return {
          mid,
          yes: [...previous.yes.slice(1), next],
          rest: [...previous.rest.slice(1), rest],
        };
      });

      if (!reduced) {
        trackRef.current?.animate(
          [{ transform: "translateX(0px)" }, { transform: `translateX(${-step}px)` }],
          { duration: TICK_MS, easing: "linear", fill: "none" }
        );
      }
    }, TICK_MS);

    return () => window.clearInterval(id);
  }, [active, step]);

  const yes = series.yes;
  const rest = series.rest;
  const no = yes.map((value) => TOTAL - value);
  // The sample that will be sitting on the right edge when this tick lands —
  // dots, labels and both pills all read it, so they move as one.
  const headYes = yes[yes.length - 1];
  const headNo = TOTAL - headYes;
  const headRest = rest[rest.length - 1];

  const dotTransition = { transition: `transform ${TICK_MS}ms linear` };

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden">
      {/* Lines. Masked left-to-right exactly as the Figma mask group is, so
       * the oldest history fades out instead of being cut off. */}
      <div
        className="bento-fade-left absolute top-[14px] left-0 overflow-hidden"
        style={{ width, height: HEIGHT }}
      >
        {/* The slide is a transform on this div, not on a <g> inside the SVG.
         * An SVG transform makes the browser re-rasterise every path in the
         * document fragment on every frame — five strokes and two gradient
         * fills, 60 times a second, which is what made this the most
         * expensive card on the page. Moving an HTML element instead is a
         * compositor transform: the SVG is rasterised once per tick and then
         * only shifted. The SVG is drawn one step wider than the window and
         * this box clips it, so the incoming sample is off-screen until the
         * slide brings it in. */}
        <div ref={trackRef} className="absolute inset-0" style={{ willChange: "transform" }}>
          <svg
            width={width + step}
            height={HEIGHT}
            viewBox={`0 0 ${width + step} ${HEIGHT}`}
            fill="none"
            aria-hidden
          >
            <defs>
              <linearGradient id="bento-yes-fill" x1="0" y1="0" x2="0" y2="1">
                <stop stopColor="#8B5CF6" stopOpacity="0.2" />
                <stop offset="1" stopColor="#8B5CF6" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="bento-no-fill" x1="0" y1="0" x2="0" y2="1">
                <stop stopColor="#A7F932" stopOpacity="0.2" />
                <stop offset="1" stopColor="#A7F932" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={buildArea(yes, yesY, step)} fill="url(#bento-yes-fill)" />
            <path d={buildArea(no, yesY, step)} fill="url(#bento-no-fill)" />
            <path
              d={buildLine(yes, yesY, step)}
              stroke="#8B5CF6"
              strokeWidth="1.39683"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={buildLine(no, yesY, step)}
              stroke="#A7F932"
              strokeWidth="1.39683"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={buildLine(rest, restY, step)}
              stroke="#F7931A"
              strokeWidth="1.39683"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Heads: the dot, held at the right edge. It rides the same tick as
       * the line, so a dot is never off its own curve. The design carries no
       * reading beside it — the pills below are the reading. */}
      {(
        [
          { y: yesY(headYes), color: "#8B5CF6" },
          { y: yesY(headNo), color: "#A7F932" },
          { y: restY(headRest), color: "#F7931A" },
        ] as const
      ).map((head) => (
        <span
          key={head.color}
          className="pointer-events-none absolute block size-[6.984px] rounded-full"
          style={{
            left: width - DOT_R,
            top: 14 - DOT_R,
            background: head.color,
            transform: `translateY(${head.y}px)`,
            ...dotTransition,
          }}
        />
      ))}

      {/* The two sides, priced from the same numbers the lines are drawn from. */}
      <div
        className="absolute bottom-[20px] left-1/2 flex -translate-x-1/2 items-center gap-2"
        style={{ width: 234 }}
      >
        <span className="relative flex h-9 min-w-0 flex-1 items-center justify-center gap-[6px] rounded-full px-4 py-[10px]">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b from-[#a7f932] to-[#8fee07]"
          />
          <span className="relative text-base leading-[19px] font-medium text-ink">Yes</span>
          <span className="relative text-sm leading-[normal] font-medium tabular-nums text-ink opacity-80">
            {Math.round(headYes)}%
          </span>
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0px_-2px_4px_0px_rgba(0,0,0,0.1),inset_0px_1px_1px_0px_rgba(255,255,255,0.5)]"
          />
        </span>
        <span className="relative flex h-9 min-w-0 flex-1 items-center justify-center gap-[6px] rounded-full px-4 py-[10px]">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b from-[#e03e3e] to-[#d32222]"
          />
          <span className="relative text-base leading-[19px] font-medium text-white">No</span>
          <span className="relative text-sm leading-[normal] font-medium tabular-nums text-white opacity-80">
            {Math.round(headNo)}%
          </span>
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0px_-2px_4px_0px_rgba(0,0,0,0.1),inset_0px_1px_1px_0px_rgba(255,255,255,0.24)]"
          />
        </span>
      </div>
    </div>
  );
}
