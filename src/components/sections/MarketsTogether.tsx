import Container from "../Container";
import ScrollScrubVideo from "../ScrollScrubVideo";
import TitleReveal from "../TitleReveal";

export default function MarketsTogether() {
  return (
    // overflow-x-clip, not overflow-hidden: hidden would make the section a
    // scroll container and stop the video stage inside it from sticking.
    <section className="overflow-x-clip pb-20 tablet:pb-28 desktop:pb-32">
      <ScrollScrubVideo
        desktop={{
          mp4: "/video/markets-scroll-desktop.mp4",
          poster: "/video/markets-scroll-desktop-poster.jpg",
          width: 1862,
          height: 1080,
        }}
        mobile={{
          mp4: "/video/markets-scroll-mobile.mp4",
          poster: "/video/markets-scroll-mobile-poster.jpg",
          width: 1080,
          height: 2334,
        }}
      />

      <Container>
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
      </Container>
    </section>
  );
}
