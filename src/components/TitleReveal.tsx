"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

type TitleRevealProps = {
  children: ReactNode;
  className?: string;
  /** Seconds before the rise starts — use to stagger a subtitle after its heading. */
  delay?: number;
  as?: "div" | "span";
};

/**
 * Section-title entrance: fades in while rising from just below its resting
 * position. Softer and slower than the generic `Reveal` (longer travel, a
 * long ease-out tail) and it plays once — titles don't re-hide when scrolled
 * past, which is what made the old toggle-on-every-pass version look jumpy.
 */
export default function TitleReveal({ children, className, delay = 0, as = "div" }: TitleRevealProps) {
  const reduceMotion = useReducedMotion();
  const MotionTag = as === "span" ? motion.span : motion.div;

  return (
    <MotionTag
      // `tr-rise` is the hook for the reduced-motion rule in globals.css, which
      // is where this component honours that setting visually. `initial` is
      // deliberately unconditional: it is rendered into the markup, and the
      // server cannot know the reader's preference, so branching it here is
      // what used to make every page carrying a subtitle hydrate against
      // styles it had not sent. Only the transition below varies, and a
      // transition never reaches the DOM.
      className={`tr-rise ${className ?? ""}`}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      // Trigger a little after the title clears the bottom edge so the whole
      // rise is actually seen rather than half-finished off-screen.
      viewport={{ once: true, amount: 0.4, margin: "0px 0px -10% 0px" }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : {
              opacity: { duration: 0.9, delay, ease: [0.25, 0.1, 0.25, 1] },
              y: { duration: 1.1, delay, ease: [0.22, 1, 0.36, 1] },
            }
      }
    >
      {children}
    </MotionTag>
  );
}
