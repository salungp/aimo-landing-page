import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import SmoothScroll from "@/components/SmoothScroll";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

const title = "AIMO — One grip for everything you trade";
const description =
  "Trade across spot, perps, predictions, and outcomes with dedicated wallets that stay connected in one place.";

export const metadata: Metadata = {
  /* Every social crawler that reads og:image or twitter:image wants an
   * absolute URL — a relative one fails silently on WhatsApp, LinkedIn and
   * Facebook's own crawler in particular. This is what turns the
   * opengraph-image.png / twitter-image.png file-convention images below
   * (and the icon/apple-icon ones) into absolute links instead of bare
   * paths. Site domain is aimo.xyz; swap this the day that changes. */
  metadataBase: new URL("https://aimo.xyz"),
  title,
  description,
  openGraph: {
    title,
    description,
    url: "https://aimo.xyz",
    siteName: "AIMO",
    type: "website",
    // en_US rather than the invalid bare "en" — Open Graph wants a locale,
    // not a language tag.
    locale: "en_US",
  },
  twitter: {
    // Without this, X/Threads fall back to the small "summary" card even
    // with a twitter-image file present — the large card is opt-in, not the
    // default the file convention implies.
    card: "summary_large_image",
    title,
    description,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-background text-white antialiased">
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
