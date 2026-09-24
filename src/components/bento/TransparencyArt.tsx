"use client";


const BADGES = [
  "Security",
  "Transaction transparency",
  "Custody model",
  "Fees",
  "Withdrawal",
  "Supported network",
];

/**
 * Transparency (Figma 285:24941). Six glass pills, wrapped centre-aligned in
 * a 289.42px column — the width is the design's, and it is what puts the
 * break after "Withdrawal".
 *
 * The pills are static, as the design has them. A staggered breathe was tried
 * and removed: see the note on `.bento-badge` in globals.css for what six
 * animated glass pills cost.
 */
export default function TransparencyArt() {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <div
        className="absolute top-[11px] left-1/2 flex -translate-x-1/2 flex-wrap content-start items-start justify-center gap-[6px]"
        style={{ width: 289.424 }}
      >
        {BADGES.map((badge) => (
          <span
            key={badge}
            className="bento-badge relative flex shrink-0 items-center justify-center gap-[4.487px] overflow-hidden rounded-full px-2 py-1"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b from-[rgba(194,249,75,0.1)] to-[rgba(194,249,75,0.06)] backdrop-blur-[4.487px]"
            />
            <span
              aria-hidden
              className="relative shrink-0 rounded-full bg-primary/20"
              style={{ width: 3.435, height: 3.435 }}
            />
            <span
              className="relative shrink-0 leading-[normal] font-medium whitespace-nowrap text-primary"
              style={{ fontSize: 10.306, letterSpacing: "-0.1031px" }}
            >
              {badge}
            </span>
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0px_-0.859px_2.576px_0px_rgba(0,0,0,0.2),inset_0px_0.859px_1.718px_0.859px_rgba(167,249,50,0.1)]"
            />
          </span>
        ))}
      </div>
    </div>
  );
}
