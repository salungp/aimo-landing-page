"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { getLenis } from "../SmoothScroll";

export type ContentsEntry = {
  /** Matches the `id` on the section it points at. */
  id: string;
  label: string;
};

// Slack on the line that decides which section is current. A click scrolls a
// section to exactly the line, but fractional layout positions and the
// browser's own rounding can leave it a pixel or two short, which without this
// leaves the list pointing at the section above the one you just asked for.
// Far smaller than the gap between two sections, so it can't reach past one.
const ACTIVE_SLACK = 8;

// Figma's "Table" card (238:34424): 6px of padding around a 20px title row and
// the list of pills. Its surface and gradient stroke are .contents-card in
// globals.css — the stroke is a top-to-bottom fade that a border colour can't
// express, so it needs the layered-background trick documented there.
const cardClass = "contents-card flex flex-col gap-1.5 rounded-[20px] p-1.5";

/**
 * The contents list for a legal page, and the thing that keeps it in step with
 * the reader: whichever section has crossed the line just under the nav is the
 * current one.
 *
 * Figma only draws the 1440 frame, where this is a sticky sidebar. Below that
 * width there isn't room beside a readable column for a 250px rail, so the same
 * list becomes a bar that sticks under the nav and opens downward — collapsed,
 * it still names the section you're in, so the tracking is visible without
 * opening anything.
 *
 * Both halves carry their own placement in the page's grid, because they don't
 * sit in the same place in reading order: the sidebar is a column beside the
 * title and the body, while the bar belongs between them, under a title that
 * should still be the first thing on the page.
 */
export default function PolicyContents({ entries }: { entries: ContentsEntry[] }) {
  const [activeId, setActiveId] = useState(entries[0]?.id ?? "");
  const [open, setOpen] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  // Document-space top of every section, plus the offset line that decides
  // which one is current. Both are cached: they only change when the page
  // relayouts, and reading them inside the scroll handler would force a layout
  // on every frame of every scroll.
  const tops = useRef<number[]>([]);
  const anchorOffset = useRef(140);

  const measure = useCallback(() => {
    anchorOffset.current =
      parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue(
          "--legal-anchor-offset"
        )
      ) || 140;

    tops.current = entries.map(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return Number.POSITIVE_INFINITY;

      // Summing offsetTop rather than using getBoundingClientRect: offsetTop is
      // untouched by transforms on ancestors, so a section sitting inside
      // something mid-reveal still measures where it will finally rest, and it
      // needs no scroll position to be meaningful.
      let top = 0;
      let node: HTMLElement | null = el;
      while (node) {
        top += node.offsetTop;
        node = node.offsetParent as HTMLElement | null;
      }
      return top;
    });
  }, [entries]);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;

      const line = window.scrollY + anchorOffset.current + ACTIVE_SLACK;
      const atBottom =
        window.scrollY + window.innerHeight >=
        document.documentElement.scrollHeight - 2;

      let next = 0;
      if (atBottom) {
        // A last section shorter than the gap to the line would otherwise never
        // become current, however far you scroll.
        next = entries.length - 1;
      } else {
        for (let i = 0; i < tops.current.length; i += 1) {
          if (tops.current[i] <= line) next = i;
        }
      }

      const entry = entries[next];
      if (entry) setActiveId(entry.id);
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    measure();
    update();

    window.addEventListener("scroll", onScroll, { passive: true });

    // Section tops move whenever the text rewraps, which a resize event alone
    // misses — a scrollbar appearing, the web font swapping in, the mobile
    // list opening above the content.
    const observer = new ResizeObserver(() => {
      measure();
      onScroll();
    });
    observer.observe(document.body);

    return () => {
      window.removeEventListener("scroll", onScroll);
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [entries, measure]);

  // Dismiss the mobile list the way a menu should: Escape, or a press anywhere
  // outside it. Selecting an entry closes it in `goTo`.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!barRef.current?.contains(event.target as Node)) setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  const goTo = useCallback(
    (event: ReactMouseEvent<HTMLAnchorElement>, id: string) => {
      const el = document.getElementById(id);
      if (!el) return;

      // Let a modified click open the anchor in a new tab as normal.
      if (event.metaKey || event.ctrlKey || event.shiftKey) return;

      event.preventDefault();
      setOpen(false);
      setActiveId(id);
      // Keeps the URL shareable without the browser also doing its own instant
      // jump on top of the smooth one.
      history.replaceState(null, "", `#${id}`);

      // Neither branch passes an offset: both Lenis and a native scroll read
      // `scroll-margin-top` off the target, which .legal-anchor sets from the
      // same custom property the active-section line uses. Passing one here
      // would be applied on top of it, landing short by that much again.
      const lenis = getLenis();
      if (lenis) {
        lenis.scrollTo(el);
      } else {
        // No Lenis under reduced motion.
        el.scrollIntoView();
      }
    },
    []
  );

  const activeLabel =
    entries.find((entry) => entry.id === activeId)?.label ?? entries[0]?.label;

  return (
    <>
      {/* Sidebar — 250px rail from Figma 238:34424, sticky at the same offset
       * an anchored section stops at, so a clicked entry lands level with it. */}
      <aside className="hidden desktop:col-start-1 desktop:row-span-2 desktop:row-start-1 desktop:block">
        <div
          data-lenis-prevent
          className={clsx(
            cardClass,
            "sticky top-[var(--legal-anchor-offset)] max-h-[calc(100vh-var(--legal-anchor-offset)-40px)] overflow-y-auto"
          )}
        >
          <p className="px-3 py-2 text-[20px] leading-[normal] font-semibold tracking-[-0.02em] text-white">
            Content
          </p>
          <List entries={entries} activeId={activeId} onSelect={goTo} />
        </div>
      </aside>

      {/* Below desktop: the same list as a sticky bar. `top` clears the nav at
       * each width; the anchor offset in globals.css then clears this bar. */}
      <div
        ref={barRef}
        className="sticky top-[76px] z-30 row-start-2 tablet:top-[88px] desktop:hidden"
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-center gap-3 rounded-full border border-white/20 bg-[#171f1a] px-4 py-3 text-left shadow-[0px_2px_4px_0px_rgba(0,0,0,0.16)]"
        >
          <span className="shrink-0 text-sm leading-[normal] tracking-[-0.02em] text-black-30">
            Content
          </span>
          <span className="min-w-0 flex-1 truncate text-sm leading-[normal] tracking-[-0.02em] text-primary">
            {activeLabel}
          </span>
          <ChevronIcon open={open} />
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              data-lenis-prevent
              className={clsx(
                cardClass,
                "absolute inset-x-0 top-[calc(100%+8px)] max-h-[60vh] overflow-y-auto"
              )}
            >
              <List entries={entries} activeId={activeId} onSelect={goTo} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

function List({
  entries,
  activeId,
  onSelect,
}: {
  entries: ContentsEntry[];
  activeId: string;
  onSelect: (event: ReactMouseEvent<HTMLAnchorElement>, id: string) => void;
}) {
  return (
    <nav aria-label="Sections of this policy" className="flex flex-col">
      {entries.map((entry) => {
        const active = entry.id === activeId;
        return (
          <a
            key={entry.id}
            href={`#${entry.id}`}
            onClick={(event) => onSelect(event, entry.id)}
            aria-current={active ? "location" : undefined}
            className={clsx(
              "rounded-full px-3 py-2 text-base leading-[normal] tracking-[-0.02em] transition-colors duration-200",
              active
                ? "bg-white/[0.06] text-primary"
                : "text-black-30 hover:text-white"
            )}
          >
            {entry.label}
          </a>
        );
      })}
    </nav>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <motion.svg
      className="size-4 shrink-0"
      viewBox="0 0 16 16"
      fill="none"
      animate={{ rotate: open ? 180 : 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <path
        d="M3.5 6L8 10.5L12.5 6"
        stroke="#B3B3B3"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </motion.svg>
  );
}
