import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { type INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
import { ZodValidationPipe } from "nestjs-zod";
import {
  SEEDED_ACCOUNTS,
  bearer,
  idempotencyKey,
  loginToken,
} from "./utils/auth.js";

describe("Rider Delivery & Cash Reconciliation (E2E / Integration)", () => {
  let app: INestApplication;
  let riderToken: string;
  let merchantToken: string;
  let hubManagerToken: string;
  let riderId: string;
  let parcelId: string;
  let trackingCode: string;
  let deliveryOtp: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(new ZodValidationPipe());
    await app.init();

    // 1. Authenticate as demo rider
    const loginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({
        emailOrPhone: "rider@dhruto.com",
        password: "dhruto123",
      })
      .expect(200);

    expect(loginRes.body.success).toBe(true);
    riderToken = loginRes.body.data.tokens.accessToken;
    expect(riderToken).toBeDefined();

    // Get current user profile to resolve riderId
    const meRes = await request(app.getHttpServer())
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${riderToken}`)
      .expect(200);

    riderId = meRes.body.data.rider?.id;
    expect(riderId).toBeDefined();

    // Parcel commands require an authenticated merchant; assignment is a
    // hub/admin operation (Phase 1 authorization hardening).
    merchantToken = await loginToken(app, SEEDED_ACCOUNTS.merchant);
    hubManagerToken = await loginToken(app, SEEDED_ACCOUNTS.hubManager);
  });

  afterAll(async () => {
    await app.close();
  });

  it("1. Create parcel booking for delivery test", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/parcels")
      .set(bearer(merchantToken))
      .set("Idempotency-Key", idempotencyKey("rider-parcel"))
      .send({
        recipientName: "Tanvir Hasan",
        recipientPhone: "01819283746",
        district: "Dhaka",
        thana: "Mirpur",
        deliveryAddress: "Road 5, Block B, Mirpur 2, Dhaka",
        codAmount: 2400,
        weight: 1.0,
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    parcelId = res.body.data.id;
    trackingCode = res.body.data.trackingCode;
    expect(parcelId).toBeDefined();
    expect(trackingCode).toBeDefined();
  });

  it("2. Assign parcel to rider via POST /api/v1/parcels/:id/assign-rider", async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/parcels/${parcelId}/assign-rider`)
      .set(bearer(hubManagerToken))
      .send({ riderId })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("ASSIGNED_TO_RIDER");
  });

  it("3. Rider views assigned tasks via GET /api/v1/riders/me/tasks", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/riders/me/tasks")
      .set("Authorization", `Bearer ${riderToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    const assignedTask = res.body.data.find((t: { id: string }) => t.id === parcelId);
    expect(assignedTask).toBeDefined();
    expect(assignedTask.status).toBe("ASSIGNED_TO_RIDER");
    expect(assignedTask.codAmount).toBe(2400);
  });

  it("4. Rider starts delivery run via POST /api/v1/riders/me/parcels/:id/start-delivery", async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/riders/me/parcels/${parcelId}/start-delivery`)
      .set("Authorization", `Bearer ${riderToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("OUT_FOR_DELIVERY");
    expect(res.body.data.deliveryOtp).toBeDefined();
    expect(res.body.data.deliveryOtp).toHaveLength(6);
    deliveryOtp = res.body.data.deliveryOtp;
  });

  it("5. Verify customer delivery OTP via POST /api/v1/riders/me/deliveries/:id/verify-otp", async () => {
    // 5a. Incorrect OTP fails
    await request(app.getHttpServer())
      .post(`/api/v1/riders/me/deliveries/${parcelId}/verify-otp`)
      .set("Authorization", `Bearer ${riderToken}`)
      .send({ otp: "000000" })
      .expect(400);

    // 5b. Correct OTP succeeds
    const res = await request(app.getHttpServer())
      .post(`/api/v1/riders/me/deliveries/${parcelId}/verify-otp`)
      .set("Authorization", `Bearer ${riderToken}`)
      .send({ otp: deliveryOtp })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.valid).toBe(true);
  });

  it("6. Complete delivery with COD collection via POST /api/v1/riders/me/deliveries/:id/complete", async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/riders/me/deliveries/${parcelId}/complete`)
      .set("Authorization", `Bearer ${riderToken}`)
      .send({
        otp: deliveryOtp,
        codAmountCollected: 2400,
        remarks: "Delivered to recipient. Cash collected in full.",
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    // Since COD > 0, parcel moves to CASH_PENDING until hand-in is verified
    expect(res.body.data.status).toBe("CASH_PENDING");
    expect(res.body.data.codAmountCollected).toBe(2400);
    expect(res.body.data.cashLedgerId).toBeDefined();
  });

  it("7. Check rider cash summary via GET /api/v1/riders/me/cash/summary", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/riders/me/cash/summary")
      .set("Authorization", `Bearer ${riderToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.pendingHandIn).toBeGreaterThanOrEqual(2400);
    expect(res.body.data.totalCollected).toBeGreaterThanOrEqual(2400);
  });

  it("8. Rider hands in collected cash via POST /api/v1/riders/me/cash/hand-in", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/riders/me/cash/hand-in")
      .set("Authorization", `Bearer ${riderToken}`)
      .send({
        notes: "End-of-day cash deposit at Mirpur Hub",
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.handedInCount).toBeGreaterThanOrEqual(1);
    expect(res.body.data.totalAmount).toBeGreaterThanOrEqual(2400);
  });

  it("9. Verify tracking timeline reflects delivery progression", async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/tracking/${trackingCode}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("CASH_PENDING");

    const statuses = res.body.data.timeline.map((t: { status: string }) => t.status);
    expect(statuses).toContain("CREATED");
    expect(statuses).toContain("ASSIGNED_TO_RIDER");
    expect(statuses).toContain("OUT_FOR_DELIVERY");
    expect(statuses).toContain("CASH_PENDING");
  });
});
