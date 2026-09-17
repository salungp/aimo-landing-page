"use client";

import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
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
function splitWords(node: ReactNode, path: string, reduceMotion: boolean | null, paint = ""): ReactNode {
  if (node == null || typeof node === "boolean") return node;

  if (typeof node === "string") {
    return node.split(/(\s+)/).map((part, i) => {
      if (part === "") return null;
      if (isWhitespace(part)) return part;
      return (
        <motion.span
          key={`${path}-${i}`}
          variants={wordVariants(reduceMotion)}
          className={`inline-block will-change-[filter,opacity,transform] ${paint}`}
        >
          {part}
        </motion.span>
      );
    });
  }

  if (Array.isArray(node)) {
    return Children.map(node, (child, i) => splitWords(child, `${path}-${i}`, reduceMotion, paint));
  }

  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode; className?: string }>;
    if (el.props.children === undefined) return el;
    const ownPaint = (el.props.className ?? "").split(/\s+/).filter(isPaintClass).join(" ");
    const nextPaint = ownPaint ? `${paint} ${ownPaint}`.trim() : paint;
    return cloneElement(el, undefined, splitWords(el.props.children, path, reduceMotion, nextPaint));
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
 * One thing that version was careful about and this one isn't: fully
 * removing a settled word's inline styles rather than leaving `blur(0px)`
 * (and the `will-change` promoting a layer for it) sitting there forever.
 * That mattered when it was 50 words repainting every frame; for a handful
 * of words animating once on page load, the leftover composited layers are
 * negligible, so this skips the cleanup for the simpler declarative variants
 * API.
 */
export default function WordReveal({ children, className, delay = 0, as = "div" }: WordRevealProps) {
  const reduceMotion = useReducedMotion();
  const MotionTag = as === "span" ? motion.span : motion.div;

  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.4, margin: "0px 0px -10% 0px" }}
      transition={{ staggerChildren: STAGGER, delayChildren: delay }}
    >
      {splitWords(children, "w", reduceMotion)}
    </MotionTag>
  );
}
