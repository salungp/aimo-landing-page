"use client";

import Container from "../Container";
import Reveal from "../Reveal";
import TitleReveal from "../TitleReveal";
import WordReveal from "../WordReveal";
import LoopVideo from "../LoopVideo";
import AsciiField from "../AsciiField";
import BrandStrip from "../BrandStrip";

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
            <WordReveal>
              <h1 className="text-[40px] font-semibold leading-[1.1] tracking-[-0.02em] text-white tablet:text-[46px] desktop:text-[56px]">
                <span className="block">One app, all</span>
                <span className="block">
                  <span className="text-primary"> trades.</span>
                </span>
              </h1>
            </WordReveal>

            <TitleReveal delay={0.12}>
              <p className="max-w-[640px] text-base leading-[1.5] text-white/60 tablet:text-lg desktop:text-xl">
                Trade spots, perpetuals, predictions, and outcomes with dedicated wallets in one place.
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

      {/* Brand strip: the logo row drifts in a seamless loop and can also be
          dragged or swiped through (see BrandStrip), fading out at both ends. */}
      <Reveal from="up" delay={0.35} className="pt-16 pb-8 tablet:pt-0 tablet:pb-10">
        <BrandStrip />
      </Reveal>
    </section>
  );
}
