"use client";

import { LazyMotion, domAnimation } from "framer-motion";
import type { ReactNode } from "react";

/* Every animated element on the site is `m.*` rather than `motion.*`, which
 * leaves framer's feature code out of the component itself; this loads the
 * one feature bundle they need. `domAnimation` covers animate/variants/exit,
 * whileInView and the gestures — nothing here uses layout or drag, which is
 * what `domMax` would add. `strict` makes a stray `motion.*` throw in dev
 * rather than quietly pulling the full bundle back in. */
export default function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  );
}
