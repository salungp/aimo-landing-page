"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { ORB_REST, ORB_THINKING } from "./liquid-orb-state";

/* Minimal structural types for the slice of WebGPU this file touches. The
 * project does not ship @webgpu/types and `lib` in tsconfig predates the API,
 * so the alternative is `any` everywhere. Buffer-usage flags are written as
 * their spec values rather than reading the `GPUBufferUsage` global, which is
 * likewise untyped here. */
type GPUCanvasCtx = {
  configure(config: { device: GPUDeviceLike; format: string; alphaMode: string }): void;
  getCurrentTexture(): { createView(): unknown };
};
type GPUDeviceLike = {
  createShaderModule(d: { code: string }): {
    getCompilationInfo(): Promise<{
      messages: { type: string; lineNum: number; linePos: number; message: string }[];
    }>;
  };
  createRenderPipeline(d: unknown): {
    getBindGroupLayout(i: number): unknown;
  };
  createBuffer(d: { size: number; usage: number }): unknown;
  createBindGroup(d: unknown): unknown;
  createCommandEncoder(): {
    beginRenderPass(d: unknown): {
      setPipeline(p: unknown): void;
      setBindGroup(i: number, g: unknown): void;
      draw(n: number): void;
      end(): void;
    };
    finish(): unknown;
  };
  queue: {
    writeBuffer(b: unknown, off: number, data: ArrayBufferView): void;
    submit(buffers: unknown[]): void;
  };
  destroy(): void;
  lost: Promise<{ message?: string; reason?: string }>;
};
type GPUNavigator = {
  gpu?: {
    requestAdapter(): Promise<{ requestDevice(): Promise<GPUDeviceLike> } | null>;
    getPreferredCanvasFormat(): string;
  };
};

const BUFFER_UNIFORM = 0x40;
const BUFFER_COPY_DST = 0x08;

/** Matches the shader editor's own two transition lengths. */
const ACTIVATION_MS = 220;
const SETTLE_MS = 650;

/* The orb is 55 CSS px. At 60fps it would re-render a fluid simulation 60
 * times a second for a circle the size of a fingernail, on a page that is
 * also scrolling nine other animations; at 30 it is indistinguishable and
 * costs half as much. The device-pixel cap is there for the same reason —
 * beyond 1.5x nothing about this is legible. */
const FRAME_MS = 1000 / 30;
const MAX_DPR = 1.5;

/* The shader and the still both draw the sphere at ~71% of their square, on
 * black. Figma crops that frame to 140.26% inside the circle (Figma 308:258),
 * so the sphere fills it edge to edge and no dark rim shows. The canvas is
 * rendered at the cropped size so the crop costs no sharpness. */
const CROP = 1.4026;
const CROP_STYLE: CSSProperties = {
  left: `${-((CROP - 1) / 2) * 100}%`,
  top: `${-((CROP - 1) / 2) * 100}%`,
  width: `${CROP * 100}%`,
  height: `${CROP * 100}%`,
};

export type OrbState = "idle" | "thinking";

function srgbToLinear(value: number) {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(value: number) {
  return value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055;
}

function mixSrgb(from: number, to: number, progress: number) {
  return linearToSrgb(
    srgbToLinear(from) + (srgbToLinear(to) - srgbToLinear(from)) * progress
  );
}

/**
 * The assistant's orb: the Aurora program of the Glass Liquid shader, run on
 * WebGPU into a canvas the size of the design's 55px circle.
 *
 * Three things are worth knowing about the shape of this component:
 *
 * 1. **It never changes what it renders.** The markup is always the same
 *    `<img>` + two `<canvas>`es, whatever the browser supports — WebGPU
 *    availability is a client-only fact, and branching the returned tree on it
 *    would hand React a server tree it cannot match. The still frame carries
 *    the orb until (and unless) the shader is running, at which point the
 *    canvas fades over it. Safari and Firefox without WebGPU simply keep the
 *    still, which is exactly what the Figma frame shows.
 *
 * 2. **It only runs while it can be seen.** `active` is the card's own
 *    in-view flag; the rAF loop stops when the card leaves the viewport or the
 *    tab is hidden, and the accumulated clock (`motionPhase`) is advanced by
 *    real elapsed time, so the fluid never jumps on the frame it resumes.
 *
 * 3. **The glow is static.** The design stacks two copies of the orb, the lower
 *    one blurred 16px. A live blurred copy of each frame is a blurred repaint
 *    per frame for a bloom that, at 55px, is indistinguishable from two fixed
 *    gradient stops — so the halo is a static radial gradient and the shader
 *    draws once per frame, not twice.
 *
 * There is no seam to loop: the program is a continuous flow field with no
 * period, so it never restarts and never repeats a frame.
 */
export default function LiquidOrb({
  size,
  state = "idle",
  active = true,
  className,
  style,
}: {
  /** CSS px for the square canvas — 55 in the design. */
  size: number;
  state?: OrbState;
  active?: boolean;
  /** The caller positions the orb; it must establish a containing block. */
  className?: string;
  style?: CSSProperties;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);
  const stillRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef<OrbState>(state);
  const activeRef = useRef(active);

  // Both are read by the rAF loop rather than by the render, so a prop change
  // steers the running shader instead of tearing WebGPU down and rebuilding it.
  useEffect(() => {
    stateRef.current = state;
    activeRef.current = active;
  }, [state, active]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const nav = navigator as Navigator & GPUNavigator;
    if (!canvas || !nav.gpu) return;

    let disposed = false;
    let frameId = 0;
    let device: GPUDeviceLike | null = null;

    const displayed = new Float32Array(ORB_REST);
    let from = new Float32Array(ORB_REST);
    let target = new Float32Array(ORB_REST);
    let current: OrbState = "idle";
    let transitionTarget: OrbState = "idle";
    let transitionStart = 0;
    let transitionDuration = 0;
    let lastFrameAt: number | null = null;
    let lastDrawAt = 0;
    let motionPhase = 0;

    function progressAt(now: number) {
      if (transitionDuration === 0) return 1;
      const raw = Math.min(1, Math.max(0, (now - transitionStart) / transitionDuration));
      // Into "thinking" the orb snaps and eases out; back to idle it settles
      // symmetrically. The editor's own two curves.
      return transitionTarget === "thinking" ? 1 - (1 - raw) ** 3 : raw * raw * (3 - 2 * raw);
    }

    // Once a transition finishes, `progress` pins at 1 forever — but nothing
    // before this flag noticed, so `sample` kept re-running the full
    // interpolation anyway: 133 floats, ~24 of them through `mixSrgb` (an
    // exponent both ways, srgb <-> linear), every drawn frame, for as long as
    // the card stayed in view between transitions. The answer was already
    // sitting in `target` untouched. `settled` short-circuits that once
    // `displayed` has actually caught up to it. Measured cost of the loop
    // itself was too small to show up in this project's own profiling (real
    // WebKit, CDP script-duration counters) — kept anyway, since recomputing
    // an unchanging answer every frame forever has no upside to weigh against
    // "it's cheap here."
    let settled = true;

    function sample(now: number) {
      if (settled) return displayed;
      const progress = progressAt(now);
      for (let i = 3; i < displayed.length; i += 1) {
        // The colour bank starts at float 40 and runs RGBA; only the three
        // colour channels are mixed through linear light, alpha and every
        // scalar control mix straight.
        const isColorChannel = i >= 40 && (i - 40) % 4 < 3;
        displayed[i] = isColorChannel
          ? mixSrgb(from[i], target[i], progress)
          : from[i] + (target[i] - from[i]) * progress;
      }
      if (progress >= 1) settled = true;
      return displayed;
    }

    function retarget(next: OrbState, now: number) {
      if (next === current) return;
      sample(now);
      from = new Float32Array(displayed);
      target = new Float32Array(next === "thinking" ? ORB_THINKING : ORB_REST);
      transitionTarget = next;
      transitionStart = now;
      transitionDuration = next === "thinking" ? ACTIVATION_MS : SETTLE_MS;
      current = next;
      settled = false;
    }

    async function start() {
      const adapter = await nav.gpu!.requestAdapter();
      if (!adapter || disposed) return;
      device = await adapter.requestDevice();
      if (disposed) {
        device.destroy();
        return;
      }

      const shaderSource = await fetch("/shaders/liquid-orb.wgsl").then((r) => r.text());
      if (disposed) {
        device.destroy();
        return;
      }

      const context = canvas!.getContext("webgpu") as GPUCanvasCtx | null;
      if (!context) return;
      const format = nav.gpu!.getPreferredCanvasFormat();
      context.configure({ device, format, alphaMode: "premultiplied" });

      const shader = device.createShaderModule({ code: shaderSource });
      const compilation = await shader.getCompilationInfo();
      if (compilation.messages.some((m) => m.type === "error") || disposed) {
        device.destroy();
        return;
      }

      // Premultiplied source-over: the shader already returns colour scaled by
      // its own alpha, so the card shows through everything it does not paint.
      const blend = {
        color: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
        alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
      };
      const pipeline = device.createRenderPipeline({
        layout: "auto",
        vertex: { module: shader, entryPoint: "vs_main" },
        fragment: { module: shader, entryPoint: "fs_main", targets: [{ format, blend }] },
        primitive: { topology: "triangle-list" },
      });

      const values = new Float32Array(displayed);
      const uniformBuffer = device.createBuffer({
        size: values.byteLength,
        usage: BUFFER_UNIFORM | BUFFER_COPY_DST,
      });
      const bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
      });

      let painted = false;

      const frame = (now: number) => {
        if (disposed || !device) return;

        const idle = !activeRef.current || document.hidden;
        if (idle) {
          // Drop the clock rather than the loop: the next live frame advances
          // from real elapsed time, so nothing jumps back into view mid-swirl.
          lastFrameAt = null;
          frameId = requestAnimationFrame(frame);
          return;
        }

        // Half rate. The clock below is advanced from real elapsed time, so
        // skipping a frame slows nothing down — it just draws less often.
        if (now - lastDrawAt < FRAME_MS) {
          frameId = requestAnimationFrame(frame);
          return;
        }
        lastDrawAt = now;

        retarget(stateRef.current, now);
        values.set(sample(now));

        const delta = lastFrameAt === null ? 0 : Math.min(0.1, (now - lastFrameAt) / 1000);
        lastFrameAt = now;
        motionPhase += delta * Math.max(values[3], 0);

        const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
        const px = Math.max(1, Math.round(size * CROP * dpr));
        if (canvas!.width !== px || canvas!.height !== px) {
          canvas!.width = px;
          canvas!.height = px;
        }

        values[0] = px;
        values[1] = px;
        // The shader multiplies time by speed; dividing it back out keeps the
        // flow continuous across a speed change instead of skipping forward.
        values[2] = motionPhase / Math.max(values[3], 0.001);
        device.queue.writeBuffer(uniformBuffer, 0, values);

        const encoder = device.createCommandEncoder();
        const pass = encoder.beginRenderPass({
          colorAttachments: [
            {
              view: context.getCurrentTexture().createView(),
              clearValue: { r: 0, g: 0, b: 0, a: 0 },
              loadOp: "clear",
              storeOp: "store",
            },
          ],
        });
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.draw(3);
        pass.end();
        device.queue.submit([encoder.finish()]);

        if (!painted) {
          painted = true;
          // Hand over from the still frame only once there is a real frame
          // behind it, so the orb never blinks out during startup.
          canvas!.style.opacity = "1";
          if (glowRef.current) glowRef.current.style.opacity = "1";
          if (stillRef.current) stillRef.current.style.opacity = "0";
        }

        frameId = requestAnimationFrame(frame);
      };

      frameId = requestAnimationFrame(frame);
    }

    start().catch(() => {
      // No adapter, no device, a blocked fetch: the still frame stays up and
      // the card is none the wiser.
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      device?.destroy();
    };
  }, [size]);

  return (
    <div className={className} style={{ ...style, width: size, height: size }}>
      {/* The design stacks a 16px-blurred copy of the orb under the sharp
       * one. Blitting the canvas into a second, blurred canvas every frame
       * reproduced that exactly and cost a full-layer blurred repaint at
       * 30fps for a bloom nobody can resolve at 55px. This is the same halo
       * as two static gradients, and it never repaints. */}
      <div
        ref={glowRef}
        aria-hidden
        className="pointer-events-none absolute -inset-[14px] opacity-0 transition-opacity duration-500"
        style={{
          background:
            "radial-gradient(circle at 50% 42%, rgba(167,249,50,0.42), rgba(167,249,50,0.12) 42%, transparent 68%)",
        }}
      />
      {/* The still frame, in the same two layers, for every browser that has
       * no WebGPU — and for the moment before the first rendered frame. The
       * blur is on the cropped circle, not the raw image, so the halo is the
       * sphere's own green rather than its black surround. */}
      <div
        ref={stillRef}
        aria-hidden
        className="absolute inset-0 transition-opacity duration-500"
      >
        <div className="absolute inset-0 overflow-hidden rounded-full" style={{ filter: "blur(16px)" }}>
          <img
            src="/images/bento/orb-aurora.webp"
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute max-w-none"
            style={CROP_STYLE}
          />
        </div>
        <div className="absolute inset-0 overflow-hidden rounded-full">
          <img
            src="/images/bento/orb-aurora.webp"
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute max-w-none"
            style={CROP_STYLE}
          />
        </div>
      </div>
      <div className="absolute inset-0 overflow-hidden rounded-full">
        <canvas
          ref={canvasRef}
          aria-hidden
          className="absolute opacity-0 transition-opacity duration-500"
          style={CROP_STYLE}
        />
      </div>
    </div>
  );
}
