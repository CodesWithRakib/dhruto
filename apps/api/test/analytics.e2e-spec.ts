import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { type INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
import { ZodValidationPipe } from "nestjs-zod";

describe("Analytics & Operational Intelligence (Phase 7 E2E)", () => {
  let app: INestApplication;
  let merchantToken: string;
  let merchant2Token: string;
  let adminToken: string;
  let riderToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(new ZodValidationPipe());
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

  it("1. Merchant summary is tenant-isolated with real KPIs (no hardcoded numbers)", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/analytics/merchant/summary")
      .set("Authorization", `Bearer ${merchantToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    const data = res.body.data;
    expect(data.period).toBe("30d");
    expect(typeof data.kpis.totalOrders).toBe("number");
    expect(data.kpis.totalOrders).toBeGreaterThan(0);
    expect(typeof data.kpis.deliverySuccessRate).toBe("number");
    expect(typeof data.kpis.rtoRate).toBe("number");
    expect(typeof data.kpis.avgDeliveryHours).toBe("number");
    // Real latency from status history — never the old 21.4 stub.
    expect(data.kpis.avgDeliveryHours).not.toBe(21.4);
    expect(typeof data.financials.totalBookedCod).toBe("number");
    expect(Array.isArray(data.dailyTrends)).toBe(true);
    expect(Array.isArray(data.topDistricts)).toBe(true);
  });

  it("2. Unauthenticated analytics access is rejected", async () => {
    await request(app.getHttpServer()).get("/api/v1/analytics/overview").expect(401);
  });

  it("3. Merchant cannot reach admin-only comparison or operations", async () => {
    await request(app.getHttpServer())
      .get("/api/v1/analytics/merchants")
      .set("Authorization", `Bearer ${merchantToken}`)
      .expect(403);
    await request(app.getHttpServer())
      .get("/api/v1/analytics/operations/overview")
      .set("Authorization", `Bearer ${merchantToken}`)
      .expect(403);
  });

  it("4. Admin overview returns KPIs with previous-period deltas + trends", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/analytics/overview?preset=30d")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    const data = res.body.data;
    expect(data.kpis.totalParcels.value).toBeGreaterThan(0);
    expect(data.kpis.successRate).toHaveProperty("previous");
    expect(data.kpis.successRate).toHaveProperty("changePct");
    expect(Array.isArray(data.trends)).toBe(true);
    expect(data.range.timezone).toBe("Asia/Dhaka");
  });

  it("5. Invalid date ranges are rejected, not silently scanned", async () => {
    await request(app.getHttpServer())
      .get("/api/v1/analytics/overview?preset=custom")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(400);
    await request(app.getHttpServer())
      .get(
        "/api/v1/analytics/overview?preset=custom&from=2026-02-01T00:00:00%2B06:00&to=2026-01-01T00:00:00%2B06:00",
      )
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(400);
  });

  it("6. Parcel funnel + latency percentiles come from status history", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/analytics/parcels?preset=90d")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    const data = res.body.data;
    expect(data.funnel[0]?.stage).toBe("Created");
    expect(data.funnel[0]?.count).toBeGreaterThan(0);
    expect(data.latency).toHaveProperty("p50");
    expect(data.latency).toHaveProperty("p95");
    expect(data.latency).toHaveProperty("p99");
  });

  it("7. Merchant B sees only own parcels (cross-tenant denial by scope)", async () => {
    const a = await request(app.getHttpServer())
      .get("/api/v1/analytics/overview?preset=90d")
      .set("Authorization", `Bearer ${merchantToken}`)
      .expect(200);
    const b = await request(app.getHttpServer())
      .get("/api/v1/analytics/overview?preset=90d")
      .set("Authorization", `Bearer ${merchant2Token}`)
      .expect(200);
    expect(a.body.data.kpis.totalParcels.value).not.toBe(b.body.data.kpis.totalParcels.value);
  });

  it("8. RTO analytics use real attempt reasons; COD uses ledger math", async () => {
    const rto = await request(app.getHttpServer())
      .get("/api/v1/analytics/rto/v2?preset=90d")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(rto.body.data.rtoCount).toBeGreaterThan(0);
    expect(rto.body.data.byReason.length).toBeGreaterThan(0);
    expect(rto.body.data.byReason[0]).toHaveProperty("reason");

    const cod = await request(app.getHttpServer())
      .get("/api/v1/analytics/cod/v2?preset=90d")
      .set("Authorization", `Bearer ${merchantToken}`)
      .expect(200);
    expect(typeof cod.body.data.booked).toBe("number");
    expect(typeof cod.body.data.collected).toBe("number");
  });

  it("9. Hubs, riders, merchants, finance, notifications, intelligence endpoints", async () => {
    const hubs = await request(app.getHttpServer())
      .get("/api/v1/analytics/hubs?preset=30d")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(Array.isArray(hubs.body.data.hubs)).toBe(true);
    expect(hubs.body.data.hubs.length).toBeGreaterThan(0);
    expect(hubs.body.data.hubs[0]).toHaveProperty("backlog");

    const riders = await request(app.getHttpServer())
      .get("/api/v1/analytics/riders?preset=30d")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(Array.isArray(riders.body.data.riders)).toBe(true);

    const mine = await request(app.getHttpServer())
      .get("/api/v1/analytics/riders/me?preset=30d")
      .set("Authorization", `Bearer ${riderToken}`)
      .expect(200);
    expect(mine.body.data).toHaveProperty("rider");

    const merchants = await request(app.getHttpServer())
      .get("/api/v1/analytics/merchants?preset=30d")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(merchants.body.data.merchants.length).toBeGreaterThan(0);

    const finance = await request(app.getHttpServer())
      .get("/api/v1/analytics/finance?preset=90d")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(finance.body.data).toHaveProperty("sourceNote");

    const notif = await request(app.getHttpServer())
      .get("/api/v1/analytics/notifications?preset=30d")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(Array.isArray(notif.body.data.byChannel)).toBe(true);

    const intel = await request(app.getHttpServer())
      .get("/api/v1/analytics/intelligence?preset=90d")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(intel.body.data.address).toHaveProperty("parses");
    expect(intel.body.data.rto).toHaveProperty("insufficientData");
  });

  it("10. Alerts evaluate + acknowledge; exports generate CSV and XLSX", async () => {
    const evaluated = await request(app.getHttpServer())
      .post("/api/v1/analytics/alerts/evaluate?preset=30d")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(Array.isArray(evaluated.body.data)).toBe(true);

    const listed = await request(app.getHttpServer())
      .get("/api/v1/analytics/alerts")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(Array.isArray(listed.body.data)).toBe(true);
    if (listed.body.data.length > 0) {
      const ack = await request(app.getHttpServer())
        .post(`/api/v1/analytics/alerts/${listed.body.data[0].id}/ack`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
      expect(ack.body.data.status).toBe("ACKNOWLEDGED");
    }

    const csv = await request(app.getHttpServer())
      .post("/api/v1/analytics/reports")
      .set("Authorization", `Bearer ${merchantToken}`)
      .set("Idempotency-Key", `analytics-e2e-${Date.now()}`)
      .send({ dataset: "parcels", format: "csv", preset: "30d" })
      .expect(200);
    expect(csv.body.data.status).toBe("READY");

    const xlsx = await request(app.getHttpServer())
      .post("/api/v1/analytics/reports")
      .set("Authorization", `Bearer ${merchantToken}`)
      .set("Idempotency-Key", `analytics-e2e-xlsx-${Date.now()}`)
      .send({ dataset: "rto", format: "xlsx", preset: "30d" })
      .expect(200);
    expect(xlsx.body.data.status).toBe("READY");

    const download = await request(app.getHttpServer())
      .get(`/api/v1/analytics/reports/${csv.body.data.id}/download`)
      .set("Authorization", `Bearer ${merchantToken}`)
      .expect(200);
    expect(download.body.data.contentBase64).toBeTruthy();
    expect(download.body.data.format).toBe("csv");

    // Another merchant cannot download this export.
    await request(app.getHttpServer())
      .get(`/api/v1/analytics/reports/${csv.body.data.id}/download`)
      .set("Authorization", `Bearer ${merchant2Token}`)
      .expect(403);
  });

  it("11. Legacy endpoints keep shapes with real numbers (no synthetic filler)", async () => {
    const summary = await request(app.getHttpServer())
      .get("/api/v1/analytics/merchant/summary?period=90d")
      .set("Authorization", `Bearer ${merchantToken}`)
      .expect(200);
    expect(summary.body.data.period).toBe("90d");
    expect(summary.body.data.kpis.totalOrders).toBeGreaterThan(0);

    const ops = await request(app.getHttpServer())
      .get("/api/v1/analytics/operations/overview")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(ops.body.data.totalShipments).toBeGreaterThan(0);
    expect(ops.body.data.totalCodProcessed).not.toBe(15000);

    const rto = await request(app.getHttpServer())
      .get("/api/v1/analytics/rto")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(typeof rto.body.data.overallRtoRate).toBe("number");
  });
});
