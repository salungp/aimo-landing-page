/**
 * Feathered edge so media's own background melts into the page.
 *
 * A Gaussian-blurred rounded rectangle used as an alpha mask, rather than two
 * linear gradients: linear ramps leave a visible "crease" where the fade
 * starts (Mach banding), and intersecting a horizontal and a vertical ramp
 * pinches the corners into hard diagonals. A blur falls off along a smooth
 * S-curve on every side and rounds the corners with it.
 *
 * Built in the media's own pixel space (viewBox = intrinsic size) so the blur
 * stays uniform on both landscape and portrait content, and inset by 3σ so the
 * mask is fully transparent at the element's edge — nothing left for rounded
 * corners to clip into a hard line.
 */
export function featherMask(width: number, height: number) {
  const base = Math.min(width, height);
  const sigma = base * 0.045;
  const inset = sigma * 3;
  const radius = base * 0.11;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">` +
    `<filter id="f" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${sigma}"/></filter>` +
    `<rect x="${inset}" y="${inset}" width="${width - 2 * inset}" height="${height - 2 * inset}" rx="${radius}" fill="#fff" filter="url(#f)"/>` +
    `</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** Style fragment applying the feathered mask at full size (with WebKit prefixes). */
export function featherMaskStyle(width: number, height: number) {
  const mask = featherMask(width, height);
  return {
    maskImage: mask,
    WebkitMaskImage: mask,
    maskSize: "100% 100%",
    WebkitMaskSize: "100% 100%",
    maskRepeat: "no-repeat",
    WebkitMaskRepeat: "no-repeat",
  } as const;
}
