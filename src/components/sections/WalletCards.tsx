"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import Container from "../Container";
import Reveal from "../Reveal";
import TitleReveal from "../TitleReveal";

type Card = {
  id: string;
  icon: string;
  label: string;
  title: string;
  body: string;
};

// Emerge order: the front card in the pocket comes out first.
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

/* ---------- Figma geometry (220:3954), as fractions of the 500 × 390.8 wallet ---------- */
const WALLET_RATIO = 390.805 / 500;
/** Top edge of the leather pocket, as a share of wallet height. */
const POCKET_TOP = 136.49 / 390.805;
/** Card size as a share of wallet width. */
const CARD_W = 433.908 / 500;
const CARD_H = 260.057 / 500;
/** Resting top of the front card inside the pocket, as a share of wallet height. */
const CARD_TOP = 61.78 / 390.805;
/** The card behind sits this much higher (× wallet width) and this much narrower. */
const STACK_STEP = 18.4 / 500;
const STACK_SHRINK = 0.08;

/* ---------- motion ---------- */
/** Share of the pinned scroll spent emerging — the rest holds the final layout before it unpins. */
const DECK_FILL_END = 0.85;
/** Each card's slice of the timeline, and how far apart consecutive cards start. */
const WINDOW = 0.34;
const STAGGER = (1 - WINDOW) / (N - 1);
/** Share of a card's slice spent rising out of the pocket (the rest travels / settles). */
const RISE = 0.5;
/** Max tilt (deg) while a card is in flight — always returns to 0 when it lands. */
const TILT = 5;
/** Stack mode: how far each earlier card steps up behind the newest one. */
const STACK_PEEK = 14;

/** Wide enough to lay the four cards out beside the wallet. */
const FAN_QUERY = "(min-width: 1280px)";

type Mode = "fan" | "stack";

type Geometry = {
  walletW: number;
  walletH: number;
  walletTop: number;
  cardW: number;
  cardH: number;
  /** Card top while tucked in the pocket (front position). */
  restTop: number;
  /** Card top once fully out — clear of the pocket and of the card peeking behind. */
  riseTop: number;
  /** Fan mode: final card positions (x from centre, card top). */
  slots: { x: number; y: number }[];
};

const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Gentle overshoot (~6%) — the "bouncy but not too much" settle. */
function easeOutBack(x: number) {
  const c1 = 1.2;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

function localT(progress: number, index: number) {
  return clamp01((progress - index * STAGGER) / WINDOW);
}

function toDeck(progress: number) {
  return clamp01(progress / DECK_FILL_END);
}

function computeGeometry(mode: Mode, w: number, h: number): Geometry {
  if (mode === "fan") {
    // Wallet anchored near the bottom of the stage so the whole space above it
    // is available for each card to rise into — lets the wallet stay close to
    // Figma's size instead of shrinking to fit a centred layout. Width is the
    // largest that satisfies both: the risen card clears the stage top, and the
    // upper pair of side slots fits above the lower pair.
    const bottom = 24;
    const gap = 32;
    const walletW = Math.max(
      240,
      Math.min(
        440,
        w * 0.3,
        (h - bottom - 8) / (WALLET_RATIO * (1 - CARD_TOP) + STACK_STEP + CARD_H),
        (h - bottom - gap) / (2 * CARD_H),
      ),
    );
    const walletH = walletW * WALLET_RATIO;
    const walletTop = h - bottom - walletH;
    const cardW = walletW * CARD_W;
    const cardH = walletW * CARD_H;
    const restTop = walletTop + walletH * CARD_TOP;
    const riseTop = restTop - STACK_STEP * walletW - 8 - cardH;
    const slotX = Math.min(walletW / 2 + 56 + cardW / 2, w / 2 - cardW / 2 - 24);
    // Side slots stack upward from the wallet's bottom edge.
    const walletBottom = walletTop + walletH;
    const lower = walletBottom - cardH;
    const upper = lower - gap - cardH;
    return {
      walletW,
      walletH,
      walletTop,
      cardW,
      cardH,
      restTop,
      riseTop,
      slots: [
        { x: -slotX, y: upper },
        { x: slotX, y: upper },
        { x: -slotX, y: lower },
        { x: slotX, y: lower },
        // Last card sits top-centre, aligned with the upper pair (Main & Spot).
        // Its bottom edge still clears the leather, so it reads as standing up
        // out of the pocket; it rises, then settles down into line.
        { x: 0, y: upper },
      ],
    };
  }

  // Stack: wallet anchored to the bottom, newest card showcased above the
  // pocket with the earlier ones peeking out behind it. Sized so the whole
  // column (peeks + card + wallet) fits the available height.
  const bottom = 16;
  const walletW = Math.max(
    220,
    Math.min(
      380,
      w - 40,
      (h - (N - 1) * STACK_PEEK - 8 - bottom - 8) / (CARD_H + STACK_STEP + WALLET_RATIO * (1 - CARD_TOP)),
    ),
  );
  const walletH = walletW * WALLET_RATIO;
  const walletTop = h - walletH - bottom;
  const cardW = walletW * CARD_W;
  const cardH = walletW * CARD_H;
  const restTop = walletTop + walletH * CARD_TOP;
  const riseTop = restTop - STACK_STEP * walletW - 8 - cardH;
  return { walletW, walletH, walletTop, cardW, cardH, restTop, riseTop, slots: [] };
}

type Frame = { x: number; y: number; rot: number; scale: number; z: number; opacity: number };

function cardFrame(mode: Mode, g: Geometry, i: number, p: number): Frame {
  const t = localT(p, i);

  // Still in the pocket: its depth shrinks as the cards in front leave.
  if (t <= 0) {
    let ahead = 0;
    for (let j = 0; j < i; j++) ahead += clamp01(localT(p, j) / (RISE * 0.6));
    const depth = Math.max(0, i - ahead);
    return {
      x: 0,
      y: g.restTop - STACK_STEP * g.walletW * depth,
      rot: 0,
      scale: 1 - STACK_SHRINK * depth,
      // Front of the pocket on top; everything in the pocket sits under the leather.
      z: 10 + N - i,
      // Only the front card and the one directly behind it are ever visible.
      opacity: clamp01(2 - depth),
    };
  }

  const riseRaw = clamp01(t / RISE);
  const rise = easeOutBack(riseRaw);
  const risenY = lerp(g.restTop, g.riseTop, rise);
  const wobble = Math.sin(Math.PI * riseRaw);

  if (mode === "fan") {
    const slot = g.slots[i];
    const side = slot.x < 0 ? -1 : 1;
    const travelRaw = clamp01((t - RISE) / (1 - RISE));
    const travel = t <= RISE ? 0 : easeOutBack(travelRaw);
    return {
      x: lerp(0, slot.x, travel),
      y: lerp(risenY, slot.y, travel),
      rot: side * (2 * wobble + TILT * Math.sin(Math.PI * travelRaw)),
      scale: 1,
      // Behind the leather while rising; above it once clear, so it can fly over the pocket.
      z: t < RISE ? 10 + N - i : 30 + i,
      opacity: 1,
    };
  }

  // Stack: step back and up as later cards rise in front.
  let level = 0;
  for (let j = i + 1; j < N; j++) level += clamp01(localT(p, j) / RISE);
  return {
    x: 0,
    y: risenY - STACK_PEEK * level,
    rot: (i % 2 === 0 ? -1 : 1) * 2.5 * wobble,
    scale: 1 - 0.05 * level,
    // Rising cards slide in front of earlier showcased cards but stay under the
    // leather; once out they drop below the pocket layer (no overlap by then).
    z: t < RISE ? 10 + N - i : 1 + i,
    opacity: 1,
  };
}

function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export default function WalletCards() {
  const reduceMotion = useReducedMotion();
  const isFan = useMediaQuery(FAN_QUERY);
  const mode: Mode = isFan ? "fan" : "stack";

  const header = (
    <div className="mx-auto flex max-w-[640px] flex-col items-center gap-3 text-center">
      <TitleReveal>
        <h2 className="text-[32px] font-semibold leading-[1.15] tracking-[-0.02em] text-white tablet:text-[40px] desktop:text-[48px]">
          One wallet for every{" "}
          <span className="block bg-gradient-to-b from-primary to-primary-dark bg-clip-text text-transparent">
            way you trade.
          </span>
        </h2>
      </TitleReveal>
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
      <section id="features" className="py-20 tablet:py-28 desktop:py-32">
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

  return <WalletStage mode={mode} header={header} />;
}

function WalletStage({ mode, header }: { mode: Mode; header: React.ReactNode }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  const { scrollYProgress } = useScroll({ target: trackRef, offset: ["start start", "end end"] });

  // One-way progress: cards only ever come *out* with scroll. Scrolling back up
  // leaves them out; they tuck back in only once the reader is on the hero with
  // this section off screen, so the reverse is never seen.
  const deckProgress = useMotionValue(0);
  // Light spring on top of scroll so flicks and wheel steps glide instead of stepping.
  const progress = useSpring(deckProgress, { stiffness: 150, damping: 26, mass: 0.7, restDelta: 0.0005 });
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const next = toDeck(v);
    if (next > deckProgress.get()) deckProgress.set(next);
  });

  useMotionValueEvent(scrollY, "change", () => {
    if (deckProgress.get() === 0 || scrollYProgress.get() > 0) return;
    const hero = document.getElementById("top");
    if (hero && hero.getBoundingClientRect().bottom > 0) {
      deckProgress.set(0);
      progress.jump(0);
    }
  });

  useEffect(() => {
    const start = toDeck(scrollYProgress.get());
    deckProgress.set(start);
    progress.jump(start);
  }, [deckProgress, progress, scrollYProgress]);

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

  const geometry = useMemo(() => computeGeometry(mode, size.w, size.h), [mode, size.w, size.h]);

  return (
    <section id="features">
      <div ref={trackRef} className={mode === "fan" ? "relative h-[410vh]" : "relative h-[480vh]"}>
        <div className="sticky top-0 flex h-svh flex-col overflow-hidden pt-[96px] tablet:pt-[112px]">
          <Container>{header}</Container>
          <div ref={stageRef} className="relative mt-6 min-h-0 flex-1 tablet:mt-8">
            {size.w > 0 && (
              <Fragment>
                <WalletBack g={geometry} />
                {cards.map((card, i) => (
                  <EmergingCard key={card.id} card={card} index={i} mode={mode} g={geometry} progress={progress} />
                ))}
                <LeatherPocket g={geometry} />
              </Fragment>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function EmergingCard({
  card,
  index,
  mode,
  g,
  progress,
}: {
  card: Card;
  index: number;
  mode: Mode;
  g: Geometry;
  progress: MotionValue<number>;
}) {
  // Geometry changes (resize, mode switch) swap the transformer; a version
  // counter in the inputs makes the motion values recompute immediately.
  const version = useMotionValue(0);
  const geoRef = useRef(g);
  useEffect(() => {
    geoRef.current = g;
    version.set(version.get() + 1);
  }, [g, version]);
  const modeRef = useRef(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const transform = useTransform([progress, version], ([p]: number[]) => {
    const f = cardFrame(modeRef.current, geoRef.current, index, p);
    return `translate3d(${f.x.toFixed(2)}px, ${f.y.toFixed(2)}px, 0) rotate(${f.rot.toFixed(3)}deg) scale(${f.scale.toFixed(4)})`;
  });
  const zIndex = useTransform([progress, version], ([p]: number[]) => cardFrame(modeRef.current, geoRef.current, index, p).z);
  const opacity = useTransform([progress, version], ([p]: number[]) => cardFrame(modeRef.current, geoRef.current, index, p).opacity);

  return (
    <motion.div
      className="absolute top-0 left-1/2 origin-top will-change-transform"
      style={{ width: g.cardW, height: g.cardH, marginLeft: -g.cardW / 2, transform, zIndex, opacity }}
    >
      <CardFace card={card} width={g.cardW} />
    </motion.div>
  );
}

/**
 * Figma "Wallet" card (225:4332): flat #171f1a tile, 34px radius, soft drop
 * shadow and a thin white top highlight drawn over the content. Icon +
 * gradient label on top (the part that peeks out of the pocket), then title
 * and body.
 */
function CardFace({ card, width }: { card: Card; width: number | null }) {
  // Scale typography with the card, with floors so small phones stay readable.
  const s = width ? width / 433.908 : 0.8;
  const pad = 21.55 * s;
  const icon = Math.max(30, 40.23 * s);
  return (
    <div
      className="relative flex size-full flex-col overflow-hidden rounded-[34px] bg-[#171f1a] shadow-[0_2px_8px_rgba(0,0,0,0.12)]"
      style={{ padding: `${15.8 * s}px ${pad}px ${pad}px`, minHeight: width ? undefined : 220 }}
    >
      <div className="flex items-center" style={{ gap: 11.5 * s }}>
        <div
          className="flex shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#e5fdc3] via-[#9bf31c] to-[#8fee07]"
          style={{ width: icon, height: icon }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={card.icon} alt="" style={{ width: icon * 0.45, height: icon * 0.45 }} />
        </div>
        <p
          className="bg-gradient-to-b from-primary to-primary-dark bg-clip-text font-medium tracking-[-0.01em] whitespace-nowrap text-transparent"
          style={{ fontSize: Math.max(14, 20.115 * s) }}
        >
          {card.label}
        </p>
      </div>

      <div className="mt-auto flex flex-col" style={{ gap: 6 * s }}>
        <p className="font-semibold tracking-[-0.01em] text-white" style={{ fontSize: Math.max(15, 21 * s) }}>
          {card.title}
        </p>
        <p className="leading-[1.45] tracking-[-0.01em] text-black-50" style={{ fontSize: Math.max(12.5, 16 * s) }}>
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

/** Back panel of the wallet — radial dark gradient with a soft top highlight. Below all cards. */
function WalletBack({ g }: { g: Geometry }) {
  return (
    <div
      aria-hidden
      className="absolute left-1/2 shadow-[inset_0_3px_3px_rgba(255,255,255,0.08)]"
      style={{
        top: g.walletTop,
        width: g.walletW,
        height: g.walletH,
        marginLeft: -g.walletW / 2,
        borderRadius: (43.103 / 500) * g.walletW,
        background: "radial-gradient(60% 50% at 50% 50%, #0c110e 0%, #171f1a 100%)",
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
