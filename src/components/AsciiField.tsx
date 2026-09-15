"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { createAsciiField } from "./ascii-field-engine";

/**
 * Drifting ASCII field on a canvas, with a pointer effect and click ripples.
 * Exported from Glyph Weather with these settings already dialled in.
 *
 * Drop it behind content as a background layer:
 *   <section className="relative isolate">
 *     <AsciiField className="pointer-events-none absolute inset-0 -z-10" />
 *     ...
 *   </section>
 *
 * The engine listens for pointer moves on window, so the layer still
 * reacts when the cursor is over content stacked on top of it.
 */

type FieldHandle = {
  update: (next: Record<string, unknown>) => unknown;
  clear: () => void;
  destroy: () => void;
};

type AsciiFieldProps = {
  className?: string;
  /** Layer opacity over whatever sits behind it. */
  opacity?: number;
  /** "screen" reads as light lifted off dark imagery; "normal" for a plain ground. */
  blend?: CSSProperties["mixBlendMode"];
  /** Fade the field out under centred copy so text stays readable. */
  centerFade?: boolean;
  /** Override any engine option per instance. */
  options?: Record<string, unknown>;
};

const FIELD_OPTIONS = {
  ramp: " .`':;|",
  cell: 15,
  speed: 58,
  scale: 70,
  coverage: 60,
  radius: 26,
  trail: 62,
  hover: "ripple",
  // Brighter than the original export for more contrast over the video:
  // the sparse end was near-black (#252D28) and vanished under screen blend.
  // More light per glyph comes from a heavier weight (see fontWeight below)
  // rather than a glow filter, which doubled frame cost for little gain.
  accent: "#A7F932",
  accentHot: "#F4FFDC",
  dim: "#4A7F3A",
  bright: "#F4FBEA",
  // Resting colour per density level, sparse -> dense (exactly 6, one per
  // engine level). Overrides the dim -> bright blend.
  levels: ["#4A7F3A", "#5FA200", "#79CC02", "#A7F932", "#D5FAA1", "#F4FBEA"],
  // A CSS custom property name is resolved at runtime, so this picks up
  // next/font automatically. A plain font stack works too.
  fontFamily: "--font-jetbrains-mono",
  // JetBrains Mono is loaded as a variable font, so 700 is a real weight
  // (not synthesised) — thickens the thin ramp glyphs ` . ' : ; |`.
  fontWeight: 700,
  // Slightly tighter grid than the engine default (1 / 1.32) so the glyphs
  // read as a denser texture rather than spaced-out marks.
  tracking: 0.85,
  lineHeight: 1.12,
};

export default function AsciiField({
  className,
  opacity = 1,
  blend = "screen",
  centerFade = true,
  options,
}: AsciiFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const field: FieldHandle | null = createAsciiField(canvas, {
      ...FIELD_OPTIONS,
      ...optionsRef.current,
    });
    return () => field?.destroy();
  }, []);

  const fade = centerFade
    ? "radial-gradient(54% 40% at 50% 50%, transparent 0%, rgba(0,0,0,0.55) 46%, #000 88%)"
    : undefined;

  return (
    <div className={className} aria-hidden="true">
      <canvas
        ref={canvasRef}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          opacity,
          mixBlendMode: blend,
          maskImage: fade,
          WebkitMaskImage: fade,
        }}
      />
    </div>
  );
}
