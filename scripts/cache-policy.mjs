/**
 * How long the browser may keep the files in public/.
 *
 * One definition, two consumers, because the two builds apply it by different
 * mechanisms and neither can see the other's:
 *
 *   - next.config.ts feeds it to headers(), which the Netlify Next.js adapter
 *     turns into real response headers on a normal build.
 *   - scripts/export-static.mjs writes it into out/_headers, because a static
 *     export drops headers() entirely (it has no server to run it).
 *
 * Change the policy here and both builds follow. The reasoning behind the
 * numbers themselves is in the comment above headers() in next.config.ts.
 */

/* The whole of public/, by top-level directory. Netlify's _headers matches
 * paths, not extensions, so directories are what both sides can express. */
export const CACHED_DIRS = ["images", "video"];

export const CACHE_CONTROL = "public, max-age=86400, stale-while-revalidate=604800";
