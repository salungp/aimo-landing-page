/**
 * Prepares the WalletCards section backdrop from a source image.
 *
 * Figma 274:23729 draws the picture 2752x1536 — 191% of the 1440 frame, so
 * only its middle is ever on screen — at 40% opacity, behind a mask: a
 * 1132x617 stadium (fully rounded ends), 80% alpha, blurred by sigma 60. The
 * mask export is public/images/wallet/backdrop-mask.svg; its own 1372x857 box
 * is the blur's bleed, and it lands at 690,339 in the drawn picture.
 *
 * Unlike OneBalance's backdrop, the mask and the opacity are baked into the
 * alpha here rather than left to CSS. This section pins, and a `mask-image`
 * over a viewport-sized layer inside a sticky container is a masking pass the
 * browser re-runs as that container moves — the same cost that took Firefox to
 * 30fps in MarketsTogether (see .mt-texture in globals.css). Baked, the
 * element only has a picture to paint.
 *
 * So the output is the mask's own box, cropped out of the drawn picture, with
 * alpha = mask x 40%. Nothing outside it was ever visible. The section places
 * it back at the fractions of the frame it came from.
 *
 *   node scripts/build-wallet-backdrop.mjs <source-image> [width]
 *
 * Needs ffmpeg, rsvg-convert and cwebp (`brew install ffmpeg librsvg webp`).
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";

/* Figma's numbers, all in the drawn picture's own pixels. */
const DRAWN = { w: 2752, h: 1536 };
const CROP = { w: 1372, h: 857, x: 690, y: 339 };
/** The picture's layer opacity. The mask's own 80% is already in its alpha. */
const OPACITY = 0.4;

/* 1:1 with Figma at a 1440 frame. There is no more detail to be had — the
 * source is only 2752 across — and past this it is a blurred backdrop at a
 * third of an opacity, which is the last thing on the page that wants bytes. */
const DEFAULT_WIDTH = CROP.w;

const QUALITY = 82;

const [source, widthArg] = process.argv.slice(2);
if (!source) {
  console.error("usage: node scripts/build-wallet-backdrop.mjs <source-image> [width]");
  process.exit(1);
}

// Everything scales off the output width, so a larger one stays on Figma's
// geometry rather than needing a second set of numbers.
const width = Number(widthArg) || DEFAULT_WIDTH;
const k = width / CROP.w;
const px = (n) => Math.round(n * k);

const dir = join(process.cwd(), "public/images/wallet");
mkdirSync(dir, { recursive: true });
const mask = join(dir, "backdrop-mask.svg");
const tmpMask = join(dir, ".backdrop-mask.png");
const tmpCrop = join(dir, ".backdrop-crop.png");
const out = join(dir, "backdrop.webp");

const height = px(CROP.h);

// The mask at the output's own size: rsvg runs the export's Gaussian, so this
// is Figma's blur rather than an approximation of it.
execFileSync("rsvg-convert", ["-w", String(width), "-h", String(height), mask, "-o", tmpMask]);

execFileSync("ffmpeg", [
  "-v", "error", "-y", "-i", source,
  // Cover rather than stretch, so a source of any shape keeps its proportions,
  // then take the window the mask actually covers.
  "-vf", [
    `scale=${px(DRAWN.w)}:${px(DRAWN.h)}:force_original_aspect_ratio=increase:flags=lanczos`,
    `crop=${px(DRAWN.w)}:${px(DRAWN.h)}`,
    `crop=${width}:${height}:${px(CROP.x)}:${px(CROP.y)}`,
  ].join(","),
  tmpCrop,
]);

execFileSync("ffmpeg", [
  "-v", "error", "-y", "-i", tmpCrop, "-i", tmpMask,
  "-filter_complex",
  `[1:v]alphaextract,format=gray[a];[0:v][a]alphamerge,format=rgba,colorchannelmixer=aa=${OPACITY}`,
  join(dir, ".backdrop.png"),
]);

// -exact keeps the colour under transparent pixels, which webp is otherwise
// free to replace; without it the feathered edge picks up a fringe.
execFileSync("cwebp", [
  "-quiet", "-q", String(QUALITY), "-m", "6", "-alpha_q", "100", "-exact",
  join(dir, ".backdrop.png"), "-o", out,
]);

for (const f of [tmpMask, tmpCrop, join(dir, ".backdrop.png")]) unlinkSync(f);

console.log(`backdrop.webp written (${width}x${height})`);
