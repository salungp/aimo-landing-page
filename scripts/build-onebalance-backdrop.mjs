/**
 * Prepares the OneBalance section backdrop from a source image.
 *
 * Only a resize and a re-encode: the mask and the 10% opacity are Figma's own
 * (244:1200), exported to public/images/one-balance/backdrop-mask.svg and
 * applied by the browser, so the image that ships here is the untouched
 * picture. Drop in a higher-resolution source and run this again — nothing
 * else has to change.
 *
 *   node scripts/build-onebalance-backdrop.mjs <source-image> [width]
 *
 * Needs ffmpeg and cwebp (`brew install ffmpeg webp`).
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";

/* Figma draws the image 1612x900 — 112% of the 1440 frame — and the section
 * keeps that ratio at every width. */
const DEFAULT_WIDTH = 1612;
const ASPECT = 1612 / 900;

/* The mask takes the image down to a tenth, so compression artefacts land a
 * tenth as hard; this is well below where any of them become visible. */
const QUALITY = 78;

const [source, widthArg] = process.argv.slice(2);
if (!source) {
  console.error("usage: node scripts/build-onebalance-backdrop.mjs <source-image> [width]");
  process.exit(1);
}

const width = Number(widthArg) || DEFAULT_WIDTH;
const height = Math.round(width / ASPECT);

const dir = join(process.cwd(), "public/images/one-balance");
mkdirSync(dir, { recursive: true });
const tmp = join(dir, ".backdrop.png");
const out = join(dir, "backdrop.webp");

execFileSync("ffmpeg", [
  "-v", "error", "-y", "-i", source,
  // Cover rather than stretch, so a source of any shape keeps its proportions.
  "-vf", `scale=${width}:${height}:force_original_aspect_ratio=increase:flags=lanczos,crop=${width}:${height}`,
  tmp,
]);
// -m 6 spends longer looking for a smaller file; this runs once.
execFileSync("cwebp", ["-quiet", "-q", String(QUALITY), "-m", "6", tmp, "-o", out]);
unlinkSync(tmp);

console.log(`backdrop.webp written (${width}x${height})`);
