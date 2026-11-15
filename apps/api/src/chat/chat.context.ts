import { type AuthenticatedUser } from "../auth/jwt/jwt.interface.js";

/** Authenticated actor and request correlation for one chat operation. */
export interface ChatRequestContext {
  user: AuthenticatedUser;
  /** Sanitised request id (safe for the outbox contract and the audit log). */
  requestId: string | null;
}

const SAFE_REQUEST_ID = /^[A-Za-z0-9._:-]{1,128}$/;

/**
 * `X-Request-Id` is client-controlled. Only a short, safe token is
 * propagated; anything else is dropped and the outbox mints its own id.
 */
export function sanitizeRequestId(value: unknown): string | null {
  return typeof value === "string" && SAFE_REQUEST_ID.test(value) ? value : null;
}
