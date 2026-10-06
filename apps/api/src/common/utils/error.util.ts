/**
 * Dhruto — error message extraction.
 * ------------------------------------------------------------------
 * `catch` bindings are `unknown` under strict TypeScript. This helper pulls a
 * human-readable message out of whatever was thrown without resorting to `any`,
 * and never swallows the failure: callers always receive a non-empty string.
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }

  if (typeof error === "object" && error !== null) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }
  }

  return fallback;
}
