"use client";

import { motion } from "framer-motion";
import { Lottie } from "lottie-react";
import { useEffect, useRef } from "react";
import Container from "../Container";
import LoopVideo from "../LoopVideo";
import Reveal from "../Reveal";

const eyebrowClass =
  "bg-gradient-to-b from-primary to-primary-dark bg-clip-text font-mono text-sm font-medium leading-[1.5] tracking-[0.04em] text-transparent uppercase";

/** Figma draws the card outline as a 1px vertical gradient — white at 15% along
 * the top edge, fading to fully transparent at the bottom — not a flat stroke.
 * Three stacked backgrounds reproduce it without a pseudo-element, painted top
 * to bottom: the fill clipped to the padding box (which keeps the gradient off
 * the card interior), the stroke gradient clipped to the border box, and the
 * fill again underneath it so the stroke composites over the card colour rather
 * than over the page — Figma's stroke is inside-aligned, so it sits on the fill.
 * The border itself is transparent, and `overflow-hidden` clips children at the
 * padding box so illustrations never cover the outline. */
const cardClass =
  "relative flex flex-col overflow-hidden rounded-[24px] border border-transparent [background:linear-gradient(#171f1a,#171f1a)_padding-box,linear-gradient(180deg,rgba(255,255,255,0.15),rgba(255,255,255,0))_border-box,linear-gradient(#171f1a,#171f1a)_border-box]";

const badges = [
  { label: "Security", left: 41.7, top: 7.6 },
  { label: "Custody model", left: 53.3, top: 32.9 },
  { label: "Withdrawal", left: 68.5, top: 54.2 },
  { label: "Supported network", left: 77.1, top: 80.3 },
  { label: "Transaction transparency", left: 69.4, top: 16.5 },
  { label: "Fees", left: 47.6, top: 59.4 },
];

export default function DeepDive() {
  const parallaxRef = usePointerParallax(18);

  return (
    <section className="relative isolate overflow-hidden py-20 tablet:py-28 desktop:py-[94px]">
      <LoopVideo
        mp4="/video/deepdive-bg-original.mp4"
        poster="/video/deepdive-bg-poster.webp"
        className="pointer-events-none absolute inset-0 -z-10 size-full object-cover"
      />

      <Container>
        <div className="flex flex-col gap-3">
          {/* Performance + Intelligence */}
          <div className="grid grid-cols-1 gap-3 tablet:grid-cols-2">
            <Reveal from="up" className={`${cardClass} h-full`}>
              <div className="flex flex-col gap-1 px-5 pt-5">
                <p className={eyebrowClass}>Performance</p>
                <p className="text-xl font-medium tracking-[-0.01em] text-white">
                  Know how it&apos;s performing.
                </p>
                <p className="text-sm leading-[1.5] tracking-[-0.01em] text-black-50">
                  See balances, positions, PnL, and performance across every
                  wallet from one view.
                </p>
              </div>
              <PerformanceIllustration />
            </Reveal>

            <Reveal from="up" delay={0.08} className={`${cardClass} h-full`}>
              <div className="flex flex-col gap-1 px-5 pt-5">
                <p className={eyebrowClass}>Intelligence</p>
                <p className="text-xl font-medium tracking-[-0.01em] text-white">
                  Your portfolio, with a smarter view.
                </p>
                <p className="text-sm leading-[1.5] tracking-[-0.01em] text-black-50">
                  Get AI-powered insights across your wallets and positions to
                  understand what&apos;s happening.
                </p>
              </div>
              <IntelligenceIllustration />
            </Reveal>
          </div>

          {/* Transparency — full width */}
          <Reveal from="up" delay={0.16} className={cardClass}>
            <div
              ref={parallaxRef}
              className="relative h-[220px] overflow-hidden tablet:h-[249px]"
            >
              <WaveLines />
              {badges.map((b, i) => (
                <Reveal
                  key={b.label}
                  from="up"
                  distance={16}
                  delay={0.3 + i * 0.07}
                  className="absolute"
                  style={{ left: `${b.left}%`, top: `${b.top}%` }}
                >
                  <FloatingBadge label={b.label} index={i} />
                </Reveal>
              ))}
            </div>
            <div className="flex flex-col gap-1 px-5 pb-5">
              <p className={eyebrowClass}>Transparency</p>
              <h2 className="text-2xl font-medium tracking-[-0.01em] text-white">
                Your money deserves clarity.
              </h2>
              <p className="text-sm leading-[1.5] tracking-[-0.01em] text-black-50">
                Understand how your money moves, with clear fees, custody,
                withdrawals, and network details.
              </p>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}

function FloatingBadge({ label, index }: { label: string; index: number }) {
  // Two layers: the idle drift owns `y` on the outer element, while the inner
  // one carries the pointer parallax — driven by the --px/--py custom properties
  // the card sets, so following the mouse costs no React re-renders. Each badge
  // gets its own depth factor so they don't all slide as one flat sheet.
  const depth = 0.55 + (index % 3) * 0.28;

  return (
    <motion.div
      style={{
        // Each badge sits on a backdrop-blur, which the compositor would
        // otherwise re-blur every frame of the drift. Promoting it to its own
        // layer lets the blurred result be cached and just moved instead.
        willChange: "transform",
      }}
      animate={{ y: [0, -5, 0] }}
      transition={{
        duration: 5 + (index % 3) * 0.6,
        delay: index * 0.4,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      <div
        className="flex items-center gap-1.5 rounded-full px-3 py-2.5 whitespace-nowrap shadow-[inset_0_-2px_4px_rgba(0,0,0,0.2),inset_0_2px_4px_rgba(167,249,50,0.2)] backdrop-blur-[6px]"
        style={{
          background:
            "linear-gradient(to bottom, rgba(194,249,75,0.1), rgba(194,249,75,0.06))",
          transform: `translate3d(calc(var(--px, 0) * ${depth}px), calc(var(--py, 0) * ${depth}px), 0)`,
          willChange: "transform",
        }}
      >
        <span className="size-1.5 shrink-0 rounded-full bg-primary" />
        <span className="font-mono text-base font-normal tracking-[0.02em] text-primary uppercase">
          {label}
        </span>
      </div>
    </motion.div>
  );
}

/** Sets --px/--py on the wrapper from the pointer position, lerped each frame
 * so the badges ease toward the cursor instead of snapping to it. Same approach
 * as ParallaxVideo; off for reduced-motion and coarse pointers. */
function usePointerParallax(strength: number) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const hasFinePointer = window.matchMedia("(pointer: fine)").matches;
    if (reduceMotion || !hasFinePointer) return;

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let rafId: number;

    function onPointerMove(e: PointerEvent) {
      const rect = el!.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width - 0.5; // -0.5..0.5
      const ny = (e.clientY - rect.top) / rect.height - 0.5;
      targetX = nx * strength;
      targetY = ny * strength;
    }

    function tick() {
      currentX += (targetX - currentX) * 0.06;
      currentY += (targetY - currentY) * 0.06;
      el!.style.setProperty("--px", currentX.toFixed(2));
      el!.style.setProperty("--py", currentY.toFixed(2));
      rafId = requestAnimationFrame(tick);
    }

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    rafId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      cancelAnimationFrame(rafId);
    };
  }, [strength]);

  return ref;
}

function WaveLines() {
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src="/images/transparency/wave-lines.webp"
      alt=""
      className="pointer-events-none absolute inset-0 size-full object-cover"
    />
  );
}

function PerformanceIllustration() {
  return (
    <div className="relative mt-auto h-[180px] overflow-hidden tablet:h-[228px]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/deepdive-performance.webp"
        alt=""
        className="size-full object-cover object-top"
      />
    </div>
  );
}

function IntelligenceIllustration() {
  // 7s loop, so — same as every other continuous animation in this
  // project — it's off for prefers-reduced-motion rather than looping
  // indefinitely with no pause control. Lottie renders its frames purely
  // client-side (nothing frame-related is in the server-rendered markup),
  // so reading this directly at render time — no state/effect — doesn't
  // risk a hydration mismatch the way it would for real DOM attributes.
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <div className="relative mt-auto h-[180px] overflow-hidden tablet:h-[228px]">
      <Lottie
        src="/json/deepdive-intelligence.json"
        autoplay={!reduceMotion}
        loop={!reduceMotion}
        className="size-full object-cover object-top"
      />
    </div>
  );
}
