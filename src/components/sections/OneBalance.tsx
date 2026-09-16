"use client";

import { Fragment, useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { motion, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "framer-motion";

const copy =
  "Aimo brings your crypto experience together in one simple balance. Your funds are ready across trading, prediction, and more, without the need to constantly move assets between separate wallets. And with gas handled behind the scenes, you can focus on what you want to do instead of worrying about the infrastructure underneath it.";

const words = copy.split(" ");

/** Share of the pinned scroll spent revealing — the rest is a short hold on the finished paragraph before it unpins. */
const FILL_END = 0.85;

/** How many words are mid-reveal at any moment. Higher = softer, more overlapping wave. */
const OVERLAP = 3;

/** Scroll distance between two consecutive words starting, and the length of one word's reveal. */
const STEP = FILL_END / (words.length - 1 + OVERLAP);
const REVEAL = STEP * OVERLAP;

/**
 * Resting state of a word that hasn't been reached yet. Blur is in `em` so it tracks the responsive font size.
 *
 * The fade is deliberately shallow: nearly all of the "it arrived" brightness comes from grey → green, and
 * dimming the grey further just buries it in the near-black background. Measured against the reference, an
 * unreached word should still read clearly, at roughly 30% the luminance of a finished one.
 */
const SCALE_FROM = 0.5;
const BLUR_FROM = 0.14;
const OPACITY_FROM = 0.8;

/** Gradient stops the word interpolates between: `black-50` → the site's `primary`/`primary-dark` pair. */
const GREY: RGB = [128, 128, 128];
const GREEN_TOP: RGB = [167, 249, 50];
const GREEN_BOTTOM: RGB = [143, 238, 7];

/** Reveal is quantised to this many steps, so a word only touches the DOM when it visibly changed. */
const STEPS = 240;

/** Clear space kept above (fixed nav) and below the paragraph inside the pinned stage. */
const PAD_TOP = 112;
const PAD_BOTTOM = 64;

const textClass =
  "text-center text-[32px] leading-[1.2] font-semibold tracking-[-0.02em] tablet:text-[44px] desktop:text-[48px]";

type RGB = [number, number, number];

/** Smoothstep: eases in and out with no kink at either end, so a word neither pops nor stalls. */
const ease = (t: number) => t * t * (3 - 2 * t);

const mix = (to: RGB, t: number) =>
  `rgb(${Math.round(GREY[0] + (to[0] - GREY[0]) * t)},${Math.round(GREY[1] + (to[1] - GREY[1]) * t)},${Math.round(
    GREY[2] + (to[2] - GREY[2]) * t,
  )})`;

/**
 * Scroll-driven word reveal: the paragraph pins to the viewport while a tall
 * track scrolls past, and the words come into focus one after another — each
 * rising from half size and a heavy blur to its full size, sharp and green.
 *
 * Built so that scrolling only ever touches the handful of words actually
 * mid-reveal:
 *
 * - Each word's progress is quantised (`STEPS`); if the rounded value hasn't
 *   moved since the last frame the word is skipped entirely.
 * - A word that has finished gets its inline `transform`/`filter`/`opacity`
 *   *removed*, so ~50 settled words hold no filter layer and never re-raster.
 *   Same for words not yet reached: written once, then left alone.
 * - `will-change` sits only on the ~3 words currently in flight.
 *
 * The green comes from a gradient painted into the word itself (`.reveal-word`
 * in globals.css) with its two stops driven from here, rather than a second
 * copy of the text stacked on top — a duplicate would double the paragraph for
 * find-in-page, copy/paste and crawlers. That class is only attached once a
 * word starts moving: `background-clip: text` is a markedly more expensive
 * paint than flat text, and leaving it on the whole paragraph measurably cost
 * frames on a slow CPU.
 *
 * When the paragraph is taller than the stage it also drifts upward in step
 * with the reveal, so the word being revealed always stays on screen.
 */
export default function OneBalance() {
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  /** Last quantised progress written per word; `undefined` means "never written". */
  const lastStep = useRef<(number | undefined)[]>([]);

  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: trackRef, offset: ["start start", "end end"] });

  const stageHeight = useMotionValue(0);
  const textHeight = useMotionValue(0);

  const render = useCallback(
    (progress: number) => {
      for (let i = 0; i < words.length; i++) {
        // No motion preference: every word goes straight to its finished state.
        const raw = reduceMotion ? 1 : (progress - i * STEP) / REVEAL;
        const t = raw <= 0 ? 0 : raw >= 1 ? 1 : ease(raw);
        const step = Math.round(t * STEPS);
        if (lastStep.current[i] === step) continue;

        const word = wordRefs.current[i];
        if (!word) continue;
        const before = lastStep.current[i];
        const wasInFlight = before !== undefined && before > 0 && before < STEPS;
        lastStep.current[i] = step;

        if (step === 0) {
          // Not reached yet: flat `black-50` text, no gradient and no promoted layer.
          word.classList.remove("reveal-word");
          word.style.transform = `scale(${SCALE_FROM})`;
          word.style.filter = `blur(${BLUR_FROM}em)`;
          word.style.opacity = `${OPACITY_FROM}`;
          if (wasInFlight) word.style.willChange = "";
          continue;
        }

        const e = step / STEPS;
        if (!wasInFlight) {
          word.classList.add("reveal-word");
          if (step < STEPS) word.style.willChange = "transform, filter, opacity";
        }
        word.style.setProperty("--reveal-a", mix(GREEN_TOP, e));
        word.style.setProperty("--reveal-b", mix(GREEN_BOTTOM, e));

        if (step === STEPS) {
          // Settled: drop the filter layer entirely rather than leave a blur(0px) behind.
          word.style.transform = "";
          word.style.filter = "";
          word.style.opacity = "";
          word.style.willChange = "";
          continue;
        }

        word.style.transform = `scale(${(SCALE_FROM + (1 - SCALE_FROM) * e).toFixed(4)})`;
        word.style.filter = `blur(${(BLUR_FROM * (1 - e)).toFixed(4)}em)`;
        word.style.opacity = (OPACITY_FROM + (1 - OPACITY_FROM) * e).toFixed(3);
      }
    },
    [reduceMotion],
  );

  useMotionValueEvent(scrollYProgress, "change", render);

  // Paint the starting state before the browser's first paint, so the paragraph
  // never flashes fully revealed on mount.
  useLayoutEffect(() => {
    lastStep.current = [];
    render(scrollYProgress.get());
  }, [render, scrollYProgress]);

  // The drift only needs the two heights; the reveal itself is resolution-independent.
  useEffect(() => {
    const stage = stageRef.current;
    const text = textRef.current;
    if (!stage || !text) return;

    const measure = () => {
      stageHeight.set(stage.clientHeight);
      textHeight.set(text.offsetHeight);
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

  return (
    // Track height sets the reveal speed: the wave runs across (height − 100vh)
    // of scrolling. Raise it to slow the reveal down further.
    // Section padding spaces it from its neighbours; the pinned track lives
    // inside it so the reveal still starts exactly when the text pins.
    <section className="py-[100px]">
      <div ref={trackRef} className="relative h-[450vh] tablet:h-[600vh]">
        <div ref={stageRef} className="sticky top-0 h-svh overflow-hidden px-4 tablet:px-10">
          <motion.div style={{ y }} className="relative mx-auto max-w-[1030px] will-change-transform">
            <p ref={textRef} className={`${textClass} text-black-50`}>
              {words.map((word, i) => (
                <Fragment key={i}>
                  {/* inline-block so the word can be scaled; the space between
                   * words stays outside it so line breaking is untouched. */}
                  <span
                    ref={(el) => {
                      wordRefs.current[i] = el;
                    }}
                    className="inline-block"
                  >
                    {word}
                  </span>{" "}
                </Fragment>
              ))}
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
