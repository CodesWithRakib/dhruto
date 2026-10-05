import createMiddleware from "next-intl/middleware";
import { routing } from "./src/i18n/routing";

export default createMiddleware(routing);

export const config = {
  /**
   * Match every application path so that links without a locale prefix
   * (e.g. `/bookings/new`) are redirected to the default locale instead of
   * 404ing. Excludes API routes, Next internals, Vercel internals and any
   * request for a file with an extension (`/robots.txt`, `/sitemap.xml`,
   * static assets).
   */
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};