/**
 * The paint model shared by the brand hub and both node fills: a solid or
 * gradient fill plus a stack of drop and inner shadows.
 *
 * Values come from built-in controls only - `colorOpacity` for the solid fill,
 * the built-in `gradient` for stops, and `collectionActions` for the shadow
 * list - so the runtime keeps ownership of every value model.
 */

export type ConnectorTint = Readonly<{ hex: string; opacity: number }>;

export type ConnectorGradientStop = Readonly<{
  color: string;
  opacity?: number;
  position: string;
}>;

export type ConnectorGradientValue = Readonly<{
  angle: number;
  gradientType: "angular" | "diamond" | "linear" | "radial";
  stops: readonly ConnectorGradientStop[];
}>;

export type ConnectorShadowKind = "drop" | "inner";

export type ConnectorShadow = Readonly<{
  blur: number;
  color: ConnectorTint;
  kind: ConnectorShadowKind;
  offsetX: number;
  offsetY: number;
  spread: number;
}>;

export type ConnectorPaint = Readonly<{
  color: ConnectorTint;
  gradient: ConnectorGradientValue;
  mode: "gradient" | "solid";
  shadows: readonly ConnectorShadow[];
}>;

export type ConnectorCircle = Readonly<{
  radius: number;
  x: number;
  y: number;
}>;

const HEX_PATTERN = /^#[0-9a-f]{6}$/iu;

export function connectorRgba(hex: string, alpha: number): string {
  const normalized = HEX_PATTERN.test(hex) ? hex : "#FFFFFF";
  const red = Number.parseInt(normalized.slice(1, 3), 16);
  const green = Number.parseInt(normalized.slice(3, 5), 16);
  const blue = Number.parseInt(normalized.slice(5, 7), 16);
  return `rgba(${red}, ${green}, ${blue}, ${Math.min(1, Math.max(0, alpha)).toFixed(4)})`;
}

export function connectorMixWithWhite(hex: string, amount: number): string {
  const normalized = HEX_PATTERN.test(hex) ? hex : "#FFFFFF";
  const ratio = Math.min(1, Math.max(0, amount));
  const channel = (offset: number) => {
    const base = Number.parseInt(normalized.slice(offset, offset + 2), 16);
    return Math.round(base + (255 - base) * ratio)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${channel(1)}${channel(3)}${channel(5)}`.toUpperCase();
}

/** Gradient stop positions are stored as strings such as "0%" or "100". */
export function connectorStopOffset(position: string): number {
  const parsed = Number.parseFloat(position);
  return Number.isFinite(parsed) ? Math.min(1, Math.max(0, parsed / 100)) : 0;
}

function sortedStops(
  stops: readonly ConnectorGradientStop[],
): ConnectorGradientStop[] {
  return [...stops].sort(
    (left, right) =>
      connectorStopOffset(left.position) - connectorStopOffset(right.position),
  );
}

/**
 * Builds the canvas paint for one circular shape. Angular gradients use a conic
 * gradient where the browser provides one; diamond falls back to radial, which
 * is recorded as a fidelity risk rather than silently pretending to match.
 */
export function createConnectorFillStyle(
  context: CanvasRenderingContext2D,
  paint: ConnectorPaint,
  circle: ConnectorCircle,
): CanvasGradient | string {
  if (paint.mode === "solid") {
    return connectorRgba(paint.color.hex, paint.color.opacity / 100);
  }

  const { angle, gradientType, stops } = paint.gradient;
  const ordered = sortedStops(stops);
  if (ordered.length === 0) {
    return connectorRgba(paint.color.hex, paint.color.opacity / 100);
  }

  let gradient: CanvasGradient;
  if (gradientType === "linear") {
    const radians = ((angle - 90) * Math.PI) / 180;
    const dx = Math.cos(radians) * circle.radius;
    const dy = Math.sin(radians) * circle.radius;
    gradient = context.createLinearGradient(
      circle.x - dx,
      circle.y - dy,
      circle.x + dx,
      circle.y + dy,
    );
  } else if (
    gradientType === "angular" &&
    typeof context.createConicGradient === "function"
  ) {
    gradient = context.createConicGradient(
      ((angle - 90) * Math.PI) / 180,
      circle.x,
      circle.y,
    );
  } else {
    gradient = context.createRadialGradient(
      circle.x,
      circle.y,
      0,
      circle.x,
      circle.y,
      circle.radius,
    );
  }

  for (const stop of ordered) {
    gradient.addColorStop(
      connectorStopOffset(stop.position),
      connectorRgba(stop.color, (stop.opacity ?? 100) / 100),
    );
  }
  return gradient;
}

function circlePath(
  context: CanvasRenderingContext2D,
  circle: ConnectorCircle,
  grow: number,
): void {
  context.beginPath();
  context.arc(circle.x, circle.y, Math.max(0.01, circle.radius + grow), 0, Math.PI * 2);
}

/**
 * Canvas shadow offsets and blur are specified in output-bitmap units and are
 * deliberately not affected by the transform, so they must be scaled by the
 * current transform to stay correct in scene units at any render scale.
 */
function contextScale(context: CanvasRenderingContext2D): number {
  const matrix = context.getTransform?.();
  if (!matrix) return 1;
  const scale = Math.hypot(matrix.a, matrix.b);
  return Number.isFinite(scale) && scale > 0 ? scale : 1;
}

function applyShadowState(
  context: CanvasRenderingContext2D,
  shadow: ConnectorShadow,
  scale: number,
  extraOffsetX = 0,
): void {
  context.shadowBlur = Math.max(0, shadow.blur) * scale;
  context.shadowColor = connectorRgba(shadow.color.hex, shadow.color.opacity / 100);
  context.shadowOffsetX = (shadow.offsetX + extraOffsetX) * scale;
  context.shadowOffsetY = shadow.offsetY * scale;
}

function clearShadowState(context: CanvasRenderingContext2D): void {
  context.shadowBlur = 0;
  context.shadowColor = "rgba(0, 0, 0, 0)";
  context.shadowOffsetX = 0;
  context.shadowOffsetY = 0;
}

/**
 * Paints one circle: every drop shadow behind it, the fill, then every inner
 * shadow clipped inside it. Shadow order follows the user's list order.
 */
export function paintConnectorCircle(
  context: CanvasRenderingContext2D,
  circle: ConnectorCircle,
  paint: ConnectorPaint,
): void {
  const scale = contextScale(context);
  const drops = paint.shadows.filter((shadow) => shadow.kind === "drop");
  const inners = paint.shadows.filter((shadow) => shadow.kind === "inner");

  for (const shadow of drops) {
    // The caster must never be seen. Draw it far off to one side and push the
    // shadow back by the same distance, so only the shadow lands on the scene.
    const exile = circle.radius * 4 + Math.abs(shadow.spread) + shadow.blur + 1000;
    context.save();
    applyShadowState(context, shadow, scale, exile);
    context.fillStyle = "#000000";
    circlePath(
      context,
      { radius: circle.radius, x: circle.x - exile, y: circle.y },
      shadow.spread,
    );
    context.fill();
    context.restore();
  }

  context.save();
  clearShadowState(context);
  context.fillStyle = createConnectorFillStyle(context, paint, circle);
  circlePath(context, circle, 0);
  context.fill();
  context.restore();

  for (const shadow of inners) {
    context.save();
    circlePath(context, circle, 0);
    context.clip();
    applyShadowState(context, shadow, scale);
    context.fillStyle = "#000000";
    // An even-odd ring whose body sits outside the clip, so only its inward
    // shadow is visible inside the shape.
    const reach = circle.radius * 4 + Math.abs(shadow.blur) + 32;
    context.beginPath();
    context.rect(circle.x - reach, circle.y - reach, reach * 2, reach * 2);
    context.arc(
      circle.x,
      circle.y,
      Math.max(0.01, circle.radius - shadow.spread),
      0,
      Math.PI * 2,
    );
    context.fill("evenodd");
    context.restore();
  }

  clearShadowState(context);
}
