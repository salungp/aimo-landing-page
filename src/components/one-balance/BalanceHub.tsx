"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * The hub illustration from Figma 244:1208 — an orb with six wallets around it,
 * each joined by a chain that a pulse runs along.
 *
 * Everything is laid out on the design's own 490x490 grid and then scaled to
 * whatever room the column has. That is deliberate: `offset-path: path()` takes
 * absolute pixel coordinates and nothing else, so expressing the layout as
 * percentages would leave the pulses behind. One scale factor on the frame
 * keeps every part in step, and it is the reason each number below can be read
 * straight off the Figma node.
 */
const SIZE = 490;

/** Centre of the illustration. Figma puts the orb half a pixel off it. */
const C = 245;

type Badge = {
  key: string;
  icon: string;
  label: string;
  /** Centre, in design pixels. */
  x: number;
  y: number;
};

const badges: Badge[] = [
  { key: "top", icon: "coins", label: "Spot balance", x: C, y: 74 },
  { key: "top-left", icon: "target", label: "Predictions", x: 84, y: 148 },
  { key: "top-right", icon: "lightning", label: "Instant settlement", x: 406, y: 148 },
  { key: "bottom-left", icon: "coins", label: "Perps balance", x: 84, y: 343 },
  { key: "bottom-right", icon: "coins", label: "Outcome balance", x: 406, y: 343 },
  { key: "bottom", icon: "wallet", label: "Main wallet", x: C, y: 416 },
];

/**
 * The chains as Figma draws them (244:1214 and 244:1221-1225): a straight drop
 * from the badge, and for the four corners a 32px-radius turn into a run at the
 * orb's height. The cubic is Figma's own quarter-circle approximation, kept
 * rather than rewritten as an arc so the curve is identical.
 *
 * The x values mirror about 245.5 while the badges sit on 245, so the left
 * chains meet their badge 1px off centre and the right ones 2px. That is in
 * the design, measured off the export rather than inferred, and at 48px across
 * it doesn't read; matching it keeps every other number honest.
 */
const chains = [
  "M245 99V206",
  "M245 287V394",
  "M83 172V199C83 216.6731 97.3269 231 115 231H215",
  "M83 319V292C83 274.3269 97.3269 260 115 260H215",
  "M408 172V199C408 216.6731 393.6731 231 376 231H276",
  "M408 319V292C408 274.3269 393.6731 260 376 260H276",
];

type Pulse = {
  key: string;
  /** Same route as its chain, run from the badge's centre to the orb's. */
  path: string;
  /** Where in the cycle this one starts, as a share of the period. */
  phase: number;
  /**
   * Position Figma freezes this pulse at, for readers who have asked for no
   * motion. Only the two chains lit in the design get one.
   */
  still?: string;
};

// Order picked so consecutive pulses land on opposite sides of the orb — going
// round the ring in order reads as a rotating sweep, which this is not.
const pulses: Pulse[] = [
  { key: "top", path: `M245 74V${C}`, phase: 0, still: "55.6%" },
  { key: "bottom-left", path: "M83 343V292C83 274.3269 97.3269 260 115 260H245", phase: 1 / 6, still: "64.5%" },
  { key: "top-right", path: "M408 148V199C408 216.6731 393.6731 231 376 231H245", phase: 2 / 6 },
  { key: "bottom", path: `M245 416V${C}`, phase: 3 / 6 },
  { key: "top-left", path: "M83 148V199C83 216.6731 97.3269 231 115 231H245", phase: 4 / 6 },
  { key: "bottom-right", path: "M408 343V292C408 274.3269 393.6731 260 376 260H245", phase: 5 / 6 },
];

const PERIOD = 4;

export default function BalanceHub({ className }: { className?: string }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [idle, setIdle] = useState(true);

  // Measured rather than derived in CSS: turning a width into a unitless scale
  // factor needs a length-by-length division that isn't reliably supported yet.
  // This runs on resize, never per frame.
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const measure = () => setScale(stage.clientWidth / SIZE);
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  // Nothing animates while the section is somewhere else on the page.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIdle(!entry.isIntersecting),
      { rootMargin: "120px" }
    );
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={stageRef}
      className={`relative aspect-square w-full max-w-[490px] ${idle ? "ob-idle" : ""} ${className ?? ""}`}
    >
      {/* Figma fills this card with 2% white over a 22px backdrop blur; it is a
       * flat colour here instead, at the user's direction. Opaque means the
       * blur has nothing left to show through, so it goes too — and with it the
       * only part of this section that was re-blurring a region every frame
       * while the page scrolled. The inset highlight along the top edge is
       * unchanged; it is what reads as the card's rim, not the fill. */}
      <div
        aria-hidden
        className="absolute top-1/2 left-1/2 overflow-hidden rounded-[32px] bg-[#0C1910] shadow-[inset_0px_2px_4px_1px_rgba(255,255,255,0.06)]"
        style={{
          width: SIZE,
          height: SIZE,
          transform: `translate(-50%, -50%) scale(${scale})`,
        }}
      >
        {/* Rings, chains and the orb's halo: one static layer, painted once. */}
        <svg
          className="absolute inset-0"
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          fill="none"
        >
          <defs>
            <linearGradient id="ob-halo" x1="245" y1="195" x2="245" y2="295" gradientUnits="userSpaceOnUse">
              <stop stopColor="white" stopOpacity="0.12" />
              <stop offset="1" stopColor="white" stopOpacity="0" />
            </linearGradient>
          </defs>

          <circle cx="245" cy="245" r="50" fill="url(#ob-halo)" />

          {/* Figma ships these two as raster exports; redrawn here so they stay
           * sharp at any scale. Dash lengths measured off those exports. */}
          <circle cx="245.5" cy="244.5" r="67" stroke="#1C211E" strokeDasharray="2.4 1.8" />
          <circle cx="245.5" cy="244.5" r="96" stroke="#1C211E" strokeDasharray="1.7 1.7" />

          {chains.map((d) => (
            <path key={d} d={d} stroke="white" strokeOpacity="0.12" />
          ))}
        </svg>

        {pulses.map((pulse) => (
          <span
            key={pulse.key}
            className="ob-pulse"
            data-static={pulse.still ? "" : undefined}
            style={
              {
                "--ob-path": `path("${pulse.path}")`,
                "--ob-period": `${PERIOD}s`,
                // Negative, so the six are already spread around the cycle on
                // the first frame instead of arriving one by one.
                "--ob-delay": `${-(pulse.phase * PERIOD).toFixed(3)}s`,
                "--ob-static": pulse.still,
                zIndex: 1,
              } as React.CSSProperties
            }
          >
            {/* Figma's pulse is the same capsule twice: a 50%-opacity copy
             * blurred by 2, and the line itself. `to right` runs along the
             * direction of travel, which `offset-rotate: auto` gives us, so
             * the lighter green trails the way it does in the design. */}
            <span className="absolute inset-0 rounded-full bg-gradient-to-r from-[#A7F932] to-[#8FEE07] opacity-50 blur-[2px]" />
            <span className="absolute inset-0 rounded-full bg-gradient-to-r from-[#A7F932] to-[#8FEE07]" />
          </span>
        ))}

        {/* Orb. Sits above the chains so a pulse disappears beneath it. */}
        <div
          className="absolute size-[79px] rounded-full bg-[linear-gradient(to_bottom,#F4FEE7_0%,#A7F932_50%,#8FEE07_100%)] shadow-[0px_4px_24px_0px_rgba(0,0,0,0.12)]"
          // Figma centres the orb on 245.5, half a pixel below and right of the
          // frame's own centre (244:1212).
          style={{ left: 206, top: 206, zIndex: 2 }}
        >
          <svg className="absolute inset-0 size-full" viewBox="0 0 79 79" fill="none">
            <path
              d="M51.5155 51.2919C49.0302 52.1057 46.4012 51.2488 44.8859 49.142C44.6784 48.8536 44.4966 48.5402 44.254 48.2849C43.6372 47.6363 42.8461 47.459 41.9834 47.5443C40.8892 47.6526 39.8932 48.0728 38.9233 48.5554C37.8726 49.0782 36.8421 49.6417 35.788 50.1573C34.4319 50.8206 33.0102 51.2993 31.5102 51.5072C30.2095 51.6875 28.9151 51.6611 27.6837 51.1447C26.21 50.5268 25.2066 49.485 24.9197 47.8624C24.7718 47.0258 24.8887 46.2009 25.1179 45.3919C25.5456 43.8822 26.3064 42.535 27.1771 41.2456C28.6009 39.137 30.2855 37.2453 32.0589 35.4299C33.6625 33.7881 35.3367 32.2226 37.1552 30.8185C38.4972 29.7824 39.8995 28.8408 41.4693 28.1757C42.3581 27.7991 43.2762 27.5257 44.2487 27.5171C45.8921 27.5024 47.1134 28.2532 47.9547 29.6415C48.5348 30.5988 48.744 31.6594 48.756 32.764C48.7743 34.4437 48.3782 36.0432 47.7321 37.577C47.361 38.458 46.8993 39.301 46.4742 40.159C46.4141 40.2804 46.3605 40.3943 46.468 40.5095C46.5855 40.6354 46.7047 40.5762 46.832 40.5105C48.839 39.4753 50.8302 39.5092 52.7515 40.696C54.1453 41.5569 55.0203 42.83 55.3724 44.4367C55.9509 47.0757 54.6831 49.7412 52.2713 50.9783C52.0341 51.0999 51.7778 51.1844 51.5155 51.2919Z"
              fill="#1A1A1A"
            />
          </svg>
        </div>

        {badges.map((badge) => (
          <div
            key={badge.key}
            className="absolute flex size-12 items-center justify-center rounded-full bg-white/[0.06] shadow-[0px_2px_6px_0px_rgba(0,0,0,0.08),inset_0px_2px_4px_0px_rgba(255,255,255,0.08)]"
            style={{ left: badge.x - 24, top: badge.y - 24, zIndex: 3 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/images/one-balance/${badge.icon}.svg`}
              alt=""
              loading="lazy"
              decoding="async"
              className="size-[18px]"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
