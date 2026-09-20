/**
 * The uniform states the orb is driven between: one flat Float32Array each,
 * positional against the `Uniforms` struct in public/shaders/liquid-orb.wgsl.
 * Floats 0-1 are the canvas size and float 2 the clock (all three overwritten
 * every frame); 3-39 are the scalar controls; the colour bank starts at float
 * 40 and runs in RGBA quads.
 *
 * Values are rounded to six decimals from the editor's float64 print — every
 * one of them lands on the same float32 the editor exported, and the colours
 * are 8-bit channel fractions either way.
 *
 * **Only the `thinking` export is green.** The shader editor's `idle` state
 * is a blue/violet aurora (its colour bank runs navy -> teal -> steel blue ->
 * violet), so driving the orb between the two exported states made it cycle
 * from green to purple every few seconds. Both states this component actually
 * uses are therefore built on the green bank; `ORB_REST` is `thinking` with
 * its motion turned down, and the aurora stays green whatever the assistant
 * is doing. `ORB_IDLE` is kept for reference, unused.
 */

/** The editor's own idle state — blue/violet. Reference only; see above. */
export const ORB_IDLE = Object.freeze([
  1, 1, 0, 0.66, 0.72, 0.368, 1.764, 0.2356,
  1.785, 0.18, 0.36, 0.28, 0.2, 0.22, 0.7316, 10,
  0.005, 0, 0, 1, 0.42, 0.024, 2, 0.42,
  0.77, 0.23, 65, 0, 0, 1, 0.22, 0.25,
  0.72, 5, 0.42, 1.25, 0.55, 0.3, 1.2, 0.7,
  0.007843, 0.019608, 0.047059, 1, 0.113725, 0.4, 0.34902, 1,
  0.156863, 0.364706, 0.470588, 1, 0.32549, 0.243137, 0.458824, 1,
  0.572549, 0.713726, 0.701961, 1, 1, 1, 1, 1,
  0.654902, 0.976471, 0.196078, 1, 0.12549, 0.941176, 0.713726, 1,
  0.917647, 0.956863, 1, 1, 0.862745, 0.917647, 1, 1,
  0.003922, 0.007843, 0.027451, 1, 0.156863, 0.415686, 0.384314, 1,
  0.968627, 0.984314, 1, 1, 0.937255, 0.964706, 0.992157, 1,
  0.878431, 0.933333, 0.976471, 1, 0.831373, 0.901961, 0.968627, 1,
  0.733333, 0.835294, 0.952941, 1, 0.65098, 0.780392, 0.941176, 1,
  0.529412, 0.690196, 0.921569, 1, 0.435294, 0.619608, 0.909804, 1,
  0.435294, 0.619608, 0.909804, 1, 0.435294, 0.619608, 0.909804, 1,
  0.435294, 0.619608, 0.909804, 1, 0.435294, 0.619608, 0.909804, 1,
]);

/** The green aurora, driven hard: what the orb shows while answering. */
export const ORB_THINKING = Object.freeze([
  1, 1, 0, 3, 0.72, 0.4, 4.2, 0.62,
  2.1, 0.18, 0.36, 0.28, 0.2, 0.22, 1.18, 10,
  0.005, 0, 0, 1, 0.42, 0.08, 2, 0.42,
  0.77, 0.23, 65, 0, 0, 1, 0.22, 0.25,
  0.72, 5, 0.42, 1.25, 0.55, 0.3, 1.2, 0.7,
  0.011765, 0.031373, 0.086275, 1, 0.654902, 0.976471, 0.196078, 1,
  0.992157, 1, 0.980392, 1, 0.4, 0.678431, 0, 1,
  1, 1, 1, 1, 1, 1, 1, 1,
  0.654902, 0.976471, 0.196078, 1, 0.12549, 0.941176, 0.713726, 1,
  0.917647, 0.956863, 1, 1, 0.862745, 0.917647, 1, 1,
  0.003922, 0.007843, 0.027451, 1, 0.654902, 0.976471, 0.196078, 1,
  0.968627, 0.984314, 1, 1, 0.937255, 0.964706, 0.992157, 1,
  0.878431, 0.933333, 0.976471, 1, 0.831373, 0.901961, 0.968627, 1,
  0.733333, 0.835294, 0.952941, 1, 0.65098, 0.780392, 0.941176, 1,
  0.529412, 0.690196, 0.921569, 1, 0.435294, 0.619608, 0.909804, 1,
  0.435294, 0.619608, 0.909804, 1, 0.435294, 0.619608, 0.909804, 1,
  0.435294, 0.619608, 0.909804, 1, 0.435294, 0.619608, 0.909804, 1,
]);

/* The orb at rest: the same green bank, with the motion controls walked back
 * so it drifts instead of churning. Derived rather than pasted so the two
 * states cannot fall out of sync on colour — the only thing that differs is
 * this handful of scalars, by index into the struct. */
const REST_OVERRIDES: Record<number, number> = {
  3: 0.75, // speed      (answering: 3)
  6: 2.4, //  warp       (answering: 4.2)
  7: 0.42, // ridgeAmt   (answering: 0.62)
  14: 0.92, // exposure  (answering: 1.18)
  21: 0.05, // contourDeform (answering: 0.08)
};

/** Uniform state: the green aurora at rest. */
export const ORB_REST = Object.freeze(
  ORB_THINKING.map((value, i) => (i in REST_OVERRIDES ? REST_OVERRIDES[i] : value))
);
