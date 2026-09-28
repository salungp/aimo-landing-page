"use client";

import { useState } from "react";

/** Index of the first character that differs, or the whole string when the
 * length changed (a digit was added or dropped, so every place shifted). */
function firstChange(prev: string, next: string) {
  if (prev.length !== next.length) return 0;
  let i = 0;
  while (i < next.length && prev[i] === next[i]) i++;
  return i;
}

/**
 * transitions.dev "Number pop-in": when the value changes, its digits pop up
 * into place — rising with a short blur and an overshoot, one after another.
 * CSS and motion tokens are `.t-digit*` in globals.css.
 *
 * Only the digits from the first changed place onward pop. A price going from
 * 63,130 to 63,134 re-prints the last digit, not all five; a strip of quotes
 * that re-prices every couple of seconds would otherwise flash every number
 * on it. The unchanged digits keep their keys, so React leaves them alone.
 *
 * Replay is a remount rather than the original's remove-class, reflow,
 * re-add dance: each change bumps a version that is part of the popping
 * digits' keys, so they are fresh elements and their animation starts over.
 * Nothing pops on the first render — only a change does — so the server and
 * the browser draw the same static number.
 */
export default function NumberPopIn({
  value,
  direction = 1,
  className,
}: {
  value: string;
  /** 1 pops the digits up from below (value rose), -1 drops them from above (value fell). */
  direction?: number;
  className?: string;
}) {
  // Derived from the previous render, React's documented pattern for it: the
  // extra render happens before paint, so the old value never shows.
  const [prev, setPrev] = useState(value);
  const [from, setFrom] = useState(value.length);
  const [version, setVersion] = useState(0);
  if (value !== prev) {
    setPrev(value);
    setFrom(firstChange(prev, value));
    setVersion((v) => v + 1);
  }

  return (
    <span
      className={`t-digit-group ${className ?? ""}`}
      style={{ "--digit-dir-y": direction >= 0 ? 1 : -1 } as React.CSSProperties}
    >
      {Array.from(value).map((ch, i) =>
        i < from ? (
          <span key={`s${i}`} className="t-digit">
            {ch}
          </span>
        ) : (
          <span
            key={`${version}-${i}`}
            className="t-digit is-popping"
            style={{ "--digit-i": i - from } as React.CSSProperties}
          >
            {ch}
          </span>
        )
      )}
    </span>
  );
}
