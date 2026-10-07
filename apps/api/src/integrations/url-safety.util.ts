import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { ApiErrorCode } from "@dhruto/contracts";

/** Cloud metadata endpoints that must never receive webhooks. */
const METADATA_HOSTS = new Set([
  "metadata.google.internal",
  "metadata.google.com",
  "instance-data",
  "169.254.169.254",
]);

function isPrivateIPv4(parts: number[]): boolean {
  const [a = -1, b = -1] = parts;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  return false;
}

function isPrivateIPv6(normalized: string): boolean {
  const lower = normalized.toLowerCase();
  return (
    lower === "::1" ||
    lower === "::" ||
    lower.startsWith("fc") ||
    lower.startsWith("fd") ||
    lower.startsWith("fe80") ||
    lower.startsWith("ff")
  );
}

function isBlockedIp(ip: string): boolean {
  if (METADATA_HOSTS.has(ip)) return true;
  const family = isIP(ip);
  if (family === 4) {
    return isPrivateIPv4(ip.split(".").map(Number));
  }
  if (family === 6) {
    return isPrivateIPv6(ip);
  }
  return true;
}

/**
 * Validates an outbound webhook URL against SSRF.
 *
 * Rejects non-HTTP(S) schemes, credentials in URL, blocked hosts, and any
 * hostname that resolves to a private/link-local/loopback/metadata address.
 * In production only HTTPS is accepted. DNS is resolved at validation time
 * (documented TOCTOU limitation: re-validated on every subscription update).
 *
 * Throws a 400-coded object with a machine-readable `error` for the filter.
 */
export async function assertSafeWebhookUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    throw { status: 400 as const, error: ApiErrorCode.WEBHOOK_INVALID_URL, message: "URL is not parseable" };
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw { status: 400 as const, error: ApiErrorCode.WEBHOOK_INVALID_URL, message: "Only http(s) URLs are allowed" };
  }
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw { status: 400 as const, error: ApiErrorCode.WEBHOOK_FORBIDDEN_URL, message: "HTTPS is required in production" };
  }
  if (url.username || url.password) {
    throw { status: 400 as const, error: ApiErrorCode.WEBHOOK_INVALID_URL, message: "Credentials must not be embedded in the URL" };
  }

  const host = url.hostname.toLowerCase();
  if (!host || host.length > 253) {
    throw { status: 400 as const, error: ApiErrorCode.WEBHOOK_INVALID_URL, message: "Invalid hostname" };
  }
  if (METADATA_HOSTS.has(host)) {
    throw { status: 400 as const, error: ApiErrorCode.WEBHOOK_FORBIDDEN_URL, message: "Destination is forbidden" };
  }

  if (isIP(host) !== 0) {
    if (isBlockedIp(host)) {
      throw { status: 400 as const, error: ApiErrorCode.WEBHOOK_FORBIDDEN_URL, message: "Destination resolves to a private address" };
    }
    return url;
  }

  if (host === "localhost") {
    throw { status: 400 as const, error: ApiErrorCode.WEBHOOK_FORBIDDEN_URL, message: "Destination is forbidden" };
  }

  let addresses: Array<{ address: string }>;
  try {
    addresses = await lookup(host, { all: true, verbatim: true });
  } catch {
    throw { status: 400 as const, error: ApiErrorCode.WEBHOOK_INVALID_URL, message: "Hostname does not resolve" };
  }
  if (addresses.length === 0 || addresses.some((entry) => isBlockedIp(entry.address))) {
    throw { status: 400 as const, error: ApiErrorCode.WEBHOOK_FORBIDDEN_URL, message: "Destination resolves to a private address" };
  }

  return url;
}

/** Masks a webhook secret for list responses: `dhr_***9f3a`. */
export function maskSecret(secret: string): string {
  if (secret.length <= 8) return "********";
  return `${secret.slice(0, 4)}***${secret.slice(-4)}`;
}
