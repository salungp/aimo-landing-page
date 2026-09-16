import type { Metadata } from "next";
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
  title: "Terms of Service — AIMO",
  description:
    "The terms that apply when you use AIMO: your account, your wallets, trading risk, fees, and how we handle changes to the service.",
};

const lastUpdated = "16 September 2026";

type Section = {
  heading: string;
  body: string[];
};

// Written for AIMO's actual product surface — the Main Wallet plus the
// dedicated spot, perps, prediction and outcome wallets described in
// WalletCards, and the deposit → allocate → trade flow in HowItWorks — so the
// terms describe this app rather than a generic exchange. Still needs a
// lawyer's pass before launch: the operating entity's legal name, a
// governing-law clause and a real contact address are the known gaps, and
// nothing here should be treated as legal advice.
const sections: Section[] = [
  {
    heading: "Agreement to these Terms",
    body: [
      "These Terms of Service (the “Terms”) are an agreement between you and AIMO. They govern your access to and use of the AIMO website, our apps, and every trading feature you reach through them — together, the “Service”. By creating an AIMO account, connecting a wallet, or otherwise using the Service, you confirm that you have read these Terms and agree to be bound by them. If you do not agree with them, please do not use the Service.",
      "Our Privacy Policy explains what information we collect when you use AIMO and what we do with it. It forms part of these Terms, so read the two together.",
    ],
  },
  {
    heading: "Who can use AIMO",
    body: [
      "You need to be at least 18 years old and legally able to enter into a contract with us. You may not use the Service if you are located in, or a resident of, a country or region where we do not offer it, or if you are subject to sanctions that apply to us. We may ask you to verify your identity, your location, or the source of your funds at any point, and we may limit or close an account when we cannot complete those checks.",
      "Your account is yours alone. Do not open one on someone else’s behalf without their permission, and do not let anyone else trade through yours — activity from your account is treated as activity by you.",
    ],
  },
  {
    heading: "Your account and its security",
    body: [
      "Keeping your sign-in details, recovery methods, and any connected wallet credentials safe is your responsibility. Anyone holding them can move your funds, and we cannot recover a lost key or reverse a transaction that was properly signed from your account.",
      "Tell us as soon as you suspect someone else has access to your account or has used it without your permission. We may pause account activity while we look into it, and we may ask you to take steps to secure the account before it reopens.",
    ],
  },
  {
    heading: "Your wallets, deposits, and withdrawals",
    body: [
      "AIMO gives you a Main Wallet alongside dedicated wallets for spot, perps, prediction, and outcome markets. Deposits arrive in your Main Wallet, and you decide how to allocate them across the others. Transfers between your own AIMO wallets are instant and carry no fee from us.",
      "Blockchain transactions are final. Once a deposit or withdrawal has been broadcast to a network, we cannot cancel, reverse, or recall it — including where funds were sent to the wrong address or over the wrong network. Check the address, the network, and the amount before you confirm.",
      "Confirmation times, network congestion, upgrades, and outages sit outside our control and can delay a deposit or a withdrawal. We may also hold a withdrawal where we are required to by law or where we reasonably suspect fraud or market abuse.",
    ],
  },
  {
    heading: "Trading, and the risk that comes with it",
    body: [
      "Crypto markets move quickly and can move against you. Prices fall as sharply as they rise, liquidity can disappear when you most need it, and an asset can lose its value entirely. Only trade with funds you can afford to lose in full.",
      "Perpetual futures involve leverage, which magnifies losses just as it magnifies gains. A position can be liquidated in full, without warning, if the market moves against it or your margin falls below what the market requires. Prediction and outcome markets settle to a single result: if the outcome you backed does not happen, the funds you committed to that market are gone.",
      "Holding funds in separate wallets limits how far one market’s losses can reach into another, which is exactly what those wallets are for. It does not reduce the risk of any individual trade, and it is not a guarantee against loss.",
    ],
  },
  {
    heading: "We do not give you advice",
    body: [
      "Nothing in the Service is financial, investment, legal, or tax advice, and nothing in it is a recommendation to make any particular trade. Prices, charts, market data, and performance figures are there to support your own research — they may be delayed, incomplete, or wrong, and they come in part from third parties we do not control.",
      "Every decision you make on AIMO is yours. So are the results, and so is any tax you owe on them.",
    ],
  },
  {
    heading: "Fees",
    body: [
      "We show the fees that apply to a trade before you confirm it. Trading fees vary by market. Withdrawals and on-chain transfers also carry the network’s own fee, which goes to the network rather than to us, and which changes with network conditions.",
      "We may change our fees as the product develops. When we do, the new fees will be visible in the app before they apply to anything you do.",
    ],
  },
  {
    heading: "Services we rely on",
    body: [
      "Parts of AIMO depend on systems we do not run: blockchains and their validators, liquidity venues, market data providers, payment and custody partners, and any wallet software you connect. Your use of those services is also subject to their own terms and privacy policies.",
      "An outage, a fork, a chain reorganisation, or an error on their side can affect what you are able to do on AIMO and what you see there. We are not responsible for how third parties behave, but we will tell you what we know when something goes wrong.",
    ],
  },
  {
    heading: "How you may use the Service",
    body: [
      "Use AIMO honestly and lawfully. In particular, do not use it for money laundering, sanctions evasion, or any other unlawful purpose; do not manipulate a market, wash trade, or place trades intended to distort a price or an outcome; do not use bots, scrapers, or automation that interfere with the Service or with other people using it; do not probe or attack our systems, or try to reach parts of them you were not given access to; and do not copy, resell, or reverse-engineer the Service.",
      "We may suspend or close accounts used this way, and we may report activity to the authorities where we are required to.",
    ],
  },
  {
    heading: "Availability and changes to the Service",
    body: [
      "AIMO is still being built. Features will be added, changed, and sometimes removed, and markets may open or close as our coverage changes. We may also take the Service down for maintenance, or restrict it in a particular region, and occasionally we will have to do that without notice.",
      "We do not promise that the Service will be available without interruption, or that it will always be free of faults.",
    ],
  },
  {
    heading: "Changes to these Terms",
    body: [
      "We may update these Terms as the product and the rules around it change. The current version always lives on this page, with the date it was last updated at the top. Where a change materially affects you, we will tell you in the app or by email before it takes effect.",
      "Continuing to use AIMO after an update means you accept the updated Terms. If you would rather not, close your positions, withdraw your funds, and stop using the Service.",
    ],
  },
  {
    heading: "Closing your account",
    body: [
      "You can close your AIMO account whenever you like, once your positions are settled and your funds withdrawn.",
      "We may suspend or close an account where the law requires it, where we reasonably suspect fraud, market abuse, or a breach of these Terms, or where we can no longer offer the Service in your location. Wherever we are able to, we will give you notice and a reasonable opportunity to withdraw what is yours.",
    ],
  },
  {
    heading: "Our content, and yours",
    body: [
      "The AIMO name, logo, interface, and the material we publish belong to us. These Terms let you use the Service as it is intended to be used — they do not give you a licence to anything beyond that.",
      "Anything you send us stays yours, including feedback. By sending it, you allow us to use it to operate and improve the Service, without owing you anything for it.",
    ],
  },
  {
    heading: "Liability",
    body: [
      "The Service is provided as it is, without warranties of any kind. To the fullest extent the law allows, we are not liable for trading losses, liquidations, missed opportunities, or losses caused by network failures, third-party outages, incorrect market data, or the loss of your own credentials.",
      "Nothing in these Terms limits liability that cannot be limited by law, including liability for fraud.",
    ],
  },
  {
    heading: "Getting in touch",
    body: [
      "If something here is unclear, or you want to raise a problem with your account, reach us through the support channels in the app or through any of the channels linked at the bottom of this page. We would rather sort a problem out early than read about it later.",
    ],
  },
];

export default function TermsOfServicePage() {
  return (
    <>
      <Nav />

      {/* Top padding clears the fixed nav with roughly the gap Figma leaves at
       * each breakpoint (238:26108 puts the title 70px below the desktop nav);
       * the bottom padding is the 108px Figma leaves before the footer. */}
      <main className="pt-28 pb-20 tablet:pt-32 tablet:pb-24 desktop:pt-[152px] desktop:pb-[108px]">
        <Container>
          <TitleReveal>
            <h1 className={legalTitleClass}>Terms of service</h1>
            <p className="mt-3 text-sm leading-[1.5] tracking-[-0.01em] text-black-50 tablet:text-base">
              Last updated {lastUpdated}
            </p>
          </TitleReveal>

          <div className="mt-8 flex flex-col gap-8 tablet:mt-10 desktop:mt-[34px] desktop:gap-[34px]">
            {sections.map((section) => (
              // `once` on purpose: a long read scrolls back and forth, and
              // re-hiding paragraphs the reader has already seen is the one
              // place this site's reveal would actively get in the way. The
              // small `amount` lets a tall block start as soon as its top
              // edge is comfortably in view rather than a quarter of the way
              // up the screen.
              <Reveal key={section.heading} from="up" once amount={0.12}>
                <section className="flex flex-col gap-3">
                  <h2 className={legalHeadingClass}>{section.heading}</h2>
                  {section.body.map((paragraph, i) => (
                    <p key={i} className={legalBodyClass}>
                      {paragraph}
                    </p>
                  ))}
                </section>
              </Reveal>
            ))}
          </div>
        </Container>
      </main>

      <Footer />
    </>
  );
}
