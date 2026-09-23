import type { Metadata } from "next";
import Image from "next/image";
import Container from "@/components/Container";
import Nav from "@/components/Nav";
import Reveal from "@/components/Reveal";
import TitleReveal from "@/components/TitleReveal";
import Footer from "@/components/sections/Footer";
import {
  legalBodyClass,
  legalHeadingClass,
  legalTitleClass,
} from "@/components/legal/prose";

export const metadata: Metadata = {
  title: "About — AIMO",
  description:
    "AIMO is operated by AIMO Technologies Limited, Sheung Wan, Hong Kong.",
};

// The company details Apple checks against the D-U-N-S record during
// developer enrollment — the legal name has to match that record exactly.
const details = [
  { label: "Legal name", value: "AIMO Technologies Limited", icon: "/images/about/building.svg" },
  { label: "Address", value: "Sheung Wan, Hong Kong", icon: "/images/about/location.svg" },
  {
    label: "Contact",
    value: "admin@aimo.xyz",
    href: "mailto:admin@aimo.xyz",
    icon: "/images/about/mail.svg",
  },
];

export default function AboutPage() {
  return (
    <>
      <Nav />

      {/* Same frame as the terms and privacy pages. overflow-x-clip because
       * the glass logo's blur canvas reaches past the column (and, on a
       * phone, past the viewport); clip, not hidden, so no scroll box. */}
      <main className="overflow-x-clip pt-28 pb-20 tablet:pt-32 tablet:pb-24 desktop:pt-[152px] desktop:pb-[108px]">
        <Container>
          <TitleReveal>
            <h1 className={legalTitleClass}>About</h1>
          </TitleReveal>

          {/* Figma 304:2899: copy and company details in the left 500px,
           * the glass logo in the right 500px, both top-aligned. Below 1024
           * the columns stack with the logo first, so the page still opens
           * on the picture rather than a wall of text. */}
          <div className="mt-8 flex flex-col gap-10 tablet:mt-10 min-[1024px]:flex-row min-[1024px]:items-start min-[1024px]:gap-0 desktop:mt-[34px]">
            <div className="flex flex-col gap-6 min-[1024px]:flex-1 tablet:gap-8 desktop:gap-[34px]">
              <Reveal from="up" once amount={0.12}>
                <p className={legalBodyClass}>
                  AIMO is one app for everything you trade. Spot, perpetuals,
                  prediction markets and outcome markets sit side by side, each
                  with its own dedicated wallet, all funded from a single Main
                  Wallet so you can move between markets without juggling
                  exchanges, logins or balances.
                </p>
              </Reveal>
              <Reveal from="up" once amount={0.12}>
                <p className={legalBodyClass}>
                  Our vision is to make trading across every market as simple as
                  holding one account. Today, taking a view on a price, a
                  leveraged position and a real-world outcome means three
                  platforms and three sets of risk to keep track of. We&rsquo;re
                  building the place where all of it lives together clearly
                  separated, instantly movable, and easy to see at a glance.
                </p>
              </Reveal>
              <Reveal from="up" once amount={0.12}>
                <p className={legalBodyClass}>
                  AIMO is developed and operated by AIMO Technologies Limited.
                </p>
              </Reveal>

              <Reveal from="up" once amount={0.12}>
                <section className="flex flex-col gap-5 desktop:gap-6">
                  <h2 className={legalHeadingClass}>Company information</h2>
                  <dl className="flex flex-col gap-4 tablet:gap-3">
                    {details.map((item) => (
                      <div key={item.label} className="flex flex-col gap-1 tablet:flex-row tablet:gap-3">
                        <dt className={`${legalBodyClass} tablet:w-[148px] tablet:shrink-0`}>
                          {item.label}:
                        </dt>
                        <dd className={`${legalBodyClass} flex items-center gap-2.5 text-white`}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={item.icon} alt="" className="size-6 shrink-0 desktop:size-7" />
                          {item.href ? (
                            <a
                              href={item.href}
                              className="text-primary underline transition-opacity hover:opacity-60"
                            >
                              {item.value}
                            </a>
                          ) : (
                            item.value
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
              </Reveal>
            </div>

            <Reveal
              from="up"
              once
              amount={0.12}
              delay={0.1}
              className="order-first w-full max-w-[500px] self-center min-[1024px]:order-none min-[1024px]:flex-1 min-[1024px]:self-start"
            >
              {/* The design's 500x435 "Background" frame. Everything inside is
               * in percentages of it, so the composition scales as one piece.
               * The glass itself sits right of centre in it (roughly 38%-114%
               * across, past the frame's own right edge), which the desktop
               * page margin absorbs. Stacked, there is no margin to absorb it,
               * so the frame shifts left by the glass's offset from centre
               * (76% - 50%) to put the logo in the middle of the screen. */}
              <div className="relative aspect-[500/434.938] -translate-x-[26%] min-[1024px]:translate-x-0">
                {/* Mask canvas: 780x715, 140px outside the frame on each side
                 * (see .about-glass). overflow-hidden only trims pixels the
                 * mask has already taken to ~0. */}
                <div className="about-glass pointer-events-none absolute top-[-32.189%] left-[-28%] h-[164.377%] w-[156%] overflow-hidden">
                  {/* The picture: 840x840, at (-170.5, -182.1) from the frame. */}
                  <Image
                    src="/images/about/glass-logo.webp"
                    alt=""
                    width={1254}
                    height={1254}
                    // Served byte-for-byte as supplied: no optimizer re-encode.
                    unoptimized
                    priority
                    className="absolute top-[-5.890%] left-[-3.914%] aspect-square h-auto w-[107.719%] max-w-none"
                  />
                </div>
              </div>
            </Reveal>
          </div>
        </Container>
      </main>

      <Footer />
    </>
  );
}
