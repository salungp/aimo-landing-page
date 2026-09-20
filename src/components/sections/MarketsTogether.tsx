"use client";

import Container from "../Container";
import InViewLoopVideo from "../InViewLoopVideo";
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
 * the copy stays on `Container`'s grid, independent of the card's own inset:
 * the same 490 / 50 / 460 split as OneBalance, off the same 1000px column.
 * Container's padding — 220px at desktop, 460px at wide — lands that column
 * exactly at the two design widths, but everywhere between them the padded
 * column is wider than the pair's fixed 1000px, so the row centres what is
 * left over instead of packing it against one edge. `row-reverse` packs
 * towards the right, which piled every spare pixel on the left: at a 1600px
 * window the scene sat 145px off-centre inside a full-bleed card, where it
 * showed (reported 2026-09-18). OneBalance and FAQ centre for the same
 * reason, packing left.
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
             * .mt-texture in globals.css — the design's chevrons, already black
             * at its 14.1%, as one flat picture rather than a live CSS mask over
             * a black layer (see that rule: the mask cost Firefox this section). */}
            <div
              aria-hidden
              className="absolute inset-y-0 right-3 left-3 -z-10 overflow-hidden rounded-[32px] bg-[linear-gradient(to_bottom,#A7F932_0%,#79C60C_50%,#4D7A0D_100%)] desktop:inset-y-3"
            >
              <div className="mt-texture absolute inset-0" />
            </div>

            <Container>
              {/* Copy first in the DOM so the heading leads on a phone and for
               * anything reading the page in order; `row-reverse` puts the scene
               * back on the left once the two sit side by side. */}
              <div className="flex flex-col items-start gap-12 px-3 tablet:px-0 desktop:flex-row-reverse desktop:items-center desktop:justify-center desktop:gap-[50px]">
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
                    {/* A pre-rendered video at every breakpoint, not the live
                     * Lottie. Both encodes come from assets/lottie/markets-together.json,
                     * which is now a build-time source only — nothing fetches it
                     * at runtime. It renders to ~2,080 SVG nodes behind 300 masks
                     * and 8 Gaussian blurs, and the SVG renderer re-rasterises
                     * all of it every frame. A phone visibly couldn't (reported
                     * 2026-09-17), and Safari can't either at any size: measured
                     * in WebKit at 1440x900, scrolling this section ran at 24fps
                     * with frames up to 137ms, against a clean 60fps with the
                     * same SVG merely `visibility: hidden` — so the cost is
                     * rasterising it, which no amount of cheaper JS would have
                     * touched (reported 2026-09-18).
                     *
                     * Two encodes because the plate is two very different sizes:
                     * 660px is 2x its ~329px mobile width, 980px is 2x the 490px
                     * it reaches from `tablet` up, so neither breakpoint pays for
                     * detail its screen can't show. See scripts/render-lottie.mjs
                     * and its `outW` / `CRF`; the desktop encode is CRF 21 rather
                     * than the phone's 27 because it's shown that much larger,
                     * and the two land at 957KB and 345KB against the JSON's
                     * 4.1MB. Checked frame for frame against the Lottie's own
                     * render at five points across the scene: 980px is PSNR
                     * 46.3-47.7dB / SSIM 0.9972-0.9980, 660px is PSNR
                     * 44.4-46.8dB / SSIM 0.9946-0.9972. The composition is fully
                     * opaque (checked against a magenta backdrop), so h264's
                     * yuv420p loses nothing, and its last frame matches its first
                     * to 63dB, so the loop needs no crossfade. */}
                    <div className="tablet:hidden">
                      <InViewLoopVideo
                        mp4="/video/markets-together-mobile.mp4"
                        poster="/video/markets-together-mobile-poster.webp"
                        width={660}
                        height={660}
                        // The scene fades up from an empty frame, so a
                        // reduced-motion visitor needs a real moment, not the
                        // first one. This scene runs a longer story than the one
                        // it replaced — portfolio, insight, amount, confirm,
                        // pending — and 10.83s is frame 650 of the 60fps source,
                        // where the insight is complete: what changed, why it
                        // matters, the suggestion and its portfolio impact, all
                        // on screen at once. (The previous export had that
                        // moment at frame 522.)
                        stillTime={10.83}
                        className="block h-auto w-full"
                      />
                    </div>

                    <div className="hidden tablet:block">
                      <InViewLoopVideo
                        mp4="/video/markets-together-desktop.mp4"
                        poster="/video/markets-together-desktop-poster.webp"
                        width={980}
                        height={980}
                        stillTime={10.83}
                        className="block h-auto w-full"
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
