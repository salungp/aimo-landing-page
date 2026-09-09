"use client";

import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
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
      "Every deposit and withdrawal starts here. Fund your Main Wallet first, then move money into whichever trading wallet you need — Spot, Perps, or Prediction — in a couple of taps. Transfers between your own Aimo wallets are instant and free, so you can keep your Main Wallet as a holding area and only allocate funds when you're ready to use them.",
  },
  {
    id: "spot",
    icon: "/images/wallets/spot-icon.svg",
    spark: "/images/wallets/spot-spark.svg",
    label: "Spot Wallet",
    title: "For your everyday crypto.",
    body: "Keep your spot assets organised and ready to trade.",
    expanded:
      "Buy, hold, and sell any listed asset without it getting tangled up in your leveraged or prediction positions. Balances update in real time, transfers to and from your other wallets are instant, and your full trade history stays in one place — so your everyday holdings are always easy to find and easy to move.",
  },
  {
    id: "perps",
    icon: "/images/wallets/perps-icon.svg",
    spark: "/images/wallets/perps-spark.svg",
    label: "Perps Wallet",
    title: "For leveraged positions.",
    body: "Keep your perpetual trading funds separate from the rest of your portfolio.",
    expanded:
      "Isolated margin means the funds you put at risk stay contained to this wallet — a bad trade here can't touch your spot holdings. Fund it with only what you're willing to leverage, track PnL separately from the rest of your portfolio, and move the rest back to your Main Wallet whenever you like.",
  },
  {
    id: "prediction",
    icon: "/images/wallets/prediction-icon.svg",
    spark: "/images/wallets/prediction-spark.svg",
    label: "Prediction Wallet",
    title: "For your predictions.",
    body: "Set aside funds for prediction markets without mixing them with your other positions.",
    expanded:
      "Keep the money you're using for prediction markets ring-fenced from your spot and leveraged trading. Positions resolve and settle independently, withdrawals don't touch your other wallets, and you can top this one up — or drain it — in a couple of taps whenever your outlook changes.",
  },
];

/**
 * Click-and-drag horizontal scrolling for mouse users (touch/trackpad keep
 * native scroll). Skips entirely when the press starts on a button so it
 * never steals clicks — pointer capture retargets the eventual `click` to
 * whatever element captured it, which was silently swallowing the card's
 * "+" button before this fix. Also carries a little momentum on release so
 * a flick doesn't just stop dead, and hands off to CSS scroll-snap once it
 * settles.
 */
function useDragScroll(ref: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let dragging = false;
    let moved = false;
    let startX = 0;
    let startScroll = 0;
    let lastX = 0;
    let lastT = 0;
    let velocity = 0; // px/ms
    let momentumId: number | null = null;

    function stopMomentum() {
      if (momentumId !== null) {
        cancelAnimationFrame(momentumId);
        momentumId = null;
      }
    }

    function onPointerDown(e: PointerEvent) {
      if (e.pointerType !== "mouse") return;
      if ((e.target as HTMLElement).closest("button, a")) return; // let clicks through untouched

      stopMomentum();
      dragging = true;
      moved = false;
      startX = lastX = e.clientX;
      startScroll = el!.scrollLeft;
      lastT = performance.now();
      velocity = 0;
      el!.style.scrollSnapType = "none";
      el!.setPointerCapture(e.pointerId);
    }

    function onPointerMove(e: PointerEvent) {
      if (!dragging) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 3) moved = true;
      el!.scrollLeft = startScroll - dx;

      const now = performance.now();
      const dt = now - lastT;
      if (dt > 0) velocity = (e.clientX - lastX) / dt;
      lastX = e.clientX;
      lastT = now;
    }

    function onPointerUp() {
      if (!dragging) return;
      dragging = false;

      if (moved) {
        // swallow the click that follows a drag so it doesn't toggle a card open
        const suppress = (ev: MouseEvent) => {
          ev.stopPropagation();
          ev.preventDefault();
        };
        el!.addEventListener("click", suppress, { capture: true, once: true });

        // a little momentum, decaying to a stop, then let scroll-snap settle it
        let v = velocity;
        function glide() {
          v *= 0.94;
          el!.scrollLeft -= v * 16;
          if (Math.abs(v) > 0.02) {
            momentumId = requestAnimationFrame(glide);
          } else {
            momentumId = null;
            el!.style.scrollSnapType = "";
          }
        }
        if (Math.abs(v) > 0.05) {
          momentumId = requestAnimationFrame(glide);
        } else {
          el!.style.scrollSnapType = "";
        }
      } else {
        el!.style.scrollSnapType = "";
      }
    }

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerUp);

    return () => {
      stopMomentum();
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerUp);
    };
  }, [ref]);
}

export default function WalletCards() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  useDragScroll(scrollerRef);

  return (
    <section id="features" className="py-20 tablet:py-28 desktop:py-32">
      <Container className="!pr-0">
        <Reveal from="up" className="pr-5 tablet:pr-10 desktop:pr-[220px]">
          <h2 className="max-w-[560px] text-[32px] font-semibold leading-[1.15] tracking-[-0.02em] text-white tablet:text-[40px] desktop:text-[48px]">
            One wallet for every{" "}
            <span className="bg-gradient-to-b from-primary to-primary-dark bg-clip-text text-transparent">
              way you trade.
            </span>
          </h2>
        </Reveal>

        <div
          ref={scrollerRef}
          className="mt-10 flex cursor-grab snap-x snap-proximity items-start gap-3 overflow-x-auto pr-5 pb-4 select-none active:cursor-grabbing tablet:mt-14 tablet:pr-10 desktop:pr-[220px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {cards.map((card, i) => (
            <Reveal
              key={card.id}
              from="up"
              delay={i * 0.1}
              className="w-[280px] shrink-0 snap-start tablet:w-[320px]"
            >
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
    <div
      className="rounded-[20px] p-px"
      style={{
        background: "linear-gradient(to bottom, rgba(1,1,1,0.16), rgba(1,1,1,0))",
      }}
    >
      <div className="relative h-[350px] overflow-hidden rounded-[19px] bg-[#171f1a]">
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/wallets/card-glow.webp"
                alt=""
                className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 w-full object-cover object-bottom"
              />

              <div className="relative flex size-full flex-col p-4">
                <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-b from-primary to-primary-dark">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={card.icon} alt="" className="size-[18px]" />
                </div>

                <div className="mt-[35px] flex flex-col gap-1.5 pr-12">
                  <p className="bg-gradient-to-b from-primary to-primary-dark bg-clip-text text-sm font-medium tracking-[-0.01em] text-transparent">
                    {card.label}
                  </p>
                  <p className="text-xl font-semibold tracking-[-0.01em] text-white">
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
                  "radial-gradient(rgba(0,0,0,0.35) 1px, transparent 1px)",
                backgroundSize: "7px 7px",
              }}
            >
              <p className="size-full overflow-hidden p-4 pr-16 text-[15px] leading-[1.5] font-semibold tracking-[-0.01em] text-ink">
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
          className={`absolute right-[19px] bottom-[19px] flex size-[43px] items-center justify-center rounded-full transition hover:scale-[1.06] ${
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
    </div>
  );
}
