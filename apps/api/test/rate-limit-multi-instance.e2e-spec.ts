import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { type INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
import { DhrutoValidationPipe } from "../src/common/pipes/validation.pipe.js";
import { CacheService } from "../src/common/cache/cache.service.js";

/**
 * Phase 9 — multi-instance limiter check.
 *
 * Two Nest application instances share one Redis (Upstash in development,
 * local Redis wherever `REDIS_URL` points). The public tracking endpoint
 * allows 60 lookups/min per identity, so 70 lookups split across both
 * instances must yield exactly 60 passes + 10 throttled
 * (429 + `Retry-After` + `RATE_LIMIT_EXCEEDED`). Per-instance counters would
 * allow all 70 through — that outcome fails this spec.
 *
 * Tracking lookups are the probe because they are public (no auth needed),
 * read-only (unknown codes 404 without writing anything), and cheap.
 * Each run uses a distinct TEST-NET-2 `x-forwarded-for` identity so it owns
 * a fresh 60s window regardless of shared-counter persistence across reruns
 * (see the Phase 6 report on Upstash counter persistence).
 */
describe("Rate limit — shared counter across 2 API instances (Phase 9)", () => {
  let appA: INestApplication;
  let appB: INestApplication;
  let n = 0;
  const ip = () => `198.51.100.${10 + (n += 1)}`;

  const boot = async (): Promise<INestApplication> => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    const app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(new DhrutoValidationPipe());
    await app.init();
    return app;
  };

  beforeAll(async () => {
    appA = await boot();
    appB = await boot();
    // The shared counter only exists when Redis is reachable; without it each
    // instance falls back to its own memory window and sharing cannot hold.
    const cache = appA.get(CacheService);
    const probe = await cache.incr(`rl:probe:phase9:${Date.now()}`, 60);
    expect(
      probe,
      "shared Redis must be reachable for the multi-instance limiter check",
    ).not.toBeNull();
  }, 60000);

  afterAll(async () => {
    await appA?.close();
    await appB?.close();
  });

  it("70 lookups split across 2 instances share one 60/min budget", async () => {
    const client = ip();
    const code = `NOPE${Date.now().toString(36).toUpperCase()}`;
    const servers = [appA.getHttpServer(), appB.getHttpServer()];
    const attempts = await Promise.all(
      Array.from({ length: 70 }, (_, i) =>
        request(servers[i % 2] as never)
          .get(`/api/v1/tracking/${code}${i}`)
          .set("x-forwarded-for", client),
      ),
    );

    const ok = attempts.filter((r) => r.status !== 429);
    const throttled = attempts.filter((r) => r.status === 429);

    // Unknown codes never hit: every pass is a 404 lookup, never a side effect.
    expect(ok.every((r) => r.status === 404)).toBe(true);
    // The shared 60/min budget is exact across both instances.
    expect(ok.length).toBe(60);
    expect(throttled.length).toBe(10);
    expect(throttled[0]?.headers["retry-after"]).toBeTruthy();
    expect(JSON.stringify(throttled[0]?.body)).toContain("RATE_LIMIT_EXCEEDED");
  }, 60000);
});
