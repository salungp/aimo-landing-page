"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** A boolean, so React can compare snapshots by value. */
const getSnapshot = () => window.matchMedia(QUERY).matches;

/** What the server knows, which is nothing. */
const getServerSnapshot = () => false;

/**
 * `prefers-reduced-motion`, but safe to branch *rendered output* on.
 *
 * Framer Motion's own `useReducedMotion` reads the media query during the
 * first client render, which the server had no way to know about — so a
 * component that picks its markup from it renders one thing on the server and
 * another during hydration, React finds the two disagree, and throws the whole
 * tree away to re-render it client-side (the minified #418). That is the worst
 * available outcome for a setting whose entire purpose is to make the page
 * calmer.
 *
 * `useSyncExternalStore` exists for exactly this shape of problem. It hydrates
 * against `getServerSnapshot` — so the first client render matches the markup
 * by construction, not by luck — and then reads the real value and re-renders
 * if it differs.
 *
 * Use this only where the difference cannot be expressed in CSS: a component
 * that returns a *different tree*. Anything that only changes a style, a
 * duration or a transition should keep Framer Motion's hook, because none of
 * those reach the markup — and anything visual is better handled by a
 * `@media (prefers-reduced-motion: reduce)` rule, which applies at first paint
 * and applies even if the JavaScript never arrives. The cost here is that a
 * reader who asked for less motion mounts the animated branch for one frame
 * before this swaps it.
 */
export default function useReducedMotionAfterMount() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
