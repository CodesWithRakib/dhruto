import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { type INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
import { DhrutoValidationPipe } from "../src/common/pipes/validation.pipe.js";
import { SEEDED_ACCOUNTS, bearer, idempotencyKey, loginToken } from "./utils/auth.js";
import { realisticEmail, realisticName } from "./utils/realistic.js";

describe("Custom JWT Auth & Rider App API (E2E / Integration)", () => {
  // Realistic recipient (suites run on the dev DB); reused in assertions below.
  const sifatName = realisticName();
  let app: INestApplication;
  let riderToken: string;
  let merchantToken: string;
  let hubManagerToken: string;
  let riderRefreshToken: string;
  let riderId: string;
  let testParcelId: string;
  let generatedOtp: string;

  const merchantEmail = realisticEmail();
  const merchantPhone = `017${Math.floor(10000000 + Math.random() * 90000000)}`;
  const merchantPassword = "merchantPassword123";

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(new DhrutoValidationPipe());
    await app.init();

    merchantToken = await loginToken(app, SEEDED_ACCOUNTS.merchant);
    hubManagerToken = await loginToken(app, SEEDED_ACCOUNTS.hubManager);

    // Rider flow uses the seeded rider (public registration is
    // merchant-only since T-SEC-01; riders are provisioned server-side).
    const seededRiderToken = await loginToken(app, SEEDED_ACCOUNTS.rider);
    const me = await request(app.getHttpServer())
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${seededRiderToken}`)
      .expect(200);
    riderToken = seededRiderToken;
    riderId = me.body.data.rider.id as string;
    expect(riderId).toBeDefined();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("1. Custom JWT Authentication", () => {
    it("POST /api/v1/auth/register - registers a new merchant account", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/register")
        .send({
          name: realisticName(),
          email: merchantEmail,
          phone: merchantPhone,
          password: merchantPassword,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.tokens.refreshToken).toBeDefined();
      expect(res.body.data.user.email).toBe(merchantEmail);
      expect(res.body.data.user.role).toBe("MERCHANT");
      expect(res.body.data.user.merchantId).toBeDefined();

      riderRefreshToken = res.body.data.tokens.refreshToken;
    });

    it("POST /api/v1/auth/register - rejects privileged roles with 403 (T-SEC-01)", async () => {
      for (const role of ["ADMIN", "HUB_MANAGER", "RIDER", "CUSTOMER"]) {
        const res = await request(app.getHttpServer())
          .post("/api/v1/auth/register")
          .send({
            name: realisticName(),
            email: realisticEmail(),
            phone: `017${Math.floor(10000000 + Math.random() * 90000000)}`,
            password: "escalation123",
            role,
          })
          .expect(403);

        expect(res.body.success).toBe(false);
      }
    });

    it("POST /api/v1/auth/register - rejects invalid roles with 422", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/auth/register")
        .send({
          name: realisticName(),
          email: realisticEmail(),
          phone: `017${Math.floor(10000000 + Math.random() * 90000000)}`,
          password: "badrole123",
          role: "SUPER_ADMIN",
        })
        .expect(422);
    });

    it("POST /api/v1/auth/login - succeeds with registered merchant credentials", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({
          emailOrPhone: merchantEmail,
          password: merchantPassword,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.tokens.refreshToken).toBeDefined();
      expect(res.body.data.user.email).toBe(merchantEmail);
      expect(res.body.data.user.role).toBe("MERCHANT");
    });

    it("GET /api/v1/auth/me - returns user profile with valid Bearer token", async () => {
      const login = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ emailOrPhone: merchantEmail, password: merchantPassword })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${login.body.data.tokens.accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(merchantEmail);
      expect(res.body.data.role).toBe("MERCHANT");
      expect(res.body.data.merchant).toBeDefined();
    });

    it("GET /api/v1/auth/me - rejects request without Authorization header with 401", async () => {
      const res = await request(app.getHttpServer()).get("/api/v1/auth/me").expect(401);

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
          recipientName: sifatName,
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
      expect(task.recipientName).toBe(sifatName);
      expect(task.codAmount).toBe(2500);
    });

    it("Step 3: POST /api/v1/riders/me/parcels/:id/start-delivery - transitions to OUT_FOR_DELIVERY & generates OTP", async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/riders/me/parcels/${testParcelId}/start-delivery`)
        .set("Authorization", `Bearer ${riderToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("OUT_FOR_DELIVERY");
      // Test automation receives the OTP from the start response (NODE_ENV=test).
      expect(res.body.data.otp).toBeDefined();
      expect(res.body.data.otp.length).toBe(6);

      generatedOtp = res.body.data.otp;
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
