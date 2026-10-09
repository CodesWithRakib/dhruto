import { describe, it, expect } from "vitest";
import { HttpException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RateLimitGuard } from "./rate-limit.guard.js";
import { RATE_LIMIT_KEY } from "./rate-limit.decorator.js";

/**
 * T-SEC-02: deterministic limiter tests (no DB, no clock control needed —
 * fresh scopes per test; window expiry is not asserted here).
 */
describe("RateLimitGuard (T-SEC-02)", () => {
  const metadata = { limit: 3, windowSeconds: 60, scope: "unit-test" };

  function makeGuard(
    cache: { incr?: () => Promise<{ count: number; ttlSeconds: number } | null> },
  ) {
    const reflector = {
      getAllAndOverride: (key: string) => (key === RATE_LIMIT_KEY ? metadata : undefined),
    } as unknown as Reflector;
    const cacheService = {
      incr: cache.incr ?? (async () => null),
      set: async () => {},
      get: async () => null,
    };
    const guard = new RateLimitGuard(reflector, cacheService as never);
    (RateLimitGuard as unknown as { inFlight: Map<string, unknown> }).inFlight.clear();
    return guard;
  }

  function ctx(ip = "10.0.0.1") {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ headers: { "x-forwarded-for": ip } }),
        getResponse: () => ({ setHeader: () => {} }),
      }),
    } as never;
  }

  it("allows requests below the limit", async () => {
    const guard = makeGuard({});
    expect(await guard.canActivate(ctx())).toBe(true);
    expect(await guard.canActivate(ctx())).toBe(true);
    expect(await guard.canActivate(ctx())).toBe(true);
  });

  it("rejects requests above the limit with 429 + Retry-After", async () => {
    const seen: string[] = [];
    const guard = makeGuard({});
    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ headers: { "x-forwarded-for": "10.0.0.2" } }),
        getResponse: () => ({ setHeader: (n: string, v: string) => seen.push(`${n}:${v}`) }),
      }),
    } as never;
    for (let i = 0; i < 3; i += 1) {
      expect(await guard.canActivate(context)).toBe(true);
    }
    try {
      await guard.canActivate(context);
      expect.unreachable("expected 429");
    } catch (err) {
      expect(err).toBeInstanceOf(HttpException);
      expect((err as HttpException).getStatus()).toBe(429);
      expect((err as HttpException).getResponse()).toMatchObject({
        error: "RATE_LIMIT_EXCEEDED",
      });
    }
    expect(seen.some((h) => h.startsWith("Retry-After:"))).toBe(true);
  });

  it("tracks identities independently", async () => {
    const guard = makeGuard({});
    for (let i = 0; i < 3; i += 1) {
      expect(await guard.canActivate(ctx("10.0.1.1"))).toBe(true);
    }
    // A different client is unaffected by the first client's usage.
    expect(await guard.canActivate(ctx("10.0.1.2"))).toBe(true);
  });

  it("passes through when no rate-limit metadata is set", async () => {
    const reflector = { getAllAndOverride: () => undefined } as unknown as Reflector;
    const guard = new RateLimitGuard(reflector, { incr: async () => null } as never);
    expect(await guard.canActivate(ctx())).toBe(true);
  });

  it("enforces the limit from the shared counter when Redis is available", async () => {
    let count = 0;
    const guard = makeGuard({
      incr: async () => ({ count: (count += 1), ttlSeconds: 60 }),
    });
    for (let i = 0; i < 3; i += 1) {
      expect(await guard.canActivate(ctx("10.0.2.1"))).toBe(true);
    }
    await expect(guard.canActivate(ctx("10.0.2.1"))).rejects.toBeInstanceOf(HttpException);
  });

  it("falls back to memory enforcement when shared storage fails", async () => {
    const guard = makeGuard({
      incr: async () => {
        throw new Error("redis down");
      },
    });
    for (let i = 0; i < 3; i += 1) {
      expect(await guard.canActivate(ctx("10.0.3.1"))).toBe(true);
    }
    // Protection stays ON despite the storage failure.
    await expect(guard.canActivate(ctx("10.0.3.1"))).rejects.toBeInstanceOf(HttpException);
  });

  it("serializes concurrent bursts to exactly limit successes", async () => {
    const guard = makeGuard({});
    const ip = "10.0.4.9";
    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        guard
          .canActivate(ctx(ip))
          .then(() => "ok")
          .catch((e: unknown) => ((e as HttpException)?.getStatus?.() === 429 ? "throttled" : "error")),
      ),
    );
    expect(results.filter((r) => r === "ok").length).toBe(3);
    expect(results.filter((r) => r === "throttled").length).toBe(7);
  });
});
