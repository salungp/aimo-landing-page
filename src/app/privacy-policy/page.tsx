import type { Metadata } from "next";
import clsx from "clsx";
import Container from "@/components/Container";
import Nav from "@/components/Nav";
import TitleReveal from "@/components/TitleReveal";
import Footer from "@/components/sections/Footer";
import PolicyContents from "@/components/legal/PolicyContents";
import {
  legalBodyClass,
  legalHeadingClass,
  legalTitleClass,
} from "@/components/legal/prose";

export const metadata: Metadata = {
  title: "Privacy Policy — AIMO",
  description:
    "What AIMO knows about you, where it comes from, what we do with it, and what you can ask us to do about it.",
};

const lastUpdated = "16 September 2026";

/** A paragraph, or a bulleted list of them. */
type Block = string | { list: string[] };

type Section = {
  /** Doubles as the anchor id and the contents entry's target. */
  id: string;
  /** Used for both the heading and its line in the contents list, so the two
   * can never drift apart. */
  label: string;
  body: Block[];
};

// Original copy, written against what AIMO actually does — accounts, the Main
// Wallet and its trading wallets, on-chain deposits and withdrawals, the
// identity checks those imply. Figma 238:31668 was filled with Phantom's terms
// (down to the headings, which were the terms page's headings repeated), so
// none of it survived. Same caveat as the terms page: this is not legal advice
// and needs a lawyer's pass, and the gaps left open there — operating entity,
// governing law, a real contact address — are open here too.
const sections: Section[] = [
  {
    id: "overview",
    label: "Overview",
    body: [
      "This policy explains what AIMO knows about you, where that information comes from, what we do with it, and what you can ask us to do about it. It covers our website, our apps, and everything you reach through them.",
      "Two things are worth saying before the detail. We try to hold as little as we can: if something is not needed to run the Service or to satisfy a rule we are bound by, we would rather not have it. And activity on a blockchain is public by design — once funds leave AIMO for a network, that record is outside our control. There is a section on what that means further down.",
    ],
  },
  {
    id: "information-you-give-us",
    label: "Information you give us",
    body: [
      "Some of this you hand over deliberately, when you set up an account and use it:",
      {
        list: [
          "Account details — the email address or sign-in method you register with, and a display name if you choose one.",
          "Identity details, where we need them — your name, date of birth, address, country, and a document that supports them. We ask for these to meet financial-crime and sanctions rules, and only when those rules apply to you.",
          "Wallet addresses you connect to AIMO, or withdraw funds to.",
          "Anything you send us directly — support messages, bug reports, survey answers, and whatever you attach to them.",
        ],
      },
      "You can decline any of it. Some of it, though, is the price of an account: without identity details where they are required, we cannot let you deposit or trade.",
    ],
  },
  {
    id: "information-we-collect",
    label: "Information we collect automatically",
    body: [
      "Using the Service produces information whether you type anything or not:",
      {
        list: [
          "Device and connection data — browser, operating system, screen size, language, and the IP address your request arrives from, which also tells us roughly where you are.",
          "Usage data — the screens you open, the features you use, and the errors the app runs into, with timestamps.",
          "Activity on AIMO — deposits, allocations between your wallets, trades, and withdrawals, along with the balances they produce.",
        ],
      },
      "The rough location is there for two unglamorous reasons: working out whether we are allowed to offer the Service where you are, and noticing when an account is suddenly being used from somewhere it never has been.",
    ],
  },
  {
    id: "information-from-others",
    label: "Information from other sources",
    body: [
      "A few things reach us second-hand:",
      {
        list: [
          "Identity and sanctions checks — the providers we use confirm or query the details you gave us, and tell us the result.",
          "Public blockchain data — an address you connect to AIMO carries its own visible history, and we read it.",
          "Market data — prices, order books, and settlement results come from the venues and data providers behind each market.",
          "Analytics and infrastructure — the services that host and measure the app report back on how it performed.",
        ],
      },
    ],
  },
  {
    id: "how-we-use-it",
    label: "How we use your information",
    body: [
      "To run your account: opening it, showing your balances, moving funds between your wallets, placing and settling trades, and processing deposits and withdrawals.",
      "To keep the Service safe and lawful: verifying who you are where the rules require it, screening against sanctions lists, spotting fraud, market manipulation, and account takeover, and keeping the records regulators expect us to keep.",
      "To fix and improve things: seeing which features are used and which are ignored, reproducing bugs from the errors the app reports, and testing changes before everyone gets them.",
      "To talk to you: answering support, and telling you about changes to the Service, to our terms, or to our fees. Product news is separate and only goes to people who ask for it — you can stop it at any time without losing the messages we have to send you about your account.",
      "We do not sell your information, and we do not hand it to anyone so they can advertise their own products to you.",
    ],
  },
  {
    id: "when-we-share",
    label: "When we share information",
    body: [
      "We share what is necessary, with people who need it to do a job for us or for you:",
      {
        list: [
          "Service providers — identity verification, hosting, analytics, error reporting, support tooling, and payment partners. They act on our instructions and cannot use your information for their own ends.",
          "Market and settlement partners — the venues that execute or settle what you trade need enough to do it.",
          "Authorities — where a law, a court, or a regulator requires it, or where we need to establish or defend a legal claim.",
          "A buyer or successor — if AIMO is ever acquired or merged, accounts move with the business, and this policy travels with them until it is replaced.",
        ],
      },
      "Some of those providers sit in other countries, which means your information does too. Where it moves somewhere with weaker protections than your own, we put contractual protections in place before it goes.",
    ],
  },
  {
    id: "on-chain",
    label: "What the blockchain makes public",
    body: [
      "Deposits and withdrawals are blockchain transactions. The address, the amount, the time, and the trail of addresses funds passed through are visible to anyone, permanently. Neither you nor we can edit or delete any of it.",
      "That record is not anonymous so much as pseudonymous. An address is not your name, but an address that has been linked to something identifying anywhere else can often be traced back to you. Keeping separate wallets inside AIMO does not change what a chain shows once funds have left it.",
      "None of this is under our control, so this policy cannot cover it. It is worth understanding before your first withdrawal rather than after.",
    ],
  },
  {
    id: "cookies",
    label: "Cookies and analytics",
    body: [
      "We use cookies and similar storage for the things the site cannot work without — keeping you signed in, remembering your preferences, protecting against abuse — and for analytics that tell us how the product is really used.",
      "Analytics here are measurement, not advertising: we read them in aggregate to decide what to build and what to fix. You can clear or block cookies in your browser, though blocking the essential ones will break parts of the Service.",
    ],
  },
  {
    id: "security",
    label: "Keeping your information safe",
    body: [
      "We encrypt data in transit and at rest, limit internal access to the people whose work requires it, log that access, and review it. We choose infrastructure providers partly on their own security record.",
      "No system is perfectly secure, and the weak point is usually a reused password or a convincing message rather than a server. Use a password you use nowhere else, turn on every extra factor we offer, and treat anyone asking for your recovery details as an attacker — we will never ask you for them.",
      "If a breach affects you, we will tell you and the relevant regulator as soon as we can establish what actually happened.",
    ],
  },
  {
    id: "how-long",
    label: "How long we keep it",
    body: [
      "Account and trading records stay while you have an account, and then for as long afterwards as financial rules require — typically several years, whatever we would prefer.",
      "Support conversations, analytics, and error logs have much shorter lives; we delete or de-identify them once they have done their job. Anything written to a blockchain is permanent, and outside this entirely.",
    ],
  },
  {
    id: "your-rights",
    label: "Your rights and choices",
    body: [
      "Depending on where you live, you can ask us to show you what we hold, correct it, delete it, limit what we do with it, hand it over in a portable form, or stop using it for a particular purpose. You can also withdraw consent you gave us, which does not undo what we did while it stood.",
      "Ask through the support channels in the app, and we will respond within the period the law where you live allows. We may need to confirm who you are first — an unverified deletion request is exactly what someone taking over an account would send.",
      "Some requests we cannot fully grant. Where a rule requires us to keep something, we will say so rather than quietly decline, and you are free to complain to your local data protection authority if you disagree.",
    ],
  },
  {
    id: "children",
    label: "Children",
    body: [
      "AIMO is not for anyone under 18, and we do not knowingly collect information about children. If we find that an account belongs to one, we will close it and delete what we hold beyond anything we are required to keep. If you believe a child has given us information, tell us and we will deal with it.",
    ],
  },
  {
    id: "changes",
    label: "Changes to this policy",
    body: [
      "We will update this policy as the product changes and as the rules around it do. The current version always lives here, with the date it was last updated at the top, and where a change materially affects you we will tell you in the app or by email before it takes effect rather than after.",
    ],
  },
  {
    id: "contact",
    label: "Getting in touch",
    body: [
      "Questions about this policy, or a request about your own information, go through the support channels in the app or the channels linked at the bottom of this page. If something here reads as unclear, that is worth telling us too — a privacy policy nobody can follow is not doing its job.",
    ],
  },
];

const contentsEntries = sections.map(({ id, label }) => ({ id, label }));

export default function PrivacyPolicyPage() {
  return (
    <>
      <Nav />

      {/* Same vertical frame as the terms page, so the two read as one pair. */}
      <main className="pt-28 pb-20 tablet:pt-32 tablet:pb-24 desktop:pt-[152px] desktop:pb-[108px]">
        <Container>
          {/* A grid rather than a row of columns, because the contents list
           * doesn't sit in the same place in both layouts: on desktop it is a
           * column beside the title and the body (Figma 238:34423 — 250px rail,
           * 36px gutter, 714px of text), and below desktop it is a bar between
           * the title and the body. Grid placement moves it without the title
           * or the body having to exist twice. */}
          <div className="grid grid-cols-1 gap-y-8 tablet:gap-y-10 desktop:grid-cols-[250px_1fr] desktop:gap-x-9 desktop:gap-y-[34px]">
            <TitleReveal className="desktop:col-start-2 desktop:row-start-1">
              <h1 className={legalTitleClass}>Privacy Policy</h1>
              <p className="mt-3 text-sm leading-[1.5] tracking-[-0.01em] text-black-50 tablet:text-base">
                Last updated {lastUpdated}
              </p>
            </TitleReveal>

            <PolicyContents entries={contentsEntries} />

            <div className="row-start-3 flex min-w-0 flex-col gap-8 desktop:col-start-2 desktop:row-start-2 desktop:gap-[34px]">
              {sections.map((section) => (
                // Deliberately not wrapped in a reveal, unlike the rest of the
                // site: every one of these is a jump target, and landing on a
                // section that then has to fade itself in is worse than one
                // that is simply already there.
                <section
                  key={section.id}
                  id={section.id}
                  className="legal-anchor flex flex-col gap-3"
                >
                  <h2 className={legalHeadingClass}>{section.label}</h2>
                  {section.body.map((block, i) =>
                    typeof block === "string" ? (
                      <p key={i} className={legalBodyClass}>
                        {block}
                      </p>
                    ) : (
                      <ul key={i} className="flex flex-col gap-2">
                        {block.list.map((item) => (
                          <li
                            key={item}
                            className={clsx(legalBodyClass, "relative pl-6")}
                          >
                            <span className="absolute top-[0.75em] left-1.5 size-1.5 -translate-y-1/2 rounded-full bg-primary" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    )
                  )}
                </section>
              ))}
            </div>
          </div>
        </Container>
      </main>

      <Footer />
    </>
  );
}
