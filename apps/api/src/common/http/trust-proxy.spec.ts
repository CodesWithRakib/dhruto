import { describe, it, expect } from "vitest";
import { parseTrustProxy } from "./trust-proxy.js";

describe("parseTrustProxy", () => {
  it("trusts nothing by default", () => {
    expect(parseTrustProxy(undefined)).toBe(false);
    expect(parseTrustProxy("")).toBe(false);
    expect(parseTrustProxy("false")).toBe(false);
    expect(parseTrustProxy("0")).toBe(false);
  });

  it("accepts a hop count", () => {
    expect(parseTrustProxy("1")).toBe(1);
    expect(parseTrustProxy(" 2 ")).toBe(2);
  });

  it("accepts presets, IPs and CIDRs", () => {
    expect(parseTrustProxy("loopback, 10.0.0.0/8, ::1")).toEqual(["loopback", "10.0.0.0/8", "::1"]);
  });

  it("rejects 'true' because it makes the header spoofable", () => {
    expect(() => parseTrustProxy("true")).toThrow(/spoof/);
  });

  it("rejects malformed entries instead of silently trusting them", () => {
    expect(() => parseTrustProxy("loopback, evil.example.com")).toThrow(/evil\.example\.com/);
  });
});
