import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { type INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
import { DhrutoValidationPipe } from "../src/common/pipes/validation.pipe.js";
import { CacheService } from "../src/common/cache/cache.service.js";
import { SEEDED_ACCOUNTS, bearer, loginToken } from "./utils/auth.js";

/**
 * Public pricing quote: anonymous visitors of the marketing /pricing page get
 * the same authoritative quote as merchants, while the authenticated
 * /pricing/calculate endpoint stays protected.
 */
describe("POST /pricing/quote (public) E2E", () => {
  let app: INestApplication;
  let merchantToken: string;
  const body = { district: "Sylhet", thana: "Zindabazar", weight: 2.5, codAmount: 1500 };
  const TEST_IPS = ["203.0.113.10", "203.0.113.11", "203.0.113.12", "203.0.113.13", "203.0.113.99"];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api/v1", { exclude: ["health", "health/(.*)"] });
    app.useGlobalPipes(new DhrutoValidationPipe());
    await app.init();
    merchantToken = await loginToken(app, SEEDED_ACCOUNTS.merchant);
    // Per-IP buckets live in Redis; reset this suite's test IPs so back-to-back
    // runs within the 60s window stay deterministic.
    const cache = app.get<CacheService>(CacheService);
    for (const ip of TEST_IPS) await cache.del(`rl:pricing-public-quote:ip:${ip}`);
  });

  afterAll(async () => {
    await app.close();
  });

  // Unique client IP per test keeps per-IP rate-limit buckets independent.
  const fromIp = (ip: string) => ({ "X-Forwarded-For": ip });

  it("returns a quote to anonymous callers", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/pricing/quote")
      .set(fromIp("203.0.113.10"))
      .send(body)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalFee).toBeGreaterThan(0);
  });

  it("matches the authenticated merchant calculation exactly", async () => {
    const [pub, auth] = await Promise.all([
      request(app.getHttpServer())
        .post("/api/v1/pricing/quote")
        .set(fromIp("203.0.113.11"))
        .send(body),
      request(app.getHttpServer())
        .post("/api/v1/pricing/calculate")
        .set(bearer(merchantToken))
        .send(body),
    ]);
    expect(pub.status).toBe(200);
    expect(auth.status).toBe(200);
    expect(pub.body.data).toEqual(auth.body.data);
  });

  it("validates input", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/pricing/quote")
      .set(fromIp("203.0.113.12"))
      .send({ district: "", weight: -1 })
      .expect((res) => expect([400, 422]).toContain(res.status));
  });

  it("keeps /pricing/calculate protected from anonymous callers", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/pricing/calculate")
      .set(fromIp("203.0.113.13"))
      .send(body)
      .expect(401);
  });

  it("rate-limits anonymous quotes per client (30/min)", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 31; i++) {
      const res = await request(app.getHttpServer())
        .post("/api/v1/pricing/quote")
        .set(fromIp("203.0.113.99"))
        .send(body);
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 30).every((s) => s === 200)).toBe(true);
    expect(statuses[30]).toBe(429);
  });
});
