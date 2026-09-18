"use client";

import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  type Transition,
} from "framer-motion";
import clsx from "clsx";
import Container from "../Container";
import Reveal from "../Reveal";
import TitleReveal from "../TitleReveal";
import WordReveal from "../WordReveal";

type Card = {
  id: string;
  icon: string;
  label: string;
  title: string;
  body: string;
};

// Pop order: the front card in the pocket comes out first, so the deck reads
// front-to-back and lands left-to-right in the divided row.
const cards: Card[] = [
  {
    id: "main",
    icon: "/images/wallets/main-icon.svg",
    label: "Main Wallet",
    title: "Your starting point.",
    body: "Deposit, withdraw, and manage your available funds from one central wallet.",
  },
  {
    id: "spot",
    icon: "/images/wallets/spot-icon.svg",
    label: "Spot Wallet",
    title: "For your everyday crypto.",
    body: "Keep your spot assets organised and ready to trade.",
  },
  {
    id: "perps",
    icon: "/images/wallets/perps-icon.svg",
    label: "Perps Wallet",
    title: "For leveraged positions.",
    body: "Keep your perpetual trading funds separate from the rest of your portfolio.",
  },
  {
    id: "prediction",
    icon: "/images/wallets/prediction-icon.svg",
    label: "Prediction Wallet",
    title: "For your predictions.",
    body: "Set aside funds for prediction markets without mixing them with your other positions.",
  },
  {
    id: "outcome",
    icon: "/images/wallets/outcome-icon.svg",
    label: "Outcome Wallet",
    title: "For event outcomes.",
    body: "Back the results you believe in, with funds kept separate from the rest of your portfolio.",
  },
];

const N = cards.length;

/* ---------- Figma geometry (desktop 236:4424, mobile 236:4544) ----------
 * Both frames draw the same 340 x 265.75 wallet with the same ~300 x 190 cards,
 * so every measurement below is a fraction of the wallet's width or height and
 * one set of numbers serves every breakpoint. */
const WALLET_RATIO = 265.747 / 340;
/** Top edge of the leather pocket, as a share of wallet height. */
const POCKET_TOP = 92.816 / 265.747;
/** Card size as a share of wallet width (Figma card is 304 x 192). */
const CARD_W = 304 / 340;
const CARD_H = 192 / 340;
/**
 * Resting top of the front card inside the pocket, as a share of wallet
 * height. Lands so the icon + label row clears the leather lip by ~1px — the
 * label is readable before anything moves.
 */
const CARD_TOP = 42 / 265.747;
/** The wallet's inner face: flat, and a shade darker than a card's #171f1a. */
const WALLET_FACE = "#121814";
/** Pocket stack: each card behind sits this much higher (x wallet width) and this much narrower. */
const STACK_STEP = 9 / 340;
const STACK_SHRINK = 0.045;
/** Ladder: the step between popped cards — exactly one icon + label row. */
const LADDER_PEEK = 51 / 340;
/** How far the front card lifts clear of the pocket once the ladder forms. */
const LADDER_LIFT = 30 / 340;
/** Divided row: 12px gutters, card bottoms 27.8px above the leather lip. */
const ROW_GAP = 12 / 340;
const ROW_LIFT = 27.8 / 340;
/** The row is drawn to bleed past both viewport edges; widen the gutters if it would not. */
const ROW_BLEED = 1.08;
/** Above the 1440 frame the wallet grows with the viewport (Figma: 340 on 1440). */
const ROW_WALLET_SHARE = 340 / 1440;
/** Wallet width in both Figma frames — held from mobile up to the desktop frame. */
const WALLET_BASE = 340;
/** Figma's mobile side margins (393 - 340). */
const WALLET_MARGIN = 52;

/** Marquee drift in px/s — alive, but slow enough to read a card as it passes. */
const MARQUEE_SPEED = 75;

/** Depth falloff for the cards still tucked in the pocket. */
const POCKET_FADE = cards.map((_, i) => Math.max(0.18, 1 - 0.28 * Math.max(0, i - 1)));

/** pocket → ladder on the first scroll; the rest follows on its own. */
type Phase = "pocket" | "ladder" | "row" | "marquee";

/** Beat between the deck finishing its pop and dividing into the row, in ms. */
const DIVIDE_DELAY = 760;
/**
 * And before the strip starts to drift. Deliberately a touch early — the last
 * of the spread's travel is still on screen, which hides the step from a dead
 * stop to a constant crawl.
 */
const MARQUEE_DELAY = 560;

/** Stage height the row layout needs, in wallet widths: row top to wallet bottom. */
const ROW_RISE = ROW_LIFT + CARD_H - WALLET_RATIO * POCKET_TOP;
const ROW_HEIGHT = ROW_RISE + WALLET_RATIO;

type Geometry = {
  walletW: number;
  walletH: number;
  walletTop: number;
  cardW: number;
  cardH: number;
  /** Front card top while tucked in the pocket. */
  restTop: number;
  /** Front card top once the ladder is out, and the step up to the card behind. */
  ladderTop: number;
  ladderStep: number;
  /** Divided row: shared card top, and the centre-to-centre pitch. */
  rowTop: number;
  rowStep: number;
  /** Marquee: how far the strip travels before it repeats, and how long that takes. */
  marqueeShift: number;
  marqueeDuration: number;
  /** Which copies of the deck to lay out, as multiples of marqueeShift. */
  copies: number[];
};

function computeGeometry(w: number, h: number): Geometry {
  const bottom = 24;
  const top = 8;

  // Size from the divided row: that is the laid-out design, and it is where the
  // reader spends the most time. 340px from mobile up to the 1440 frame, then
  // proportional, and never so wide that the row cannot fit the stage.
  const walletW = Math.max(
    220,
    Math.min(
      Math.max(WALLET_BASE, w * ROW_WALLET_SHARE),
      w - WALLET_MARGIN,
      460,
      (h - bottom - top) / ROW_HEIGHT,
    ),
  );
  const walletH = walletW * WALLET_RATIO;
  const cardW = walletW * CARD_W;
  const cardH = walletW * CARD_H;
  // Centre the row composition in whatever height is left over. At 1440 x 900
  // this lands the row and the wallet within ~2px of the Figma frame.
  const slack = Math.max(0, h - bottom - top - ROW_HEIGHT * walletW);
  const walletTop = h - bottom - walletH - slack / 2;
  const restTop = walletTop + walletH * CARD_TOP;
  const ladderTop = restTop - walletW * LADDER_LIFT;

  // The ladder is the transient intro, so it yields rather than shrinking the
  // wallet: it takes the full header-row step when there is room above the
  // wallet, and tightens when a short window leaves less.
  const ladderStep = Math.max(
    walletW * 0.1,
    Math.min(walletW * LADDER_PEEK, (ladderTop - top) / (N - 1)),
  );

  // Keep the bleed even when a short window has forced the wallet down a size,
  // but never open the gutters past a tenth of a card — at that point the row
  // reads as five separate cards rather than one continuous strip.
  const gap = Math.min(
    Math.max(walletW * ROW_GAP, (w * ROW_BLEED - N * cardW) / (N - 1)),
    cardW * 0.09,
  );
  const rowStep = cardW + gap;
  const marqueeShift = N * rowStep;

  // Copy 0 is the centred five-card row the deck divides into. Tile further
  // copies either side — just enough that the strip still covers the viewport
  // at every point in the loop, so it never drifts a gap into view.
  const half = (marqueeShift - gap) / 2;
  const first = Math.min(0, Math.floor((half - w / 2) / marqueeShift));
  const last = Math.max(1, Math.ceil((w / 2 + marqueeShift - half) / marqueeShift));
  const copies: number[] = [];
  for (let k = first; k <= last; k++) copies.push(k);

  return {
    walletW,
    walletH,
    walletTop,
    cardW,
    cardH,
    restTop,
    ladderTop,
    ladderStep,
    rowTop: walletTop + walletH * POCKET_TOP - walletW * ROW_LIFT - cardH,
    rowStep,
    marqueeShift,
    marqueeDuration: marqueeShift / MARQUEE_SPEED,
    copies,
  };
}

type Frame = { x: number; y: number; scale: number; opacity: number };

function cardFrame(phase: Phase, g: Geometry, i: number, copy: number): Frame {
  const dx = copy * g.marqueeShift;
  if (phase === "pocket") {
    return {
      x: dx,
      y: g.restTop - g.walletW * STACK_STEP * i,
      scale: 1 - STACK_SHRINK * i,
      opacity: POCKET_FADE[i],
    };
  }
  if (phase === "row" || phase === "marquee") {
    return { x: dx + (i - (N - 1) / 2) * g.rowStep, y: g.rowTop, scale: 1, opacity: 1 };
  }
  // Ladder — the reference stack: straight up, no tilt, each card a header row
  // higher than the one in front of it.
  return { x: dx, y: g.ladderTop - g.ladderStep * i, scale: 1, opacity: 1 };
}

function cardTransition(phase: Phase, i: number): Transition {
  // Resetting only ever happens off screen, so it should not be animated. By
  // the marquee the cards are already in place — the strip is what moves.
  if (phase === "pocket" || phase === "marquee") return { duration: 0 };
  if (phase === "row") {
    // Near-critical: the spread glides out rather than bouncing. Centre card
    // leads, its neighbours follow, so the deck opens like a hand of cards.
    return {
      type: "spring",
      stiffness: 170,
      damping: 22,
      mass: 1,
      delay: Math.abs(i - (N - 1) / 2) * 0.06,
    };
  }
  // ~8% overshoot — the gentle settle the reference pop has.
  return { type: "spring", stiffness: 210, damping: 17, mass: 0.9, delay: i * 0.06 };
}

export default function WalletCards() {
  const reduceMotion = useReducedMotion();

  const header = (
    <div className="mx-auto flex max-w-[640px] flex-col items-center gap-3 text-center">
      <WordReveal>
        <h2 className="text-[32px] font-semibold leading-[1.15] tracking-[-0.02em] text-white tablet:text-[40px] desktop:text-[48px]">
          One wallet for every{" "}
          <span className="block bg-gradient-to-b from-primary to-primary-dark bg-clip-text text-transparent">
            way you trade.
          </span>
        </h2>
      </WordReveal>
      <TitleReveal delay={0.12}>
        <p className="text-base leading-[1.5] text-black-30 tablet:text-lg desktop:text-xl">
          Your AI companion helps you navigate your portfolio, markets and
          activity inside Aimo.
        </p>
      </TitleReveal>
    </div>
  );

  if (reduceMotion) {
    return (
      <section id="features" className="relative isolate overflow-hidden py-20 tablet:py-28 desktop:py-32">
        <Backdrop />
        <Container>
          {header}
          <div className="mt-10 grid grid-cols-1 gap-3 tablet:mt-14 tablet:grid-cols-2 desktop:grid-cols-3">
            {cards.map((card, i) => (
              <Reveal key={card.id} from="up" delay={i * 0.1}>
                <CardFace card={card} width={null} />
              </Reveal>
            ))}
          </div>
        </Container>
      </section>
    );
  }

  return <WalletStage header={header} />;
}

function WalletStage({ header }: { header: React.ReactNode }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [phase, setPhase] = useState<Phase>("pocket");

  const { scrollYProgress } = useScroll({ target: trackRef, offset: ["start start", "end end"] });

  // One trigger. Progress leaves 0 the moment the section pins, and that single
  // scroll plays the whole thing — no scrubbing, so nothing is left half-open.
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    if (v > 0.004) setPhase((prev) => (prev === "pocket" ? "ladder" : prev));
  });

  // Tuck back in so the deck is fresh on the way back up. The default
  // threshold means this only fires once the whole track has left the
  // viewport, so the reverse is never seen.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) setPhase("pocket");
    });
    observer.observe(track);
    return () => observer.disconnect();
  }, []);

  // ladder → row → marquee, each a beat after the one before it settles.
  useEffect(() => {
    if (phase !== "ladder" && phase !== "row") return;
    const next: Phase = phase === "ladder" ? "row" : "marquee";
    const id = window.setTimeout(
      () => setPhase(next),
      phase === "ladder" ? DIVIDE_DELAY : MARQUEE_DELAY,
    );
    return () => window.clearTimeout(id);
  }, [phase]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const measure = () => {
      const next = { w: stage.clientWidth, h: stage.clientHeight };
      setSize((prev) => (prev.w === next.w && prev.h === next.h ? prev : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  const g = useMemo(() => computeGeometry(size.w, size.h), [size.w, size.h]);

  return (
    <section id="features">
      {/* Short track: enough pin to watch the deck open, not enough to scrub it. */}
      <div ref={trackRef} className="relative h-[185vh]">
        <div className="sticky top-0 flex h-svh flex-col overflow-hidden pt-[96px] tablet:pt-[112px]">
          <Backdrop />
          <Container>{header}</Container>
          <div ref={stageRef} className="relative mt-6 min-h-0 flex-1 tablet:mt-8">
            {size.w > 0 && (
              <Fragment>
                <WalletBack g={g} />
                {/* The strip. Isolated so the cards' stacking stays local and it
                 * always paints between the wallet's inner face and its
                 * leather, with or without the marquee transform. */}
                <div
                  className={clsx(
                    "absolute inset-0 isolate",
                    phase === "marquee" && "wallet-deck-marquee",
                  )}
                  style={
                    {
                      zIndex: 10,
                      "--wallet-marquee-shift": `${g.marqueeShift.toFixed(2)}px`,
                      animationDuration: `${g.marqueeDuration.toFixed(2)}s`,
                    } as CSSProperties
                  }
                >
                  {g.copies.map((copy) =>
                    cards.map((card, i) => (
                      <DeckCard
                        key={`${card.id}:${copy}`}
                        card={card}
                        index={i}
                        copy={copy}
                        phase={phase}
                        g={g}
                      />
                    )),
                  )}
                </div>
                <LeatherPocket g={g} />
                <EdgeFade side="left" />
                <EdgeFade side="right" />
              </Fragment>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function DeckCard({
  card,
  index,
  copy,
  phase,
  g,
}: {
  card: Card;
  index: number;
  copy: number;
  phase: Phase;
  g: Geometry;
}) {
  const f = cardFrame(phase, g, index, copy);
  return (
    <motion.div
      className="absolute top-0 left-1/2 origin-top will-change-transform"
      style={{
        width: g.cardW,
        height: g.cardH,
        marginLeft: -g.cardW / 2,
        // Lower on screen means further forward, in the pocket and in the
        // ladder alike; the leather sits above every card.
        zIndex: N - index,
      }}
      initial={false}
      animate={{ x: f.x, y: f.y, scale: f.scale, opacity: f.opacity }}
      transition={cardTransition(phase, index)}
      // Only the centred copy is real content; the others are the strip's tail.
      aria-hidden={copy !== 0 || undefined}
    >
      <CardFace card={card} width={g.cardW} />
    </motion.div>
  );
}

/**
 * Figma "Wallet" card (236:4448): flat #171f1a tile, 34px radius, soft drop
 * shadow and a thin white top highlight drawn over the content. Icon +
 * gradient label on top (the part that peeks out of the pocket), then title
 * and body pinned to the bottom.
 */
function CardFace({ card, width }: { card: Card; width: number | null }) {
  // Scale with the card — Figma's is 304 wide — with floors so small phones
  // stay readable. A null width is the static grid, which uses Figma's sizes.
  const s = width ? width / 304 : 1;
  const pad = 16 * s;
  const icon = Math.max(28, 32 * s);
  return (
    <div
      className="wallet-deck-card relative flex size-full flex-col overflow-hidden bg-[#171f1a] shadow-[0_2px_8px_rgba(0,0,0,0.12)]"
      style={{
        padding: `${17.24 * s}px ${pad}px ${20 * s}px`,
        borderRadius: 34 * s,
        minHeight: width ? undefined : 192,
      }}
    >
      <div className="flex items-center" style={{ gap: 11.494 * s }}>
        <div
          className="flex shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#e5fdc3] via-[#9bf31c] to-[#8fee07]"
          style={{ width: icon, height: icon }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={card.icon} alt="" style={{ width: icon * 0.539, height: icon * 0.539 }} />
        </div>
        <p
          className="bg-gradient-to-b from-primary to-primary-dark bg-clip-text font-medium tracking-[-0.01em] whitespace-nowrap text-transparent"
          style={{ fontSize: Math.max(14, 16 * s) }}
        >
          {card.label}
        </p>
      </div>

      <div className="mt-auto flex flex-col" style={{ gap: 6 * s }}>
        <p
          className="font-semibold tracking-[-0.01em] text-white"
          style={{ fontSize: Math.max(14, 16 * s) }}
        >
          {card.title}
        </p>
        <p
          className="leading-[1.5] tracking-[-0.01em] text-black-50"
          style={{ fontSize: Math.max(12.5, 14 * s) }}
        >
          {card.body}
        </p>
      </div>

      {/* Inner highlight sits above the content, as in Figma. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_2px_1px_rgba(255,255,255,0.06)]"
      />
    </div>
  );
}

/**
 * Figma 274:23729 — the green streak picture behind the whole section, shaped
 * by a blurred stadium mask so it reaches the head of the section and falls
 * away to nothing at the corners.
 *
 * The mask and the 40% opacity are already in the file's alpha: this section
 * pins, and a live `mask-image` over a layer this size inside a sticky
 * container is a masking pass the browser redoes as that container moves.
 * scripts/build-wallet-backdrop.mjs bakes it, from Figma's own mask export —
 * point it at a new source image to replace this.
 *
 * The box is the mask's, at the fractions of Figma's 1440x900 frame it sits
 * at. `fill` rather than `cover` because the feathered edge is in the pixels
 * now: cropping it would cut a hard line where the fade should be, so the
 * shape stretches with the viewport instead and the streaks stretch with it.
 */
function Backdrop() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/images/wallet/backdrop.webp"
      alt=""
      aria-hidden
      loading="lazy"
      decoding="async"
      className="pointer-events-none absolute top-[2.5%] left-[2.361%] -z-10 h-[95.222%] w-[95.278%] max-w-none object-fill"
    />
  );
}

/**
 * Figma 236:4542/4543 — the strip is wider than the frame, and the cards that
 * hang off each edge fade into the page instead of being cut. Narrower on
 * phones, where a card is most of the screen.
 */
function EdgeFade({ side }: { side: "left" | "right" }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-y-0 w-[11%] tablet:w-[16.7%]"
      style={{
        left: side === "left" ? 0 : undefined,
        right: side === "right" ? 0 : undefined,
        background: `linear-gradient(to ${side === "left" ? "right" : "left"}, var(--background) 10%, transparent 100%)`,
        zIndex: 26,
      }}
    />
  );
}

/**
 * The wallet's back panel — the inner face you see above the leather and
 * through its thumb notch. Flat #121814 with a hairline top highlight, per
 * Figma. A gradient here reads as a crack where the panel meets a card,
 * because it lands on the cards' own #171f1a.
 */
function WalletBack({ g }: { g: Geometry }) {
  return (
    <div
      aria-hidden
      className="absolute left-1/2 shadow-[inset_0_1px_2px_rgba(255,255,255,0.05)]"
      style={{
        top: g.walletTop,
        width: g.walletW,
        height: g.walletH,
        marginLeft: -g.walletW / 2,
        borderRadius: (43.103 / 500) * g.walletW,
        background: WALLET_FACE,
        zIndex: 0,
      }}
    />
  );
}

/**
 * Figma "Leather Cover": pocket shape (gradient + shadow), leather texture
 * multiplied over it and masked to the pocket outline, embossed logo and a
 * stitched border. Painted once; it's the layer cards rise out from behind.
 */
function LeatherPocket({ g }: { g: Geometry }) {
  const height = g.walletH * (1 - POCKET_TOP);
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-1/2 isolate"
      style={{
        top: g.walletTop + g.walletH * POCKET_TOP,
        width: g.walletW,
        height,
        marginLeft: -g.walletW / 2,
        zIndex: 20,
      }}
    >
      {/* The thumb notch is a cut-out in the leather. Back it with the same
       * inner face: this sits inside the pocket's stacking context, so it is
       * above every card but under the leather itself, and is only ever visible
       * through the notch — without it a card's copy reads through the hole.
       *
       * It has to be the pocket's silhouette *without* the notch subtracted, so
       * pocket-mask.svg is no use here: instead it carries the leather path's
       * own corner radii (23 top / 43 bottom of its 500-wide outline). Left
       * square it pokes out past all four rounded corners. */}
      <div
        className="absolute inset-0"
        style={{
          background: WALLET_FACE,
          borderRadius: `${(22.9885 / 500) * g.walletW}px ${(22.9885 / 500) * g.walletW}px ${(43.1035 / 500) * g.walletW}px ${(43.1035 / 500) * g.walletW}px`,
        }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/wallet/pocket-shape.svg"
        alt=""
        className="absolute max-w-none"
        style={{ top: "-1.13%", right: "-1.15%", bottom: "-3.39%", left: "-1.15%", width: "102.3%", height: "104.52%" }}
      />
      <div
        className="absolute inset-0 mix-blend-multiply"
        style={{
          backgroundImage: "url(/images/wallet/leather-texture.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          maskImage: "url(/images/wallet/pocket-mask.svg)",
          WebkitMaskImage: "url(/images/wallet/pocket-mask.svg)",
          maskSize: "100% 100%",
          WebkitMaskSize: "100% 100%",
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
        }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/wallet/logo-mark.svg"
        alt=""
        className="absolute"
        style={{ top: "45.2%", bottom: "29.38%", left: "41.95%", right: "41.67%", width: "16.38%", height: "25.42%" }}
      />
      <div className="absolute" style={{ left: "2.3%", top: "4.52%", width: "95.4%", height: "90.96%" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/wallet/pocket-stitch.svg"
          alt=""
          className="absolute max-w-none"
          style={{ top: "-0.31%", left: "-0.15%", width: "100.3%", height: "100.62%" }}
        />
      </div>
    </div>
  );
}
