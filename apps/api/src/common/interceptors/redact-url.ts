/**
 * Query parameters whose VALUES must never reach application logs (Phase 7
 * security review): staff justifications (`reason` — may contain case
 * details), free-text search (`q`), and anything credential-like.
 */
const SENSITIVE_QUERY_KEYS = new Set([
  "reason",
  "q",
  "token",
  "access_token",
  "refresh_token",
  "signature",
  "x-amz-signature",
  "x-amz-credential",
]);

/** Returns `url` with sensitive query values replaced by `[redacted]` (keys kept for debugging). */
export function redactUrl(url: string | undefined): string {
  if (!url) return "unknown";
  const index = url.indexOf("?");
  if (index < 0) return url;
  const path = url.slice(0, index);
  const params = url
    .slice(index + 1)
    .split("&")
    .map((pair) => {
      const eq = pair.indexOf("=");
      const rawKey = eq < 0 ? pair : pair.slice(0, eq);
      let key = rawKey;
      try {
        key = decodeURIComponent(rawKey.replace(/\+/g, " "));
      } catch {
        // keep raw key
      }
      return SENSITIVE_QUERY_KEYS.has(key.toLowerCase()) ? `${rawKey}=[redacted]` : pair;
    });
  return `${path}?${params.join("&")}`;
}
