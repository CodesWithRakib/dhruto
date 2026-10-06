import type { MetadataRoute } from "next";

/**
 * Dhruto PWA manifest.
 * Served by Next at `/manifest.webmanifest` and referenced from the locale
 * layout metadata. Icons are generated at request time by the ImageResponse
 * routes under `app/icons/*` so the repo carries no binary brand assets.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dhruto — Logistics Operating System",
    short_name: "Dhruto",
    description:
      "Nationwide parcel delivery, cash-on-delivery collection, merchant automation and real-time tracking for Bangladesh.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#F8FAFC",
    theme_color: "#16A34A",
    lang: "en",
    dir: "ltr",
    categories: ["business", "productivity", "utilities"],
    icons: [
      {
        src: "/icons/192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/512",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Track a parcel", short_name: "Track", url: "/track" },
      { name: "Merchant dashboard", short_name: "Dashboard", url: "/merchant/dashboard" },
      { name: "Rider tasks", short_name: "Rider", url: "/rider/dashboard" },
    ],
  };
}
