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

describe("Custom JWT Auth & Rider App API (E2E / Integration)", () => {
  let app: INestApplication;
  let riderToken: string;
  let merchantToken: string;
  let hubManagerToken: string;
  let riderRefreshToken: string;
  let riderId: string;
  let testParcelId: string;
  let generatedOtp: string;

  const riderEmail = `rider_${Date.now()}@dhruto.com`;
  const riderPhone = `017${Math.floor(10000000 + Math.random() * 90000000)}`;
  const riderPassword = "riderPassword123";

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(new ZodValidationPipe());
    await app.init();

    merchantToken = await loginToken(app, SEEDED_ACCOUNTS.merchant);
    hubManagerToken = await loginToken(app, SEEDED_ACCOUNTS.hubManager);
  });

  afterAll(async () => {
    await app.close();
  });

  describe("1. Custom JWT Authentication", () => {
    it("POST /api/v1/auth/register - registers a new rider account", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/register")
        .send({
          name: "Test Rider Karim",
          email: riderEmail,
          phone: riderPhone,
          password: riderPassword,
          role: "RIDER",
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.tokens.refreshToken).toBeDefined();
      expect(res.body.data.user.email).toBe(riderEmail);
      expect(res.body.data.user.role).toBe("RIDER");
      expect(res.body.data.user.riderId).toBeDefined();

      riderId = res.body.data.user.riderId;
    });

    it("POST /api/v1/auth/login - succeeds with registered rider credentials", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({
          emailOrPhone: riderEmail,
          password: riderPassword,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.tokens.refreshToken).toBeDefined();
      expect(res.body.data.user.email).toBe(riderEmail);
      expect(res.body.data.user.role).toBe("RIDER");

      riderToken = res.body.data.tokens.accessToken;
      riderRefreshToken = res.body.data.tokens.refreshToken;
    });

    it("GET /api/v1/auth/me - returns user profile with valid Bearer token", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${riderToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(riderEmail);
      expect(res.body.data.role).toBe("RIDER");
      expect(res.body.data.rider).toBeDefined();
    });

    it("GET /api/v1/auth/me - rejects request without Authorization header with 401", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/auth/me")
        .expect(401);

      expect(res.body.statusCode).toBe(401);
    });

    it("POST /api/v1/auth/refresh - refreshes access token using refresh token", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/refresh")
        .send({ refreshToken: riderRefreshToken })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
    });
  });

  describe("2. Rider Workflow & Delivery Lifecycle", () => {
    it("Step 1: Create a parcel booking and assign to rider", async () => {
      // 1. Create parcel
      const createRes = await request(app.getHttpServer())
        .post("/api/v1/parcels")
        .set(bearer(merchantToken))
        .set("Idempotency-Key", idempotencyKey("auth-rider-parcel"))
        .send({
          recipientName: "Customer Sifat",
          recipientPhone: "01812345678",
          district: "Dhaka",
          thana: "Gulshan",
          deliveryAddress: "Road 11, House 25, Gulshan 1, Dhaka",
          codAmount: 2500,
          weight: 2.0,
        })
        .expect(201);

      testParcelId = createRes.body.data.id;
      expect(testParcelId).toBeDefined();

      // 2. Assign to rider
      const assignRes = await request(app.getHttpServer())
        .post(`/api/v1/parcels/${testParcelId}/assign-rider`)
        .set(bearer(hubManagerToken))
        .send({ riderId })
        .expect(200);

      expect(assignRes.body.success).toBe(true);
      expect(assignRes.body.data.status).toBe("ASSIGNED_TO_RIDER");
    });

    it("Step 2: GET /api/v1/riders/me/tasks - rider sees assigned parcel", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/riders/me/tasks")
        .set("Authorization", `Bearer ${riderToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      const task = res.body.data.find((p: { id: string }) => p.id === testParcelId);
      expect(task).toBeDefined();
      expect(task.recipientName).toBe("Customer Sifat");
      expect(task.codAmount).toBe(2500);
    });

    it("Step 3: POST /api/v1/riders/me/parcels/:id/start-delivery - transitions to OUT_FOR_DELIVERY & generates OTP", async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/riders/me/parcels/${testParcelId}/start-delivery`)
        .set("Authorization", `Bearer ${riderToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("OUT_FOR_DELIVERY");
      expect(res.body.data.deliveryOtp).toBeDefined();
      expect(res.body.data.deliveryOtp.length).toBe(6);

      generatedOtp = res.body.data.deliveryOtp;
    });

    it("Step 4: POST /api/v1/riders/me/deliveries/:id/verify-otp - verifies customer OTP", async () => {
      // Test invalid OTP
      const invalidRes = await request(app.getHttpServer())
        .post(`/api/v1/riders/me/deliveries/${testParcelId}/verify-otp`)
        .set("Authorization", `Bearer ${riderToken}`)
        .send({ otp: "000000" })
        .expect(400);

      expect(invalidRes.body.success).toBe(false);

      // Test valid OTP
      const validRes = await request(app.getHttpServer())
        .post(`/api/v1/riders/me/deliveries/${testParcelId}/verify-otp`)
        .set("Authorization", `Bearer ${riderToken}`)
        .send({ otp: generatedOtp })
        .expect(200);

      expect(validRes.body.success).toBe(true);
      expect(validRes.body.data.valid).toBe(true);
    });

    it("Step 5: POST /api/v1/riders/me/deliveries/:id/complete - completes delivery & creates COD cash ledger", async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/riders/me/deliveries/${testParcelId}/complete`)
        .set("Authorization", `Bearer ${riderToken}`)
        .send({
          otp: generatedOtp,
          codAmountCollected: 2500,
          remarks: "Successfully handed over to recipient",
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("CASH_PENDING");
      expect(res.body.data.codAmountCollected).toBe(2500);
      expect(res.body.data.cashLedgerId).toBeDefined();
    });

    it("Step 6: GET /api/v1/riders/me/cash/summary - shows collected COD", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/riders/me/cash/summary")
        .set("Authorization", `Bearer ${riderToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.pendingHandIn).toBeGreaterThanOrEqual(2500);
    });

    it("Step 7: POST /api/v1/riders/me/cash/hand-in - hands in cash to hub", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/riders/me/cash/hand-in")
        .set("Authorization", `Bearer ${riderToken}`)
        .send({ notes: "Evening shift hand-in" })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.handedInCount).toBeGreaterThanOrEqual(1);
      expect(res.body.data.totalAmount).toBeGreaterThanOrEqual(2500);
    });
  });
});
