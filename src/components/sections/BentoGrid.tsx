"use client";

import type { CSSProperties } from "react";
import Container from "../Container";
import BentoCard from "../bento/BentoCard";
import TransparencyArt from "../bento/TransparencyArt";
import MultichainSwapArt from "../bento/MultichainSwapArt";
import PerformanceArt from "../bento/PerformanceArt";
import IntelligenceArt from "../bento/IntelligenceArt";
import PredictionArt from "../bento/PredictionArt";
import GaslessArt from "../bento/GaslessArt";
import UnifiedBalanceArt from "../bento/UnifiedBalanceArt";
import PerpsArt from "../bento/PerpsArt";
import SpotArt from "../bento/SpotArt";

/**
 * Placement, in the two grid templates described in globals.css. Tablet is
 * two equal columns; desktop is the five-column template that expresses both
 * of the design's bands. Rows are 6px units and the spans include the gutter
 * below each card, so 31 is a 186px card and 56 is a 336px one.
 */
function place(
  tabletColumn: string,
  tabletRow: string,
  desktopColumn: string,
  desktopRow: string
): CSSProperties {
  return {
    "--t-col": tabletColumn,
    "--t-row": tabletRow,
    "--d-col": desktopColumn,
    "--d-row": desktopRow,
  } as CSSProperties;
}

/**
 * The feature bento (Figma 284:24040) — nine cards covering what AIMO does,
 * each one demonstrating its claim rather than captioning it.
 *
 * All nine cards of the frame are here. The duplicate headline the page used
 * to carry ("Your money deserves clarity." appeared on both this card and a
 * full-width card in Deep dive) was resolved on the Deep dive side; this
 * grid is the design.
 *
 * Every card is the design's own height, at every width. The illustrations
 * inside them are fixed-size compositions built against a fixed-size card, so
 * each one is handed a box of its design card's width, centred — at 1440 that
 * box is exactly the card and the render is 1:1 with Figma, and at any other
 * width the composition centres and clips instead of reflowing into numbers
 * nobody drew.
 */
export default function BentoGrid() {
  return (
    <section id="features" className="overflow-x-clip py-[60px] tablet:py-28 desktop:py-[120px]">
      <Container>
        <div className="bento-grid">
          <BentoCard
            index={0}
            label="Transparency"
            title="Your money deserves clarity."
            texture
            height={186}
            artTop={73}
            artWidth={271}
            style={place("1", "1 / span 31", "1", "1 / span 31")}
          >
            <TransparencyArt />
          </BentoCard>

          <BentoCard
            index={1}
            label="Multichain swap"
            title="Swap across chains, not around them."
            texture
            height={336}
            artTop={93}
            artWidth={271}
            style={place("1", "34 / span 56", "1", "34 / span 56")}
          >
            <MultichainSwapArt />
          </BentoCard>

          <BentoCard
            index={2}
            label="Performance"
            title="Know how it's performing."
            height={186}
            artTop={74}
            artWidth={434}
            style={place("2", "1 / span 31", "2 / span 3", "1 / span 31")}
          >
            <PerformanceArt />
          </BentoCard>

          <BentoCard
            index={3}
            label="Intelligence"
            title={
              <>
                Your portfolio,
                <br />
                with a smarter view.
              </>
            }
            variant="feature"
            texture
            height={336}
            artTop={103}
            artWidth={434}
            style={place("2", "34 / span 56", "2 / span 3", "34 / span 56")}
          >
            <IntelligenceArt />
          </BentoCard>

          <BentoCard
            index={4}
            label="Prediction"
            title="Trade what you think happens next."
            texture
            height={336}
            artTop={93}
            artWidth={272}
            artFillMobile
            style={place("1", "92 / span 56", "5", "1 / span 56")}
          >
            <PredictionArt />
          </BentoCard>

          <BentoCard
            index={5}
            label="Gasless"
            title="No gas token. No stuck trade."
            height={186}
            artTop={74}
            artWidth={271}
            style={place("2", "92 / span 31", "5", "59 / span 31")}
          >
            <GaslessArt />
          </BentoCard>

          <BentoCard
            index={6}
            label="Unified balance"
            title="Five wallets. One number."
            height={186}
            artTop={74}
            artWidth={325}
            artFillMobile
            style={place("1", "150 / span 31", "1 / span 2", "92 / span 31")}
          >
            <UnifiedBalanceArt />
          </BentoCard>

          <BentoCard
            index={7}
            label="Perps"
            title="Leverage, kept in its own lane."
            height={186}
            artTop={74}
            artWidth={326}
            style={place("2", "125 / span 31", "3", "92 / span 31")}
          >
            <PerpsArt />
          </BentoCard>

          <BentoCard
            index={8}
            label="Spot"
            title="Buy it. Hold it. It's yours."
            height={186}
            artTop={74}
            artWidth={325}
            style={place("2", "158 / span 31", "4 / span 2", "92 / span 31")}
          >
            <SpotArt />
          </BentoCard>
        </div>
      </Container>
    </section>
  );
}
