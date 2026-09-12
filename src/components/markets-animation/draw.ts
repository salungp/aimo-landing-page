import {
  connectorLaneSegments,
  type ConnectorLane,
  type ConnectorPacket,
  type ConnectorScene,
} from "./scene";
import {
  connectorRgba,
  paintConnectorCircle,
} from "./paint";
import type { ConnectorAppearance } from "./appearance";

export type ConnectorIconPlacement = Readonly<{
  image: CanvasImageSource;
  /** Artwork diameter as a share of the circle radius. */
  scale: number;
}>;

export type ConnectorIconLookup = (
  side: "input" | "output",
  index: number,
) => ConnectorIconPlacement | null;

export type ConnectorBackdropPlacement = Readonly<{
  image: CanvasImageSource;
  /** 0-1 multiplier applied over the background colour. */
  opacity: number;
}>;

export type ConnectorDrawOptions = Readonly<{
  appearance: ConnectorAppearance;
  /** Uploaded image painted over the background colour, cover-cropped. */
  backdrop?: ConnectorBackdropPlacement | null;
  /** Connector dimming away from the hub, 0-100. */
  falloff: number;
  hubLogo?: ConnectorIconPlacement | null;
  icon?: ConnectorIconLookup;
  /** Connector stroke width in scene pixels. */
  lineWidth: number;
  scene: ConnectorScene;
  /** Draw the product background rectangle. Live preview may suppress it. */
  withBackground: boolean;
}>;

function drawIconInCircle(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  centerX: number,
  centerY: number,
  radius: number,
): void {
  const source = image as { height?: number; width?: number };
  const naturalWidth =
    typeof source.width === "number" && source.width > 0 ? source.width : 1;
  const naturalHeight =
    typeof source.height === "number" && source.height > 0 ? source.height : 1;
  const box = radius * 1.6;
  const scale = Math.min(box / naturalWidth, box / naturalHeight);
  const drawWidth = naturalWidth * scale;
  const drawHeight = naturalHeight * scale;

  context.save();
  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.clip();
  context.drawImage(
    image,
    centerX - drawWidth / 2,
    centerY - drawHeight / 2,
    drawWidth,
    drawHeight,
  );
  context.restore();
}

/**
 * The backdrop covers the scene rect and is centre-cropped, so it never
 * letterboxes and never distorts whatever the uploaded aspect ratio is.
 */
function drawBackdrop(
  context: CanvasRenderingContext2D,
  placement: ConnectorBackdropPlacement,
  scene: ConnectorScene,
): void {
  const source = placement.image as { height?: number; width?: number };
  const naturalWidth =
    typeof source.width === "number" && source.width > 0 ? source.width : 1;
  const naturalHeight =
    typeof source.height === "number" && source.height > 0 ? source.height : 1;
  const scale = Math.max(
    scene.width / naturalWidth,
    scene.height / naturalHeight,
  );
  const drawWidth = naturalWidth * scale;
  const drawHeight = naturalHeight * scale;

  context.save();
  context.beginPath();
  context.rect(scene.x, scene.y, scene.width, scene.height);
  context.clip();
  context.globalAlpha = Math.min(1, Math.max(0, placement.opacity));
  context.drawImage(
    placement.image,
    scene.x + (scene.width - drawWidth) / 2,
    scene.y + (scene.height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );
  context.restore();
}

function drawLane(
  context: CanvasRenderingContext2D,
  lane: ConnectorLane,
  options: ConnectorDrawOptions,
): void {
  const { appearance, falloff, lineWidth } = options;
  const style = appearance.connectorStyleBySide[lane.side];
  const baseAlpha = appearance.connectorTint.opacity / 100;
  const strokeWidth = Math.max(0.25, lineWidth);

  context.lineCap = style === "solid" ? "butt" : "round";
  context.lineJoin = "round";
  context.lineWidth = strokeWidth;

  for (const segment of connectorLaneSegments({
    falloff,
    lane,
    style,
    width: strokeWidth,
  })) {
    context.strokeStyle = connectorRgba(
      appearance.connectorTint.hex,
      baseAlpha * segment.opacity,
    );
    context.beginPath();
    context.moveTo(segment.a.x, segment.a.y);
    context.lineTo(segment.b.x, segment.b.y);
    context.stroke();
  }

  context.lineCap = "butt";
  context.strokeStyle = connectorRgba(
    appearance.connectorTint.hex,
    baseAlpha * Math.max(0, 1 - falloff / 100),
  );
  context.beginPath();
  context.moveTo(lane.lead.a.x, lane.lead.a.y);
  context.lineTo(lane.lead.b.x, lane.lead.b.y);
  context.stroke();
}

function drawNode(
  context: CanvasRenderingContext2D,
  lane: ConnectorLane,
  options: ConnectorDrawOptions,
): void {
  const { appearance } = options;
  const isInput = lane.side === "input";
  const paint = isInput ? appearance.sourcePaint : appearance.outputPaint;
  const stroke = isInput ? appearance.sourceStroke : appearance.outputStroke;
  const { radius, x, y } = lane.node;

  paintConnectorCircle(context, { radius, x, y }, paint);

  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.lineWidth = Math.max(1, radius * 0.05);
  context.strokeStyle = stroke;
  context.stroke();

  const placement =
    options.icon?.(lane.side, lane.node.index) ??
    (lane.side === "output" && appearance.outputSource === "brand"
      ? (options.hubLogo ?? null)
      : null);
  if (placement) {
    drawIconInCircle(context, placement.image, x, y, radius * placement.scale);
  }
}

function drawPacket(
  context: CanvasRenderingContext2D,
  packet: ConnectorPacket,
  options: ConnectorDrawOptions,
): void {
  const { appearance } = options;
  const alpha = appearance.packetTint.opacity / 100;
  const size = Math.max(1, appearance.packetSize);

  if (packet.trail.length > 1) {
    context.lineCap = "round";
    context.lineWidth = Math.max(1, size * 0.22);
    for (let index = 1; index < packet.trail.length; index += 1) {
      const from = packet.trail[index - 1];
      const to = packet.trail[index];
      if (!from || !to) continue;
      const fade = 1 - index / packet.trail.length;
      context.strokeStyle = connectorRgba(
        appearance.packetTint.hex,
        alpha * fade * fade,
      );
      context.beginPath();
      context.moveTo(from.x, from.y);
      context.lineTo(to.x, to.y);
      context.stroke();
    }
  }

  context.save();
  context.translate(packet.head.x, packet.head.y);
  context.rotate(packet.angle);
  context.fillStyle = connectorRgba(appearance.packetTint.hex, alpha);
  context.strokeStyle = connectorRgba(appearance.packetTint.hex, alpha);
  context.lineWidth = Math.max(1, size * 0.14);

  if (appearance.packetShape === "dot") {
    context.beginPath();
    context.arc(0, 0, size / 2, 0, Math.PI * 2);
    context.fill();
  } else if (appearance.packetShape === "bar") {
    context.fillRect(-size * 0.9, -size * 0.16, size * 1.8, size * 0.32);
  } else {
    context.beginPath();
    context.rect(-size / 2, -size / 2, size, size);
    context.stroke();
    context.globalAlpha = 0.5;
    context.fill();
    context.globalAlpha = 1;
  }
  context.restore();
}

function drawHub(
  context: CanvasRenderingContext2D,
  options: ConnectorDrawOptions,
): void {
  const { appearance, scene } = options;
  const { radius, x, y } = scene.hub;

  // Halo and body both come from the user's paint stack, so the glow is an
  // editable drop shadow rather than a fixed effect.
  paintConnectorCircle(context, { radius, x, y }, appearance.hubPaint);

  if (options.hubLogo) {
    drawIconInCircle(
      context,
      options.hubLogo.image,
      x,
      y,
      radius * options.hubLogo.scale,
    );
  }
}

export function drawConnectorScene(
  context: CanvasRenderingContext2D,
  options: ConnectorDrawOptions,
): void {
  const { appearance, scene } = options;

  if (options.withBackground) {
    context.fillStyle = appearance.backgroundColor;
    context.fillRect(scene.x, scene.y, scene.width, scene.height);
  }

  if (options.backdrop) drawBackdrop(context, options.backdrop, scene);

  for (const lane of scene.lanes) drawLane(context, lane, options);
  drawHub(context, options);
  for (const lane of scene.lanes) drawNode(context, lane, options);
  for (const packet of scene.packets) drawPacket(context, packet, options);
}
