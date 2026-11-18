import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { type INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
import { applyTrustProxy } from "../src/common/http/trust-proxy.js";
import { DhrutoValidationPipe } from "../src/common/pipes/validation.pipe.js";
import { CacheService } from "../src/common/cache/cache.service.js";

/**
 * Phase 10 — Redis-down limiter drill (T-OPS-03, code level).
 *
 * Boots the full application with Redis unreachable (dead loopback port) and
 * proves abuse protection stays ON: the guard falls back to its per-instance
 * memory window instead of failing open. Probe is the public tracking
 * endpoint (60/min per identity, read-only 404s for unknown codes).
 *
 * Env subtlety (`config/redis.config.ts resolveRedisUrl`): a localhost
 * `REDIS_URL` is ignored while Upstash REST credentials exist, so the drill
 * must clear `UPSTASH_REDIS_REST_URL/TOKEN` too — otherwise the app would
 * silently resolve back to Upstash and the drill would prove nothing.
 * Saved values are restored in `afterAll`.
 */
describe("Rate limit — Redis-down drill, memory fallback still throttles (Phase 10)", () => {
  let app: INestApplication;
  let n = 0;
  const ip = () => `203.0.113.${10 + (n += 1)}`;
  const savedEnv: Record<string, string | undefined> = {};

  beforeAll(async () => {
    for (const key of ["REDIS_URL", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"]) {
      savedEnv[key] = process.env[key];
    }
    process.env.REDIS_URL = "redis://127.0.0.1:6399";
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    // X-Forwarded-For arrives via a trusted local reverse proxy (TRUST_PROXY=loopback).
    applyTrustProxy(app, ["loopback"]);
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(new DhrutoValidationPipe());
    await app.init();

    const driver = app.get(CacheService).getHealth().driver;
    expect(driver).toBe("memory-fallback");
  }, 60000);

  afterAll(async () => {
    await app?.close();
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("61 lookups under one identity yield 60 passes + 1 throttled with Redis down", async () => {
    const client = ip();
    const code = `DOWN${Date.now().toString(36).toUpperCase()}`;
    // Sequential: deterministic against the memory window, no timing flakes.
    const statuses: number[] = [];
    let retryAfter: string | undefined;
    let body = "";
    for (let i = 0; i < 61; i += 1) {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/tracking/${code}${i}`)
        .set("x-forwarded-for", client);
      statuses.push(res.status);
      if (res.status === 429) {
        retryAfter = res.headers["retry-after"] as string | undefined;
        body = JSON.stringify(res.body);
      }
    }
    expect(statuses.filter((s) => s === 404).length).toBe(60);
    expect(statuses.filter((s) => s === 429).length).toBe(1);
    expect(retryAfter).toBeTruthy();
    expect(body).toContain("RATE_LIMIT_EXCEEDED");
  }, 60000);
});
