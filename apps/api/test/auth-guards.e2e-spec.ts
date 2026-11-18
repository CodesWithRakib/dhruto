import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { type INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
import { applyTrustProxy } from "../src/common/http/trust-proxy.js";
import { DhrutoValidationPipe } from "../src/common/pipes/validation.pipe.js";
import { SEEDED_ACCOUNTS, bearer, idempotencyKey, loginToken } from "./utils/auth.js";

/**
 * T-SEC-04: global default-deny guards over HTTP.
 *
 * Proves anonymous rejection on protected routes, intact public routes,
 * role enforcement, and tenant isolation (merchant / hub / rider).
 */
describe("Global auth guards (T-SEC-04 E2E)", () => {
  let app: INestApplication;
  let merchantToken: string;
  let merchant2Token: string;
  let adminToken: string;
  let dhkToken: string;
  let ctgToken: string;
  let riderToken: string;
  let rider2Token: string;
  let merchantParcelId: string;
  let dhkHubId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // X-Forwarded-For arrives via a trusted local reverse proxy (TRUST_PROXY=loopback).
    applyTrustProxy(app, ["loopback"]);
    app.setGlobalPrefix("api/v1", {
      exclude: ["health", "health/(.*)"],
    });
    app.useGlobalPipes(new DhrutoValidationPipe());
    await app.init();

    [merchantToken, merchant2Token, adminToken, dhkToken, ctgToken] = await Promise.all([
      loginToken(app, SEEDED_ACCOUNTS.merchant),
      loginToken(app, SEEDED_ACCOUNTS.merchant2),
      loginToken(app, SEEDED_ACCOUNTS.admin),
      loginToken(app, SEEDED_ACCOUNTS.hubManager),
      loginToken(app, SEEDED_ACCOUNTS.hubManagerCtg),
    ]);
    [riderToken, rider2Token] = await Promise.all([
      loginToken(app, SEEDED_ACCOUNTS.rider),
      loginToken(app, "rider2@dhruto.com"),
    ]);

    const booked = await request(app.getHttpServer())
      .post("/api/v1/parcels")
      .set(bearer(merchantToken))
      .set("Idempotency-Key", idempotencyKey("guards"))
      .send({
        recipientName: "Guard Probe",
        recipientPhone: "01712345678",
        district: "Dhaka",
        thana: "Mirpur",
        deliveryAddress: "House 1, Road 1, Mirpur, Dhaka",
        codAmount: 500,
        weight: 1,
      })
      .expect(201);
    merchantParcelId = booked.body.data.id as string;

    const hubs = await request(app.getHttpServer())
      .get("/api/v1/hubs")
      .set(bearer(dhkToken))
      .expect(200);
    const dhk = (hubs.body.data as Array<{ code: string; id: string }>).find((h) =>
      h.code.includes("DHK"),
    );
    expect(dhk).toBeDefined();
    dhkHubId = dhk?.id as string;
  });

  afterAll(async () => {
    await app.close();
  });

  it("rejects anonymous access to protected routes with 401", async () => {
    await request(app.getHttpServer()).get("/api/v1/parcels").expect(401);
    await request(app.getHttpServer()).get("/api/v1/merchants/me").expect(401);
    await request(app.getHttpServer()).get("/api/v1/riders/me/tasks").expect(401);
    await request(app.getHttpServer()).get("/api/v1/finance/wallet/me").expect(401);
    await request(app.getHttpServer()).get("/api/v1/hubs").expect(401);
    await request(app.getHttpServer())
      .post("/api/v1/parcels")
      .set("Idempotency-Key", idempotencyKey("guards-anon"))
      .send({})
      .expect(401);
  });

  it("keeps explicitly public routes reachable", async () => {
    await request(app.getHttpServer()).get("/health").expect(200);
    // Unknown tracking code: 404 proves the public route executed (not 401).
    await request(app.getHttpServer()).get("/api/v1/tracking/DHR-20200101-ZZZZZZ").expect(404);
    // Bad credentials: 401 from the handler (not guard misconfiguration).
    await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .set("x-forwarded-for", "203.0.113.10")
      .send({ emailOrPhone: "nobody@dhruto.com", password: "wrong" })
      .expect(401);
  });

  it("rejects insufficient roles with 403", async () => {
    // Merchant cannot use rider terminal surfaces.
    await request(app.getHttpServer())
      .get("/api/v1/riders/me/tasks")
      .set(bearer(merchantToken))
      .expect(403);
    // Merchant cannot use hub operations.
    await request(app.getHttpServer()).get("/api/v1/hubs").set(bearer(merchantToken)).expect(403);
    // Rider cannot read merchant profile.
    await request(app.getHttpServer())
      .get("/api/v1/merchants/me")
      .set(bearer(riderToken))
      .expect(403);
    // CTG manager cannot read the DHK hub dashboard (cross-hub).
    await request(app.getHttpServer())
      .get("/api/v1/hubs/HUB-DHK-01/dashboard")
      .set(bearer(ctgToken))
      .expect(403);
  });

  it("isolates merchants from each other's parcels", async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/parcels/${merchantParcelId}`)
      .set(bearer(merchant2Token))
      .expect((res) => {
        expect([403, 404]).toContain(res.status);
      });
  });

  it("scopes hub managers to assigned hubs while admins bypass", async () => {
    await request(app.getHttpServer())
      .get("/api/v1/hubs/HUB-CTG-01/dashboard")
      .set(bearer(dhkToken))
      .expect(403);
    await request(app.getHttpServer())
      .get("/api/v1/hubs/HUB-CTG-01/dashboard")
      .set(bearer(adminToken))
      .expect(200);
    expect(dhkHubId).toBeDefined();
  });

  it("isolates riders from each other's tasks", async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/riders/me/tasks/${merchantParcelId}`)
      .set(bearer(rider2Token))
      .expect((res) => {
        expect([403, 404]).toContain(res.status);
      });
  });

  it("keeps admin access intact across protected surfaces", async () => {
    await request(app.getHttpServer()).get("/api/v1/parcels").set(bearer(adminToken)).expect(200);
    await request(app.getHttpServer())
      .get("/api/v1/admin/finance/overview")
      .set(bearer(adminToken))
      .expect(200);
  });
});
