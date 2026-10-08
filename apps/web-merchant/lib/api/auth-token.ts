/**
 * Dhruto — single place that knows how access/refresh tokens are persisted.
 *
 * The project stores short-lived JWTs in localStorage (existing security
 * model: backend remains the authority, tokens are never logged, and only
 * `NEXT_PUBLIC_API_URL`/`NEXT_PUBLIC_SITE_URL`/`NEXT_PUBLIC_APP_NAME` are
 * client-exposed). Every reader — base query, file download, tests — goes
 * through here so quote-stripping and null-safety never drift between copies.
 */

const ACCESS_KEY = "dhruto_access_token";
const REFRESH_KEY = "dhruto_refresh_token";

/** Normalizes a persisted token: rejects empty/quoted/"null" placeholders. */
export function cleanTokenValue(value: string | null | undefined): string | null {
  if (!value || value === "undefined" || value === "null" || value.trim() === "") {
    return null;
  }
  const cleaned = value.replace(/^["']|["']$/g, "").trim();
  return cleaned === "" || cleaned === "undefined" || cleaned === "null" ? null : cleaned;
}

function readKey(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return cleanTokenValue(window.localStorage.getItem(key));
  } catch {
    return null;
  }
}

export function getStoredAccessToken(): string | null {
  return readKey(ACCESS_KEY);
}

export function getStoredRefreshToken(): string | null {
  return readKey(REFRESH_KEY);
}

export const TOKEN_STORAGE_KEYS = { ACCESS_KEY, REFRESH_KEY } as const;
