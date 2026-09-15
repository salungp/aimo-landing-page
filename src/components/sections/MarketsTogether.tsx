import Container from "../Container";
import InViewLottie from "../InViewLottie";
import InViewVideo from "../InViewVideo";
import TitleReveal from "../TitleReveal";

export default function MarketsTogether() {
  return (
    <section className="overflow-x-clip py-20 tablet:py-28 desktop:py-32">
      {/* Mobile: the portrait video, unchanged. Hidden from tablet up — a
          display:none element never intersects the viewport, so its file is
          never fetched there. */}
      <div className="tablet:hidden">
        <InViewVideo
          desktop={{
            mp4: "/video/markets-scroll-mobile.mp4",
            poster: "/video/markets-scroll-mobile-poster.jpg",
            width: 1080,
            height: 2334,
          }}
        />
      </div>

      {/* Tablet / desktop: the Lottie scene (Scene-4, 1948 × 1129). Hidden on
          mobile, where it's likewise never fetched. */}
      <div className="hidden tablet:block">
        <InViewLottie src="/lottie/markets-together-desktop-2.json" width={1948} height={1129} />
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
