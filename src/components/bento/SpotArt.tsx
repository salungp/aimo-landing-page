"use client";

import { useCardSeen } from "./BentoCard";

const SIZE = 88;
const CENTRE = SIZE / 2;
const STROKE = 8.8;
/** The ring's centreline, and the two edges the segments are drawn between. */
const RADIUS = (SIZE - STROKE) / 2;
const OUTER = RADIUS + STROKE / 2;
const INNER = RADIUS - STROKE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** Visible gap between segments, measured on the centreline, in px. */
const GAP = 2;
/** Corner radius on the four ends of each segment. */
const CORNER = 3;

/* Clockwise from twelve o'clock, as the Figma donut reads. The percentages
 * are the design's own; they are normalised onto the ring so the four arcs
 * plus their gaps close it exactly, while the legend keeps the authored
 * numbers. */
const SLICES = [
  { key: "BTC", pct: 43, value: "$10,200", color: "#2ab2ef" },
  { key: "ETH", pct: 12, value: "$4,200", color: "#8b5cf6" },
  { key: "SOL", pct: 23, value: "$2,210", color: "#f96e0d" },
  { key: "Outcome", pct: 12, value: "$12,200", color: "#f59e0b" },
];

const TOTAL_PCT = SLICES.reduce((sum, slice) => sum + slice.pct, 0);

/* Segments are filled sectors, not dashes on a stroked circle.
 *
 * A stroke can only end flat or fully round, and "round" is half the stroke —
 * 5.5px here, which is the whole end of the segment. Drawing the band as a
 * path is the only way to ask for a corner of 3px (Figma 308:384). It also makes the gap
 * honest: the segments now end on true radial edges, so GAP is the distance
 * between them on the centreline rather than a dash length that both round
 * caps then eat into. */
const point = (radius: number, angle: number) =>
  `${(CENTRE + radius * Math.cos(angle)).toFixed(3)} ${(CENTRE + radius * Math.sin(angle)).toFixed(3)}`;

function sectorPath(from: number, to: number) {
  // How far in from each radial edge the corner arc starts, on each rim: the
  // corner circle sits tangent to both the rim and the edge, so its centre is
  // one corner-radius inside the rim and this angle off the edge.
  const outerInset = Math.asin(CORNER / (OUTER - CORNER));
  const innerInset = Math.asin(CORNER / (INNER + CORNER));
  // Where the corner meets the radial edge, measured from the centre.
  const outerFoot = (OUTER - CORNER) * Math.cos(outerInset);
  const innerFoot = (INNER + CORNER) * Math.cos(innerInset);
  const outerSweep = to - from - 2 * outerInset > Math.PI ? 1 : 0;
  const innerSweep = to - from - 2 * innerInset > Math.PI ? 1 : 0;

  return [
    `M${point(OUTER, from + outerInset)}`,
    `A${OUTER} ${OUTER} 0 ${outerSweep} 1 ${point(OUTER, to - outerInset)}`,
    `A${CORNER} ${CORNER} 0 0 1 ${point(outerFoot, to)}`,
    `L${point(innerFoot, to)}`,
    `A${CORNER} ${CORNER} 0 0 1 ${point(INNER, to - innerInset)}`,
    `A${INNER} ${INNER} 0 ${innerSweep} 0 ${point(INNER, from + innerInset)}`,
    `A${CORNER} ${CORNER} 0 0 1 ${point(innerFoot, from)}`,
    `L${point(outerFoot, from)}`,
    `A${CORNER} ${CORNER} 0 0 1 ${point(OUTER, from + outerInset)}`,
    "Z",
  ].join(" ");
}

/** Each slice's sector, laid out clockwise from twelve o'clock. */
const GAP_ANGLE = GAP / RADIUS;
const SPAN = 2 * Math.PI - GAP_ANGLE * SLICES.length;
const ARCS = SLICES.map((slice, i) => {
  const before = SLICES.slice(0, i).reduce((sum, p) => sum + (p.pct / TOTAL_PCT) * SPAN + GAP_ANGLE, 0);
  const from = -Math.PI / 2 + before;
  return { ...slice, index: i, d: sectorPath(from, from + (slice.pct / TOTAL_PCT) * SPAN) };
});

/**
 * Spot (Figma 285:24937). The holdings donut and its legend.
 *
 * Nothing here pretends to be live — spot is the one card about what you
 * already own, so the only motion is the arrival: the ring wipes on clockwise
 * the first time the card comes into view, on the page's own expo curve. The
 * wipe is a mask (one stroked circle whose dash opens from nothing) rather
 * than four separately drawn arcs, because the segments are filled paths now
 * and a path cannot draw itself on. It runs once and stays (`useCardSeen`,
 * not `useCardActive`) — a ring that un-drew itself every time the card left
 * the viewport would re-run on every scroll past.
 */
export default function SpotArt() {
  const drawn = useCardSeen();

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="absolute top-0 left-1/2 flex -translate-x-1/2 items-center gap-[12.8px]" style={{ width: 260 }}>
        <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} fill="none" aria-hidden>
            <defs>
              <mask id="bento-donut-wipe">
                <circle
                  cx={CENTRE}
                  cy={CENTRE}
                  r={RADIUS}
                  stroke="#fff"
                  strokeWidth={STROKE + 4}
                  fill="none"
                  transform={`rotate(-90 ${CENTRE} ${CENTRE})`}
                  strokeDasharray={CIRCUMFERENCE}
                  style={{
                    strokeDashoffset: drawn ? 0 : CIRCUMFERENCE,
                    transition: "stroke-dashoffset 900ms cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                />
              </mask>
              {/* Figma's inner shadow on each segment: a 0.8px white lip along
               * the top edge at 30%. */}
              <filter id="bento-donut-lip" x="0" y="0" width="100%" height="100%">
                <feOffset in="SourceAlpha" dy="0.8" />
                <feGaussianBlur stdDeviation="0.4" />
                <feComposite in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" />
                <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.3 0" />
                <feComposite in2="SourceGraphic" operator="over" />
              </filter>
            </defs>
            <g mask="url(#bento-donut-wipe)" filter="url(#bento-donut-lip)">
              {ARCS.map((slice) => (
                <path key={slice.key} d={slice.d} fill={slice.color} />
              ))}
            </g>
          </svg>

          <div
            className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col gap-[3.2px] text-center"
            style={{ width: 47.2 }}
          >
            <p className="font-medium text-white" style={{ fontSize: 11.2 }}>
              $24,503
            </p>
            <p className="text-black-50" style={{ fontSize: 9.6 }}>
              100%
            </p>
          </div>
        </div>

        <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-[4.8px] gap-y-[11.2px]">
          {SLICES.map((slice) => (
            <div key={slice.key} className="flex items-start gap-[6.4px]">
              <span
                aria-hidden
                className="mt-[1px] shrink-0 rounded-[3.2px] shadow-[inset_0px_0.8px_0.8px_0px_rgba(255,255,255,0.3)]"
                style={{ width: 9.6, height: 9.6, background: slice.color }}
              />
              <div className="flex flex-col gap-[3.2px] whitespace-nowrap" style={{ fontSize: 9.6 }}>
                <div className="flex gap-[3.2px] text-black-50">
                  <span>{slice.key}</span>
                  <span>{slice.pct}%</span>
                </div>
                <span className="font-medium text-white">{slice.value}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
