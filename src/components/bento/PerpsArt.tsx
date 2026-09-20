"use client";

import { useEffect, useState } from "react";
import { useCardActive } from "./BentoCard";

/* The illustration's own box, and the picker laid out inside it. The knob
 * never moves: the track slides under it, the way a leverage picker works
 * when you drag it. Ticks sit on a 22px pitch, every fourth full height, and
 * the five full-height ticks that carry a label are the stops.
 *
 * The strip is drawn wider than the labelled range so that sliding to either
 * end still covers the card — the scale continues past the labels rather than
 * running out into empty background. */
const TRACK_TOP = 42;
const TICK_PITCH = 22;
const FIRST_TICK = -6;
const LAST_TICK = 22;
const KNOB_CY = TRACK_TOP + 30;

const STOPS = [
  { tick: 0, label: "0x" },
  { tick: 4, label: "1x" },
  { tick: 8, label: "3x" },
  { tick: 12, label: "5x" },
  { tick: 16, label: "8x" },
];

/** Where the drag goes, and how long it rests. A hand, not a metronome. */
const DRAG = [8, 12, 16, 12, 8, 4, 0, 4];
const DRAG_MS = 2000;

/** A tick's centre in track coordinates. The track's own origin is tick 0. */
const tickCentre = (tick: number) => tick * TICK_PITCH + 2;

/**
 * Perps (Figma 285:24936). The leverage picker, being scrubbed.
 *
 * The knob is nailed to the card's centre line and the scale slides under it
 * — the way the control actually behaves when a thumb drags it, and the only
 * arrangement where the selected value is unambiguous. A knob that travelled
 * instead would be a progress bar, not a picker.
 *
 * One transform on one element carries the whole strip, ticks and labels
 * together, on an overshooting curve. Nothing else in here moves except the
 * thumb's own press.
 */
export default function PerpsArt() {
  const active = useCardActive();
  const [step, setStep] = useState(0);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!active) return;

    let grab: number | undefined;
    let release: number | undefined;
    const id = window.setInterval(() => {
      // A beat of "grab" before each move, so the throw reads as deliberate.
      setDragging(true);
      grab = window.setTimeout(() => {
        setStep((previous) => (previous + 1) % DRAG.length);
        release = window.setTimeout(() => setDragging(false), 560);
      }, 150);
    }, DRAG_MS);

    return () => {
      window.clearInterval(id);
      window.clearTimeout(grab);
      window.clearTimeout(release);
    };
  }, [active]);

  const selected = DRAG[step];
  // Slide the track so the selected tick sits under the fixed knob. The knob
  // is at the box's own centre, so the offset is measured from there and the
  // card can be any width — which the wide slot in the grid needs.
  const offset = -tickCentre(selected);

  const ticks: number[] = [];
  for (let i = FIRST_TICK; i <= LAST_TICK; i += 1) ticks.push(i);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="bento-fade-x absolute inset-0">
        <div
          className="absolute inset-y-0 left-1/2"
          style={{
            transform: `translate3d(${offset}px, 0, 0)`,
            // Carried a little past the stop and back: the overshoot is what
            // makes it read as thrown rather than tweened.
            transition: "transform 640ms cubic-bezier(0.34, 1.28, 0.42, 1)",
            willChange: "transform",
          }}
        >
          {ticks.map((i) => {
            const tall = i % 4 === 0;
            // The design greens the full-height ticks that carry a label, and
            // leaves everything else white at 8%.
            const green = tall && i >= 0 && i <= 16;

            return (
              <span
                key={i}
                aria-hidden
                className="absolute rounded-[2px]"
                style={{
                  left: i * TICK_PITCH,
                  top: TRACK_TOP + (tall ? 0 : 10),
                  width: 4,
                  height: tall ? 50 : 40,
                  background: green
                    ? "linear-gradient(180deg, #A7F932 0%, rgba(167,249,50,0.16) 100%)"
                    : "rgba(255,255,255,0.08)",
                }}
              />
            );
          })}

          {STOPS.map((stop) => {
            const isSelected = stop.tick === selected;
            return (
              <span
                key={stop.label}
                className="absolute flex h-[22px] -translate-x-1/2 items-center justify-center overflow-hidden rounded-[44px] px-[10px] transition-[background,color,box-shadow] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                style={{
                  left: tickCentre(stop.tick),
                  top: 11,
                  background: isSelected ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.06)",
                  color: isSelected ? "#a7f932" : "#808080",
                  boxShadow: isSelected
                    ? "0px 0px 0px 2px rgba(255,255,255,0.04), 0px 2px 4px 0px rgba(0,0,0,0.12), inset 0px 4px 4px 0px rgba(0,0,0,0.16), inset 0px -2px 6px 0px rgba(255,255,255,0.16), inset 0px 0px 6px 0px rgba(255,255,255,0.16)"
                    : "0px 2px 4px 0px rgba(0,0,0,0.12), inset 0px 4px 4px 0px rgba(0,0,0,0.16), inset 0px -2px 4px 0px rgba(255,255,255,0.1), inset 0px 0px 4px 0px rgba(255,255,255,0.1)",
                }}
              >
                <span className="text-xs leading-none font-medium whitespace-nowrap">
                  {stop.label}
                </span>
              </span>
            );
          })}
        </div>

        {/* The thumb. Fixed on the card's centre line — the scale moves, it
         * does not, which is what a picker does under a finger. */}
        <span
          aria-hidden
          className="absolute size-[18px] rounded-full bg-primary"
          style={{
            left: "calc(50% - 9px)",
            top: KNOB_CY - 9,
            transform: `scale(${dragging ? 1.14 : 1})`,
            transition: "transform 420ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 420ms ease-out",
            boxShadow: dragging
              ? "0px 2px 4px rgba(0,0,0,0.2), inset 0px 2px 10px rgba(0,0,0,0.25), 0 0 0 6px rgba(167,249,50,0.14)"
              : "0px 2px 4px rgba(0,0,0,0.2), inset 0px 2px 10px rgba(0,0,0,0.25), 0 0 0 0 rgba(167,249,50,0)",
            border: "2px solid rgba(255,255,255,0.55)",
          }}
        />
      </div>
    </div>
  );
}
