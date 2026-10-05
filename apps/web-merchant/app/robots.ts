import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://dhruto.com";

/**
 * Authenticated/internal surfaces must never be indexed. The API is excluded
 * defensively in case it is ever served from the same origin.
 */
const DISALLOW = [
  "/*/dashboard",
  "/*/parcels",
  "/*/bookings",
  "/*/finance",
  "/*/hub",
  "/*/rider",
  "/*/intelligence",
  "/*/developer",
  "/*/login",
  "/*/register",
  "/api/",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: DISALLOW }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
