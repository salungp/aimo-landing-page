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
  ramp: "  ..::--==++**@@@@",
  cell: 8,
  speed: 65,
  scale: 52,
  coverage: 53,
  radius: 18,
  trail: 34,
  hover: "ripple",
  accent: "#8CE85A",
  accentHot: "#EAFFB8",
  dim: "#252D28",
  bright: "#B3C8B9",
  // A CSS custom property name is resolved at runtime, so this picks up
  // next/font automatically. A plain font stack works too.
  fontFamily: "--font-jetbrains-mono",
};

export default function AsciiField({
  className,
  opacity = 0.6,
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
