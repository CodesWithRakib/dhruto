import type { MetadataRoute } from "next";
import { routing } from "../src/i18n/routing";
import { INDEXABLE_ROUTES } from "../config/routes";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://dhruto.com";

/** Public, indexable routes. Dashboard and auth surfaces are deliberately excluded. */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return INDEXABLE_ROUTES.flatMap((route) =>
    routing.locales.map((locale) => ({
      url: `${SITE_URL}/${locale}${route.path === "/" ? "" : route.path}`,
      lastModified,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
      alternates: {
        languages: Object.fromEntries(
          routing.locales.map((alt) => [
            alt,
            `${SITE_URL}/${alt}${route.path === "/" ? "" : route.path}`,
          ]),
        ),
      },
    })),
  );
}
