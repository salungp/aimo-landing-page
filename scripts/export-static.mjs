/**
 * Builds the page as plain files a client can upload anywhere.
 *
 *   npm run build:static
 *
 * Output is two things:
 *
 *   out/                          one .html per route, hashed CSS and JS under
 *                                 _next/, everything from public/. No Node
 *                                 process behind it.
 *   aimo-landing-page-<date>.zip  the same tree, ready to send to a client,
 *                                 with docs/CARA-UPLOAD.txt beside it.
 *
 * The archive holds the CONTENTS of out/ at its root, so index.html is the
 * top level and not one folder down. That is the failure this packaging
 * exists to prevent: absolute asset paths mean a site unpacked one level too
 * deep serves bare HTML with no CSS, which looks like a broken build rather
 * than a misplaced folder. The date in the filename is so nobody has to guess
 * which archive was the one they sent.
 *
 * What this build gives up, and what is done about it:
 *
 *   headers()  A static export has no server, so Next drops the Cache-Control
 *              rules from next.config.ts. Without them every file in public/
 *              is revalidated on each visit — about 40 requests and 1.5MB
 *              before the page can paint. This script writes out/_headers, so
 *              a Netlify upload keeps the policy. Any other host ignores that
 *              file; see the note it prints.
 *
 *   next/image The optimizer is not available, so images ship at their source
 *              size. Free here — the one next/image is an SVG logo, which the
 *              optimizer never touched.
 *
 * Nothing else on this page needs a server: three static routes, no API
 * routes, no server actions, no dynamic params.
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { CACHE_CONTROL, CACHED_DIRS } from "./cache-policy.mjs";

const OUT = "out";

execFileSync("npx", ["next", "build"], {
  stdio: "inherit",
  env: { ...process.env, STATIC_EXPORT: "1" },
});

/* public/ is copied into the export wholesale, Finder's droppings included.
 * They are gitignored, so they are invisible until they turn up in the folder
 * being handed to someone. */
let junk = 0;
const sweep = (dir) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) sweep(path);
    else if (name === ".DS_Store") {
      rmSync(path);
      junk += 1;
    }
  }
};
sweep(OUT);

/* Netlify reads _headers from the uploaded folder, which is how a drag-and-drop
 * deploy gets the caching that headers() would have applied. Matching is by
 * path, so this covers public/ a directory at a time. */
const headers = CACHED_DIRS.map((dir) => `/${dir}/*\n  Cache-Control: ${CACHE_CONTROL}\n`).join("\n");
writeFileSync(join(OUT, "_headers"), headers);

const bytes = (() => {
  let total = 0;
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      const info = statSync(path);
      if (info.isDirectory()) walk(path);
      else total += info.size;
    }
  };
  walk(OUT);
  return total;
})();

/* Packaged from inside out/ so the archive's root is the site itself. `zip -X`
 * leaves out the resource forks and extra attributes macOS would otherwise
 * bury in there. */
const stamp = new Date().toISOString().slice(0, 10);
const ZIP = `aimo-landing-page-${stamp}.zip`;
rmSync(ZIP, { force: true });
execFileSync("zip", ["-r", "-q", "-X", join("..", ZIP), ".", "-x", ".DS_Store", "-x", "__MACOSX/*"], {
  cwd: OUT,
  stdio: "inherit",
});
copyFileSync(join("docs", "CARA-UPLOAD.txt"), "CARA-UPLOAD.txt");

const zipMb = (statSync(ZIP).size / 1024 / 1024).toFixed(1);

console.log(`
out/ is ready — ${(bytes / 1024 / 1024).toFixed(1)}MB${junk ? `, ${junk} .DS_Store removed` : ""}.

Ready to send:

  ${ZIP}  ${zipMb}MB
  ${"CARA-UPLOAD.txt".padEnd(ZIP.length)}  instructions for whoever installs it

  Netlify   the client drags the .zip onto app.netlify.com/drop — no unzipping.
            _headers inside it is picked up automatically.

  Any other host: unzip and upload the CONTENTS to the web root. _headers is
  Netlify-only and will be ignored — to keep the caching, translate it into
  that host's own config (.htaccess on Apache, a location block on nginx).

To deploy it yourself instead: npx netlify-cli deploy --prod --dir=out
`);
