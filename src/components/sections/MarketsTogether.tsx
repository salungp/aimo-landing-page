import Container from "../Container";
import Reveal from "../Reveal";
import MarketsAnimation from "../markets-animation/MarketsAnimation";

export default function MarketsTogether() {
  return (
    <section className="overflow-hidden py-20 tablet:py-28 desktop:py-32">
      <Reveal from="none" duration={1} amount={0.15}>
        <div className="relative mx-auto aspect-[2200/888] w-full max-w-[1100px]">
          <MarketsAnimation className="size-full" />
        </div>
      </Reveal>

      <Container>
        <Reveal from="up" delay={0.1}>
          <div className="mx-auto mt-4 flex max-w-[720px] flex-col items-center gap-3 text-center tablet:mt-0">
            <h2 className="text-[32px] font-semibold leading-[1.15] tracking-[-0.02em] text-white tablet:text-[40px] desktop:text-[48px]">
              Your markets shouldn&apos;t live in{" "}
              <span className="bg-gradient-to-b from-primary to-primary-dark bg-clip-text text-transparent">
                separate worlds.
              </span>
            </h2>
            <p className="text-base leading-[1.5] text-black-40 tablet:text-lg desktop:text-xl">
              Aimo brings your trading experience together, so you can move,
              trade and track everything without constantly switching between
              platforms.
            </p>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
