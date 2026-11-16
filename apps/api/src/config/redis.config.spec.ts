import { describe, it, expect } from "vitest";
import { buildRedisConfig } from "./redis.config.js";

describe("buildRedisConfig (Local Dev vs Production Upstash Quota Guard)", () => {
  const upstashRestUrl = "https://guided-mink-212973.upstash.io";
  const upstashRestToken = "test_upstash_secret_token_12345";
  const upstashTcpUrl = "rediss://default:token@guided-mink-212973.upstash.io:6379";

  it("defaults to local Redis (localhost:6379) in development when no env vars are set", () => {
    const config = buildRedisConfig({
      NODE_ENV: "development",
    } as NodeJS.ProcessEnv);

    expect(config.url).toBe("redis://localhost:6379");
    expect(config.host).toBe("localhost");
    expect(config.port).toBe(6379);
    expect(config.isProduction).toBe(false);
    expect(config.isUpstash).toBe(false);
    expect(config.targetSummary).toContain("Local Redis Engine");
  });

  it("uses explicit local REDIS_URL in development", () => {
    const config = buildRedisConfig({
      NODE_ENV: "development",
      REDIS_URL: "redis://127.0.0.1:6380",
    } as NodeJS.ProcessEnv);

    expect(config.url).toBe("redis://127.0.0.1:6380");
    expect(config.isProduction).toBe(false);
    expect(config.isUpstash).toBe(false);
  });

  it("guards against accidental Upstash usage in development when REDIS_URL points to Upstash", () => {
    const config = buildRedisConfig({
      NODE_ENV: "development",
      REDIS_URL: upstashTcpUrl,
    } as NodeJS.ProcessEnv);

    expect(config.url).toBe("redis://localhost:6379");
    expect(config.isProduction).toBe(false);
    expect(config.isUpstash).toBe(false);
    expect(config.targetSummary).toContain("Dev guard: Upstash bypassed to protect free quota");
  });

  it("guards against accidental Upstash usage in development when UPSTASH REST credentials are present", () => {
    const config = buildRedisConfig({
      NODE_ENV: "development",
      UPSTASH_REDIS_REST_URL: upstashRestUrl,
      UPSTASH_REDIS_REST_TOKEN: upstashRestToken,
    } as NodeJS.ProcessEnv);

    expect(config.url).toBe("redis://localhost:6379");
    expect(config.isProduction).toBe(false);
    expect(config.isUpstash).toBe(false);
  });

  it("allows Upstash in development only when USE_UPSTASH_IN_DEV is explicitly set to true", () => {
    const config = buildRedisConfig({
      NODE_ENV: "development",
      USE_UPSTASH_IN_DEV: "true",
      REDIS_URL: upstashTcpUrl,
    } as NodeJS.ProcessEnv);

    expect(config.url).toBe(upstashTcpUrl);
    expect(config.isUpstash).toBe(true);
    expect(config.targetSummary).toContain("guided-mink-212973.upstash.io");
  });

  it("synthesizes TLS rediss:// URL in production from UPSTASH credentials", () => {
    const config = buildRedisConfig({
      NODE_ENV: "production",
      UPSTASH_REDIS_REST_URL: upstashRestUrl,
      UPSTASH_REDIS_REST_TOKEN: upstashRestToken,
    } as NodeJS.ProcessEnv);

    expect(config.url).toContain("rediss://default:");
    expect(config.url).toContain("@guided-mink-212973.upstash.io:6379");
    expect(config.isProduction).toBe(true);
    expect(config.isUpstash).toBe(true);
    expect(config.targetSummary).toContain("guided-mink-212973.upstash.io");
  });

  it("masks credentials in targetSummary", () => {
    const config = buildRedisConfig({
      NODE_ENV: "production",
      REDIS_URL: "redis://username:supersecretpassword@redis.cluster.internal:6379",
    } as NodeJS.ProcessEnv);

    expect(config.targetSummary).toBe("redis://username:****@redis.cluster.internal:6379");
    expect(config.targetSummary).not.toContain("supersecretpassword");
  });
});
