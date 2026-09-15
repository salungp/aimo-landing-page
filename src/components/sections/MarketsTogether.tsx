import Container from "../Container";
import InViewLottie from "../InViewLottie";
import TitleReveal from "../TitleReveal";

export default function MarketsTogether() {
  return (
    // Sticky: the media pins to the centre of the screen when the section
    // arrives and holds for about half a screen of extra scrolling, then
    // moves on. The pinned stage centres it with room above and below, so the
    // section needs no padding of its own. overflow-x-clip (not hidden) keeps
    // sticky working.
    <section className="overflow-x-clip">
      <div className="relative h-[150vh]">
      <div className="sticky top-0 flex h-svh items-center justify-center">
      {/* Mobile: the portrait Lottie scene (Scene-6, 574 × 1241). Hidden from
          tablet up — a display:none element never intersects the viewport, so
          its file is never fetched there. */}
      <div className="w-full tablet:hidden">
        <InViewLottie src="/lottie/markets-together-mobile-2.json" width={574} height={1241} />
      </div>

      {/* Tablet / desktop: the Lottie scene (Scene-4, 1948 × 1129). Hidden on
          mobile, where it's likewise never fetched. */}
      <div className="hidden w-full tablet:block">
        <InViewLottie src="/lottie/markets-together-desktop.json" width={1948} height={1129} />
      </div>
      </div>
      </div>

      {/* <Container>
        <div className="mx-auto mt-4 flex max-w-[720px] flex-col items-center gap-3 text-center tablet:mt-0">
          <TitleReveal>
            <h2 className="text-[32px] font-semibold leading-[1.15] tracking-[-0.02em] text-white tablet:text-[40px] desktop:text-[48px]">
              Your markets shouldn&apos;t live in{" "}
              <span className="bg-gradient-to-b from-primary to-primary-dark bg-clip-text text-transparent">
                separate worlds.
              </span>
            </h2>
          </TitleReveal>
          <TitleReveal delay={0.12}>
            <p className="text-base leading-[1.5] text-black-40 tablet:text-lg desktop:text-xl">
              AIMO brings your trading experience together, so you can move,
              trade and track everything without constantly switching between
              platforms.
            </p>
          </TitleReveal>
        </div>
      </Container> */}
    </section>
  );
}
