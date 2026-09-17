"use client";

import Container from "../Container";
import Reveal from "../Reveal";
import TitleReveal from "../TitleReveal";
import WordReveal from "../WordReveal";

type Step = {
  number: string;
  title: string;
  body: string;
};

const steps: Step[] = [
  {
    number: "01",
    title: "Sign up",
    body: "Create your AIMO account.",
  },
  {
    number: "02",
    title: "Fund your main wallet",
    body: "Deposit into your main wallet.",
  },
  {
    number: "03",
    title: "Move where you trade",
    body: "Move funds to the wallet.",
  },
  {
    number: "04",
    title: "Make your move",
    body: "Move funds to the wallet.",
  },
];

/**
 * Figma 258:13608 — the section moves onto its own card, the same move as
 * OneBalance and MarketsTogether: a 12px page inset (this design's own
 * number, distinct from the other two) around a rounded card, `.hiw-card` in
 * globals.css for the radial glow. Unlike those two sections nothing here
 * inverts — the type stays white/primary on the card, same as it was
 * directly on the page.
 *
 * Content still runs through `Container`, so it keeps the same 220px/460px
 * columns as every other section rather than the design's own 196px offset
 * from the card's own edge (208px absolute) — the same simplification made
 * for MarketsTogether, so the grid lines up section to section rather than
 * card to card.
 *
 * From `desktop` the card itself is a full viewport tall (less the 12px
 * inset) and pins there for half a screen of extra scrolling before moving
 * on — the same 150svh-track/sticky-pin mechanism as MarketsTogether. The
 * card fills that full height (`desktop:h-full` inside an `h-svh` wrapper)
 * rather than hugging its own content and leaving page background showing
 * above and below it; its content is then centred *inside* it
 * (`desktop:flex desktop:flex-col desktop:justify-center`), the same
 * relationship OneBalance's and MarketsTogether's cards have to their
 * content. The card's own vertical padding drops to 0 at desktop so
 * centring is the only thing setting the content's position — otherwise the
 * two would fight.
 */
export default function HowItWorks() {
  return (
    // overflow-x-clip, not hidden: `hidden` on an ancestor silently kills
    // position: sticky below.
    <section id="how-it-works" className="overflow-x-clip">
      {/* The track is half a screen taller than the pin, and that difference is
       * exactly how long the card holds before it scrolls away. */}
      <div className="relative desktop:h-[150svh]">
        <div className="desktop:sticky desktop:top-0">
          <div className="p-3 desktop:h-svh">
            <div className="hiw-card overflow-hidden rounded-[36px] desktop:flex desktop:h-full desktop:flex-col desktop:justify-center">
              <div className="py-20 tablet:py-28 desktop:py-0">
                <Container>
                  <div className="flex flex-col gap-3">
                    <TitleReveal>
                      <p className="font-mono text-xs leading-[1.5] font-medium tracking-[0.04em] text-white uppercase tablet:text-[13px] desktop:text-sm">
                        How it works
                      </p>
                    </TitleReveal>

                    <WordReveal delay={0.05}>
                      <h2 className="max-w-[560px] text-[32px] leading-[normal] font-semibold tracking-[-0.02em] text-white tablet:max-w-none tablet:text-[40px] desktop:text-[48px]">
                        Start with{" "}
                        <span className="bg-gradient-to-b from-primary to-primary-dark bg-clip-text text-transparent">
                          one wallet.
                        </span>{" "}
                        Grow into every market.
                      </h2>
                    </WordReveal>
                  </div>

                  <div className="mt-10 grid grid-cols-1 gap-3 tablet:mt-14 tablet:grid-cols-2 desktop:mt-[50px] desktop:grid-cols-4">
                    {steps.map((step, i) => (
                      <Reveal key={step.number} from="up" delay={i * 0.08}>
                        <StepCard step={step} />
                      </Reveal>
                    ))}
                  </div>
                </Container>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StepCard({ step }: { step: Step }) {
  return (
    <div className="relative flex h-[220px] flex-col justify-between overflow-hidden rounded-[24px] bg-[#1f291e] px-4 py-5 tablet:h-[240px] desktop:h-[280px]">
      <p className="relative text-[48px] leading-none font-bold tracking-[-0.01em] text-white/10">
        {step.number}
      </p>

      <div className="relative flex flex-col gap-1.5">
        <p className="text-lg leading-[normal] font-semibold tracking-[-0.01em] text-white">
          {step.title}
        </p>
        <p className="text-sm leading-[1.5] tracking-[-0.01em] text-black-50">
          {step.body}
        </p>
      </div>

      <div className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_4px_1px_rgba(255,255,255,0.06)]" />
    </div>
  );
}
