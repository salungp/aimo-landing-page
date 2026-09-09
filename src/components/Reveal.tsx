"use client";

import { motion, type Variants } from "framer-motion";
import type { CSSProperties, ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Stagger delay in seconds, e.g. index * 0.08 */
  delay?: number;
  /** Direction the content travels in from */
  from?: "up" | "down" | "left" | "right" | "none";
  /** Distance travelled, in px */
  distance?: number;
  duration?: number;
  once?: boolean;
  /** How much of the element must enter the viewport before it animates (0-1) */
  amount?: number;
  as?: "div" | "span";
};

const offsets: Record<NonNullable<RevealProps["from"]>, { x: number; y: number }> = {
  up: { x: 0, y: 28 },
  down: { x: 0, y: -28 },
  left: { x: 28, y: 0 },
  right: { x: -28, y: 0 },
  none: { x: 0, y: 0 },
};

export default function Reveal({
  children,
  className,
  style,
  delay = 0,
  from = "up",
  distance,
  duration = 0.7,
  once = false,
  amount = 0.25,
  as = "div",
}: RevealProps) {
  const offset = offsets[from];
  const x = distance !== undefined ? (offset.x !== 0 ? Math.sign(offset.x) * distance : 0) : offset.x;
  const y = distance !== undefined ? (offset.y !== 0 ? Math.sign(offset.y) * distance : 0) : offset.y;

  const variants: Variants = {
    hidden: { opacity: 0, x, y },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: {
        duration,
        delay,
        ease: [0.16, 1, 0.3, 1],
      },
    },
  };

  const MotionTag = as === "span" ? motion.span : motion.div;

  return (
    <MotionTag
      className={className}
      style={style}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount }}
      variants={variants}
    >
      {children}
    </MotionTag>
  );
}
