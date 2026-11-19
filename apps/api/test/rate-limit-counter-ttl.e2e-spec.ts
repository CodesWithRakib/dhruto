import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Redis } from "ioredis";
import { INCR_WITH_WINDOW_LUA } from "../src/common/cache/cache.service.js";

/**
 * Regression: rate-limit counters were created with INCR and only given a
 * TTL when the count was exactly 1. Counters that missed that EXPIRE never
 * reset, so users were locked out permanently (seen in dev: chat-read
 * counters at 300+ with TTL -1). The atomic script must always leave a TTL.
 */
describe("Rate-limit counter TTL (atomic INCR + EXPIRE)", () => {
  let redis: Redis;
  const key = `rl:test-ttl:${Date.now()}`;

  beforeAll(() => {
    redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379/14");
  });

  afterAll(async () => {
    await redis.del(key);
    await redis.quit();
  });

  it("sets the window on a new counter", async () => {
    const [count, ttl] = (await redis.eval(INCR_WITH_WINDOW_LUA, 1, key, "60")) as [number, number];
    expect(count).toBe(1);
    expect(ttl).toBeGreaterThan(0);
    expect(await redis.ttl(key)).toBeGreaterThan(0);
  });

  it("heals a stuck counter that has no TTL", async () => {
    await redis.set(key, "418"); // what the dev data looked like: no expiry
    expect(await redis.ttl(key)).toBe(-1);
    const [count, ttl] = (await redis.eval(INCR_WITH_WINDOW_LUA, 1, key, "60")) as [number, number];
    expect(count).toBe(419);
    expect(ttl).toBe(60);
    expect(await redis.ttl(key)).toBeGreaterThan(0);
  });

  it("does not extend an existing window", async () => {
    await redis.set(key, "1", "EX", 30);
    const [, ttl] = (await redis.eval(INCR_WITH_WINDOW_LUA, 1, key, "60")) as [number, number];
    expect(ttl).toBeLessThanOrEqual(30);
  });
});
