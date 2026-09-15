import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  // Dev only: lets a phone on the same Wi-Fi open the dev server at this Mac's
  // LAN address. Without it Next blocks the dev JS bundles for that origin, so
  // the page never hydrates (no autoplaying video, no scroll animations).
  // Update the IP if the Mac's local address changes. No effect in production.
  allowedDevOrigins: ["192.168.0.157"],
};

export default nextConfig;
