"use client";

import {
  createContext,
  useContext,
  useMemo,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import clsx from "clsx";

/** Defaults to on-screen, so an illustration dropped outside a card runs. */
const CardStateContext = createContext({ active: true, seen: true });

/**
 * Whether this card is on screen. Every illustration in the grid runs some
 * kind of loop; each one reads this and stands still while its card is
 * elsewhere, so the page is never animating nine things the reader cannot
 * see. Defaults to true so an illustration dropped outside a card still runs.
 */
export function useCardActive() {
  return useContext(CardStateContext).active;
}

/**
 * Whether this card has *ever* been on screen. An entrance that plays on
 * arrival should latch: tying it to `useCardActive` alone means it also plays
 * backwards when the card leaves, so scrolling past and back re-draws
 * something that was already there.
 */
export function useCardSeen() {
  return useContext(CardStateContext).seen;
}

export type BentoCardProps = {
  /** The mono eyebrow, e.g. "Multichain swap". Rendered uppercase. */
  label: string;
  /** The white headline. A string, or lines that must break where the design breaks them. */
  title: ReactNode;
  /** Card height in px — 186 or 336 in the design. */
  height: number;
  /** Distance from the card's top edge to the illustration, per the Figma frame. */
  artTop: number;
  /**
   * The illustration's own width in Figma — its box is centred at this width.
   * Omitted for an illustration that should fill whatever the card is, which
   * is what a card re-placed at a width the design never drew needs.
   */
  artWidth?: number;
  /** Intelligence is the one card whose header is centred and set at 20px. */
  variant?: "default" | "feature";
  /** The dot field, on the four cards the design gives one. */
  texture?: boolean;
  /** Position in the reveal stagger. */
  index?: number;
  className?: string;
  /** Grid placement custom properties; see BentoGrid. */
  style?: CSSProperties;
  children?: ReactNode;
};

/**
 * One tile of the bento (Figma 284:24040).
 *
 * The chrome — 24px radius, #171F1A face, the vertical gradient edge — lives
 * in `.bento-card` in globals.css; see the note there for why the edge is a
 * masked ring rather than a border.
 *
 * Header and illustration are both absolutely positioned against the card, at
 * the design's own offsets (16px inset for the text, a per-card top for the
 * art). That is deliberate: every illustration is a fixed-size composition
 * built for a fixed-height card, so flowing them would only introduce a
 * second set of numbers that has to agree with the first. Cards keep their
 * design height at every breakpoint and the art is centred and clipped, which
 * is what the Figma frame does to the wider ones anyway.
 */
export default function BentoCard({
  label,
  title,
  height,
  artTop,
  artWidth,
  variant = "default",
  texture = false,
  index = 0,
  className,
  style,
  children,
}: BentoCardProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { amount: 0.2 });
  const everInView = useInView(ref, { once: true, amount: 0.15 });
  const reduceMotion = useReducedMotion();
  const feature = variant === "feature";
  // Memoised so a card's own re-render doesn't re-render its illustration
  // through the context on every pass.
  const cardState = useMemo(
    () => ({ active: inView, seen: everInView }),
    [inView, everInView]
  );

  return (
    // Two elements, not one: the reveal writes an inline transform, and the
    // hover lift in `.bento-card` is also a transform. Sharing an element
    // would mean Framer's inline value silently winning over the hover rule
    // for the life of the page. The outer element travels in, the inner one
    // is the card and owns the hover.
    <motion.div
      ref={ref}
      style={style}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : {
              // The page's house curve: a long expo-out, staggered across the
              // grid so the tiles arrive in reading order rather than at once.
              duration: 0.85,
              delay: index * 0.06,
              ease: [0.16, 1, 0.3, 1],
            }
      }
    >
      <article className={clsx("bento-card", className)} style={{ height }}>
        {texture && <CardTexture />}

        <div
          className={clsx(
            "absolute top-4 right-4 left-4 z-[1] flex flex-col gap-1",
            feature && "text-center"
          )}
        >
          <p className="bg-gradient-to-b from-[#a7f932] to-[#8fee07] bg-clip-text font-mono text-xs leading-[1.5] font-medium tracking-[0.48px] text-transparent uppercase">
            {label}
          </p>
          <p
            className={clsx(
              // Tailwind's size utilities carry a line-height of their own; the
              // design sets every headline to the font's normal leading, which is
              // what puts two lines 19px apart rather than 24.
              "leading-[normal] font-medium text-white",
              feature ? "text-[20px] tracking-[-0.2px]" : "text-base tracking-[-0.16px]"
            )}
          >
            {title}
          </p>
        </div>

        <CardStateContext.Provider value={cardState}>
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2"
            style={{ top: artTop, width: artWidth ?? "100%" }}
          >
            {children}
          </div>
        </CardStateContext.Provider>
      </article>
    </motion.div>
  );
}

/**
 * The card texture: the dot field the design puts behind four of the
 * illustrations. It covers the whole card, not just the illustration box, and
 * sits under everything else in it.
 *
 * This replaces a transcription of Figma's own construction (four blurred
 * discs seen through a stipple mask, which was four `filter: blur(40px)`
 * layers a card) with the flattened asset the designer exported. See
 * `.bento-texture` in globals.css for how a black-alpha field is painted as
 * light.
 */
export function CardTexture() {
  return <div aria-hidden className="bento-texture pointer-events-none absolute inset-0" />;
}
