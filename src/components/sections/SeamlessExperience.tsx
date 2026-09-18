"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import Container from "../Container";
import Reveal from "../Reveal";
import TitleReveal from "../TitleReveal";
import WordReveal from "../WordReveal";

type BubbleIcon = {
  id: string;
  left: number;
  top: number;
  w: number; // % of stage width
  h: number; // % of stage height (stage keeps a fixed aspect ratio, so this renders as a true circle)
  iconScale: number; // icon size as a fraction of the bubble
  src: string;
  blur: number;
  depth: number; // parallax multiplier — smaller bubbles drift a bit more (feel closer)
};

// Percentages are derived from the Figma frame (1440 x 750 reference box) so
// the whole graphic scales as one unit across breakpoints. Width/height use
// different bases (stage width vs stage height) on purpose — the stage isn't
// square, so a "96px" circle needs different %-of-width vs %-of-height to
// still render as a true circle once the stage scales.
//
// All 7 icons share the same glass-bubble treatment (frosted circle +
// backdrop blur + inset highlight). The Polymarket/Bitcoin glyphs originally
// came as flattened images with their own baked-in glass effect via SVG
// `backdrop-filter`, which browsers don't render reliably for `<img>`-loaded
// SVGs — they showed up flat/blocky. Re-cropped to bare glyphs so they use
// the same live glass wrapper as the rest.
const bubbles: BubbleIcon[] = [
  { id: "sol-1", left: 31.6, top: 42.67, w: 6.67, h: 12.8, iconScale: 0.479, src: "/images/orbit/token-sol.svg", blur: 5, depth: 0.8 },
  { id: "eth", left: 43.33, top: 66.53, w: 6.67, h: 12.8, iconScale: 0.326, src: "/images/orbit/token-eth.svg", blur: 5, depth: 0.8 },
  { id: "bnb", left: 59.03, top: 60.8, w: 4.58, h: 8.8, iconScale: 0.42, src: "/images/orbit/token-bnb.svg", blur: 8.25, depth: 1.3 },
  { id: "hl-2", left: 42.78, top: 11.6, w: 4.58, h: 8.8, iconScale: 0.485, src: "/images/orbit/token-hl.svg", blur: 8.25, depth: 1.3 },
  { id: "robinhood", left: 62.57, top: 39.6, w: 6.67, h: 12.8, iconScale: 0.335, src: "/images/orbit/token-robinhood.svg", blur: 5, depth: 0.8 },
  { id: "polymarket", left: 57.36, top: 14.93, w: 6.67, h: 12.8, iconScale: 0.335, src: "/images/orbit/token-polymarket.svg", blur: 5, depth: 0.8 },
  { id: "bitcoin", left: 28.06, top: 22.8, w: 6.67, h: 12.8, iconScale: 0.324, src: "/images/orbit/token-bitcoin.svg", blur: 5, depth: 0.8 },
];

// Mobile has its own tighter cluster layout (not just a scaled-down desktop
// one) plus a dashed orbit ring. Pulled from the real "Seamless" mobile frame
// (node 143:404, a 393 x 852 canvas) via Figma's design-context API — exact
// figures, not screenshot-measured — against a 393-wide x 440-tall reference
// box (y origin at 120px into the frame).
const mobileBubbles: BubbleIcon[] = [
  { id: "hl-top", left: 36.9, top: 9.55, w: 12.21, h: 10.91, iconScale: 0.485, src: "/images/orbit/token-hl.svg", blur: 6, depth: 0 },
  { id: "polymarket", left: 65.39, top: 12.27, w: 18.32, h: 16.36, iconScale: 0.335, src: "/images/orbit/token-polymarket.svg", blur: 3.75, depth: 0 },
  { id: "bitcoin", left: 7.38, top: 20.45, w: 18.46, h: 16.49, iconScale: 0.324, src: "/images/orbit/token-bitcoin.svg", blur: 3.75, depth: 0 },
  { id: "robinhood", left: 76.59, top: 46.36, w: 18.32, h: 16.36, iconScale: 0.335, src: "/images/orbit/token-robinhood.svg", blur: 3.75, depth: 0 },
  { id: "sol-left", left: 7.63, top: 62.73, w: 18.32, h: 16.36, iconScale: 0.479, src: "/images/orbit/token-sol.svg", blur: 3.75, depth: 0 },
  { id: "eth", left: 39.44, top: 79.09, w: 18.32, h: 16.36, iconScale: 0.326, src: "/images/orbit/token-eth.svg", blur: 3.75, depth: 0 },
  { id: "bnb", left: 71.5, top: 73.64, w: 12.21, h: 10.91, iconScale: 0.42, src: "/images/orbit/token-bnb.svg", blur: 6, depth: 0 },
];

export default function SeamlessExperience() {
  const stageRef = useRef<HTMLDivElement>(null);

  // Mouse-follow parallax: a single listener updates --mx/--my on the stage;
  // every bubble reads those (custom properties inherit) and scales them by
  // its own --depth, so small bubbles drift a little more than big ones.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hasFinePointer = window.matchMedia("(pointer: fine)").matches;
    if (reduceMotion || !hasFinePointer) return;

    const strength = 14;
    let targetX = 0;
    let targetY = 0;
    let pointerX = 0;
    let pointerY = 0;
    let havePointer = false;
    let currentX = 0;
    let currentY = 0;
    let rafId: number;

    // The handler only records where the cursor is. Resolving that against the
    // stage's box is done once per frame below, because `getBoundingClientRect`
    // forces a layout flush — and a pointermove handler runs many times per
    // frame, on a page whose every scroll tick has already moved the box. The
    // frame only ever uses the latest position anyway.
    function onPointerMove(e: PointerEvent) {
      pointerX = e.clientX;
      pointerY = e.clientY;
      havePointer = true;
    }

    function tick() {
      if (havePointer) {
        const rect = stage!.getBoundingClientRect();
        const nx = (pointerX - rect.left) / rect.width - 0.5;
        const ny = (pointerY - rect.top) / rect.height - 0.5;
        targetX = -nx * strength;
        targetY = -ny * strength;
      }
      currentX += (targetX - currentX) * 0.06;
      currentY += (targetY - currentY) * 0.06;
      stage!.style.setProperty("--mx", currentX.toFixed(2));
      stage!.style.setProperty("--my", currentY.toFixed(2));
      rafId = requestAnimationFrame(tick);
    }

    // Nothing runs while the section is away. The loop reads the stage's box
    // every frame, and the page is scrolled by Lenis, so an ungated loop would
    // be flushing layout sixty times a second through every other section on
    // the page to ease a parallax nobody is looking at.
    let looping = false;
    function start() {
      if (looping) return;
      looping = true;
      rafId = requestAnimationFrame(tick);
    }
    function stop() {
      if (!looping) return;
      looping = false;
      cancelAnimationFrame(rafId);
    }

    const observer = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? start() : stop()),
      { rootMargin: "100px" },
    );
    observer.observe(stage);
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      stop();
    };
  }, []);

  return (
    <section className="seamless-fit relative overflow-hidden py-20 tablet:py-12">
      {/* Mobile: tighter cluster (a distinct layout, not a scaled-down desktop one) */}
      <div className="relative aspect-[393/440] w-full tablet:hidden">
        <OrbGlow style={{ left: "-26.3%", top: "-18.7%", width: "152.5%", height: "136.3%" }} />
        {mobileBubbles.map((b, i) => (
          <OrbitBubble key={b.id} b={b} delay={i * 0.08} />
        ))}
      </div>

      {/* Tablet/desktop: original wide layout */}
      <div
        ref={stageRef}
        className="relative mx-auto hidden aspect-[1440/750] tablet:block"
        style={{ width: "var(--seamless-stage-w)" }}
      >
        <OrbGlow style={{ left: "12.1%", top: "3%", width: "75.8%", height: "81.8%" }} />
        {bubbles.map((b, i) => (
          <OrbitBubble key={b.id} b={b} delay={i * 0.08} />
        ))}
      </div>

      <Container>
        <div
          className="mx-auto flex max-w-[720px] flex-col items-center gap-3 text-center"
          style={{ marginTop: "var(--seamless-copy-mt)" }}
        >
          <WordReveal>
            <h2 className="text-[36px] font-semibold leading-[1.15] tracking-[-0.02em] text-white tablet:text-[40px] desktop:text-[48px]">
              One <span className="text-primary">seamless</span> experience.
            </h2>
          </WordReveal>
          <TitleReveal delay={0.12}>
            <p className="text-base leading-[1.5] text-black-30 tablet:text-lg desktop:text-xl">
              Keep your funds organised around how you trade. Move money
              between wallets whenever you need it without leaving AIMO.
            </p>
          </TitleReveal>
        </div>
      </Container>
    </section>
  );
}

function OrbGlow({ style }: { style: CSSProperties }) {
  return (
    <Reveal
      from="none"
      duration={1}
      className="absolute"
      style={{ ...style, mixBlendMode: "screen" }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          transform: "translate3d(calc(var(--mx, 0) * 0.4 * 1px), calc(var(--my, 0) * 0.4 * 1px), 0)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/orbit/orb-glow.webp"
          alt=""
          loading="lazy"
          decoding="async"
          className="size-full object-contain"
        />
      </div>
    </Reveal>
  );
}

function OrbitBubble({ b, delay }: { b: BubbleIcon; delay: number }) {
  return (
    <Reveal
      from="up"
      distance={40}
      delay={delay}
      className="absolute"
      style={{ left: `${b.left}%`, top: `${b.top}%`, width: `${b.w}%`, height: `${b.h}%` }}
    >
      <div
        className="size-full overflow-hidden rounded-full bg-white/10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6),inset_0_0_2px_rgba(255,255,255,0.25),inset_0_-12px_20px_-8px_rgba(255,255,255,0.5),inset_0_8px_16px_-8px_rgba(255,255,255,0.25)]"
        style={{
          backdropFilter: `blur(${b.blur}px)`,
          transform: `translate3d(calc(var(--mx, 0) * ${b.depth} * 1px), calc(var(--my, 0) * ${b.depth} * 1px), 0)`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={b.src}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ width: `${b.iconScale * 100}%` }}
        />
      </div>
    </Reveal>
  );
}
