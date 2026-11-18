import type { INestApplication } from "@nestjs/common";

/**
 * Express `trust proxy` setting derived from the `TRUST_PROXY` env var.
 *
 * Client IPs (rate limiting, request logs) come from `req.ip`. Express only
 * reads `X-Forwarded-For` for `req.ip` when the immediate peer is a trusted
 * proxy, so a client talking to the API directly can no longer pick its own
 * IP by sending that header.
 *
 * Accepted values:
 *  - unset / "" / "false" / "0" → trust nothing (default; API exposed directly)
 *  - a positive integer         → number of proxy hops in front of the API
 *  - a comma list of IPs/CIDRs or Express presets ("loopback", "uniquelocal")
 *
 * `true` is rejected: it trusts every hop, which makes the header spoofable again.
 */
export type TrustProxySetting = false | number | string[];

const PRESETS = new Set(["loopback", "linklocal", "uniquelocal"]);
const IP_OR_CIDR = /^[0-9a-fA-F.:]+(\/\d{1,3})?$/;

export function parseTrustProxy(raw: string | undefined): TrustProxySetting {
  const value = raw?.trim().toLowerCase() ?? "";
  if (value === "" || value === "false" || value === "0") return false;
  if (value === "true") {
    throw new Error(
      'TRUST_PROXY=true would trust every hop and let clients spoof their IP. Use the number of proxies (e.g. "1") or their addresses.',
    );
  }
  if (/^\d+$/.test(value)) return Number(value);
  const entries = value.split(",").map((part) => part.trim()).filter(Boolean);
  const invalid = entries.filter((entry) => !PRESETS.has(entry) && !IP_OR_CIDR.test(entry));
  if (invalid.length > 0) {
    throw new Error(`Invalid TRUST_PROXY entries: ${invalid.join(", ")}`);
  }
  return entries;
}

/** Applies the setting to the underlying Express instance. */
export function applyTrustProxy(app: INestApplication, setting: TrustProxySetting): void {
  const instance = app.getHttpAdapter().getInstance() as { set: (k: string, v: unknown) => void };
  instance.set("trust proxy", setting);
}
