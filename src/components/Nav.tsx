"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import Container from "./Container";
import logo from "../../public/images/shared/logo-primary.svg";

const links = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "FAQ", href: "#faq" },
];

// Figma's nav pill and the opened mobile menu share the same dark card
// surface (#171f1a) and edge treatment: a 20%-white hairline border plus a
// two-layer shadow — a 1px solid "shadow" the same colour as the fill
// (crisps up the edge over whatever sits behind it) and a soft drop shadow
// underneath. Both node specs (102:23267 and 145:749) use this exact pair.
const surfaceClass =
  "border border-white/20 bg-[#171f1a] shadow-[0px_0px_0px_1px_#171f1a,0px_2px_4px_0px_rgba(0,0,0,0.16)]";

// The CTA is a bright green gradient pill with dark text in both the
// desktop bar and the opened mobile menu (Figma nodes 206:961 / 206:983) —
// not the dark button this used to be.
const ctaClass =
  "flex h-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-primary to-primary-dark px-4 text-base font-medium tracking-[-0.02em] text-black-90";

export default function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed inset-x-0 top-4 z-50 tablet:top-5">
      <Container>
        <div className="relative">
          <nav className={`flex w-full items-center justify-between gap-3 rounded-full p-[10px] ${surfaceClass}`}>
            <a
              href="#top"
              onClick={() => setOpen(false)}
              className="flex shrink-0 items-center px-3"
            >
              <Image src={logo} alt="Aimo" className="h-5 w-auto tablet:h-[27px]" priority />
            </a>

            <div className="hidden items-center gap-9 text-base leading-[1.5] text-black-30 tablet:flex">
              {links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="shrink-0 transition-opacity hover:opacity-60"
                >
                  {link.label}
                </a>
              ))}
            </div>

            {/* Desktop/tablet CTA — mobile gets a hamburger instead, CTA lives in the opened menu. */}
            <a href="#start-trading" className={`hidden tablet:flex ${ctaClass}`}>
              Start trading
            </a>

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-label={open ? "Close menu" : "Open menu"}
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/10 transition-transform tablet:hidden hover:scale-[1.06]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={open ? "/images/shared/menu-close.svg" : "/images/shared/menu-open.svg"}
                alt=""
                className={open ? "size-5" : "size-4"}
              />
            </button>
          </nav>

          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`absolute inset-x-0 top-[calc(100%+8px)] flex flex-col gap-5 rounded-[24px] p-5 tablet:hidden ${surfaceClass}`}
              >
                {links.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="text-base leading-[1.5] text-black-30 transition-opacity hover:opacity-60"
                  >
                    {link.label}
                  </a>
                ))}
                <a
                  href="#start-trading"
                  onClick={() => setOpen(false)}
                  className={`w-fit px-4 ${ctaClass}`}
                >
                  Start trading
                </a>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Container>
    </div>
  );
}
