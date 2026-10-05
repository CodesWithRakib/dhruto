/**
 * Extracts a user-facing message from an unknown thrown value.
 *
 * RTK Query rejects with `{ status, data }` where `data.message` comes from the
 * API error contract; plain `Error` instances carry `message`. Anything else
 * falls back to the provided default, so callers never need `any`.
 */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "object" && error !== null) {
    const candidate = error as {
      data?: { message?: unknown };
      message?: unknown;
    };

    const apiMessage = candidate.data?.message;
    if (typeof apiMessage === "string" && apiMessage.trim()) {
      return apiMessage;
    }
    if (typeof candidate.message === "string" && candidate.message.trim()) {
      return candidate.message;
    }
  }

  return fallback;
}
