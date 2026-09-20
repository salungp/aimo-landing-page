import type { NextConfig } from "next";
import { CACHE_CONTROL } from "./scripts/cache-policy.mjs";

/* `npm run build:static` sets this. It produces out/ — plain HTML, CSS and JS
 * a client can drag onto any host — instead of the server build that Netlify's
 * Next.js adapter runs. See scripts/export-static.mjs for what the mode costs
 * and how the difference is made up. Unset, nothing below changes. */
const staticExport = process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  // Dev only: lets a phone on the same Wi-Fi open the dev server at this Mac's
  // LAN address. Without it Next blocks the dev JS bundles for that origin, so
  // the page never hydrates (no autoplaying video, no scroll animations).
  // Update the IP if the Mac's local address changes. No effect in production.
  allowedDevOrigins: ["192.168.0.157"],

  ...(staticExport
    ? {
        output: "export" as const,

        /* Emits privacy-policy/index.html rather than privacy-policy.html, so
         * the links work on a dumb file server that does not know to try
         * `.html`. Netlify would resolve either; Apache and nginx out of the
         * box would not. */
        trailingSlash: true,

        /* A static export has no image optimizer to call. Costs nothing here:
         * the only next/image on the page is the logo, and it is an SVG, which
         * the optimizer passes through untouched either way. */
        images: { unoptimized: true },
      }
    : {}),

  // Everything Next builds is content-hashed and already served immutable for a
  // year. Everything in `public/` is not: the default for those is
  // `max-age=0`, so a returning visitor re-validates every one of them — on
  // this page that is ~40 conditional requests, for about 1.5MB of pictures and
  // video that had not changed, before anything can paint.
  //
  // A day of freshness plus a week of stale-while-revalidate is the compromise
  // these filenames allow. They are stable (`hero-bg-loop.mp4` keeps its name
  // when the clip behind it is replaced), so `immutable` would leave visitors
  // holding a replaced asset until their cache evicted it. As written, a
  // replacement is picked up within a day, or on the next load after one
  // visitor has been served the stale copy once.
  //
  // If these assets ever get content-hashed names, raise this to
  // `max-age=31536000, immutable` and drop the revalidation entirely.
  //
  // Static exports do not support headers() — there is no server to apply it —
  // so that build writes the same policy to out/_headers instead. The values
  // live in scripts/cache-policy.mjs so the two cannot drift.
  ...(staticExport
    ? {}
    : {
        async headers() {
          return [
            {
              source: "/:path*.(webp|png|jpg|jpeg|svg|avif|mp4|webm|json|woff2)",
              headers: [{ key: "Cache-Control", value: CACHE_CONTROL }],
            },
          ];
        },
      }),
};

export default nextConfig;
