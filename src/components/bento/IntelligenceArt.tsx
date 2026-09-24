"use client";

import { useEffect, useState } from "react";
import { useCardActive } from "./BentoCard";
import LiquidOrb from "./LiquidOrb";

/* The resting placeholder from the design, then five things a reader might
 * actually ask AIMO — each short enough to sit on one line in the 172px
 * field at the design's 8px. */
const PROMPTS = [
  "Ask aimo...",
  "How's my portfolio today?",
  "Move idle funds to Perps?",
  "Best route for USDC → SOL?",
  "What are my fees this month?",
  "Close my Yes position?",
];

const PROMPT_MS = 3400;
/** How long the orb answers for before settling back. */
const THINKING_MS = 1100;

/**
 * Intelligence (Figma 285:24943). The assistant, mid-conversation.
 *
 * The suggestion in the ask field cycles, and the orb is wired to it: each
 * time the question changes the shader is driven to its "thinking" state —
 * faster flow, brighter exposure, the green primary pushed through the body
 * colours — and settles back a beat later. That pairing is the whole point of
 * the card; a still orb next to changing text would read as two unrelated
 * loops.
 *
 * The prompt itself is keyed by index, so React remounts the span and its
 * entrance animation replays without any presence bookkeeping.
 */
export default function IntelligenceArt() {
  const active = useCardActive();
  const [index, setIndex] = useState(0);
  const [thinking, setThinking] = useState(false);

  useEffect(() => {
    if (!active) return;

    let settle: number | undefined;
    const id = window.setInterval(() => {
      setIndex((previous) => (previous + 1) % PROMPTS.length);
      setThinking(true);
      settle = window.setTimeout(() => setThinking(false), THINKING_MS);
    }, PROMPT_MS);

    return () => {
      window.clearInterval(id);
      window.clearTimeout(settle);
    };
  }, [active]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* The phone. Taller than the illustration on purpose — Figma lets the
       * card's own clip cut it off below the ask field. */}
      <div
        className="absolute overflow-hidden rounded-[32px] border-2 border-[rgba(255,255,255,0.06)] bg-gradient-to-b bg-origin-border from-[rgba(255,255,255,0.12)] to-[rgba(255,255,255,0.02)] backdrop-blur-[12px]"
        style={{ left: 115, top: 11, width: 204, height: 316 }}
      >
        <p
          className="absolute text-center font-semibold text-white"
          style={{ left: 23.27, top: 15.75, width: 28.12, fontSize: 8.33, letterSpacing: "-0.32px" }}
        >
          9:41
        </p>
        <img
          src="/images/bento/status-bar.svg"
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          className="absolute"
          style={{ right: 12, top: 18.6, width: 40.83, height: 6.77 }}
        />

        <LiquidOrb
          className="absolute"
          size={55}
          state={thinking ? "thinking" : "idle"}
          active={active}
          // Figma's own offset inside the phone frame.
          style={{ left: 75, top: 54 }}
        />

        <p
          className="absolute left-1/2 -translate-x-1/2 text-center text-[10px] font-medium whitespace-nowrap text-white"
          style={{ top: 121 }}
        >
          Aimo Assistance
        </p>

        <div
          className="absolute overflow-hidden rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.06)]"
          style={{ left: 14, top: 173, width: 172, height: 23 }}
        >
          <img
            src="/images/bento/mic.svg"
            alt=""
            aria-hidden
            loading="lazy"
            decoding="async"
            className="absolute"
            style={{ left: 5, top: 5, width: 11, height: 11 }}
          />
          <span
            key={index}
            className="bento-ask absolute top-1/2 -translate-y-1/2 text-[8px] whitespace-nowrap text-[rgba(255,255,255,0.4)]"
            style={{ left: 22 }}
          >
            {PROMPTS[index]}
          </span>
        </div>
      </div>
    </div>
  );
}
