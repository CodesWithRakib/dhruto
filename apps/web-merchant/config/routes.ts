/**
 * Dhruto — Centralized route definitions.
 * ------------------------------------------------------------------
 * Every navigation item, redirect and auth landing decision reads from
 * this map instead of repeating path strings across components.
 *
 * Paths are **locale-relative**: the next-intl `Link`/`router` prefixes the
 * active locale at runtime, so `/merchant/dashboard` renders as
 * `/en/merchant/dashboard`. Never include a locale here.
 *
 * The filesystem mirrors this map through Next.js route groups, which do NOT
 * appear in the URL:
 *   app/[locale]/(public)/track/page.tsx        ->  /en/track
 *   app/[locale]/(merchant)/merchant/...        ->  /en/merchant/...
 */

/** Matches the backend `UserRole` enum. */
export const PUBLIC_ROUTES = {
  home: "/",
  tracking: "/track",
  trackShipment: (code: string) => `/track/${code}`,
  services: "/services",
  pricing: "/pricing",
  status: "/status",
  about: "/about",
  contact: "/contact",
  faq: "/faq",
  privacy: "/privacy",
  terms: "/terms",
  workflow: "/workflow",
} as const;

export const AUTH_ROUTES = {
  login: "/login",
  register: "/register",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
} as const;

export const MERCHANT_ROUTES = {
  dashboard: "/merchant/dashboard",
  createBooking: "/merchant/bookings/new",
  calculator: "/merchant/calculator",
  parcels: "/merchant/parcels",
  parcel: (id: string) => `/merchant/parcels/${id}`,
  parcelLabel: (id: string) => `/merchant/parcels/${id}/label`,
  returns: "/merchant/returns",
  finance: "/merchant/finance",
  intelligence: "/merchant/intelligence",
  analytics: "/merchant/analytics",
  tracking: "/merchant/track",
  trackShipment: (code: string) => `/merchant/track/${code}`,
  webhooks: "/merchant/developer/webhooks",
  apiKeys: "/merchant/developer/api-keys",
  settings: "/merchant/settings",
  messages: "/merchant/messages",
  messageThread: (id: string) => `/merchant/messages/${id}`,
} as const;

export const ADMIN_ROUTES = {
  dashboard: "/admin/dashboard",
  parcels: "/admin/parcels",
  parcel: (id: string) => `/admin/parcels/${id}`,
  parcelLabel: (id: string) => `/admin/parcels/${id}/label`,
  finance: "/admin/finance",
  hub: "/admin/hub",
  rider: "/admin/rider",
  analytics: "/admin/analytics",
  integrations: "/admin/integrations",
  intelligence: "/admin/intelligence",
  tracking: "/admin/track",
  trackShipment: (code: string) => `/admin/track/${code}`,
  settings: "/admin/settings",
  messages: "/admin/messages",
  messageThread: (id: string) => `/admin/messages/${id}`,
  /** Phase 7 Admin Communication Center. */
  communications: "/admin/communications",
  communicationThread: (id: string) => `/admin/communications/${id}`,
} as const;

export const HUB_ROUTES = {
  dashboard: "/hub/dashboard",
  scanner: "/hub/scanner",
  parcels: "/hub/parcels",
  pickups: "/hub/pickups",
  bags: "/hub/bags",
  bag: (id: string) => `/hub/bags/${id}`,
  manifests: "/hub/manifests",
  manifest: (id: string) => `/hub/manifests/${id}`,
  exceptions: "/hub/exceptions",
  cash: "/hub/cash",
  settings: "/hub/settings",
  messages: "/hub/messages",
  messageThread: (id: string) => `/hub/messages/${id}`,
} as const;

export const RIDER_ROUTES = {
  dashboard: "/rider/dashboard",
  tasks: "/rider/tasks",
  task: (id: string) => `/rider/tasks/${id}`,
  history: "/rider/history",
  profile: "/rider/profile",
  settings: "/rider/settings",
  messages: "/rider/messages",
  messageThread: (id: string) => `/rider/messages/${id}`,
} as const;

export const CUSTOMER_ROUTES = {
  dashboard: "/customer/dashboard",
  tracking: "/customer/track",
  trackShipment: (code: string) => `/customer/track/${code}`,
  history: "/customer/history",
  settings: "/customer/settings",
  messages: "/customer/messages",
  messageThread: (id: string) => `/customer/messages/${id}`,
  notifications: "/customer/notifications",
} as const;

export const ROUTES = {
  public: PUBLIC_ROUTES,
  auth: AUTH_ROUTES,
  merchant: MERCHANT_ROUTES,
  admin: ADMIN_ROUTES,
  hub: HUB_ROUTES,
  rider: RIDER_ROUTES,
  customer: CUSTOMER_ROUTES,
} as const;

/**
 * Routes that require an authenticated session. Used by the client-side
 * guard and by `robots.ts`. Backend authorization remains authoritative —
 * this is defence in depth and UX only.
 */
export const PROTECTED_PREFIXES: string[] = ["/merchant", "/admin", "/hub", "/rider", "/customer"];

/** Public routes that are indexable by search engines. */
export const INDEXABLE_ROUTES: {
  path: string;
  priority: number;
  changeFrequency: "weekly" | "monthly" | "yearly";
}[] = [
  { path: PUBLIC_ROUTES.home, priority: 1, changeFrequency: "weekly" },
  { path: PUBLIC_ROUTES.services, priority: 0.9, changeFrequency: "monthly" },
  { path: PUBLIC_ROUTES.pricing, priority: 0.8, changeFrequency: "monthly" },
  { path: PUBLIC_ROUTES.tracking, priority: 0.8, changeFrequency: "weekly" },
  { path: PUBLIC_ROUTES.about, priority: 0.6, changeFrequency: "yearly" },
  { path: PUBLIC_ROUTES.contact, priority: 0.6, changeFrequency: "yearly" },
  { path: PUBLIC_ROUTES.faq, priority: 0.6, changeFrequency: "monthly" },
  { path: PUBLIC_ROUTES.privacy, priority: 0.3, changeFrequency: "yearly" },
  { path: PUBLIC_ROUTES.terms, priority: 0.3, changeFrequency: "yearly" },
];

/** Removes a leading `/<locale>` segment from a pathname, if present. */
export function stripLocale(pathname: string): string {
  const stripped = pathname.replace(/^\/(en|bn)(?=\/|$)/, "");
  return stripped.length === 0 ? "/" : stripped;
}

/**
 * True when `pathname` is exactly `href` or a nested route of it.
 * The dashboard index is treated as an exact match so it does not stay
 * highlighted while a sibling route is open.
 */
export function isActiveRoute(pathname: string, href: string): boolean {
  const clean = stripLocale(pathname);
  if (href === "/" || href.endsWith("/dashboard")) {
    return clean === href;
  }
  return clean === href || clean.startsWith(`${href}/`);
}

/** True when the pathname targets the authenticated application. */
export function isProtectedRoute(pathname: string): boolean {
  const clean = stripLocale(pathname);
  return PROTECTED_PREFIXES.some((prefix) => clean === prefix || clean.startsWith(`${prefix}/`));
}
