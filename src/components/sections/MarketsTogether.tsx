"use client";

import Container from "../Container";
import InViewLoopVideo from "../InViewLoopVideo";
import InViewLottie from "../InViewLottie";
import Reveal from "../Reveal";
import TitleReveal from "../TitleReveal";
import WordReveal from "../WordReveal";

/**
 * Figma 258:10911 — the section inverts: instead of light type on the dark
 * page, a bright green card is inset 12px into it and everything on top is
 * near-black. The illustration keeps the left, the copy the right.
 *
 * The design's own inset is 20px (its card is 860 in a 900 frame); this build
 * uses a tighter 12px gutter instead, so the pinned card runs a few pixels
 * taller than the design's own ratio — a deliberate departure, not a miss.
 *
 * From `desktop` the card is a full viewport tall (less 12px top and bottom)
 * and pins there for half a screen of extra scrolling before moving on.
 *
 * The card is a background layer rather than a wrapper around the content, so
 * the copy stays on `Container`'s grid and lines up with every other section.
 * Container's own padding — 220px at desktop, 460px at wide — is what lands
 * the design's illustration and text columns, independent of the card's own
 * inset: the same 490 / 50 / 460 split as OneBalance, off the same 1000px
 * column.
 *
 * There is no mobile or tablet frame for this design, and below `desktop` the
 * two halves stack: the copy alone is most of a phone screen, so a pinned
 * viewport there would leave the scene a few hundred pixels tall. Below that
 * breakpoint the section keeps its natural height and does not pin, and the
 * content takes an extra 12px inside the card on the smallest screens — the
 * same 12px the card keeps outside itself — where Container's own gutter
 * would otherwise put the text flush against its edge.
 */
export default function MarketsTogether() {
  return (
    // overflow-x-clip, not hidden: `hidden` on an ancestor silently kills
    // position: sticky below.
    <section className="overflow-x-clip">
      {/* The track is half a screen taller than the pin, and that difference is
       * exactly how long the card holds before it scrolls away. */}
      <div className="relative desktop:h-[150svh]">
        <div className="desktop:sticky desktop:top-0">
          <div className="relative isolate flex items-center py-20 tablet:py-28 desktop:h-svh desktop:py-0">
            {/* The card. Vertical gradient sampled off the design's render: it
             * starts on the brand green and turns over at the halfway mark,
             * which a two-stop ramp does not reproduce. The texture over it is
             * .mt-texture in globals.css — black at the design's 14.1%, shaped
             * by the exported mask. */}
            <div
              aria-hidden
              className="absolute inset-y-0 right-3 left-3 -z-10 overflow-hidden rounded-[32px] bg-[linear-gradient(to_bottom,#A7F932_0%,#79C60C_50%,#4D7A0D_100%)] desktop:inset-y-3"
            >
              <div className="mt-texture absolute inset-0 bg-black opacity-[0.141]" />
            </div>

            <Container>
              {/* Copy first in the DOM so the heading leads on a phone and for
               * anything reading the page in order; `row-reverse` puts the scene
               * back on the left once the two sit side by side. */}
              <div className="flex flex-col items-start gap-12 px-3 tablet:px-0 desktop:flex-row-reverse desktop:items-center desktop:gap-[50px]">
                <div className="flex flex-col gap-3 desktop:w-[460px] desktop:shrink-0">
                  <TitleReveal>
                    <p className="font-mono text-xs leading-[1.5] font-medium tracking-[0.04em] text-ink uppercase tablet:text-[13px] desktop:text-sm">
                      AI Insights
                    </p>
                  </TitleReveal>

                  <WordReveal delay={0.05}>
                    <h2 className="text-[32px] leading-[normal] font-semibold tracking-[-0.02em] text-ink tablet:text-[40px] desktop:text-[48px]">
                      <span className="block">AI that notices.</span>
                      And acts with you.
                    </h2>
                  </WordReveal>

                  <Reveal from="up" delay={0.1}>
                    <p className="text-base leading-[1.5] tracking-normal text-ink tablet:text-lg desktop:text-[20px]">
                      Aimo watches every wallet and position you hold. When your
                      exposure drifts, it tells you what shifted, why it matters,
                      and what to do about it then runs the trade the moment you
                      confirm, without ever leaving the app.
                    </p>
                  </Reveal>
                </div>

                <Reveal from="up" delay={0.15} amount={0.2} className="w-full desktop:w-[490px] desktop:shrink-0">
                  {/* The design's plate for the illustration: a 490px square, 32px
                   * radius, its own dark gradient and the hairline top highlight
                   * the OneBalance hub carries. Figma also gives it
                   * backdrop-blur-22, which is left off — nothing shows through an
                   * opaque scene, and it would be a real per-frame cost while the
                   * page scrolls.
                   *
                   * Once the card is pinned to the viewport the square has to fit
                   * inside it, so from desktop it also gives up whatever a short
                   * window cannot spare while keeping 165px clear above and below
                   * — the design's own margin. The cap only bites under ~820px of
                   * viewport; at the design's 900 it stays 490. */}
                  <div className="mx-auto w-full max-w-[490px] overflow-hidden rounded-[32px] bg-[linear-gradient(to_bottom,#2C3D13_0%,#4F7C0E_100%)] shadow-[inset_0px_2px_4px_1px_rgba(255,255,255,0.06)] desktop:max-w-[min(490px,calc(100svh-330px))]">
                    {/* Below `tablet`: a pre-rendered video, not the live Lottie.
                     * The scene is 6MB of JSON and ~300 embedded images; the SVG
                     * renderer re-rasterises every layer — several behind blur
                     * filters — on every frame, which desktop/tablet hardware
                     * shrugs off but a phone visibly can't (reported laggy on
                     * request 2026-09-17). Rendered at 660px, 2x the plate's own
                     * ~329px mobile width, so nothing here outruns a phone screen's
                     * own resolution; see scripts/render-lottie.mjs's `outW`. */}
                    <div className="tablet:hidden">
                      <InViewLoopVideo
                        mp4="/video/markets-together-mobile.mp4"
                        poster="/video/markets-together-mobile-poster.webp"
                        width={660}
                        height={660}
                        // Same reasoning as the Lottie's stillFrame below — the
                        // scene fades up from an empty frame, so a reduced-motion
                        // visitor needs a real moment, not the first one.
                        stillTime={8.7}
                        className="block h-auto w-full"
                      />
                    </div>

                    {/* `tablet` and up: the scene itself, played straight from the
                     * source Lottie — no video conversion. Desktop/tablet hardware
                     * has no trouble with the same file's cost: see InViewLottie
                     * for the SVG-renderer and only-load-when-near tradeoffs that
                     * make that affordable there. */}
                    <div className="hidden tablet:block">
                      <InViewLottie
                        src="/lottie/markets-together.json"
                        width={1130}
                        height={1129}
                        fill
                        // The scene fades up from an empty frame, so the component's
                        // own default still (an early, arbitrary frame) would leave
                        // a reduced-motion visitor looking at nothing. Frame 522 is
                        // the insight itself: what changed, why it matters, and the
                        // suggestion, all on screen at once — the same moment the
                        // video version parked on.
                        stillFrame={522}
                      />
                    </div>
                  </div>
                </Reveal>
              </div>
            </Container>
          </div>
        </div>
      </div>
    </section>
  );
}
