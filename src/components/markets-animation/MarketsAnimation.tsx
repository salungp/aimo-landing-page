"use client";

import * as React from "react";

import {
  CONNECTOR_APPEARANCE,
  CONNECTOR_DURATION_SECONDS,
  CONNECTOR_REFERENCE_WIDTH,
  CONNECTOR_SCENE_VALUES,
} from "./appearance";
import { drawConnectorScene } from "./draw";
import { connectorHubLogo, connectorIconLookup, preloadConnectorIcons } from "./icons";
import { resolveConnectorScene } from "./scene";

type MarketsAnimationProps = {
  className?: string;
};

/**
 * Live redraw of the "markets together" network diagram, replacing the baked
 * `network-diagram.mp4/webm` clip with the same connector geometry running
 * directly on a canvas — no video request, no decode, always crisp.
 */
export default function MarketsAnimation({ className }: MarketsAnimationProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  React.useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    preloadConnectorIcons();

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let cssWidth = 0;
    let cssHeight = 0;

    const resize = () => {
      const box = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cssWidth = box.width;
      cssHeight = box.height;
      const backingWidth = Math.max(1, Math.round(cssWidth * dpr));
      const backingHeight = Math.max(1, Math.round(cssHeight * dpr));
      if (canvas.width !== backingWidth) canvas.width = backingWidth;
      if (canvas.height !== backingHeight) canvas.height = backingHeight;
    };
    resize();

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    let isIntersecting = true;
    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        isIntersecting = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0.01 },
    );
    intersectionObserver.observe(container);

    let isTabVisible = !document.hidden;
    const onVisibilityChange = () => {
      isTabVisible = !document.hidden;
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    const drawFrame = (loopProgress: number) => {
      if (cssWidth <= 0 || cssHeight <= 0) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const scaleFactor = cssWidth / CONNECTOR_REFERENCE_WIDTH;
      const rect = { height: cssHeight, width: cssWidth, x: 0, y: 0 };

      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, cssWidth, cssHeight);

      const sceneValues = {
        ...CONNECTOR_SCENE_VALUES,
        connectorWidth: CONNECTOR_SCENE_VALUES.connectorWidth * scaleFactor,
        hubFloat: CONNECTOR_SCENE_VALUES.hubFloat * scaleFactor,
        hubSize: CONNECTOR_SCENE_VALUES.hubSize * scaleFactor,
        outputNodeSize: CONNECTOR_SCENE_VALUES.outputNodeSize * scaleFactor,
        packetTrail: CONNECTOR_SCENE_VALUES.packetTrail * scaleFactor,
        sourceNodeSize: CONNECTOR_SCENE_VALUES.sourceNodeSize * scaleFactor,
      };

      const scene = resolveConnectorScene({
        durationSeconds: CONNECTOR_DURATION_SECONDS,
        loopProgress,
        rect,
        values: sceneValues,
      });

      drawConnectorScene(context, {
        appearance: CONNECTOR_APPEARANCE,
        falloff: sceneValues.connectorFalloff,
        hubLogo: connectorHubLogo(),
        icon: connectorIconLookup,
        lineWidth: sceneValues.connectorWidth,
        scene,
        withBackground: false,
      });
    };

    let rafId = 0;
    const start = performance.now();

    const tick = (now: number) => {
      rafId = requestAnimationFrame(tick);
      if (!isTabVisible || !isIntersecting) return;
      const elapsedSeconds = (now - start) / 1000;
      const progress =
        (elapsedSeconds % CONNECTOR_DURATION_SECONDS) / CONNECTOR_DURATION_SECONDS;
      drawFrame(progress);
    };

    if (reduceMotion) {
      drawFrame(0);
    } else {
      rafId = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return (
    <div ref={containerRef} className={className}>
      <canvas
        aria-hidden="true"
        ref={canvasRef}
        style={{ display: "block", height: "100%", width: "100%" }}
      />
    </div>
  );
}
