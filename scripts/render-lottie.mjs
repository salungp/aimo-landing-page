/**
 * Pre-render a Lottie composition to an mp4, for breakpoints where shipping the
 * JSON is too expensive. Steps the animation frame by frame in a headless
 * browser and pipes the PNGs straight into ffmpeg, so nothing touches disk.
 *
 * Needs the dev server running (the JSON is fetched from it, same-origin).
 *
 *   node scripts/render-lottie.mjs <out.mp4> <json-path> <w> <h> <srcFps> <frames> <outFps>
 *
 * e.g. the mobile markets scene — 574x1241, 60fps, 1680 frames, out at 30:
 *   node scripts/render-lottie.mjs /tmp/m.mp4 /lottie/markets-together-mobile-2.json 574 1241 60 1680 30
 *
 * Renders at deviceScaleFactor 2, i.e. exactly twice the composition, so the
 * vectors are never resampled and the result holds up on a 3x phone screen.
 * Then: poster with `ffmpeg -vf select=eq(n\,0)` piped through `cwebp`.
 */
import { chromium } from "/Users/salungprastyo/Documents/aimo-landing-page/node_modules/playwright/index.mjs";
import { spawn } from "node:child_process";

const OUT = process.argv[2];
const SRC = process.argv[3];
const W = +process.argv[4];
const H = +process.argv[5];
const SRC_FPS = +process.argv[6];
const TOTAL = +process.argv[7];
const FPS = +process.argv[8];
const LOTTIE = "/Users/salungprastyo/Documents/aimo-landing-page/node_modules/lottie-web/build/player/lottie_svg.min.js";

const step = SRC_FPS / FPS;
const frames = Math.round(TOTAL / step);

const ff = spawn("ffmpeg", [
  "-y", "-v", "error",
  "-f", "image2pipe", "-vcodec", "png", "-framerate", String(FPS), "-i", "-",
  "-c:v", "libx264", "-preset", "slow", "-crf", "27",
  "-pix_fmt", "yuv420p", "-profile:v", "high", "-level", "4.2",
  // Every frame a candidate for the loop restart; no B-frame reordering delay.
  "-g", String(FPS * 4), "-movflags", "+faststart",
  OUT,
]);
ff.stderr.on("data", (d) => process.stderr.write(d));
const done = new Promise((res, rej) => {
  ff.on("close", (c) => (c === 0 ? res() : rej(new Error("ffmpeg " + c))));
});

const browser = await chromium.launch();
// deviceScaleFactor 2 renders the vectors at exactly twice the composition's
// size, so nothing is resampled on the way out.
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
await page.route("**/__render", (r) =>
  r.fulfill({
    contentType: "text/html",
    body: `<!doctype html><html><body style="margin:0;overflow:hidden"><div id="c" style="width:${W}px;height:${H}px"></div></body></html>`,
  }),
);
await page.goto("http://localhost:3000/__render", { waitUntil: "domcontentloaded" });
await page.addScriptTag({ path: LOTTIE });
await page.evaluate(async (src) => {
  const data = await (await fetch(src)).json();
  const anim = window.lottie.loadAnimation({
    container: document.getElementById("c"),
    renderer: "svg", loop: false, autoplay: false, animationData: data,
    rendererSettings: { preserveAspectRatio: "xMidYMid meet" },
  });
  await new Promise((r) => anim.addEventListener("DOMLoaded", r));
  window.__anim = anim;
}, SRC);

const t0 = Date.now();
for (let i = 0; i < frames; i++) {
  await page.evaluate((f) => {
    window.__anim.goToAndStop(f, true);
  }, i * step);
  const buf = await page.screenshot({ type: "png" });
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
  if (i % 60 === 0) {
    const per = (Date.now() - t0) / (i + 1);
    console.log(`${i}/${frames}  ${per.toFixed(0)}ms/frame  eta ${(((frames - i) * per) / 1000).toFixed(0)}s`);
  }
}
ff.stdin.end();
await browser.close();
await done;
console.log("encoded", OUT);
