"use client";

import { useEffect } from "react";

/* `loading="lazy"` only reaches <img>. A CSS background or mask is fetched as
 * soon as its element renders, wherever it sits, so without this every
 * section's textures and masks download with the hero — competing with the
 * hero video and fonts for the first second of the visit.
 *
 * A section opts in with `data-defer`; once it comes within a screen of the
 * viewport it gets `data-near`, and the rules in globals.css only name the
 * image URLs under that attribute. A screen ahead is the same head start the
 * browser gives a lazy <img>. Set once and never removed, so nothing is
 * refetched or repainted on the way back up. */
export default function DeferAssets() {
  useEffect(() => {
    const targets = document.querySelectorAll<HTMLElement>("[data-defer]");
    const markNear = (el: Element) => el.setAttribute("data-near", "");

    if (typeof IntersectionObserver === "undefined") {
      targets.forEach(markNear);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          markNear(entry.target);
          io.unobserve(entry.target);
        }
      },
      { rootMargin: "100% 0px" },
    );
    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return null;
}
