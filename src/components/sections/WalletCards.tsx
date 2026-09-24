"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { motion, useMotionValueEvent, useScroll, type Transition } from "framer-motion";
import clsx from "clsx";
import Container from "../Container";
import useReducedMotionAfterMount from "../useReducedMotionAfterMount";
import TitleReveal from "../TitleReveal";
import WordReveal from "../WordReveal";
import TiltCard from "../TiltCard";

type Card = {
  id: string;
  icon: string;
  label: string;
  title: string;
  body: string;
};

// Pocket order, front to back: Main comes out first and ends up in the middle
// of the fan, Outcome and Perps fan out to its left and right (Figma 313:531).
const cards: Card[] = [
  {
    id: "main",
    icon: "/images/wallets/main-icon.svg",
    label: "Main Wallet",
    title: "Your starting point.",
    body: "Deposit, withdraw, and manage your available funds from one central wallet.",
  },
  {
    id: "outcome",
    icon: "/images/wallets/outcome-icon.svg",
    label: "Outcome Wallet",
    title: "For event outcomes.",
    body: "Back the results you believe in, with funds separated from the rest of your portfolio.",
  },
  {
    id: "perps",
    icon: "/images/wallets/perps-icon.svg",
    label: "Perps Wallet",
    title: "For leveraged positions.",
    body: "Keep your perpetuals trading funds separate from the rest of your portfolio.",
  },
];

const N = cards.length;

/* ---------- Figma geometry (313:531, 1440 x 900) ----------
 * The wallet is 340 x 265.75 and the cards 304 x 192, so every measurement
 * below is a fraction of the wallet's width or height and one set of numbers
 * serves every breakpoint. */
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
/** Fan: Main's top edge sits 134px above the wallet's (Figma 313:559 vs 313:542). */
const FAN_MAIN_TOP = -134.13 / 340;
/** Fan: the side cards' centres, 342px out and 55px down from Main's. */
const FAN_DX = 342 / 340;
const FAN_DY = 55.07 / 340;
/** Fan: the side cards' tilt, in degrees (Figma rotates them ∓15). */
const FAN_TILT = 15;
/** Half the width a 15°-tilted card covers: (304 cos 15 + 192 sin 15) / 2. */
const TILTED_HALF_W = 171.67 / 340;
/** The fan's full width, in wallet widths, and the smallest wallet it is drawn at. */
const FAN_SPAN = 2 * (FAN_DX + TILTED_HALF_W);
const FAN_MIN_WALLET = 300;
/* Where even a 300px wallet's fan will not fit (phones, tablets — Figma has no
 * frame for either), the side cards tuck in just behind Main instead: a small
 * tilt and a small offset, so only their edges show and none of their copy
 * hangs out half-cut. */
const TUCK_DX = 0;
const TUCK_DY = 8 / 340;
const TUCK_TILT = 5;
/** Above the 1440 frame the wallet grows with the viewport (Figma: 340 on 1440). */
const WALLET_SHARE = 340 / 1440;
/** Wallet width in the Figma frame — held from mobile up to it. */
const WALLET_BASE = 340;
/** Side margins on a phone (393 - 340). */
const WALLET_MARGIN = 52;

/** Depth falloff for the cards still tucked in the pocket. */
const POCKET_FADE = cards.map((_, i) => Math.max(0.18, 1 - 0.28 * Math.max(0, i - 1)));

/** pocket → ladder on the first scroll; the fan follows on its own. */
type Phase = "pocket" | "ladder" | "fan";

/** Beat between the deck finishing its pop and fanning out, in ms. */
const FAN_DELAY = 760;

/** Stage height the fan needs, in wallet widths: Main's top to the wallet's bottom. */
const FAN_HEIGHT = WALLET_RATIO - FAN_MAIN_TOP;

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
  /** Fan: Main's top, and the side cards' offset from Main's centre and tilt. */
  fanTop: number;
  fanDx: number;
  fanDy: number;
  fanTilt: number;
};

function computeGeometry(w: number, h: number): Geometry {
  // Figma leaves 100px under the wallet on its 1440 x 900 frame; phones and
  // tablets keep the tighter margin so the fan stays as large as it can.
  const bottom = w >= 1024 ? 72 : 24;
  const top = 8;

  // Size from the fan: that is the laid-out design, and it is where the reader
  // spends the most time. 340px from mobile up to the 1440 frame, then
  // proportional, and never so tall that the fan cannot fit the stage.
  const fanFits = (w - 32) / FAN_SPAN >= FAN_MIN_WALLET;
  const walletW = Math.max(
    220,
    Math.min(
      Math.max(WALLET_BASE, w * WALLET_SHARE),
      w - WALLET_MARGIN,
      460,
      (h - bottom - top) / FAN_HEIGHT,
      // Shrink the wallet a little rather than lose the fan, down to 300.
      fanFits ? (w - 32) / FAN_SPAN : Infinity,
    ),
  );
  const walletH = walletW * WALLET_RATIO;
  const cardW = walletW * CARD_W;
  const cardH = walletW * CARD_H;
  // Centre the fan in whatever height is left over. At 1440 x 900 this lands
  // the wallet and the cards on the Figma frame.
  const slack = Math.max(0, h - bottom - top - FAN_HEIGHT * walletW);
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


  return {
    walletW,
    walletH,
    walletTop,
    cardW,
    cardH,
    restTop,
    ladderTop,
    ladderStep,
    fanTop: walletTop + walletW * FAN_MAIN_TOP,
    fanDx: walletW * (fanFits ? FAN_DX : TUCK_DX),
    fanDy: walletW * (fanFits ? FAN_DY : TUCK_DY),
    fanTilt: fanFits ? FAN_TILT : TUCK_TILT,
  };
}

type Frame = { x: number; y: number; scale: number; rotate: number; opacity: number };

/** Cards transform about their centre, so `y` is always the card's top edge
 * as laid out, with a shrunk pocket card nudged to keep that top in place. */
function cardFrame(phase: Phase, g: Geometry, i: number): Frame {
  if (phase === "pocket") {
    const scale = 1 - STACK_SHRINK * i;
    return {
      x: 0,
      y: g.restTop - g.walletW * STACK_STEP * i - (g.cardH * (1 - scale)) / 2,
      scale,
      rotate: 0,
      opacity: POCKET_FADE[i],
    };
  }
  if (phase === "fan") {
    if (i === 0) return { x: 0, y: g.fanTop, scale: 1, rotate: 0, opacity: 1 };
    const side = i === 1 ? -1 : 1;
    return {
      x: side * g.fanDx,
      y: g.fanTop + g.fanDy,
      scale: 1,
      rotate: side * g.fanTilt,
      opacity: 1,
    };
  }
  // Ladder — the reference stack: straight up, no tilt, each card a header row
  // higher than the one in front of it.
  return { x: 0, y: g.ladderTop - g.ladderStep * i, scale: 1, rotate: 0, opacity: 1 };
}

function cardTransition(phase: Phase, i: number): Transition {
  // Resetting only ever happens off screen, so it should not be animated.
  if (phase === "pocket") return { duration: 0 };
  if (phase === "fan") {
    // One gentle settle for the whole hand: Main rises into place and the two
    // behind it swing out a beat later, so the fan reads as opening from the
    // middle rather than three cards moving at once.
    return { type: "spring", duration: 0.7, bounce: 0.18, delay: i === 0 ? 0 : 0.06 };
  }
  // ~8% overshoot — the gentle settle the reference pop has.
  return { type: "spring", stiffness: 210, damping: 17, mass: 0.9, delay: i * 0.06 };
}

export default function WalletCards() {
  // Not Framer Motion's `useReducedMotion`: under reduced motion the section
  // drops its pin and renders the fan still, and choosing between those on a
  // value the server cannot know made every reduced-motion visit hydrate
  // against the wrong tree. See the hook.
  const reduceMotion = useReducedMotionAfterMount();

  const header = (
    <div className="mx-auto flex max-w-[640px] flex-col items-center gap-3 text-center">
      <WordReveal>
        <h2 className="text-[32px] leading-[normal] font-semibold tracking-[-0.02em] text-white tablet:text-[40px] desktop:text-[48px]">
          One wallet for every{" "}
          <span className="block bg-gradient-to-b from-primary to-primary-dark bg-clip-text text-transparent">
            way you trade.
          </span>
        </h2>
      </WordReveal>
      <TitleReveal delay={0.12}>
        {/* Narrower than the title so it breaks after "portfolio," as Figma does. */}
        <p className="max-w-[500px] text-base leading-[1.5] text-black-30 tablet:text-lg desktop:text-xl">
          Your AI companion helps you navigate your portfolio, markets and
          activity inside Aimo.
        </p>
      </TitleReveal>
    </div>
  );

  return <WalletStage header={header} still={reduceMotion} />;
}

function WalletStage({ header, still }: { header: React.ReactNode; still: boolean }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [played, setPlayed] = useState<Phase>("pocket");
  // Reduced motion skips straight to the finished fan and never pins.
  const phase: Phase = still ? "fan" : played;

  const { scrollYProgress } = useScroll({ target: trackRef, offset: ["start start", "end end"] });

  // One trigger. Progress leaves 0 the moment the section pins, and that single
  // scroll plays the whole thing — no scrubbing, so nothing is left half-open.
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    if (v > 0.004) setPlayed((prev) => (prev === "pocket" ? "ladder" : prev));
  });

  // Tuck back in so the deck is fresh on the way back up. The default
  // threshold means this only fires once the whole track has left the
  // viewport, so the reverse is never seen.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) setPlayed("pocket");
    });
    observer.observe(track);
    return () => observer.disconnect();
  }, []);

  // ladder → fan, a beat after the pop settles.
  useEffect(() => {
    if (played !== "ladder") return;
    const id = window.setTimeout(() => setPlayed("fan"), FAN_DELAY);
    return () => window.clearTimeout(id);
  }, [played]);

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
    <section id="wallets">
      {/* Short track: enough pin to watch the deck open, not enough to scrub it. */}
      <div ref={trackRef} className={clsx("relative", still ? "h-svh min-h-[640px]" : "h-[185vh]")}>
        <div className="sticky top-0 flex h-svh min-h-[640px] flex-col overflow-hidden pt-[96px] tablet:pt-[112px] desktop:pt-[142px]">
          <Backdrop />
          <Container>{header}</Container>
          <div ref={stageRef} className="relative mt-6 min-h-0 flex-1 tablet:mt-8">
            {size.w > 0 && (
              <Fragment>
                <WalletBack g={g} />
                {/* The deck. Isolated so the cards' stacking stays local and
                 * always paints between the wallet's inner face and its
                 * leather. */}
                <div className="absolute inset-0 isolate" style={{ zIndex: 10 }}>
                  {cards.map((card, i) => (
                    <DeckCard key={card.id} card={card} index={i} phase={phase} still={still} g={g} />
                  ))}
                </div>
                <LeatherPocket g={g} />
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
  phase,
  still,
  g,
}: {
  card: Card;
  index: number;
  phase: Phase;
  /** Reduced motion: the fan is placed, never played. */
  still: boolean;
  g: Geometry;
}) {
  const f = cardFrame(phase, g, index);
  // `will-change` only while the card's own spring can run; at rest in the
  // pocket there is nothing to promote a layer for.
  const animating = phase !== "pocket" && !still;
  return (
    <motion.div
      className={clsx("absolute top-0 left-1/2", animating && "will-change-transform")}
      style={{
        width: g.cardW,
        height: g.cardH,
        marginLeft: -g.cardW / 2,
        // Lower on screen means further forward, in the pocket and in the
        // ladder alike; in the fan Main stays in front of the two it opens
        // out from. The leather sits above every card.
        zIndex: N - index,
      }}
      initial={false}
      animate={{ x: f.x, y: f.y, scale: f.scale, rotate: f.rotate, opacity: f.opacity }}
      transition={still ? { duration: 0 } : cardTransition(phase, index)}
    >
      {/* Tilts only once the fan is out; in the pocket and mid-pop the card
       * is not somewhere a reader is meant to pick it up. */}
      <TiltCard radius={34 * (g.cardW / 304)} enabled={phase === "fan"}>
        <CardFace card={card} width={g.cardW} />
      </TiltCard>
    </motion.div>
  );
}

/**
 * Figma "Wallet" card (236:4448): flat #171f1a tile, 34px radius, soft drop
 * shadow and a thin white top highlight drawn over the content. Icon +
 * gradient label on top (the part that peeks out of the pocket), then title
 * and body pinned to the bottom.
 */
function CardFace({ card, width }: { card: Card; width: number }) {
  // Scale with the card — Figma's is 304 wide — with floors so small phones
  // stay readable.
  const s = width / 304;
  const pad = 16 * s;
  const icon = Math.max(28, 32 * s);
  return (
    <div
      className="relative isolate flex size-full flex-col overflow-hidden bg-[#171f1a] shadow-[0_2px_8px_rgba(0,0,0,0.12)]"
      style={{
        padding: `${17.24 * s}px ${pad}px ${20 * s}px`,
        borderRadius: 34 * s,
      }}
    >
      {/* Only the Main Wallet carries this — Figma 298:13434, a background the
       * other four cards don't have. */}
      {card.id === "main" && <MainWalletBackground />}

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
 * Main Wallet's own background (Figma 313:560) — the other two cards stay flat
 * #171f1a.
 *
 * Two layers over the card's fill. Four soft grey blobs (#D9D9D9 at 40%,
 * blurred by 40) seen *only through* the designer's dot stipple, so they read
 * as a dot field that brightens where a blob sits rather than as grey haze.
 * The stipple is Figma's own mask export (main-card-dots.webp, 2x the card),
 * used as an alpha mask exactly as the file does. Over that, unmasked, a green
 * glow behind the icon.
 *
 * Drawn as inline SVG at the design's 304 x 192 so the blur re-rasterises
 * crisp at any card size. Nothing in here animates, so the filter and the mask
 * are paid once, not per frame.
 */
function MainWalletBackground() {
  return (
    <>
      <svg
        aria-hidden
        viewBox="0 0 304 192"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 -z-10 size-full"
        style={{
          maskImage: "url(/images/wallet/main-card-dots.webp)",
          WebkitMaskImage: "url(/images/wallet/main-card-dots.webp)",
          maskSize: "100% 100%",
          WebkitMaskSize: "100% 100%",
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
        }}
      >
        <defs>
          <filter id="wallet-main-blur-40" x="-200" y="-200" width="704" height="592" filterUnits="userSpaceOnUse">
            <feGaussianBlur stdDeviation="40" />
          </filter>
        </defs>
        <g fill="#D9D9D9" opacity="0.4" filter="url(#wallet-main-blur-40)">
          <ellipse cx="22.06" cy="98.65" rx="26.27" ry="22.09" />
          <ellipse cx="72.5" cy="117.5" rx="51.48" ry="43.29" />
          <ellipse cx="283.5" cy="79.5" rx="54.5" ry="45.5" />
          <ellipse cx="250" cy="166.5" rx="51" ry="42.5" />
        </g>
      </svg>
      <svg
        aria-hidden
        viewBox="0 0 304 192"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 -z-10 size-full"
      >
        <defs>
          <linearGradient id="wallet-main-glow" x1="152" y1="-37" x2="152" y2="63" gradientUnits="userSpaceOnUse">
            <stop stopColor="#A7F932" />
            <stop offset="1" stopColor="#8FEE07" />
          </linearGradient>
          <filter id="wallet-main-blur-50" x="-200" y="-200" width="704" height="592" filterUnits="userSpaceOnUse">
            <feGaussianBlur stdDeviation="50" />
          </filter>
        </defs>
        <circle cx="152" cy="13" r="50" fill="url(#wallet-main-glow)" opacity="0.2" filter="url(#wallet-main-blur-50)" />
      </svg>
    </>
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
