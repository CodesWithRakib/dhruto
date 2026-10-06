import { ApiErrorCode } from "@dhruto/contracts";

/**
 * Dhruto — API error → translation key mapping.
 * ------------------------------------------------------------------
 * Maps a rejected RTK Query request onto a key in the `ApiErrors` message
 * namespace. Components translate that key, so a 409/429/500 always surfaces a
 * bilingual message instead of a raw backend string.
 *
 * Returns `null` when the error carries no recognisable status, letting callers
 * fall back to the server-provided message.
 */
export function getApiErrorKey(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;

  const candidate = error as {
    status?: unknown;
    data?: { errorCode?: unknown };
  };

  if (candidate.status === "FETCH_ERROR" || candidate.status === "TIMEOUT_ERROR") {
    return "network";
  }

  switch (candidate.data?.errorCode) {
    case ApiErrorCode.UNAUTHORIZED:
      return "unauthorized";
    case ApiErrorCode.FORBIDDEN:
      return "forbidden";
    case ApiErrorCode.PARCEL_NOT_FOUND:
    case ApiErrorCode.TRACKING_NOT_FOUND:
    case ApiErrorCode.MERCHANT_NOT_FOUND:
      return "notFound";
    case ApiErrorCode.IDEMPOTENCY_CONFLICT:
      return "conflict";
    case ApiErrorCode.IDEMPOTENCY_IN_PROGRESS:
      return "idempotencyInProgress";
    case ApiErrorCode.IDEMPOTENCY_KEY_REQUIRED:
      return "validation";
    case ApiErrorCode.VALIDATION_ERROR:
    case ApiErrorCode.INVALID_STATUS_TRANSITION:
      return "validation";
    case ApiErrorCode.RATE_LIMIT_EXCEEDED:
      return "rateLimited";
    case ApiErrorCode.INTERNAL_SERVER_ERROR:
      return "server";
    default:
      break;
  }

  if (typeof candidate.status === "number") {
    if (candidate.status === 401) return "unauthorized";
    if (candidate.status === 403) return "forbidden";
    if (candidate.status === 404) return "notFound";
    if (candidate.status === 409) return "conflict";
    if (candidate.status === 422) return "validation";
    if (candidate.status === 429) return "rateLimited";
    if (candidate.status >= 500) return "server";
  }

  return null;
}
