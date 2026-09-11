"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Container from "../Container";
import Reveal from "../Reveal";

type Item = {
  question: string;
  answer: string;
};

// Placeholder copy written to match the site's existing wallet/product
// language (see WalletCards.tsx) — swap in the real answers when available.
const items: Item[] = [
  {
    question: "How does Aimo work?",
    answer:
      "Aimo gives you one account with dedicated wallets for spot, perps, and predictions, all connected so you can move funds between them in a couple of taps without leaving the app.",
  },
  {
    question: "Why does Aimo have multiple wallets?",
    answer:
      "Keeping spot, perps, and prediction funds separate means a bad trade in one market can't touch the money you've set aside for another. Your Main Wallet holds funds until you're ready to allocate them.",
  },
  {
    question: "Can I move funds between wallets?",
    answer:
      "Yes. Transfers between your own Aimo wallets are instant and free — move money from your Main Wallet into Spot, Perps, or Prediction whenever you need it.",
  },
  {
    question: "Can I deposit directly into every wallet?",
    answer:
      "Deposits land in your Main Wallet first. From there you can split funds across your other wallets in a couple of taps, so your Main Wallet stays your single source of truth.",
  },
  {
    question: "What can I trade on Aimo?",
    answer:
      "Spot assets, leveraged perpetuals, and prediction markets — all from one account, with balances and performance tracked separately for each.",
  },
  {
    question: "Is Aimo available on mobile?",
    answer:
      "Aimo is fully responsive and works in any modern mobile browser, with a dedicated app on the way.",
  },
  {
    question: "How do I withdraw?",
    answer:
      "Move funds back to your Main Wallet from any of your trading wallets, then withdraw from there — the same wallet you deposit into.",
  },
  {
    question: "What are the fees?",
    answer:
      "Aimo charges standard network fees for withdrawals and on-chain transfers. Trading fees vary by market and are always shown before you confirm a trade.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-20 tablet:py-28 desktop:py-20">
      <Container>
        <div className="flex flex-col items-start gap-10 tablet:gap-12 desktop:flex-row desktop:gap-0">
          <Reveal from="up" className="desktop:w-[436px] desktop:shrink-0">
            <h2 className="text-[32px] font-semibold leading-[1.15] tracking-[-0.02em] text-white tablet:text-[40px] desktop:text-[48px]">
              Questions?{" "}
              <span className="block bg-gradient-to-b from-primary to-primary-dark bg-clip-text text-transparent">
                Answers.
              </span>
            </h2>
          </Reveal>

          <div className="flex w-full flex-col gap-3 desktop:w-[564px] desktop:shrink-0">
            {items.map((item, i) => (
              <Reveal key={item.question} from="up" delay={i * 0.05}>
                <FaqCard
                  item={item}
                  open={openIndex === i}
                  onToggle={() =>
                    setOpenIndex((current) => (current === i ? null : i))
                  }
                />
              </Reveal>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}

function FaqCard({
  item,
  open,
  onToggle,
}: {
  item: Item;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-[16px] bg-[#171f1a]">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-start gap-4 p-4 text-left"
      >
        <p className="flex-1 text-lg leading-[normal] font-medium tracking-[-0.01em] text-white">
          {item.question}
        </p>
        {/* Same plus glyph as the Figma icon — rotating it 45° turns it into
         * a close (×) without swapping assets or fighting a layout shift. */}
        <motion.svg
          className="mt-0.5 size-5 shrink-0"
          viewBox="0 0 20 20"
          fill="none"
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <path
            d="M9.375 16.6667C9.375 17.0118 9.65483 17.2917 10 17.2917C10.3452 17.2917 10.625 17.0118 10.625 16.6667V10.625H16.6667C17.0118 10.625 17.2917 10.3452 17.2917 10C17.2917 9.65483 17.0118 9.375 16.6667 9.375H10.625V3.33333C10.625 2.98816 10.3452 2.70833 10 2.70833C9.65483 2.70833 9.375 2.98816 9.375 3.33333V9.375H3.33333C2.98816 9.375 2.70833 9.65483 2.70833 10C2.70833 10.3452 2.98816 10.625 3.33333 10.625H9.375V16.6667Z"
            fill="#A7F932"
          />
        </motion.svg>
      </button>

      {/* Animating to height:"auto" (rather than a fixed px value) lets
       * Framer Motion measure the real content height on every open/close,
       * so this stays correct regardless of how the answer text wraps at
       * a given viewport width. */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="answer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <p className="px-4 pb-4 text-sm leading-[1.5] tracking-[-0.01em] text-black-50">
              {item.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
