import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test, type TestingModule } from "@nestjs/testing";
import { type INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
import { ParcelStatus, BagStatus, HubScanType } from "@dhruto/contracts";
import {
  SEEDED_ACCOUNTS,
  bearer,
  idempotencyKey,
  loginToken,
} from "./utils/auth.js";

describe("Hub Operations & Cross-Hub Transit Lifecycle (E2E / Integration)", () => {
  let app: INestApplication;
  let merchantToken: string;
  let originHubId: string;
  let destinationHubId: string;
  let testParcelId: string;
  let testTrackingCode: string;
  let testBagId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api/v1");
    await app.init();

    merchantToken = await loginToken(app, SEEDED_ACCOUNTS.merchant);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it("Step 1: GET /api/v1/hubs - lists seeded hubs", async () => {
    const res = await request(app.getHttpServer()).get("/api/v1/hubs").expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);

    const dhkHub = res.body.data.find((h: { code: string }) => h.code === "HUB-DHK-01");
    originHubId = dhkHub ? dhkHub.id : res.body.data[0].id;

    const ctgHub = res.body.data.find((h: { code: string }) => h.code === "HUB-CTG-01");
    destinationHubId = ctgHub ? ctgHub.id : originHubId;
  });

  it("Step 2: POST /api/v1/parcels - books a new parcel destined for Chittagong", async () => {
    const booking = {
      recipientName: "Shahadat Hossain",
      recipientPhone: "01712345678",
      district: "Chittagong",
      thana: "Panchlaish",
      deliveryAddress: "GEC Circle, Nasirabad, Chittagong",
      codAmount: 3000,
      weight: 1.5,
    };

    const res = await request(app.getHttpServer())
      .post("/api/v1/parcels")
      .set(bearer(merchantToken))
      .set("Idempotency-Key", idempotencyKey("hubs-parcel"))
      .send(booking)
      .expect(201);

    expect(res.body.success).toBe(true);
    testParcelId = res.body.data.id;
    testTrackingCode = res.body.data.trackingCode;
    expect(res.body.data.status).toBe(ParcelStatus.CREATED);
  });

  it("Step 3: POST /api/v1/hubs/:id/scans (RECEIVE_INBOUND) - Origin Hub checks in the parcel", async () => {
    const scanPayload = {
      barcode: testTrackingCode,
      scanType: HubScanType.RECEIVE_INBOUND,
    };

    const res = await request(app.getHttpServer())
      .post(`/api/v1/hubs/${originHubId}/scans`)
      .send(scanPayload)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.currentStatus).toBe(ParcelStatus.ORIGIN_HUB_RECEIVED);

    // Verify parcel status in DB
    const check = await request(app.getHttpServer())
      .get(`/api/v1/parcels/${testParcelId}`)
      .set(bearer(merchantToken))
      .expect(200);
    expect(check.body.data.status).toBe(ParcelStatus.ORIGIN_HUB_RECEIVED);
  });

  it("Step 4: POST /api/v1/bags - creates transit bag from Origin to Destination Hub", async () => {
    const bagPayload = {
      destinationHubId,
      sealTag: "SEAL-2026-001",
    };

    const res = await request(app.getHttpServer())
      .post(`/api/v1/bags?originHubId=${originHubId}`)
      .send(bagPayload)
      .expect(201);

    expect(res.body.success).toBe(true);
    testBagId = res.body.data.id;
    expect(res.body.data.status).toBe(BagStatus.OPEN);
  });

  it("Step 5: POST /api/v1/bags/:id/parcels - packs the parcel into the bag", async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/bags/${testBagId}/parcels`)
      .send({ parcelTrackingCode: testTrackingCode })
      .expect(200);

    expect(res.body.success).toBe(true);

    // Verify parcel status transitioned to BAGGED
    const check = await request(app.getHttpServer())
      .get(`/api/v1/parcels/${testParcelId}`)
      .set(bearer(merchantToken))
      .expect(200);
    expect(check.body.data.status).toBe(ParcelStatus.BAGGED);
  });

  it("Step 6: POST /api/v1/bags/:id/seal - seals the bag", async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/bags/${testBagId}/seal`)
      .send({ sealTag: "SEAL-TAMPER-PROOF-99" })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe(BagStatus.SEALED);
  });

  it("Step 7: POST /api/v1/bags/:id/dispatch - dispatches bag into line-haul transit", async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/bags/${testBagId}/dispatch`)
      .send()
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe(BagStatus.IN_TRANSIT);

    // Verify parcel status transitioned to IN_TRANSIT
    const check = await request(app.getHttpServer())
      .get(`/api/v1/parcels/${testParcelId}`)
      .set(bearer(merchantToken))
      .expect(200);
    expect(check.body.data.status).toBe(ParcelStatus.IN_TRANSIT);
  });

  it("Step 8: POST /api/v1/bags/:id/receive - Destination Hub receives and unpacks the bag", async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/bags/${testBagId}/receive`)
      .send({ destinationHubId })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe(BagStatus.RECEIVED);

    // Verify parcel status transitioned to DESTINATION_HUB_RECEIVED
    const check = await request(app.getHttpServer())
      .get(`/api/v1/parcels/${testParcelId}`)
      .set(bearer(merchantToken))
      .expect(200);
    expect(check.body.data.status).toBe(ParcelStatus.DESTINATION_HUB_RECEIVED);
    expect(check.body.data.history.length).toBeGreaterThanOrEqual(4);
  });
});
