import Container from "../Container";
import Reveal from "../Reveal";
import TitleReveal from "../TitleReveal";
import BalanceHub from "../one-balance/BalanceHub";

/**
 * Figma 244:1198 — copy on the left, the connected-wallets hub on the right.
 *
 * The desktop frame is 1440x900 with a 1000px column split 460 / 50 / 490, and
 * that is what runs from `desktop` up. There is no mobile or tablet frame, so
 * below that the two halves stack and the illustration keeps its square,
 * scaling to the column; the type steps down on the same scale the rest of the
 * site uses.
 */
export default function OneBalance() {
  return (
    <section className="relative isolate overflow-hidden py-20 tablet:py-28 desktop:py-[205px]">
      {/* The picture, at full strength; the blurred rounded-rect mask that
       * shapes and dims it is .ob-backdrop in globals.css, exported straight
       * from Figma. 112% wide because Figma draws the image 1612px across a
       * 1440px frame. Decoding stays off the critical path — nothing is laid
       * out against it, and at a tenth opacity nobody sees it arrive. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/one-balance/backdrop.webp"
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        className="ob-backdrop pointer-events-none absolute top-1/2 left-1/2 -z-10 h-full w-[112%] -translate-x-1/2 -translate-y-1/2 object-cover"
      />

      <Container>
        <div className="flex flex-col items-start gap-12 desktop:flex-row desktop:items-center desktop:gap-[50px]">
          <div className="flex flex-col gap-3 desktop:w-[460px] desktop:shrink-0">
            <TitleReveal>
              <p className="bg-gradient-to-b from-primary to-primary-dark bg-clip-text font-mono text-xs leading-[1.5] font-medium tracking-[0.04em] text-transparent uppercase tablet:text-[13px] desktop:text-sm">
                Unified Balance
              </p>
            </TitleReveal>

            <TitleReveal delay={0.05}>
              <h2 className="text-[32px] leading-[normal] font-semibold tracking-[-0.02em] text-white tablet:text-[40px] desktop:text-[48px]">
                <span className="block bg-gradient-to-b from-primary to-primary-dark bg-clip-text text-transparent">
                  One balance.
                </span>
                Everything onchain.
              </h2>
            </TitleReveal>

            <Reveal from="up" delay={0.1}>
              <p className="text-base leading-[1.5] tracking-normal text-black-50 tablet:text-lg desktop:text-[20px]">
                Keep your funds together in one unified balance and use them across
                Aimo&apos;s trading, prediction, and other experiences without constantly
                moving money between separate wallets.
              </p>
            </Reveal>
          </div>

          <Reveal from="up" delay={0.15} amount={0.2} className="w-full desktop:w-[490px] desktop:shrink-0">
            <BalanceHub className="mx-auto" />
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
