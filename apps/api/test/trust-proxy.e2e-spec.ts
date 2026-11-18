import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { type INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
import { DhrutoValidationPipe } from "../src/common/pipes/validation.pipe.js";
import { CacheService } from "../src/common/cache/cache.service.js";

/**
 * Regression for the rate-limit bypass: with no trusted proxy (the default),
 * a client cannot escape per-IP limits by rotating X-Forwarded-For.
 */
describe("Rate limiting without a trusted proxy E2E", () => {
  let app: INestApplication;
  let cache: CacheService;
  const body = { district: "Dhaka", thana: "Mirpur", weight: 1, codAmount: 500 };
  const LOOPBACK_KEYS = [
    "rl:pricing-public-quote:ip:::ffff:127.0.0.1",
    "rl:pricing-public-quote:ip:127.0.0.1",
    "rl:pricing-public-quote:ip:::1",
  ];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication(); // TRUST_PROXY unset: trust nothing
    app.setGlobalPrefix("api/v1", { exclude: ["health", "health/(.*)"] });
    app.useGlobalPipes(new DhrutoValidationPipe());
    await app.init();
    cache = app.get<CacheService>(CacheService);
    for (const key of LOOPBACK_KEYS) await cache.del(key);
  });

  afterAll(async () => {
    for (const key of LOOPBACK_KEYS) await cache.del(key);
    await app.close();
  });

  it("ignores a rotating X-Forwarded-For header and still returns 429", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 31; i++) {
      const res = await request(app.getHttpServer())
        .post("/api/v1/pricing/quote")
        .set("X-Forwarded-For", `198.51.100.${i}`)
        .send(body);
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 30).every((s) => s === 200)).toBe(true);
    expect(statuses[30]).toBe(429);
  });
});
