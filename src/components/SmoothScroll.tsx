"use client";

import { useEffect, type ReactNode } from "react";
import Lenis from "lenis";

// Module-level rather than a context: the only consumers are one-off imperative
// calls (scroll this anchor into view), and a context would make every consumer
// a descendant of a provider for no gain. Null whenever smooth scrolling isn't
// running — before mount, and permanently under prefers-reduced-motion — so
// callers must handle that and fall back to a native scroll.
let activeLenis: Lenis | null = null;

export function getLenis() {
  return activeLenis;
}

export default function SmoothScroll({ children }: { children: ReactNode }) {
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) return;

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t: number) => 1 - Math.pow(1 - t, 3),
      smoothWheel: true,
      touchMultiplier: 1.4,
    });

    activeLenis = lenis;

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      activeLenis = null;
    };
  }, []);

  return <>{children}</>;
}
