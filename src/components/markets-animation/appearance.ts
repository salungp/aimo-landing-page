import type { ConnectorPaint, ConnectorTint } from "./paint";
import type { ConnectorLineStyle, ConnectorPacketShape, ConnectorSceneValues } from "./scene";

/**
 * Static appearance + scene tuning for the "markets together" hero animation.
 *
 * Ported from the connector motion-graphics tool that produced
 * `network-diagram.mp4` — the geometry/paint modules are the same pure code,
 * re-tuned here with Aimo's own brand tokens (see `src/app/globals.css`)
 * instead of the tool's generic defaults, so the live canvas draws the same
 * diagram the baked video shows, without shipping a video file.
 */

export type ConnectorOutputSource = "brand" | "upload";

export type ConnectorAppearance = Readonly<{
  backgroundColor: string;
  connectorStyleBySide: Readonly<{
    input: ConnectorLineStyle;
    output: ConnectorLineStyle;
  }>;
  connectorTint: ConnectorTint;
  hubPaint: ConnectorPaint;
  includeBackground: boolean;
  outputPaint: ConnectorPaint;
  outputSource: ConnectorOutputSource;
  outputStroke: string;
  packetShape: ConnectorPacketShape;
  packetSize: number;
  packetTint: ConnectorTint;
  sourcePaint: ConnectorPaint;
  sourceStroke: string;
}>;

/** Reference canvas width the absolute pixel values below were tuned against. */
export const CONNECTOR_REFERENCE_WIDTH = 1600;

export const CONNECTOR_DURATION_SECONDS = 6;

const PRIMARY = "#A7F932";
const PRIMARY_DARK = "#8FEE07";
const PRIMARY_LIGHT = "#CDFB7A";

export const CONNECTOR_APPEARANCE: ConnectorAppearance = {
  backgroundColor: "#05130A",
  connectorStyleBySide: { input: "dotted", output: "solid" },
  connectorTint: { hex: PRIMARY, opacity: 55 },
  hubPaint: {
    color: { hex: PRIMARY, opacity: 100 },
    gradient: {
      angle: 180,
      gradientType: "linear",
      stops: [
        { color: PRIMARY_LIGHT, opacity: 100, position: "0%" },
        { color: PRIMARY, opacity: 100, position: "55%" },
        { color: PRIMARY_DARK, opacity: 100, position: "100%" },
      ],
    },
    mode: "gradient",
    shadows: [
      {
        blur: 88,
        color: { hex: PRIMARY, opacity: 45 },
        kind: "drop",
        offsetX: 0,
        offsetY: 0,
        spread: 6,
      },
    ],
  },
  includeBackground: false,
  outputPaint: {
    color: { hex: PRIMARY, opacity: 100 },
    gradient: {
      angle: 180,
      gradientType: "linear",
      stops: [
        { color: PRIMARY_LIGHT, opacity: 100, position: "0%" },
        { color: PRIMARY_DARK, opacity: 100, position: "100%" },
      ],
    },
    mode: "gradient",
    shadows: [
      {
        blur: 18,
        color: { hex: PRIMARY, opacity: 35 },
        kind: "drop",
        offsetX: 0,
        offsetY: 0,
        spread: 0,
      },
    ],
  },
  outputSource: "brand",
  outputStroke: "#1F2820",
  packetShape: "dot",
  packetSize: 10,
  packetTint: { hex: PRIMARY, opacity: 100 },
  sourcePaint: {
    color: { hex: "#0E1A12", opacity: 100 },
    gradient: {
      angle: 180,
      gradientType: "linear",
      stops: [
        { color: "#16261B", opacity: 100, position: "0%" },
        { color: "#0B1410", opacity: 100, position: "100%" },
      ],
    },
    mode: "solid",
    shadows: [],
  },
  sourceStroke: "#1F2820",
};

export const CONNECTOR_SCENE_VALUES: ConnectorSceneValues = {
  connectorCurvature: 60,
  connectorFalloff: 70,
  connectorWidth: 1.6,
  count: 5,
  flowDirection: "both",
  hubFloat: 9,
  hubSize: 180,
  inset: 9,
  loop: true,
  outputNodeSize: 76,
  packetRate: 1,
  packetSpeed: 1,
  packetTrail: 70,
  sourceNodeSize: 76,
  spread: 80,
};
