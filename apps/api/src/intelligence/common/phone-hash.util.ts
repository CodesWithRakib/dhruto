import { createHmac } from "node:crypto";
import { normalizeBangladeshPhone, BANGLADESH_PHONE_REGEX } from "@dhruto/contracts";

/**
 * Phone privacy for intelligence matching/history.
 *
 * Raw phone numbers never enter logs, feature rows or prediction rows — only
 * the HMAC below. The pepper comes from server configuration (never committed).
 */
function pepper(): string {
  return (
    process.env.INTELLIGENCE_PHONE_PEPPER?.trim() ||
    process.env.JWT_ACCESS_SECRET?.trim() ||
    "dhruto-dev-phone-pepper-change-in-production"
  );
}

/** Canonical 11-digit form (`01XXXXXXXXX`) for matching. */
export function canonicalPhone(input: string): string {
  return normalizeBangladeshPhone(input);
}

export function isValidBangladeshPhone(input: string): boolean {
  return BANGLADESH_PHONE_REGEX.test(canonicalPhone(input));
}

/** Keyed hash for recipient identity in intelligence tables. */
export function hashPhone(input: string): string {
  return createHmac("sha256", pepper()).update(canonicalPhone(input)).digest("hex");
}

/** Last digits for support display only (never for identity joins). */
export function maskPhone(input: string): string {
  const canonical = canonicalPhone(input);
  if (canonical.length < 4) return "****";
  return `****${canonical.slice(-4)}`;
}
