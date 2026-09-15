"use client";

import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, useMotionValue, useMotionValueEvent, useScroll, useTransform } from "framer-motion";

const copy =
  "Aimo brings your crypto experience together in one simple balance. Your funds are ready across trading, prediction, and more, without the need to constantly move assets between separate wallets. And with gas handled behind the scenes, you can focus on what you want to do instead of worrying about the infrastructure underneath it.";

const words = copy.split(" ");

/** Share of the pinned scroll spent filling — the rest is a short hold on the fully green text before it unpins. */
const FILL_END = 0.85;

/** Width of the soft leading edge of the green sweep, in px. */
const FEATHER = 56;

/** Clear space kept above (fixed nav) and below the paragraph inside the pinned stage. */
const PAD_TOP = 112;
const PAD_BOTTOM = 64;

const textClass =
  "text-center text-[32px] leading-[1.2] font-semibold tracking-[-0.02em] tablet:text-[44px] desktop:text-[60px]";

type Line = { top: number; height: number; left: number; width: number };

/**
 * Scroll-driven text fill: the paragraph pins to the viewport while a tall
 * track scrolls past, and a green sweep runs through it letter by letter in
 * reading order — the scroll distance through the pinned track acts as the
 * "playhead".
 *
 * Built to never repaint while scrolling. The grey paragraph and a green copy
 * are each painted once; per line, the green copy sits in a band that is
 * revealed by sliding a clipping window over it (window translates right,
 * its contents translate back left by the same amount so the text stays put).
 * Only transforms change per frame, which the compositor handles on its own.
 * A masked, feathered right edge on the window makes the sweep glide across
 * letters instead of snapping between them.
 *
 * When the paragraph is taller than the stage it also drifts upward in step
 * with the fill, so the filling line always stays on screen.
 */
export default function OneBalance() {
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const windowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const contentRefs = useRef<(HTMLDivElement | null)[]>([]);
  const lastOffsets = useRef<number[]>([]);
  const textWidth = useRef(0);

  const [lines, setLines] = useState<Line[]>([]);
  const { scrollYProgress } = useScroll({ target: trackRef, offset: ["start start", "end end"] });

  const stageHeight = useMotionValue(0);
  const textHeight = useMotionValue(0);

  const renderFill = useCallback(
    (progress: number) => {
      if (!lines.length) return;
      const dpr = window.devicePixelRatio || 1;
      const W = textWidth.current;
      const total = lines.reduce((sum, line) => sum + line.width + FEATHER, 0);
      let remaining = Math.min(Math.max(progress / FILL_END, 0), 1) * total;

      lines.forEach((line, i) => {
        const length = line.width + FEATHER;
        const reveal = Math.min(Math.max(remaining, 0), length);
        remaining -= length;
        // Right edge of the clipping window; snapped to device pixels so the
        // window and its counter-shifted contents cancel out exactly (no text shimmer).
        const offset = Math.round((line.left + reveal - W) * dpr) / dpr;
        if (lastOffsets.current[i] === offset) return;
        lastOffsets.current[i] = offset;
        const win = windowRefs.current[i];
        const content = contentRefs.current[i];
        if (win) win.style.transform = `translate3d(${offset}px,0,0)`;
        if (content) content.style.transform = `translate3d(${-offset}px,0,0)`;
      });
    },
    [lines],
  );

  useMotionValueEvent(scrollYProgress, "change", renderFill);

  // Re-apply after lines are (re)measured, before paint, so a resize never flashes the wrong state.
  useLayoutEffect(() => {
    lastOffsets.current = [];
    renderFill(scrollYProgress.get());
  }, [renderFill, scrollYProgress]);

  // Measure where the browser broke the grey paragraph into lines; the green bands follow those lines.
  useEffect(() => {
    const stage = stageRef.current;
    const text = textRef.current;
    if (!stage || !text) return;

    const measure = () => {
      stageHeight.set(stage.clientHeight);
      textHeight.set(text.offsetHeight);
      textWidth.current = text.clientWidth;

      const box = text.getBoundingClientRect();
      const lineHeight = parseFloat(getComputedStyle(text).lineHeight);
      const next: Line[] = [];
      text.querySelectorAll<HTMLElement>("[data-word]").forEach((word) => {
        const r = word.getBoundingClientRect();
        const index = Math.floor((r.top + r.height / 2 - box.top) / lineHeight);
        const left = r.left - box.left;
        const right = r.right - box.left;
        const line = next[index];
        if (!line) {
          next[index] = { top: index * lineHeight, height: lineHeight, left, width: right - left };
        } else {
          const lineRight = Math.max(line.left + line.width, right);
          line.left = Math.min(line.left, left);
          line.width = lineRight - line.left;
        }
      });
      const measured = next.filter(Boolean);
      setLines((prev) => (JSON.stringify(prev) === JSON.stringify(measured) ? prev : measured));
    };

    measure();
    document.fonts?.ready.then(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    observer.observe(text);
    return () => observer.disconnect();
  }, [stageHeight, textHeight]);

  const y = useTransform([scrollYProgress, stageHeight, textHeight], ([progress, stage, text]: number[]) => {
    const room = stage - PAD_TOP - PAD_BOTTOM;
    if (text <= room) return PAD_TOP + (room - text) / 2;
    return PAD_TOP - (text - room) * Math.min(progress / FILL_END, 1);
  });

  const featherMask = `linear-gradient(to right, #000 calc(100% - ${FEATHER}px), transparent)`;

  return (
    // Track height sets the fill speed: the sweep runs across (height − 100vh)
    // of scrolling. Raise it to slow the fill down further.
    // Section padding spaces it from its neighbours; the pinned track lives
    // inside it so the fill still starts exactly when the text pins.
    <section className="py-[100px]">
      <div ref={trackRef} className="relative h-[450vh] tablet:h-[600vh]">
      <div ref={stageRef} className="sticky top-0 h-svh overflow-hidden px-4 tablet:px-10">
        <motion.div style={{ y }} className="relative mx-auto max-w-[1030px] will-change-transform">
          <p ref={textRef} className={`${textClass} text-black-50`}>
            {words.map((word, i) => (
              <Fragment key={i}>
                <span data-word>{word}</span>{" "}
              </Fragment>
            ))}
          </p>

          <div aria-hidden className="pointer-events-none absolute inset-0">
            {lines.map((line, i) => (
              <div key={i} className="absolute inset-x-0 overflow-hidden" style={{ top: line.top, height: line.height }}>
                {/* The window is twice the paragraph's width and starts one
                 * width to the left, so its right edge sits at the paragraph's
                 * right edge when untranslated. Sliding it only ever moves that
                 * right edge through the line — its left side stays past the
                 * line start, so already-filled letters never get uncovered. */}
                <div
                  ref={(el) => {
                    windowRefs.current[i] = el;
                  }}
                  className="absolute inset-y-0 -left-full w-[200%] overflow-hidden will-change-transform"
                  style={{ transform: "translate3d(-50%,0,0)", maskImage: featherMask, WebkitMaskImage: featherMask }}
                >
                  {/* Content sits in the window's right half (back at the
                   * paragraph's own x) and counter-slides to hold the text still. */}
                  <div
                    ref={(el) => {
                      contentRefs.current[i] = el;
                    }}
                    className="absolute inset-y-0 left-1/2 w-1/2 will-change-transform"
                    style={{ transform: "translate3d(100%,0,0)" }}
                  >
                    <p
                      className={`${textClass} bg-gradient-to-b from-primary to-primary-dark bg-clip-text text-transparent`}
                      style={{ marginTop: -line.top }}
                    >
                      {copy}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
      </div>
    </section>
  );
}
