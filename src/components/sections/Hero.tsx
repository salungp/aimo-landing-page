import Container from "../Container";
import Reveal from "../Reveal";
import ParallaxVideo from "../ParallaxVideo";
import AsciiField from "../AsciiField";

// The hero background is hosted on ImageKit. The ?tr= transforms hand back a
// right-sized encode of the 2752x1536 master (~0.5MB each) rather than the
// 7.6MB original, and /ik-thumbnail.jpg pulls a still for the poster.
const HERO_BG = "https://ik.imagekit.io/pras09jeor/animation-result.mp4";
const heroBackground = {
  webm: `${HERO_BG}?tr=w-1920,f-webm`,
  mp4: `${HERO_BG}?tr=w-1920,f-mp4`,
  poster: `${HERO_BG}/ik-thumbnail.jpg?tr=so-2,w-1600`,
};

// Same fixed pixel heights at every breakpoint per Figma (mobile doesn't
// shrink these — it just wraps them onto more lines via flex-wrap).
const markets = [
  { name: "Polymarket", src: "/images/hero/polymarket.svg", h: "h-[28px]" },
  { name: "Hyperliquid", src: "/images/hero/hyperliquid.svg", h: "h-[27px]" },
  { name: "Solana", src: "/images/hero/solana.svg", h: "h-[23px]" },
  { name: "Bitcoin", src: "/images/hero/bitcoin.svg", h: "h-[23px]" },
];

export default function Hero() {
  return (
    <section
      id="top"
      className="relative isolate flex min-h-[100svh] flex-col overflow-hidden"
    >
      {/* Mobile: background covers only the top ~73% of the frame (620/852 in
          the design), not the full height — the rest is plain background
          color underneath the bottom-anchored content. Tablet+ it's full-bleed. */}
      <div className="absolute inset-x-0 top-0 -z-20 h-[73%] tablet:h-full">
        <ParallaxVideo
          webm={heroBackground.webm}
          mp4={heroBackground.mp4}
          poster={heroBackground.poster}
          fallbackImage={heroBackground.poster}
          strength={18}
        />
        {/* Textmode layer over the video: drifting characters that heat up
            under the pointer and ripple on click. Screen-blended, so it reads
            as light lifted off the footage rather than a flat overlay. */}
        <AsciiField className="pointer-events-none absolute inset-0" />

        {/* Same overlay treatment as the footer's — solid background colour
            fading to fully transparent — but flipped: the footer fades top
            (solid) to bottom (clear) into the section below it, so up here,
            where the solid colour needs to sit at the *bottom* (blending the
            video into the content underneath) fading to zero opacity at the
            top (keeping the video/ascii layer fully clear near the top of
            the frame), it's the same gradient turned upside down. Last child
            in this stack, so it paints over both the video and the ascii
            layer. */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background to-transparent" />
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-1/2 bg-gradient-to-b from-transparent to-background" />

      <div className="flex flex-1 flex-col justify-end pt-32 pb-8 tablet:justify-center tablet:pt-56 tablet:pb-24">
        <Container>
          <div className="mx-auto flex max-w-[820px] flex-col items-center gap-8 text-center tablet:gap-10">
            <Reveal from="up" delay={0}>
              <h1 className="text-[40px] font-semibold leading-[1.1] tracking-[-0.02em] text-white tablet:text-[46px] desktop:text-[56px]">
                <span className="block">One grip for</span>
                <span className="block">
                  <span className="text-primary">everything</span> you trade.
                </span>
              </h1>
            </Reveal>

            <Reveal from="up" delay={0.12}>
              <p className="max-w-[640px] text-base leading-[1.5] text-white/60 tablet:text-lg desktop:text-xl">
                Trade across spot, perps, predictions, and outcomes with
                dedicated wallets that stay connected in one place.
              </p>
            </Reveal>

            <Reveal from="up" delay={0.22}>
              <a
                href="#start-trading"
                className="rounded-full bg-gradient-to-b from-primary to-primary-dark px-6 py-2.5 text-base font-semibold text-ink transition-transform hover:scale-[1.03]"
              >
                Start trading
              </a>
            </Reveal>
          </div>
        </Container>
      </div>

      <Reveal from="up" delay={0.35} className="pt-16 pb-8 tablet:pt-0 tablet:pb-10">
        <Container>
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-4 tablet:gap-x-10">
            <p className="whitespace-nowrap text-sm text-black-30 tablet:text-base">
              Connected market
            </p>
            {markets.map((market) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={market.name}
                src={market.src}
                alt={market.name}
                className={`${market.h} w-auto opacity-50`}
              />
            ))}
          </div>
        </Container>
      </Reveal>
    </section>
  );
}
