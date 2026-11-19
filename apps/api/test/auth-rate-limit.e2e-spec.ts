import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { type INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
import { applyTrustProxy } from "../src/common/http/trust-proxy.js";
import { DhrutoValidationPipe } from "../src/common/pipes/validation.pipe.js";
import { realisticEmail, realisticName } from "./utils/realistic.js";

/**
 * T-SEC-02: authentication rate limiting over HTTP.
 *
 * Budgets (per IP, 60s windows): register 10, login 60, refresh 60.
 * Each test uses a distinct `x-forwarded-for` identity so tests are
 * independent of each other and of other suites (separate workers).
 * Synthetic credentials only; failed logins never lock accounts.
 */
describe("Auth rate limiting (T-SEC-02 E2E)", () => {
  let app: INestApplication;
  let n = 0;
  let pc = 0;
  const ip = () => `198.51.100.${100 + (n += 1)}`;
  // Unique 017XXXXXXXX phone per call (counter) and per run (timestamp).
  const phone = () => `017${String(10000000 + ((Date.now() + (pc += 1)) % 90000000))}`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // X-Forwarded-For arrives via a trusted local reverse proxy (TRUST_PROXY=loopback).
    applyTrustProxy(app, ["loopback"]);
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(new DhrutoValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("allows registrations below the limit", async () => {
    const client = ip();
    for (let i = 0; i < 3; i += 1) {
      await request(app.getHttpServer())
        .post("/api/v1/auth/register")
        .set("x-forwarded-for", client)
        .send({
          name: realisticName(),
          email: realisticEmail(),
          phone: phone(),
          password: "rateLimit123",
        })
        .expect(201);
    }
  });

  it("throttles registrations above 10/min with 429 + Retry-After", async () => {
    const client = ip();
    for (let i = 0; i < 10; i += 1) {
      await request(app.getHttpServer())
        .post("/api/v1/auth/register")
        .set("x-forwarded-for", client)
        .send({
          name: realisticName(),
          email: realisticEmail(),
          phone: phone(),
          password: "rateLimit123",
        })
        .expect(201);
    }
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .set("x-forwarded-for", client)
      .send({
        name: realisticName(),
        email: realisticEmail(),
        phone: phone(),
        password: "rateLimit123",
      })
      .expect(429);

    expect(res.headers["retry-after"]).toBeTruthy();
    expect(JSON.stringify(res.body)).toContain("RATE_LIMIT_EXCEEDED");

    // An independent client is unaffected.
    await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .set("x-forwarded-for", ip())
      .send({
        name: realisticName(),
        email: realisticEmail(),
        phone: phone(),
        password: "rateLimit123",
      })
      .expect(201);
  });

  it("throttles login bursts above 60/min without locking the account", async () => {
    const client = ip();
    const attempts = await Promise.all(
      Array.from({ length: 65 }, () =>
        request(app.getHttpServer())
          .post("/api/v1/auth/login")
          .set("x-forwarded-for", client)
          .send({ emailOrPhone: "nobody@dhruto.com", password: "wrong-password" }),
      ),
    );
    const throttled = attempts.filter((r) => r.status === 429);
    expect(throttled.length).toBeGreaterThan(0);
    expect(throttled[0]?.headers["retry-after"]).toBeTruthy();
    // Rejected attempts are 401 (bad credentials), never an account lockout.
    expect(attempts.filter((r) => r.status === 401).length).toBeGreaterThan(0);
  });
});

