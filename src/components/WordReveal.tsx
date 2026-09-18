"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";

type WordRevealProps = {
  children: ReactNode;
  className?: string;
  /** Seconds before the first word starts — stagger a subtitle in after its title. */
  delay?: number;
  as?: "div" | "span";
};

/**
 * Timing below is read off the keyframes of the user's second reference —
 * `Scene-1 (6).json`, a Lottie export of the same "One balance. Everything
 * onchain." reveal — rather than measured off rendered video frames, so it's
 * exact rather than fitted. Each of the 4 words is its own layer with a
 * position keyframe from `[x, 21.779]` down to `[x, 0]` (Lottie's y grows
 * downward, so this is a slide *up* into place) running alongside an
 * opacity 0→100 and a Gaussian-blur effect 33.33→3.67→0, all on the exact
 * same two frame numbers per word — so one duration and one stagger cover
 * position, opacity and blur together:
 *   word   hold-ends-at   settles-at
 *   1      frame 0        frame 48
 *   2      frame 9        frame 57
 *   3      frame 18       frame 66
 *   4      frame 27       frame 75
 * At the file's 60fps that's a 9-frame (0.15s) stagger and a 48-frame (0.8s)
 * duration for every word, exactly, not approximately.
 */
const STAGGER = 0.15;
const WORD_DURATION = 0.8;

/** The slide runs on its own, shorter duration — the file's literal 0.8s (see
 * above) read as sluggish on request, dialed down independently of opacity
 * and blur rather than speeding up the whole word, since a fast slide under
 * a slower unblur is what actually reads as "arriving" rather than "sliding
 * the whole time it's coming into focus". */
const SLIDE_DURATION = 0.45;

/** Position's own two keyframes carry complete, unambiguous bezier handles —
 * `o:{0,0}` outgoing and `i:{1,1}` incoming — which is `cubic-bezier(0,0,1,1)`,
 * i.e. exactly linear. Opacity's keyframes are corrupted for this by an
 * end-of-hold flag with no easing data of its own, so there's no clean number
 * to lift for it or for blur; both keep the curve every other title's rise
 * already uses on this site (front-loaded, easing out) rather than inventing
 * a new one from an ambiguous source. */
const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/** How far below its resting spot a word starts, before sliding up — in `em`
 * so it scales with each heading's own font size rather than needing a
 * per-heading constant, the same reasoning as the blur below. The Lottie's
 * own units are its composition's local pixels (21.779 out of a ~640-wide
 * comp), not em, so this is that offset divided by the rendered cap-height of
 * "One" in the same file (27px, measured off the rendered frames) and then
 * corrected from cap-height to the nominal font-size em (cap-height usually
 * runs ~70% of it): 21.779 / (27 / 0.7) ≈ 0.56em. */
const SLIDE_FROM = "0.56em";

/** Starting blur. The reference file's own Gaussian-blur value converts to
 * ≈0.86em (see git history on this line for that arithmetic) — legible on
 * the reference's tiny 640px-wide comp, but the same ratio at a 48-56px
 * heading on the real site read as too heavy a smudge, so this is dialed back
 * on request rather than held to the source clip's literal number. */
const BLUR_FROM = "0.35em";
const OPACITY_FROM = 0.8;

/**
 * Unlike the retired scroll-scrubbed word reveal this is named after (git
 * history, `OneBalance.tsx` before 2026-09-16), there's no scale change and
 * no grey→brand-color mix: this reference has neither (checked: a word's
 * pixel width never changes across its frames), and these are section titles
 * that already carry their own color from the JSX (plain white, or a
 * gradient-clipped span for a highlighted word) rather than a monochrome
 * paragraph that needs to.
 */
const wordVariants = (reduceMotion: boolean | null): Variants => ({
  hidden: reduceMotion ? {} : { opacity: OPACITY_FROM, filter: `blur(${BLUR_FROM})`, y: SLIDE_FROM },
  visible: reduceMotion
    ? {}
    : {
        opacity: 1,
        filter: "blur(0px)",
        y: 0,
        transition: {
          opacity: { duration: WORD_DURATION, ease: EASE_OUT },
          filter: { duration: WORD_DURATION, ease: EASE_OUT },
          y: { duration: SLIDE_DURATION, ease: "linear" },
        },
      },
});

/** True for a run of one-or-more whitespace characters — kept as plain text
 * between word spans rather than wrapped, so justification, line breaks and
 * find-in-page all see ordinary spacing. */
const isWhitespace = (s: string) => /^\s+$/.test(s);

/** A class that paints text rather than laying it out: `background-clip:
 * text` reads the element's OWN rendered glyphs to know what to clip to, and
 * splitting a word into its own `inline-block` box takes it out of that —
 * the word ends up with `color: transparent` inherited from the gradient
 * span and nothing of its own painted behind it, i.e. genuinely invisible
 * (confirmed: the DOM had the right text with opacity 1, rendering nothing).
 * The fix is to give the gradient to each word directly rather than only the
 * wrapper, which is what this class list finds. `bg-gradient-to-b` is a
 * purely vertical ramp, so every word — same line, same height — paints an
 * identical slice of it; there is no horizontal seam to worry about. Layout
 * classes like `block` (used on some of these same spans purely to force a
 * line break) are deliberately excluded — those stay on the wrapper only, or
 * every word would end up on its own line. */
const isPaintClass = (c: string) => /^(bg-|from-|to-|via-)/.test(c) || c === "text-transparent";

/**
 * Recursively split every string leaf into per-word `motion.span`s, leaving
 * element wrapping untouched — a `<span>` doing a gradient text-clip around
 * one highlighted word keeps that span, its words just become independently
 * animated children of it. This is what lets `WordReveal` drop straight into
 * a heading built the way every heading on this site already is (plain text
 * mixed with a colored `<span>`), instead of asking the caller to flatten
 * their heading into a word list.
 *
 * `paint` carries any gradient/clip classes collected from ancestor spans
 * down to the actual word spans (see `isPaintClass`) — without it a
 * gradient-clipped word disappears rather than turning color.
 */
function splitWords(
  node: ReactNode,
  path: string,
  reduceMotion: boolean | null,
  inFlight: boolean,
  paint = "",
): ReactNode {
  if (node == null || typeof node === "boolean") return node;

  if (typeof node === "string") {
    return node.split(/(\s+)/).map((part, i) => {
      if (part === "") return null;
      if (isWhitespace(part)) return part;
      return (
        <motion.span
          key={`${path}-${i}`}
          variants={wordVariants(reduceMotion)}
          className={`inline-block ${inFlight ? "will-change-[filter,opacity,transform]" : ""} ${paint}`}
        >
          {part}
        </motion.span>
      );
    });
  }

  if (Array.isArray(node)) {
    return Children.map(node, (child, i) => splitWords(child, `${path}-${i}`, reduceMotion, inFlight, paint));
  }

  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode; className?: string }>;
    if (el.props.children === undefined) return el;
    const ownPaint = (el.props.className ?? "").split(/\s+/).filter(isPaintClass).join(" ");
    const nextPaint = ownPaint ? `${paint} ${ownPaint}`.trim() : paint;
    return cloneElement(el, undefined, splitWords(el.props.children, path, reduceMotion, inFlight, nextPaint));
  }

  return node;
}

/**
 * Word-by-word blur-and-slide reveal for section titles. Built first from a
 * reference clip (`Scene-1 (21).mp4`: blur and brighten only, no slide — that
 * version shipped, then the user pointed at a second reference, the Lottie
 * source itself (`Scene-1 (6).json`), and said it should slide up too: read
 * carefully, that file's own keyframes do move each word — up from 21.779
 * units below its resting spot, not just fade it in place. The mp4 must have
 * been re-exported without that layer, or it was too subtle to read at that
 * compression; the JSON is the authoritative source (see the constants above)
 * and this version follows it: each word slides up while it unblurs and
 * brightens, left to right, no scale change. Plays once, the first time the
 * title scrolls into view — same trigger as `TitleReveal`, which this
 * replaces on headings specifically (eyebrows and subtitles keep the simpler
 * rise-and-fade; "title" in the request meant the heading).
 *
 * No per-frame JS drives this: `staggerChildren` on the parent's `transition`
 * is a single Framer Motion orchestration that every word's `variants` prop
 * subscribes to via context, so it reaches through the plain (non-motion)
 * wrapper spans in a heading's own markup — the stagger still runs left to
 * right in source order even though some words sit one level deeper, inside
 * a colored span, than their siblings. That's what makes this a cheap,
 * one-shot alternative to the scroll-scrubbed word reveal it's named after
 * (git history, `OneBalance.tsx` before 2026-09-16), which drove the same
 * per-word blur/opacity from a `useMotionValueEvent` firing on every scroll
 * tick across ~50 words — worth avoiding there, irrelevant here: a title is
 * a handful of words animating once, not continuously.
 *
 * `will-change` is held only while a heading is actually revealing. It used
 * to be a constant on every word span, on the reasoning that a handful of
 * words animating once leaves a negligible number of composited layers — but
 * this is on every heading on the site, and counted on the real page that was
 * 53 spans, each asking the compositor for its own layer *and* its own filter
 * rasterisation target, from first paint until the tab closed. They are all
 * promoted before a single one of them has animated, and they stay promoted
 * long after the last one has settled. So the parent flips the hint on when
 * its stagger starts and off when the last word lands: the animation is
 * identical, and at rest the page holds none of those layers.
 */
export default function WordReveal({ children, className, delay = 0, as = "div" }: WordRevealProps) {
  const reduceMotion = useReducedMotion();
  const MotionTag = as === "span" ? motion.span : motion.div;
  // "idle" until this heading scrolls in, "done" once every word has settled;
  // only in between do the words ask for a layer. See the note above.
  const [inFlight, setInFlight] = useState(false);
  const [settled, setSettled] = useState(false);
  const root = useRef<HTMLElement>(null);

  // Framer Motion leaves a settled word holding the end of its own animation:
  // `filter: blur(0px)`, a zero transform, `opacity: 1`. None of those change
  // what is drawn, but a filter — even a no-op one — gives the element its own
  // stacking context and effect node for the rest of the session. The reveal
  // runs once (`viewport.once`), so once it is over the inline styles have
  // nothing left to say and are cleared. This runs after React has committed
  // the re-render that drops `will-change`, so it is the last word on the
  // element's style.
  useEffect(() => {
    if (!settled || !root.current) return;
    for (const word of root.current.querySelectorAll<HTMLElement>("span.inline-block")) {
      word.style.removeProperty("filter");
      word.style.removeProperty("transform");
      word.style.removeProperty("opacity");
      word.style.removeProperty("will-change");
    }
  }, [settled]);

  return (
    <MotionTag
      ref={root as never}
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.4, margin: "0px 0px -10% 0px" }}
      transition={{ staggerChildren: STAGGER, delayChildren: delay }}
      onAnimationStart={() => setInFlight(true)}
      onAnimationComplete={() => {
        setInFlight(false);
        setSettled(true);
      }}
    >
      {splitWords(children, "w", reduceMotion, inFlight)}
    </MotionTag>
  );
}
