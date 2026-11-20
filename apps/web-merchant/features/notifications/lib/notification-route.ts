/**
 * Resolves a safe in-app route from a notification's metadata. Only known
 * role areas are allowed — never open redirects or external URLs.
 */
const ALLOWED_PREFIXES = ["/merchant/", "/admin/", "/hub/", "/rider/", "/customer/"] as const;
const ALLOWED_EXACT = new Set(["/merchant/parcels", "/merchant/finance"]);

export function resolveNotificationRoute(metadata: Record<string, unknown> | undefined | null): string | null {
  const route = metadata?.route;
  if (typeof route !== "string" || route.length === 0 || route.startsWith("//")) return null;
  if (ALLOWED_EXACT.has(route) || ALLOWED_PREFIXES.some((p) => route.startsWith(p))) return route;
  return null;
}
