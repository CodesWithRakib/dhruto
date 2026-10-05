import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./src/i18n/routing";

const intlMiddleware = createMiddleware(routing);

/**
 * Phase 1–7 shipped a flat route tree (`/dashboard`, `/parcels`, `/hub`, ...).
 * The route-group refactor moved those surfaces under role-prefixed URLs.
 * These permanent redirects keep old bookmarks, external links and any cached
 * navigation working without maintaining duplicate page implementations.
 *
 * Order matters: more specific patterns come first.
 */
const LEGACY_REDIRECTS: Array<[RegExp, string]> = [
  [/^\/parcels\/([^/]+)\/label\/?$/, "/merchant/parcels/$1/label"],
  [/^\/parcels\/([^/]+)\/?$/, "/merchant/parcels/$1"],
  [/^\/parcels\/?$/, "/merchant/parcels"],
  [/^\/bookings\/new\/?$/, "/merchant/bookings/new"],
  [/^\/bookings\/?$/, "/merchant/bookings/new"],
  [/^\/developer\/webhooks\/?$/, "/merchant/developer/webhooks"],
  [/^\/intelligence\/?$/, "/merchant/intelligence"],
  [/^\/finance\/?$/, "/merchant/finance"],
  [/^\/dashboard\/?$/, "/merchant/dashboard"],
  [/^\/hub\/?$/, "/hub/dashboard"],
  [/^\/rider\/?$/, "/rider/dashboard"],
];

function resolveLegacy(pathname: string): string | null {
  for (const [pattern, target] of LEGACY_REDIRECTS) {
    const match = pathname.match(pattern);
    if (match) {
      return target.replace(/\$(\d)/g, (_, index) => match[Number(index)] ?? "");
    }
  }
  return null;
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Split an optional locale prefix off before matching legacy paths.
  const localeMatch = pathname.match(/^\/(en|bn)(\/.*)?$/);
  const locale = localeMatch?.[1];
  const rest = locale ? localeMatch?.[2] || "/" : pathname;

  const target = resolveLegacy(rest);
  if (target) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale ?? routing.defaultLocale}${target}`;
    return NextResponse.redirect(url, 308);
  }

  return intlMiddleware(request);
}

export const config = {
  /**
   * Match every application path so that links without a locale prefix
   * (e.g. `/merchant/dashboard`) are redirected to the default locale instead
   * of 404ing. Excludes API routes, Next internals, Vercel internals and any
   * request for a file with an extension (`/robots.txt`, `/sitemap.xml`,
   * `manifest.webmanifest`, service worker, static assets) and generated PWA
   * icon routes (`/icons/192`, `/icons/512`, `/icons/maskable-512`) and the
   * generated `/icon` and `/apple-icon` favicon routes.
   */
  matcher: ["/((?!api|_next|_vercel|icon|apple-icon|.*\\..*).*)"],
};
