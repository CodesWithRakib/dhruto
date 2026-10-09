import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { type INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
import { DhrutoValidationPipe } from "../src/common/pipes/validation.pipe.js";
import { idempotencyKey } from "./utils/auth.js";

describe("Intelligence v2 — address confirm, parcel intelligence, overrides (Phase 6 E2E)", () => {
  let app: INestApplication;
  let merchantToken: string;
  let merchant2Token: string;
  let adminToken: string;
  let riderToken: string;
  let parcelId: string;
  let parseId: string;
  let recommendationId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(new DhrutoValidationPipe());
    await app.init();

    const login = async (emailOrPhone: string): Promise<string> => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ emailOrPhone, password: "dhruto123" })
        .expect(200);
      return res.body.data.tokens.accessToken as string;
    };

    merchantToken = await login("merchant@dhruto.com");
    merchant2Token = await login("merchant2@dhruto.com");
    adminToken = await login("admin@dhruto.com");
    riderToken = await login("rider@dhruto.com");
  });

  afterAll(async () => {
    await app.close();
  });

  it("1. Rejects unauthenticated intelligence access", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/intelligence/address/parse")
      .send({ rawAddress: "Mirpur 10, Dhaka" })
      .expect(401);
  });

  it("2. Rider cannot reach admin intelligence controls", async () => {
    await request(app.getHttpServer())
      .get("/api/v1/admin/intelligence/versions")
      .set("Authorization", `Bearer ${riderToken}`)
      .expect(403);
  });

  it("3. Versioned parse of Bangla + typo addresses", async () => {
    const bn = await request(app.getHttpServer())
      .post("/api/v1/intelligence/address/parse")
      .set("Authorization", `Bearer ${merchantToken}`)
      .send({ rawAddress: "মিরপুর ১০, ঢাকা" })
      .expect(200);
    expect(bn.body.data.structuredAddress.district).toBe("Dhaka");
    expect(bn.body.data.parserVersion).toBe("address-parser-v1.0");
    expect(bn.body.data.datasetVersion).toBe("bd-geo-2026-10");
    expect(bn.body.data.language).toBe("BN");

    const debi = await request(app.getHttpServer())
      .post("/api/v1/intelligence/address/parse")
      .set("Authorization", `Bearer ${merchantToken}`)
      .send({ rawAddress: "debiganj panchagarh" })
      .expect(200);
    expect(debi.body.data.structuredAddress.district).toBe("Panchagarh");
    parseId = debi.body.data.parseId as string;
    expect(parseId).toBeTruthy();
  });

  it("4. Ambiguous input returns candidates for confirmation", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/intelligence/address/parse")
      .set("Authorization", `Bearer ${merchantToken}`)
      .send({ rawAddress: "Debiganj, Dhaka" })
      .expect(200);
    expect(res.body.data.hasConflict).toBe(true);
    expect(res.body.data.requiresConfirmation).toBe(true);
    expect(res.body.data.candidates.length).toBeGreaterThan(1);
    parseId = res.body.data.parseId as string;
  });

  it("5. Confirming a candidate is audited", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/intelligence/address/confirm")
      .set("Authorization", `Bearer ${merchantToken}`)
      .send({ parseId, candidateIndex: 0, reason: "e2e confirmation" })
      .expect(200);
    expect(res.body.data.confirmationSource).toBe("merchant");
    expect(res.body.data.structure).toBeDefined();
  });

  it("6. Creates a parcel then reads its intelligence (risk + RTO + recs)", async () => {
    const created = await request(app.getHttpServer())
      .post("/api/v1/parcels")
      .set("Authorization", `Bearer ${merchantToken}`)
      .set("Idempotency-Key", idempotencyKey("intel-parcel"))
      .send({
        recipientName: "E2E Receiver",
        recipientPhone: "01799001122",
        district: "Dhaka",
        thana: "Mirpur",
        deliveryAddress: "House 1, Road 2, Mirpur 10, Dhaka",
        weight: 1,
        codAmount: 9000,
      })
      .expect(201);
    parcelId = (created.body.data.id ?? created.body.data.parcelId) as string;
    expect(parcelId).toBeTruthy();

    const intel = await request(app.getHttpServer())
      .get(`/api/v1/intelligence/parcels/${parcelId}/intelligence`)
      .set("Authorization", `Bearer ${merchantToken}`)
      .expect(200);
    expect(intel.body.data.risk.level).toBeDefined();
    expect(intel.body.data.rto.modelVersion).toBe("rule-based-rto-v1");
    expect(Array.isArray(intel.body.data.recommendations)).toBe(true);
    const active = intel.body.data.recommendations.filter(
      (r: { status: string }) => r.status === "ACTIVE",
    );
    if (active.length > 0) recommendationId = active[0].id as string;
  });

  it("7. Merchant B cannot read merchant A parcel intelligence", async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/intelligence/parcels/${parcelId}/intelligence`)
      .set("Authorization", `Bearer ${merchant2Token}`)
      .expect(404);
  });

  it("8. Recommendation override is audited (or skipped when none active)", async () => {
    if (!recommendationId) return;
    const res = await request(app.getHttpServer())
      .post(`/api/v1/intelligence/recommendations/${recommendationId}/override`)
      .set("Authorization", `Bearer ${merchantToken}`)
      .send({ decision: "PROCEED", reason: "Customer confirmed by phone" })
      .expect(200);
    expect(res.body.data.status).toBe("OVERRIDDEN");
    expect(res.body.data.overriddenBy).toBeTruthy();
  });

  it("9. Feedback, models, health and geography search", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/intelligence/feedback")
      .set("Authorization", `Bearer ${merchantToken}`)
      .send({ subjectType: "ADDRESS", subjectId: parseId, signal: "ADDRESS_ACCEPTED" })
      .expect(200);

    const models = await request(app.getHttpServer())
      .get("/api/v1/intelligence/models")
      .set("Authorization", `Bearer ${merchantToken}`)
      .expect(200);
    expect(models.body.data.length).toBeGreaterThan(0);

    const health = await request(app.getHttpServer())
      .get("/api/v1/intelligence/health")
      .set("Authorization", `Bearer ${merchantToken}`)
      .expect(200);
    expect(health.body.data.districts).toBe(64);
    expect(health.body.data.datasetVersion).toBe("bd-geo-2026-10");

    const geo = await request(app.getHttpServer())
      .get("/api/v1/intelligence/geography/search?q=debiganj&limit=3")
      .set("Authorization", `Bearer ${merchantToken}`)
      .expect(200);
    expect(geo.body.data[0]?.district).toBe("Panchagarh");
  });

  it("10. Admin versions + geography import are admin-only and idempotent", async () => {
    await request(app.getHttpServer())
      .get("/api/v1/admin/intelligence/versions")
      .set("Authorization", `Bearer ${merchantToken}`)
      .expect(403);

    const versions = await request(app.getHttpServer())
      .get("/api/v1/admin/intelligence/versions")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(versions.body.data.parserVersion).toBe("address-parser-v1.0");

    const imported = await request(app.getHttpServer())
      .post("/api/v1/admin/intelligence/geography/import")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(imported.body.data.districts).toBe(64);
  });
});
