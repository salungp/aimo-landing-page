import type { ConnectorIconPlacement } from "./draw";

/**
 * Node artwork: the five market icons already shipped for the orbit/hero
 * sections feed the input (source) nodes, the Aimo mark — the wordmark's own
 * "A" glyph, isolated as a standalone icon — feeds the hub, and the output
 * nodes reuse the Main Wallet icon from the wallet-cards section, since the
 * output side represents money landing in your (unified) Aimo wallet.
 */
const SOURCE_ICON_SRC = [
  "/images/orbit/token-bitcoin.svg",
  "/images/orbit/token-hl.svg",
  "/images/orbit/token-polymarket.svg",
  "/images/orbit/token-sol.svg",
  "/images/orbit/token-eth.svg",
] as const;

const HUB_ICON_SRC = "/images/shared/mark-dark.svg";
const OUTPUT_ICON_SRC = "/images/wallets/main-icon.svg";

const cache = new Map<string, HTMLImageElement>();

function loadIcon(src: string): HTMLImageElement | null {
  if (typeof Image === "undefined") return null;
  let image = cache.get(src);
  if (!image) {
    image = new Image();
    image.decoding = "async";
    image.src = src;
    cache.set(src, image);
  }
  return image.complete && image.naturalWidth > 0 ? image : null;
}

const SOURCE_ARTWORK_SCALE = 0.5;
const HUB_ARTWORK_SCALE = 0.56;
const OUTPUT_ARTWORK_SCALE = 0.62;

export function connectorIconLookup(
  side: "input" | "output",
  index: number,
): ConnectorIconPlacement | null {
  if (side === "output") {
    const image = loadIcon(OUTPUT_ICON_SRC);
    return image ? { image, scale: OUTPUT_ARTWORK_SCALE } : null;
  }
  const src = SOURCE_ICON_SRC[index % SOURCE_ICON_SRC.length];
  const image = loadIcon(src);
  return image ? { image, scale: SOURCE_ARTWORK_SCALE } : null;
}

export function connectorHubLogo(): ConnectorIconPlacement | null {
  const image = loadIcon(HUB_ICON_SRC);
  return image ? { image, scale: HUB_ARTWORK_SCALE } : null;
}

/** Kicks off decoding early so icons are already warm by first paint. */
export function preloadConnectorIcons(): void {
  for (const src of SOURCE_ICON_SRC) loadIcon(src);
  loadIcon(HUB_ICON_SRC);
  loadIcon(OUTPUT_ICON_SRC);
}
