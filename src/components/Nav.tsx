"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import Container from "./Container";
import logo from "../../public/images/shared/logo.svg";

const links = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "FAQ", href: "#faq" },
];

export default function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed inset-x-0 top-4 z-50 tablet:top-5">
      <Container>
        <div className="relative">
          <nav className="flex w-full items-center justify-between gap-3 rounded-full bg-white p-2 shadow-[0px_2px_2px_rgba(0,0,0,0.16)] tablet:p-2.5">
            <a
              href="#top"
              onClick={() => setOpen(false)}
              className="flex shrink-0 items-center px-2 tablet:px-3"
            >
              <Image src={logo} alt="Aimo" className="h-6 w-auto tablet:h-[27px]" priority />
            </a>

            <div className="hidden items-center gap-9 text-base leading-[1.5] text-black tablet:flex">
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

            {/* Desktop/tablet CTA — mobile gets a hamburger instead, CTA lives in the opened menu.
                Subtle top-to-bottom-lighter gradient + hairline border + glossy inset top-highlight per spec. */}
            <a
              href="#start-trading"
              className="hidden h-10 shrink-0 items-center rounded-full border border-[#1b1b1b] bg-gradient-to-t from-black-90 to-[#373737] px-4 text-base font-medium text-white shadow-[inset_0px_2px_1px_0px_rgba(255,255,255,0.2)] tablet:flex"
            >
              Start trading
            </a>

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-label={open ? "Close menu" : "Open menu"}
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#eee] transition-transform tablet:hidden hover:scale-[1.06]"
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
                className="absolute inset-x-0 top-[calc(100%+8px)] flex flex-col gap-5 rounded-[24px] bg-white p-5 shadow-[0px_2px_2px_rgba(0,0,0,0.16)] tablet:hidden"
              >
                {links.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="text-base leading-[1.5] text-black transition-opacity hover:opacity-60"
                  >
                    {link.label}
                  </a>
                ))}
                <a
                  href="#start-trading"
                  onClick={() => setOpen(false)}
                  className="flex h-10 shrink-0 items-center justify-center rounded-full bg-black-90 px-4 text-base text-white"
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
