import { describe, it, expect } from "vitest";
import { buildAuthConfig } from "./auth.config.js";

/**
 * T-SEC-05: fail-closed JWT configuration. Pure unit tests (no DB, no Nest).
 */
describe("buildAuthConfig (T-SEC-05 fail-closed)", () => {
  const strong = "a".repeat(32) + "b".repeat(8);

  it("throws in production when secrets are missing", () => {
    expect(() => buildAuthConfig({ NODE_ENV: "production" } as NodeJS.ProcessEnv)).toThrow(
      /JWT_ACCESS_SECRET must be set/,
    );
  });

  it("throws in production when a secret is empty", () => {
    expect(() =>
      buildAuthConfig({
        NODE_ENV: "production",
        JWT_ACCESS_SECRET: "   ",
        JWT_REFRESH_SECRET: strong,
      } as NodeJS.ProcessEnv),
    ).toThrow(/JWT_ACCESS_SECRET must be set/);
  });

  it("throws in production when a secret is shorter than 32 chars", () => {
    expect(() =>
      buildAuthConfig({
        NODE_ENV: "production",
        JWT_ACCESS_SECRET: "too-short",
        JWT_REFRESH_SECRET: strong,
      } as NodeJS.ProcessEnv),
    ).toThrow(/at least 32 characters/);
  });

  it("resolves explicit secrets in production", () => {
    const cfg = buildAuthConfig({
      NODE_ENV: "production",
      JWT_ACCESS_SECRET: strong,
      JWT_REFRESH_SECRET: strong,
    } as NodeJS.ProcessEnv);
    expect(cfg.jwtAccessSecret).toBe(strong);
    expect(cfg.jwtAccessExpiresIn).toBe("15m");
  });

  it("keeps explicit dev defaults outside production", () => {
    const cfg = buildAuthConfig({ NODE_ENV: "development" } as NodeJS.ProcessEnv);
    expect(cfg.jwtAccessSecret).toContain("dhruto_dev_");
    expect(cfg.jwtRefreshSecret).toContain("dhruto_dev_");
  });

  it("honours explicit expiry overrides", () => {
    const cfg = buildAuthConfig({
      NODE_ENV: "test",
      JWT_ACCESS_EXPIRES_IN: "5m",
    } as NodeJS.ProcessEnv);
    expect(cfg.jwtAccessExpiresIn).toBe("5m");
    expect(cfg.jwtRefreshExpiresIn).toBe("7d");
  });
});
