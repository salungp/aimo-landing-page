import Image from "next/image";
import Container from "../Container";
import HalftoneField from "../HalftoneField";
import Reveal from "../Reveal";
import logo from "../../../public/images/shared/logo-primary.svg";

// Icons are stored as components (not pre-built JSX elements) and given an
// explicit gradientId at render time — this section renders SocialRow twice
// (a mobile-only block and a tablet/desktop-only one, see FooterContent), and
// the two instances turned out to land on identical useId() output, since
// they're structurally symmetric render positions. An explicit id sidesteps
// that entirely instead of relying on an assumption about useId's scoping.
const socials = [
  { label: "Instagram", href: "#", Icon: InstagramIcon, key: "ig" },
  { label: "X (Twitter)", href: "#", Icon: TwitterIcon, key: "x" },
  { label: "Discord", href: "#", Icon: DiscordIcon, key: "dc" },
  { label: "YouTube", href: "#", Icon: YoutubeIcon, key: "yt" },
];

export default function Footer() {
  return (
    <footer className="relative isolate overflow-hidden">
      {/* Canvas recreation of Figma's "halftone-field" video loop — see
       * HalftoneField for why: no video fetch/decode for the life of the
       * page, and it's resolution-independent instead of a fixed 1920x1080
       * source stretched to fit whatever the footer's actual size is. */}
      <HalftoneField className="pointer-events-none absolute inset-0 -z-10 size-full" />

      {/* Figma's "Overlay" — fades the dot field from solid background colour
       * at the top down to almost fully transparent by the bottom, so the
       * FAQ section above doesn't end on a hard seam against the pattern.
       * Sits in the same -z-10 background layer as HalftoneField (painted
       * after it, so it washes over the dots) — everything below, the CTA
       * banner and footer content, is normal-flow content stacked above
       * both and is untouched by it. */}
      <div className="pointer-events-none absolute inset-0 -z-10 size-full bg-gradient-to-b from-[#05130a] to-[rgba(5,19,10,0.1)]" />

      <Container className="flex flex-col gap-16 pt-20 pb-10 tablet:gap-20 tablet:pt-28 tablet:pb-12 desktop:gap-[50px] desktop:pt-20 desktop:pb-[50px]">
        <Reveal from="up">
          <CtaBanner />
        </Reveal>

        <Reveal from="up" delay={0.1}>
          <FooterContent />
        </Reveal>
      </Container>
    </footer>
  );
}

function CtaBanner() {
  return (
    <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-b from-primary to-[#63931d] tablet:h-[300px] desktop:h-[348px]">
      {/* Low-poly mesh texture — exact export from Figma, not recreated.
       * Full-bleed and dimmed on mobile (nothing to share the card with),
       * confined to the right side matching Figma from tablet up. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/footer/cta-texture.webp"
        alt=""
        className="pointer-events-none absolute inset-0 size-full object-cover opacity-50 tablet:top-0 tablet:right-0 tablet:left-auto tablet:h-full tablet:w-[61%] tablet:opacity-100"
      />

      {/* Phone mockup — hidden below tablet: at mobile widths there isn't
       * room beside it for the headline without wrapping into a wall of
       * text, so it moves below the copy in its own block instead (see the
       * mobile-only layout further down). Reveal's own transform (Framer
       * Motion) and the -translate-y-1/2 centering (Tailwind's native
       * `translate` property) are separate CSS properties, so the slide-up
       * animation and the constant vertical centering compose without
       * fighting each other. */}
      <Reveal
        from="up"
        distance={48}
        duration={0.8}
        className="pointer-events-none absolute top-1/2 left-[57%] hidden aspect-square w-[40%] -translate-y-1/2 tablet:block"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/footer/phone-mockup.webp"
          alt="The Aimo app open to a portfolio view, held in a hand"
          className="size-full object-cover"
        />
      </Reveal>

      {/* Mobile layout (187:56483): copy+button stack with their own 24px
       * gap, then the phone sits flush underneath at full content width —
       * Figma has zero gap here and sizes the phone to exactly match the
       * text column's width, not a smaller centred thumbnail. */}
      <div className="relative z-10 flex flex-col px-6 pt-6 tablet:hidden">
        <div className="flex flex-col gap-6">
          <CtaCopy />
          <CtaButton />
        </div>
        <Reveal from="up" distance={32} duration={0.7} className="aspect-square w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/footer/phone-mockup.webp"
            alt="The Aimo app open to a portfolio view, held in a hand"
            className="size-full object-cover"
          />
        </Reveal>
      </div>

      {/* Tablet/desktop layout: copy and button pinned to the padded left
       * edge, width capped so it never runs into the phone. */}
      <div className="relative z-10 hidden h-full max-w-[58%] flex-col justify-between gap-8 p-8 tablet:flex desktop:p-[30px]">
        <CtaCopy />
        <CtaButton />
      </div>
    </div>
  );
}

function CtaCopy() {
  return (
    <div className="flex flex-col gap-1.5">
      <h2 className="text-[36px] leading-[1.1] font-semibold tracking-[-0.02em] text-ink tablet:text-[40px] desktop:text-[48px]">
        Everything you trade.
        <br />
        One place to hold it.
      </h2>
      <p className="text-sm leading-[1.5] tracking-[-0.01em] text-ink/70">
        Multiple markets. Connected wallets. One Aimo.
      </p>
    </div>
  );
}

function CtaButton() {
  return (
    <a
      href="#start-trading"
      className="inline-flex w-fit items-center gap-2.5 rounded-full bg-ink px-6 py-2.5 text-base font-medium text-white transition-colors duration-200 hover:bg-[#333333]"
    >
      Start trading
      <ArrowIcon />
    </a>
  );
}

function FooterContent() {
  return (
    <div className="flex flex-col gap-[25px]">
      {/* Mobile (187:56483): logo/tagline, socials, and the legal links all
       * stack in one column, legal links grouped up here rather than down
       * with the copyright. Tablet/desktop (183:45651) splits differently —
       * logo/tagline and socials sit side by side, and the legal links move
       * down to share a row with the copyright instead — so this is two
       * separate blocks rather than one responsive one. */}
      <div className="flex flex-col gap-10 tablet:hidden">
        <div className="flex flex-col items-start gap-5">
          <div className="flex flex-col items-start gap-[25px]">
            <Image src={logo} alt="Aimo" className="h-[27px] w-auto" />
            <p className="text-sm leading-[1.5] tracking-[-0.01em] text-white">
              Everything you trade. One place to hold it.
            </p>
          </div>
          <SocialRow variant="mobile" />
          <LegalLinks />
        </div>
        <div className="h-px w-full bg-white/10" />
      </div>

      <div className="hidden flex-col gap-16 tablet:flex desktop:gap-[100px]">
        <div className="flex items-start justify-between">
          <div className="flex flex-col items-start gap-[25px]">
            <Image src={logo} alt="Aimo" className="h-[27px] w-auto" />
            <p className="text-sm leading-[1.5] tracking-[-0.01em] text-white">
              Everything you trade. One place to hold it.
            </p>
          </div>
          <SocialRow variant="desktop" />
        </div>
        <div className="h-px w-full bg-white/10" />
      </div>

      <div className="flex items-center justify-between text-sm leading-[1.5] tracking-[-0.01em] text-white">
        <p>© 2026 AIMO. All rights reserved.</p>
        <LegalLinks className="hidden tablet:flex" />
      </div>
    </div>
  );
}

function SocialRow({ variant }: { variant: "mobile" | "desktop" }) {
  return (
    <div className="flex items-center gap-3">
      {socials.map((social) => (
        <a
          key={social.label}
          href={social.href}
          aria-label={social.label}
          className="flex size-9 items-center justify-center rounded-full border border-white/[0.16] bg-[#171f1a] shadow-[inset_0_2px_2px_rgba(0,0,0,0.12),0_4px_12px_rgba(17,17,17,0.06)] transition-colors duration-200 hover:bg-[#1f2a22]"
        >
          <social.Icon gradientId={`social-${variant}-${social.key}`} />
        </a>
      ))}
    </div>
  );
}

function LegalLinks({ className = "flex" }: { className?: string }) {
  return (
    <div className={`items-center gap-9 ${className}`}>
      <a href="#" className="transition-opacity hover:opacity-60">
        Terms of Usage
      </a>
      <a href="#" className="transition-opacity hover:opacity-60">
        Privacy policy
      </a>
    </div>
  );
}

function ArrowIcon() {
  return (
    <svg className="size-5" viewBox="0 0 20 20" fill="none">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3 10C3 9.80109 3.07902 9.61032 3.21967 9.46967C3.36032 9.32902 3.55109 9.25 3.75 9.25H14.388L10.23 5.29C10.1557 5.22256 10.0956 5.14089 10.0534 5.04982C10.0112 4.95875 9.98771 4.86013 9.98432 4.75982C9.98093 4.6595 9.99771 4.55952 10.0337 4.46581C10.0696 4.3721 10.124 4.28656 10.1937 4.21426C10.2633 4.14196 10.3467 4.08437 10.439 4.0449C10.5313 4.00543 10.6306 3.98489 10.7309 3.9845C10.8313 3.9841 10.9307 4.00385 11.0233 4.04259C11.1159 4.08132 11.1998 4.13825 11.27 4.21L16.77 9.46C16.8426 9.52996 16.9003 9.61384 16.9398 9.70662C16.9792 9.7994 16.9995 9.89918 16.9995 10C16.9995 10.1008 16.9792 10.2006 16.9398 10.2934C16.9003 10.3862 16.8426 10.47 16.77 10.54L11.27 15.79C11.1998 15.8617 11.1159 15.9187 11.0233 15.9574C10.9307 15.9961 10.8313 16.0159 10.7309 16.0155C10.6306 16.0151 10.5313 15.9946 10.439 15.9551C10.3467 15.9156 10.2633 15.858 10.1937 15.7857C10.124 15.7134 10.0696 15.6279 10.0337 15.5342C9.99771 15.4405 9.98093 15.3405 9.98432 15.2402C9.98771 15.1399 10.0112 15.0413 10.0534 14.9502C10.0956 14.8591 10.1557 14.7774 10.23 14.71L14.388 10.75H3.75C3.55109 10.75 3.36032 10.671 3.21967 10.5303C3.07902 10.3897 3 10.1989 3 10Z"
        fill="white"
      />
    </svg>
  );
}

function InstagramIcon({ gradientId }: { gradientId: string }) {
  return (
    <svg className="size-5" viewBox="0 0 20 20" fill="none">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6.22083 0.888333C7.19833 0.843333 7.51 0.833333 10 0.833333C12.49 0.833333 12.8017 0.844167 13.7783 0.888333C14.755 0.9325 15.4217 1.08833 16.005 1.31417C16.6158 1.545 17.17 1.90583 17.6283 2.3725C18.095 2.83 18.455 3.38333 18.685 3.995C18.9117 4.57833 19.0667 5.245 19.1117 6.22C19.1567 7.19917 19.1667 7.51083 19.1667 10C19.1667 12.4892 19.1558 12.8017 19.1117 13.7792C19.0675 14.7542 18.9117 15.4208 18.685 16.0042C18.4549 16.6159 18.0943 17.1701 17.6283 17.6283C17.17 18.095 16.6158 18.455 16.005 18.685C15.4217 18.9117 14.755 19.0667 13.78 19.1117C12.8017 19.1567 12.49 19.1667 10 19.1667C7.51 19.1667 7.19833 19.1558 6.22083 19.1117C5.24583 19.0675 4.57917 18.9117 3.99583 18.685C3.38414 18.4549 2.8299 18.0943 2.37167 17.6283C1.90548 17.1704 1.54462 16.6165 1.31417 16.005C1.08833 15.4217 0.933333 14.755 0.888333 13.78C0.843333 12.8008 0.833333 12.4892 0.833333 10C0.833333 7.51083 0.844167 7.19833 0.888333 6.22167C0.9325 5.245 1.08833 4.57833 1.31417 3.995C1.54486 3.38345 1.90602 2.8295 2.3725 2.37167C2.83017 1.90558 3.38382 1.54473 3.995 1.31417C4.57833 1.08833 5.24583 0.933333 6.22083 0.888333ZM13.7033 2.53833C12.7367 2.49417 12.4467 2.485 9.99917 2.485C7.55167 2.485 7.26167 2.49417 6.295 2.53833C5.40083 2.57917 4.91583 2.72833 4.5925 2.85417C4.165 3.02083 3.85917 3.21833 3.53833 3.53917C3.23394 3.83483 2.99984 4.19508 2.85333 4.59333C2.7275 4.91667 2.57833 5.40167 2.5375 6.29583C2.49333 7.2625 2.48417 7.5525 2.48417 10C2.48417 12.4475 2.49333 12.7375 2.5375 13.7042C2.57833 14.5983 2.7275 15.0833 2.85333 15.4067C3 15.8042 3.23417 16.165 3.53833 16.4608C3.83417 16.765 4.195 16.9992 4.5925 17.1458C4.91583 17.2717 5.40083 17.4208 6.295 17.4617C7.26167 17.5058 7.55083 17.515 9.99917 17.515C12.4475 17.515 12.7367 17.5058 13.7033 17.4617C14.5975 17.4208 15.0825 17.2717 15.4058 17.1458C15.8333 16.9792 16.1392 16.7817 16.46 16.4608C16.7642 16.165 16.9983 15.8042 17.145 15.4067C17.2708 15.0833 17.42 14.5983 17.4608 13.7042C17.505 12.7375 17.5142 12.4475 17.5142 10C17.5142 7.5525 17.505 7.2625 17.4608 6.29583C17.42 5.40167 17.2708 4.91667 17.145 4.59333C16.9783 4.16583 16.7808 3.86 16.46 3.53917C16.1643 3.23477 15.8041 3.00068 15.4058 2.85417C15.0825 2.72833 14.5975 2.57917 13.7033 2.53833ZM8.82833 12.8258C9.48222 13.098 10.2103 13.1348 10.8883 12.9298C11.5662 12.7248 12.152 12.2908 12.5455 11.7019C12.939 11.113 13.1159 10.4057 13.0459 9.70092C12.9759 8.99612 12.6633 8.33748 12.1617 7.8375C11.8419 7.5179 11.4552 7.27318 11.0294 7.12096C10.6037 6.96874 10.1495 6.9128 9.69958 6.95718C9.24964 7.00156 8.81513 7.14515 8.42734 7.37761C8.03955 7.61007 7.70812 7.92562 7.45692 8.30154C7.20572 8.67747 7.04099 9.10441 6.9746 9.55163C6.9082 9.99886 6.94179 10.4552 7.07295 10.8879C7.20411 11.3206 7.42957 11.7188 7.7331 12.0539C8.03663 12.389 8.41069 12.6527 8.82833 12.8258ZM6.66833 6.66833C7.10585 6.23081 7.62527 5.88375 8.19692 5.64697C8.76856 5.41018 9.38125 5.28831 10 5.28831C10.6187 5.28831 11.2314 5.41018 11.8031 5.64697C12.3747 5.88375 12.8941 6.23081 13.3317 6.66833C13.7692 7.10585 14.1162 7.62527 14.353 8.19692C14.5898 8.76856 14.7117 9.38125 14.7117 10C14.7117 10.6187 14.5898 11.2314 14.353 11.8031C14.1162 12.3747 13.7692 12.8941 13.3317 13.3317C12.4481 14.2153 11.2496 14.7117 10 14.7117C8.75038 14.7117 7.55195 14.2153 6.66833 13.3317C5.78472 12.4481 5.28831 11.2496 5.28831 10C5.28831 8.75038 5.78472 7.55195 6.66833 6.66833ZM15.7567 5.99C15.8651 5.88772 15.9519 5.76473 16.0119 5.62831C16.072 5.49189 16.104 5.34481 16.1062 5.19578C16.1084 5.04674 16.0806 4.89879 16.0246 4.76068C15.9685 4.62256 15.8854 4.49709 15.78 4.3917C15.6746 4.28631 15.5491 4.20313 15.411 4.1471C15.2729 4.09107 15.1249 4.06331 14.9759 4.06549C14.8269 4.06766 14.6798 4.09971 14.5434 4.15975C14.4069 4.21978 14.2839 4.30658 14.1817 4.415C13.9828 4.62586 13.8739 4.90593 13.8781 5.19578C13.8823 5.48562 13.9993 5.7624 14.2043 5.96737C14.4093 6.17234 14.6861 6.28936 14.9759 6.29358C15.2657 6.29781 15.5458 6.18891 15.7567 5.99Z"
        fill={`url(#${gradientId})`}
      />
      <defs>
        <linearGradient id={gradientId} x1="10" y1="0.833" x2="10" y2="19.167" gradientUnits="userSpaceOnUse">
          <stop stopColor="#A7F932" />
          <stop offset="1" stopColor="#8FEE07" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function TwitterIcon({ gradientId }: { gradientId: string }) {
  return (
    <svg className="size-5" viewBox="0 0 20 20" fill="none">
      <path
        d="M11.5463 8.755L17.5962 1.87375H16.1625L10.9088 7.85L6.71375 1.875H1.875L8.21875 10.91L1.875 18.1237H3.30875L8.855 11.815L13.2862 18.1237H18.125L11.5463 8.755ZM9.5825 10.9888L8.94 10.0888L3.825 2.93H6.0275L10.155 8.7075L10.7975 9.6075L16.1625 17.1163H13.9612L9.5825 10.9888Z"
        fill={`url(#${gradientId})`}
      />
      <defs>
        <linearGradient id={gradientId} x1="10" y1="1.874" x2="10" y2="18.124" gradientUnits="userSpaceOnUse">
          <stop stopColor="#A7F932" />
          <stop offset="1" stopColor="#8FEE07" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function DiscordIcon({ gradientId }: { gradientId: string }) {
  return (
    <svg className="size-5" viewBox="0 0 20 20" fill="none">
      <path
        d="M16.9308 3.74333C15.6558 3.16833 14.2892 2.74333 12.86 2.50167C12.8473 2.49922 12.8341 2.5008 12.8223 2.50617C12.8105 2.51155 12.8007 2.52046 12.7942 2.53167C12.6192 2.83917 12.4242 3.24 12.2875 3.55667C10.7717 3.33062 9.23079 3.33062 7.715 3.55667C7.56336 3.20545 7.39169 2.86322 7.20083 2.53167C7.19413 2.52055 7.18433 2.51164 7.17264 2.50601C7.16095 2.50039 7.14786 2.4983 7.135 2.5C5.70667 2.74167 4.34 3.16667 3.06417 3.7425C3.05379 3.74803 3.0447 3.7557 3.0375 3.765C0.444167 7.5775 -0.266667 11.2958 0.0825 14.9675C0.0834716 14.9765 0.0862629 14.9852 0.0907041 14.9931C0.0951453 15.001 0.101143 15.0078 0.108333 15.0133C1.62175 16.1158 3.3101 16.9553 5.1025 17.4967C5.11501 17.5003 5.1283 17.5002 5.14074 17.4963C5.15318 17.4925 5.16422 17.4851 5.1725 17.475C5.55762 16.9589 5.89934 16.4117 6.19417 15.8392C6.19825 15.8313 6.2006 15.8227 6.20107 15.8139C6.20153 15.8051 6.2001 15.7963 6.19686 15.788C6.19362 15.7798 6.18865 15.7724 6.18229 15.7663C6.17593 15.7601 6.16833 15.7554 6.16 15.7525C5.6214 15.5504 5.09975 15.3058 4.6 15.0208C4.59101 15.0157 4.58344 15.0084 4.57796 14.9996C4.57249 14.9909 4.56927 14.9809 4.56861 14.9705C4.56795 14.9602 4.56986 14.9499 4.57418 14.9405C4.57849 14.9311 4.58507 14.9229 4.59333 14.9167C4.69889 14.8389 4.80222 14.7592 4.90333 14.6775C4.91253 14.6706 4.92335 14.6663 4.93474 14.6648C4.94613 14.6633 4.9577 14.6648 4.96833 14.6692C8.24083 16.1392 11.785 16.1392 15.0192 14.6692C15.0298 14.6646 15.0415 14.6628 15.0531 14.6642C15.0646 14.6655 15.0756 14.6698 15.085 14.6767C15.185 14.7589 15.2883 14.8389 15.395 14.9167C15.4033 14.9228 15.41 14.9308 15.4145 14.9402C15.4189 14.9495 15.421 14.9598 15.4205 14.9701C15.42 14.9804 15.417 14.9905 15.4116 14.9993C15.4063 15.0082 15.3989 15.0156 15.39 15.0208C14.8928 15.3069 14.3725 15.5506 13.8292 15.7517C13.8208 15.7547 13.8132 15.7595 13.8068 15.7657C13.8005 15.7719 13.7955 15.7794 13.7923 15.7877C13.789 15.796 13.7876 15.8048 13.7881 15.8137C13.7886 15.8226 13.7909 15.8313 13.795 15.8392C14.095 16.4117 14.4383 16.9567 14.8158 17.4742C14.8239 17.4845 14.8349 17.4922 14.8473 17.4964C14.8598 17.5006 14.8732 17.5009 14.8858 17.4975C16.6809 16.9566 18.3719 16.1168 19.8875 15.0133C19.8947 15.008 19.9008 15.0013 19.9054 14.9936C19.91 14.9858 19.913 14.9772 19.9142 14.9683C20.3308 10.7233 19.2158 7.035 16.9567 3.76667C16.9511 3.75605 16.942 3.74777 16.9308 3.74333ZM6.68333 12.7317C5.69833 12.7317 4.88583 11.8408 4.88583 10.7483C4.88583 9.655 5.6825 8.765 6.68333 8.765C7.69167 8.765 8.49667 9.6625 8.48083 10.7483C8.48083 11.8417 7.68417 12.7317 6.68333 12.7317ZM13.3292 12.7317C12.3433 12.7317 11.5317 11.8408 11.5317 10.7483C11.5317 9.655 12.3275 8.765 13.3292 8.765C14.3375 8.765 15.1425 9.6625 15.1267 10.7483C15.1267 11.8417 14.3383 12.7317 13.3292 12.7317Z"
        fill={`url(#${gradientId})`}
      />
      <defs>
        <linearGradient id={gradientId} x1="10" y1="2.499" x2="10" y2="17.5" gradientUnits="userSpaceOnUse">
          <stop stopColor="#A7F932" />
          <stop offset="1" stopColor="#8FEE07" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function YoutubeIcon({ gradientId }: { gradientId: string }) {
  return (
    <svg className="size-5" viewBox="0 0 20 20" fill="none">
      <g transform="translate(0, 3.33)">
        <path
          d="M19.5839 2.0931C19.4701 1.68936 19.2496 1.32376 18.9455 1.03477C18.6324 0.737273 18.2487 0.524466 17.8305 0.416436C16.2655 0.00393637 9.99553 0.00393647 9.99553 0.00393647C7.38166 -0.0250182 4.76845 0.105781 2.17053 0.395603C1.75236 0.511614 1.36934 0.729175 1.05553 1.02894C0.747201 1.3256 0.523868 1.69144 0.407201 2.09227C0.126495 3.60199 -0.00967638 5.13504 0.000534247 6.6706C-0.00946575 8.20477 0.126368 9.73727 0.407201 11.2489C0.521368 11.6481 0.743868 12.0123 1.05303 12.3064C1.3622 12.6006 1.7472 12.8131 2.17053 12.9256C3.75637 13.3373 9.99553 13.3373 9.99553 13.3373C12.6127 13.3666 15.2293 13.2358 17.8305 12.9456C18.2487 12.8376 18.6324 12.6248 18.9455 12.3273C19.2493 12.0382 19.4695 11.6726 19.583 11.2689C19.8705 9.75972 20.0103 8.22609 20.0005 6.68977C20.022 5.14694 19.8824 3.60692 19.5839 2.0931ZM8.0022 9.52394V3.8181L13.2189 6.67144L8.0022 9.52394Z"
          fill={`url(#${gradientId})`}
        />
      </g>
      <defs>
        <linearGradient id={gradientId} x1="10" y1="0" x2="10" y2="13.341" gradientUnits="userSpaceOnUse">
          <stop stopColor="#A7F932" />
          <stop offset="1" stopColor="#8FEE07" />
        </linearGradient>
      </defs>
    </svg>
  );
}
