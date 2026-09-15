import Container from "../Container";
import Reveal from "../Reveal";
import TitleReveal from "../TitleReveal";
import LoopVideo from "../LoopVideo";
import AsciiField from "../AsciiField";

// Built from 5.25s-9.29s of the source clip. That window is where the vortex
// comes back around closest to its own start — found by scoring every frame
// pair in the 20s source for pixel error, which also showed the footage has
// no periodicity at all: best-achievable error rises dead-linearly with loop
// length (~8.4 mse per second, against ~80 for a pair of unrelated frames).
// So seam quality and repeat interval trade off directly, and no trim can
// win both.
//
// They're decoupled here instead: seam quality is set by the *frame* gap,
// repeat interval by wall-clock duration. The 4s window is motion-
// interpolated to 48fps (ffmpeg `minterpolate`) and played back at half
// speed, giving an 8s interval off a 4s frame gap — the longer interval
// costs nothing at the seam. What's left is covered by crossfading the last
// second back into the first.
//
// Two dead ends worth not repeating: a tighter 2s window scores a better
// seam (mse 5.5) but reads as an obvious repeat, and upscaling the 720p
// master to 1080p just resamples the same detail while adding ringing on
// the bright swirl — this stays at the source's native resolution.
const HERO_BG_MP4 = "/video/hero-bg-loop.mp4";
const HERO_BG_WEBM = "/video/hero-bg-loop.webm";
const HERO_BG_POSTER = "/video/hero-bg-loop-poster.webp";

// Brand strip (Figma 225:4156). Heights are Figma's; mobile renders them at
// 80%. The SVGs ship with the design's 40% white baked in; Privy is a raster
// brandmark, so its 40% is applied here instead.
const brands: { name: string; src: string; w: number; h: number; opacity?: number }[] = [
  { name: "Polymarket", src: "/images/hero/polymarket.svg", w: 150, h: 28 },
  { name: "Hyperliquid", src: "/images/hero/hyperliquid.svg", w: 150, h: 27 },
  { name: "BNB Chain", src: "/images/hero/bnb-chain.svg", w: 148, h: 26 },
  { name: "Robinhood", src: "/images/hero/robinhood.svg", w: 136, h: 26 },
  { name: "Privy", src: "/images/hero/privy.png", w: 115, h: 26, opacity: 0.4 },
];

/** Both ends of the strip fade into the background (257px of Figma's 1000px row). */
const BRAND_FADE =
  "linear-gradient(to right, transparent, #000 25.7%, #000 74.3%, transparent)";

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
        {/* Static (no mouse parallax). The poster doubles as a painted
            fallback behind the video while it loads. */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${HERO_BG_POSTER})` }}
        >
          <LoopVideo
            webm={HERO_BG_WEBM}
            mp4={HERO_BG_MP4}
            poster={HERO_BG_POSTER}
            className="absolute inset-0 size-full object-cover"
          />
        </div>
        {/* Textmode layer over the video: drifting characters that send out
            ripples under the pointer and on click. Screen-blended, so it reads
            as light lifted off the footage rather than a flat overlay. */}
        <AsciiField className="pointer-events-none absolute inset-0" />

        {/* Overlay from Figma (213:2561): the page background colour fading
            in from fully transparent at the top to solid by 75.54% of the
            height, so the video/ascii layer stays clear up top and melts into
            the content below. Last child in this stack, so it paints over
            both the video and the ascii layer. */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(5,19,10,0)_0%,var(--background)_75.54%)]" />
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-1/2 bg-gradient-to-b from-transparent to-background" />

      <div className="flex flex-1 flex-col justify-end pt-32 pb-8 tablet:justify-center tablet:pt-56 tablet:pb-24">
        <Container>
          <div className="mx-auto flex max-w-[820px] flex-col items-center gap-8 text-center tablet:gap-10">
            <TitleReveal>
              <h1 className="text-[40px] font-semibold leading-[1.1] tracking-[-0.02em] text-white tablet:text-[46px] desktop:text-[56px]">
                <span className="block">One grip for</span>
                <span className="block">
                  <span className="text-primary">everything</span> you trade.
                </span>
              </h1>
            </TitleReveal>

            <TitleReveal delay={0.12}>
              <p className="max-w-[640px] text-base leading-[1.5] text-white/60 tablet:text-lg desktop:text-xl">
                Trade across spot, perps, predictions, and outcomes with
                dedicated wallets that stay connected in one place.
              </p>
            </TitleReveal>

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

      {/* Brand strip: the logo row scrolls in a seamless loop (see
          .brand-marquee in globals.css), fading out at both ends. The second
          copy of the row is decorative, so it's hidden from assistive tech. */}
      <Reveal from="up" delay={0.35} className="pt-16 pb-8 tablet:pt-0 tablet:pb-10">
        <div
          className="brand-marquee mx-auto w-full max-w-[1000px] overflow-hidden"
          style={{ maskImage: BRAND_FADE, WebkitMaskImage: BRAND_FADE }}
        >
          <div className="brand-marquee-track flex w-max">
            {[0, 1].map((copy) => (
              <ul
                key={copy}
                aria-hidden={copy === 1 ? true : undefined}
                aria-label={copy === 0 ? "Connected markets" : undefined}
                className="flex shrink-0 items-center gap-10 pr-10 tablet:gap-[70px] tablet:pr-[70px]"
              >
                {brands.map((brand) => (
                  <li key={brand.name} className="shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={brand.src}
                      alt={copy === 0 ? brand.name : ""}
                      width={brand.w}
                      height={brand.h}
                      draggable={false}
                      className="h-[calc(var(--h)*0.8)] w-auto tablet:h-[var(--h)]"
                      style={{ "--h": `${brand.h}px`, opacity: brand.opacity } as React.CSSProperties}
                    />
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
