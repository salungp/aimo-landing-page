/**
 * Pure geometry and timing model for the connector diagram.
 *
 * Everything here is deterministic in `(values, rect, loopProgress)` so the live
 * Canvas 2D preview, the raster export renderer, and the SVG export renderer all
 * draw the same scene from one source of truth.
 */

export type ConnectorPoint = Readonly<{ x: number; y: number }>;

export type ConnectorSide = "input" | "output";

export type ConnectorLineStyle = "dashed" | "dotted" | "solid";

export type ConnectorPacketShape = "bar" | "dot" | "square";

export type ConnectorFlowDirection = "both" | "in" | "out";

export type ConnectorOutputSource = "brand" | "upload";

export type ConnectorNode = Readonly<{
  index: number;
  radius: number;
  side: ConnectorSide;
  x: number;
  y: number;
}>;

export type ConnectorSegment = Readonly<{
  a: ConnectorPoint;
  b: ConnectorPoint;
  opacity: number;
}>;

export type ConnectorLane = Readonly<{
  /** Straight lead-in from the canvas edge to the node edge. */
  lead: Readonly<{ a: ConnectorPoint; b: ConnectorPoint }>;
  node: ConnectorNode;
  /** Sampled polyline from the node edge to the hub edge, node end first. */
  points: readonly ConnectorPoint[];
  side: ConnectorSide;
}>;

export type ConnectorPacket = Readonly<{
  angle: number;
  head: ConnectorPoint;
  nodeIndex: number;
  side: ConnectorSide;
  /** Head-first trail polyline; index 0 is the head. */
  trail: readonly ConnectorPoint[];
  /**
   * 0 where the packet departs, 1 where it arrives. Inbound lanes run from the
   * source node to the hub; outbound lanes run from the hub to the output node,
   * so traffic reads left to right through the hub.
   */
  travel: number;
}>;

export type ConnectorHub = Readonly<{
  radius: number;
  x: number;
  y: number;
}>;

export type ConnectorScene = Readonly<{
  height: number;
  hub: ConnectorHub;
  lanes: readonly ConnectorLane[];
  packets: readonly ConnectorPacket[];
  width: number;
  x: number;
  y: number;
}>;

export type ConnectorSceneValues = Readonly<{
  connectorCurvature: number;
  connectorFalloff: number;
  connectorWidth: number;
  count: number;
  flowDirection: ConnectorFlowDirection;
  hubFloat: number;
  hubSize: number;
  inset: number;
  /**
   * True cycles traffic forever, so the first and last frames stitch. False
   * plays a single pass: the lanes start clear, fill, and drain before the end.
   */
  loop: boolean;
  outputNodeSize: number;
  packetRate: number;
  packetSpeed: number;
  packetTrail: number;
  sourceNodeSize: number;
  spread: number;
}>;

export type ConnectorSceneRect = Readonly<{
  height: number;
  width: number;
  x: number;
  y: number;
}>;

/**
 * Seconds one packet needs to cross a full lane at speed 1. Measured from the
 * reference recording: ~700 px/s across a 1978px frame, i.e. ~0.355 frame widths
 * per second, which is ~1.2s for the node-to-hub distance.
 */
export const CONNECTOR_BASE_TRAVEL_SECONDS = 1.2;

/** Vertical fan of the lane endpoints where they meet the hub. */
const HUB_ENTRY_FAN = 0.14;

/** Samples per lane path. Enough for smooth dashes on these gentle curves. */
const LANE_SAMPLE_COUNT = 64;

const MAX_TRAIL_SAMPLES = 16;

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

function toFinite(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/**
 * Deterministic per-lane departure phase. Reproduces the staggered, unsynchronized
 * packet cadence of the reference without any random source, so the loop is
 * identical on every playback and in every exported frame.
 */
export function connectorLanePhase(side: ConnectorSide, index: number): number {
  const seed = (side === "input" ? 1 : 2) * 2654435761 + (index + 1) * 40503;
  const mixed = Math.imul(seed ^ (seed >>> 15), 2246822519) >>> 0;
  return (mixed % 10_000) / 10_000;
}

function cubicAt(
  t: number,
  p0: ConnectorPoint,
  p1: ConnectorPoint,
  p2: ConnectorPoint,
  p3: ConnectorPoint,
): ConnectorPoint {
  const inverse = 1 - t;
  const a = inverse * inverse * inverse;
  const b = 3 * inverse * inverse * t;
  const c = 3 * inverse * t * t;
  const d = t * t * t;
  return {
    x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
    y: a * p0.y + b * p1.y + c * p2.y + d * p3.y,
  };
}

export function connectorNodeCenters({
  count,
  height,
  spread,
  y,
}: Readonly<{
  count: number;
  height: number;
  spread: number;
  y: number;
}>): number[] {
  const centerY = y + height / 2;
  const span = (clamp(spread, 0, 100) / 100) * height;
  if (count <= 1) return [centerY];
  return Array.from(
    { length: count },
    (_unused, index) => centerY - span / 2 + (span * index) / (count - 1),
  );
}

function buildLane({
  curvature,
  hub,
  node,
  rect,
}: Readonly<{
  curvature: number;
  hub: ConnectorHub;
  node: ConnectorNode;
  rect: ConnectorSceneRect;
}>): ConnectorLane {
  const direction = node.side === "input" ? 1 : -1;
  const start: ConnectorPoint = { x: node.x + direction * node.radius, y: node.y };
  const end: ConnectorPoint = {
    x: hub.x - direction * hub.radius,
    y: hub.y + (node.y - hub.y) * HUB_ENTRY_FAN,
  };
  const dx = Math.abs(end.x - start.x);
  const bend = clamp(curvature, 0, 100) / 100;
  const c1: ConnectorPoint = { x: start.x + direction * dx * bend, y: start.y };
  const c2: ConnectorPoint = { x: end.x - direction * dx * bend, y: end.y };

  const points: ConnectorPoint[] = [];
  for (let index = 0; index < LANE_SAMPLE_COUNT; index += 1) {
    points.push(cubicAt(index / (LANE_SAMPLE_COUNT - 1), start, c1, c2, end));
  }

  const edgeX = node.side === "input" ? rect.x : rect.x + rect.width;
  return {
    lead: {
      a: { x: edgeX, y: node.y },
      b: { x: node.x - direction * node.radius, y: node.y },
    },
    node,
    points,
    side: node.side,
  };
}

export function connectorPolylineLengths(
  points: readonly ConnectorPoint[],
): number[] {
  const lengths: number[] = [0];
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1] as ConnectorPoint;
    const current = points[index] as ConnectorPoint;
    lengths.push(
      (lengths[index - 1] as number) +
        Math.hypot(current.x - previous.x, current.y - previous.y),
    );
  }
  return lengths;
}

export function connectorLaneLength(lane: ConnectorLane): number {
  const lengths = connectorPolylineLengths(lane.points);
  return lengths[lengths.length - 1] ?? 0;
}

/** Point at an absolute arc-length position along a polyline. */
export function connectorPointAtDistance(
  points: readonly ConnectorPoint[],
  lengths: readonly number[],
  distance: number,
): ConnectorPoint {
  const total = lengths[lengths.length - 1] ?? 0;
  const target = clamp(distance, 0, total);
  let index = 1;
  while (index < lengths.length - 1 && (lengths[index] as number) < target) {
    index += 1;
  }
  const previousLength = lengths[index - 1] as number;
  const segmentLength = (lengths[index] as number) - previousLength;
  const ratio = segmentLength > 0 ? (target - previousLength) / segmentLength : 0;
  const a = points[index - 1] as ConnectorPoint;
  const b = points[index] as ConnectorPoint;
  return { x: a.x + (b.x - a.x) * ratio, y: a.y + (b.y - a.y) * ratio };
}

/**
 * Splits one lane into drawable segments carrying the falloff opacity. Dash and
 * dot patterns are resolved here rather than by a renderer dash setting, so the
 * Canvas 2D preview and the SVG artifact describe the same geometry.
 */
export function connectorLaneSegments({
  falloff,
  lane,
  style,
  width,
}: Readonly<{
  falloff: number;
  lane: ConnectorLane;
  style: ConnectorLineStyle;
  width: number;
}>): ConnectorSegment[] {
  const points = lane.points;
  const lengths = connectorPolylineLengths(points);
  const total = lengths[lengths.length - 1] ?? 0;
  if (total <= 0) return [];

  const dim = clamp(falloff, 0, 100) / 100;
  const strokeWidth = Math.max(width, 0.25);
  const pattern =
    style === "dotted"
      ? { gap: strokeWidth * 3.6, on: strokeWidth * 1.05 }
      : style === "dashed"
        ? { gap: strokeWidth * 4.4, on: strokeWidth * 6.5 }
        : { gap: 0, on: total / 26 };

  const segments: ConnectorSegment[] = [];
  const step = pattern.on + pattern.gap;
  if (step <= 0) return [];
  const overlap = style === "solid" ? Math.min(0.75, pattern.on * 0.2) : 0;

  for (let start = 0; start < total; start += step) {
    const end = Math.min(start + pattern.on + overlap, total);
    if (end - start < 0.05) continue;
    const midpoint = (start + end) / 2 / total;
    segments.push({
      a: connectorPointAtDistance(points, lengths, start),
      b: connectorPointAtDistance(points, lengths, end),
      opacity: 1 - dim * (1 - clamp(midpoint, 0, 1)),
    });
  }
  return segments;
}

export function connectorTravelFraction({
  durationSeconds,
  speed,
}: Readonly<{ durationSeconds: number; speed: number }>): number {
  const duration = toFinite(durationSeconds, 5);
  const rate = Math.max(0.05, toFinite(speed, 1));
  if (duration <= 0) return 1;
  return clamp(CONNECTOR_BASE_TRAVEL_SECONDS / rate / duration, 0.01, 1);
}

/**
 * Vertical hub offset. The reference hub travels a pure cosine of about +/-1.1%
 * of frame height over exactly one loop period, with no horizontal drift.
 */
export function connectorHubFloatOffset({
  amplitude,
  loopProgress,
}: Readonly<{ amplitude: number; loopProgress: number }>): number {
  return Math.cos(2 * Math.PI * toFinite(loopProgress, 0)) * toFinite(amplitude, 0);
}

function laneCarriesFlow(
  lane: ConnectorLane,
  direction: ConnectorFlowDirection,
): boolean {
  if (direction === "both") return true;
  return direction === "in" ? lane.side === "input" : lane.side === "output";
}

function buildPackets({
  lanes,
  loopProgress,
  travelFraction,
  values,
}: Readonly<{
  lanes: readonly ConnectorLane[];
  loopProgress: number;
  travelFraction: number;
  values: ConnectorSceneValues;
}>): ConnectorPacket[] {
  const rate = Math.max(0, Math.round(values.packetRate));
  if (rate === 0 || travelFraction <= 0) return [];

  const packets: ConnectorPacket[] = [];
  const trailLength = Math.max(0, values.packetTrail);

  for (const lane of lanes) {
    if (!laneCarriesFlow(lane, values.flowDirection)) continue;
    const lengths = connectorPolylineLengths(lane.points);
    const total = lengths[lengths.length - 1] ?? 0;
    if (total <= 0) continue;
    const phase = connectorLanePhase(lane.side, lane.node.index);

    for (let emission = 0; emission < rate; emission += 1) {
      const departure = (phase + emission / rate) % 1;
      // Looping traffic wraps: a packet that left at 0.9 is back in flight at
      // 0.05, which is what stitches the last frame to the first. A single pass
      // drops the wrap and skips any departure that would still be mid-lane at
      // the end, so the clip opens and closes on clear lanes.
      const elapsed = values.loop
        ? (((loopProgress - departure) % 1) + 1) % 1
        : loopProgress - departure;
      if (elapsed < 0) continue;
      if (!values.loop && departure + travelFraction > 1) continue;
      const travel = elapsed / travelFraction;
      if (travel >= 1) continue;

      // Lane points always run node -> hub so the falloff ramp stays anchored to
      // the hub. Outbound traffic walks that same polyline backwards, which is
      // what makes the flow read source -> hub -> output.
      const outbound = lane.side === "output";
      const laneOrigin = outbound ? total : 0;
      const heading = outbound ? -1 : 1;
      const headDistance = laneOrigin + heading * travel * total;
      const head = connectorPointAtDistance(lane.points, lengths, headDistance);
      const behind = connectorPointAtDistance(
        lane.points,
        lengths,
        clamp(headDistance - heading * 2, 0, total),
      );
      const trail: ConnectorPoint[] = [head];
      if (trailLength > 0) {
        const samples = Math.min(
          MAX_TRAIL_SAMPLES,
          Math.max(2, Math.round(trailLength / 8)),
        );
        for (let sample = 1; sample <= samples; sample += 1) {
          const distance = headDistance - heading * (trailLength * sample) / samples;
          trail.push(
            connectorPointAtDistance(lane.points, lengths, clamp(distance, 0, total)),
          );
          if (distance <= 0 || distance >= total) break;
        }
      }

      packets.push({
        angle: Math.atan2(head.y - behind.y, head.x - behind.x),
        head,
        nodeIndex: lane.node.index,
        side: lane.side,
        trail,
        travel,
      });
    }
  }
  return packets;
}

export function resolveConnectorScene({
  durationSeconds,
  loopProgress,
  rect,
  values,
}: Readonly<{
  durationSeconds: number;
  loopProgress: number;
  rect: ConnectorSceneRect;
  values: ConnectorSceneValues;
}>): ConnectorScene {
  const progress = ((toFinite(loopProgress, 0) % 1) + 1) % 1;
  const count = Math.max(1, Math.round(values.count));
  const hub: ConnectorHub = {
    radius: Math.max(4, values.hubSize / 2),
    x: rect.x + rect.width / 2,
    y:
      rect.y +
      rect.height / 2 +
      connectorHubFloatOffset({
        amplitude: values.hubFloat,
        loopProgress: progress,
      }),
  };

  const centers = connectorNodeCenters({
    count,
    height: rect.height,
    spread: values.spread,
    y: rect.y,
  });
  const insetX = (clamp(values.inset, 0, 45) / 100) * rect.width;

  const lanes: ConnectorLane[] = [];
  for (const side of ["input", "output"] as const) {
    const radius = Math.max(
      2,
      (side === "input" ? values.sourceNodeSize : values.outputNodeSize) / 2,
    );
    for (const [index, centerY] of centers.entries()) {
      lanes.push(
        buildLane({
          curvature: values.connectorCurvature,
          hub,
          node: {
            index,
            radius,
            side,
            x: side === "input" ? rect.x + insetX : rect.x + rect.width - insetX,
            y: centerY,
          },
          rect,
        }),
      );
    }
  }

  return {
    height: rect.height,
    hub,
    lanes,
    packets: buildPackets({
      lanes,
      loopProgress: progress,
      travelFraction: connectorTravelFraction({
        durationSeconds,
        speed: values.packetSpeed,
      }),
      values,
    }),
    width: rect.width,
    x: rect.x,
    y: rect.y,
  };
}
