"use client";

import { useState, type MouseEvent as ReactMouseEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Container from "../Container";
import Reveal from "../Reveal";

type Card = {
  id: string;
  icon: string;
  spark?: string;
  label: string;
  title: string;
  body: string;
  /** Shown on the card's flipped-open face — placeholder copy, swap in the real thing. */
  expanded: string;
};

const cards: Card[] = [
  {
    id: "main",
    icon: "/images/wallets/main-icon.svg",
    label: "Main Wallet",
    title: "Your starting point.",
    body: "Deposit, withdraw, and manage your available funds from one central wallet.",
    expanded:
      "Every deposit and withdrawal starts here. Fund your Main Wallet first, then move money into whichever trading wallet you need. Spot, Perps, or Prediction in a couple of taps. Transfers between your own Aimo wallets are instant and free, so you can keep your Main Wallet as a holding area and only allocate funds when you're ready to use them.",
  },
  {
    id: "spot",
    icon: "/images/wallets/spot-icon.svg",
    spark: "/images/wallets/spot-spark.svg",
    label: "Spot Wallet",
    title: "For your everyday crypto.",
    body: "Keep your spot assets organised and ready to trade.",
    expanded:
      "Buy, hold, and sell any listed asset without it getting tangled up in your leveraged or prediction positions. Balances update in real time, transfers to and from your other wallets are instant, and your full trade history stays in one place so your everyday holdings are always easy to find and easy to move.",
  },
  {
    id: "perps",
    icon: "/images/wallets/perps-icon.svg",
    spark: "/images/wallets/perps-spark.svg",
    label: "Perps Wallet",
    title: "For leveraged positions.",
    body: "Keep your perpetual trading funds separate from the rest of your portfolio.",
    expanded:
      "Isolated margin means the funds you put at risk stay contained to this wallet a bad trade here can't touch your spot holdings. Fund it with only what you're willing to leverage, track PnL separately from the rest of your portfolio, and move the rest back to your Main Wallet whenever you like.",
  },
  {
    id: "prediction",
    icon: "/images/wallets/prediction-icon.svg",
    spark: "/images/wallets/prediction-spark.svg",
    label: "Prediction Wallet",
    title: "For your predictions.",
    body: "Set aside funds for prediction markets without mixing them with your other positions.",
    expanded:
      "Keep the money you're using for prediction markets ring-fenced from your spot and leveraged trading. Positions resolve and settle independently, withdrawals don't touch your other wallets, and you can top this one up or drain it in a couple of taps whenever your outlook changes.",
  },
];

export default function WalletCards() {
  return (
    <section id="features" className="py-20 tablet:py-28 desktop:py-32">
      <Container>
        <Reveal from="up">
          <h2 className="max-w-[560px] text-[32px] font-semibold leading-[1.15] tracking-[-0.02em] text-white tablet:text-[40px] desktop:text-[48px]">
            One wallet for every{" "}
            <span className="bg-gradient-to-b from-primary to-primary-dark bg-clip-text text-transparent">
              way you trade.
            </span>
          </h2>
        </Reveal>

        {/* Static grid — no drag/scroll carousel. Figma's heading-to-row gap
         * is 80px at desktop (Row starts at y=276, the heading block ends at
         * y=196); mobile/tablet have no spec, so they follow this project's
         * usual section-internal gap scale instead. 1 column on mobile, 2 on
         * tablet, all 4 across on desktop — it just reflows with the
         * viewport rather than scrolling. */}
        <div className="mt-10 grid grid-cols-1 gap-3 tablet:mt-14 tablet:grid-cols-2 desktop:mt-[80px] desktop:grid-cols-4">
          {cards.map((card, i) => (
            <Reveal key={card.id} from="up" delay={i * 0.1}>
              <WalletCard card={card} />
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

function WalletCard({ card }: { card: Card }) {
  const [open, setOpen] = useState(false);

  function handleClick(e: ReactMouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    setOpen((v) => !v);
  }

  return (
    // Same 1px vertical-gradient outline as the DeepDive cards (white at 15%
    // along the top edge, fading to fully transparent by the bottom) —
    // confirmed by sampling the real Figma pixels: the border colour visibly
    // changes top-to-bottom, it isn't the flat border get_design_context
    // reported. Three stacked backgrounds reproduce it without a
    // pseudo-element: the fill clipped to the padding box, the gradient
    // clipped to the border box, and the fill again underneath so the
    // gradient composites over the card colour rather than the page.
    //
    // Height steps down at narrower breakpoints (no Figma spec below
    // desktop) — same convention as HowItWorks' stepped card heights.
    <div className="relative h-[280px] overflow-hidden rounded-[20px] border border-transparent [background:linear-gradient(#171f1a,#171f1a)_padding-box,linear-gradient(180deg,rgba(255,255,255,0.15),rgba(255,255,255,0))_border-box,linear-gradient(#171f1a,#171f1a)_border-box] tablet:h-[320px] desktop:h-[350px]">
      <AnimatePresence initial={false}>
        {!open ? (
          <motion.div
            key="closed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0"
          >
            {/* Figma's "Blur effect" is a solid #C2F94B blob run through a
             * real Gaussian blur (feGaussianBlur stdDeviation="60"), not a
             * pre-blurred image — reproduced the same way here: a small
             * solid-colour shape blurred by the browser, so it stays crisp
             * at any resolution and costs nothing to store. Sized smaller
             * than the ~254x116 visible glow and let the 60px blur expand
             * it outward to match; the card's overflow-hidden clips the
             * part that would otherwise spill past the bottom edge. */}
            <div
              className="pointer-events-none absolute bottom-[-40px] left-1/2 h-10 w-[130px] -translate-x-1/2 rounded-full bg-[#c2f94b] opacity-50 blur-[60px]"
              aria-hidden
            />

            <div className="relative flex size-full flex-col gap-4 px-4 py-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-primary to-primary-dark">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={card.icon} alt="" className="size-[18px]" />
              </div>

              <div className="flex flex-col gap-1.5">
                <p className="bg-gradient-to-b from-primary to-primary-dark bg-clip-text text-sm font-medium tracking-[-0.01em] text-transparent">
                  {card.label}
                </p>
                <p className="text-l font-semibold tracking-[-0.01em] text-white">
                  {card.title}
                </p>
                <p className="text-sm leading-[1.5] tracking-[-0.01em] text-black-50">
                  {card.body}
                </p>
              </div>
            </div>

            {card.spark && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={card.spark}
                alt=""
                className="pointer-events-none absolute -bottom-6 left-0 w-[254px] opacity-80"
              />
            )}
          </motion.div>
        ) : (
          <motion.div
            key="open"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 bg-primary"
            style={{
              backgroundImage:
                "radial-gradient(rgba(0,0,0,0.1) 1px, transparent 1px)",
              backgroundSize: "7px 7px",
            }}
          >
            <p className="size-full overflow-hidden p-4 text-[15px] leading-[1.5] font-semibold tracking-[-0.01em] text-ink">
              {card.expanded}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={handleClick}
        aria-expanded={open}
        aria-label={open ? `Hide details about ${card.label}` : `Show more about ${card.label}`}
        className={`absolute right-5 bottom-5 flex size-[43px] items-center justify-center rounded-full transition hover:scale-[1.06] ${
          open ? "bg-ink" : "bg-white/[0.12] shadow-[inset_0_-8px_6px_-4px_rgba(255,255,255,0.12)]"
        }`}
      >
        <motion.img
          src="/images/wallets/plus.svg"
          alt=""
          className="size-[23px]"
          animate={{ rotate: open ? 135 : 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        />
      </button>
    </div>
  );
}
