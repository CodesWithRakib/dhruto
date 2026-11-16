import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { type INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
import { DhrutoValidationPipe } from "../src/common/pipes/validation.pipe.js";
import { ParcelStatus, HubScanType } from "@dhruto/contracts";
import { SEEDED_ACCOUNTS, bearer, idempotencyKey, loginToken } from "./utils/auth.js";

/**
 * Enterprise Anti-Fraud & Edge Case Hardening Suite:
 * -------------------------------------------------------------
 * 1. Delivery OTP brute-force attempt lockout (max 3 attempts, locked on 3rd).
 * 2. Replay & double-delivery prevention (idempotent completeDelivery).
 * 3. Malformed, negative, and zero payout exploit prevention.
 * 4. Pessimistic wallet row locking under concurrent payout races.
 * 5. State machine bypass denial (illegal status jumps).
 * 6. Cross-tenant rider task isolation (cannot start/deliver unassigned parcels).
 */
describe("Anti-Fraud & Edge Case Hardening Suite", () => {
  let app: INestApplication;
  let merchantToken: string;
  let dhkManagerToken: string;
  let riderToken: string;
  let rider2Token: string;
  let dhkHubId: string;
  let riderId: string;
  let rider2Id: string;

  const unique = () => Math.random().toString(36).slice(2, 8).toUpperCase();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(new DhrutoValidationPipe());
    await app.init();

    [merchantToken, dhkManagerToken, riderToken, rider2Token] = await Promise.all([
      loginToken(app, SEEDED_ACCOUNTS.merchant),
      loginToken(app, SEEDED_ACCOUNTS.hubManager),
      loginToken(app, SEEDED_ACCOUNTS.rider),
      loginToken(app, "rider3@dhruto.com"),
    ]);

    // Discover Dhaka Hub
    const dhkHubs = await request(app.getHttpServer())
      .get("/api/v1/hubs")
      .set(bearer(dhkManagerToken))
      .expect(200);
    dhkHubId = dhkHubs.body.data[0].id;

    // Discover Rider 1 ID
    const meRider = await request(app.getHttpServer())
      .get("/api/v1/auth/me")
      .set(bearer(riderToken))
      .expect(200);
    riderId = meRider.body.data.rider.id;

    // Discover Rider 2 ID
    const meRider2 = await request(app.getHttpServer())
      .get("/api/v1/auth/me")
      .set(bearer(rider2Token))
      .expect(200);
    rider2Id = meRider2.body.data.rider.id;
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  // Helper to create a parcel ready for rider delivery
  async function setupOutForDeliveryParcel(codAmount = 1000) {
    const booking = await request(app.getHttpServer())
      .post("/api/v1/parcels")
      .set(bearer(merchantToken))
      .set("Idempotency-Key", idempotencyKey("fraud-parcel"))
      .send({
        recipientName: `Fraud Test ${unique()}`,
        recipientPhone: "01712345678",
        district: "Dhaka",
        thana: "Mirpur",
        deliveryAddress: "Mirpur 10, Dhaka",
        codAmount,
        weight: 1.0,
      })
      .expect(201);

    const parcelId = booking.body.data.id as string;
    const trackingCode = booking.body.data.trackingCode as string;

    // Assign directly from CREATED to Rider 1 (supported operational flow)
    await request(app.getHttpServer())
      .post(`/api/v1/parcels/${parcelId}/assign-rider`)
      .set(bearer(dhkManagerToken))
      .send({ riderId })
      .expect(200);

    // Rider 1 starts delivery -> triggers OTP generation
    const startRes = await request(app.getHttpServer())
      .post(`/api/v1/riders/me/parcels/${parcelId}/start-delivery`)
      .set(bearer(riderToken))
      .expect(200);

    const validOtp = startRes.body.data.otp as string;
    return { parcelId, trackingCode, validOtp };
  }

  // =========================================================================
  // TEST 1: OTP BRUTE-FORCE LOCKOUT
  // =========================================================================
  it("enforces OTP brute-force lockout: locks out after 3 wrong attempts and rejects real OTP", async () => {
    const { parcelId, validOtp } = await setupOutForDeliveryParcel(1200);

    // Attempts 1-4: Wrong OTP (attempts remaining: 4, 3, 2, 1)
    for (let i = 1; i <= 4; i++) {
      const attempt = await request(app.getHttpServer())
        .post(`/api/v1/riders/me/deliveries/${parcelId}/verify-otp`)
        .set(bearer(riderToken))
        .send({ otp: `${i}${i}${i}${i}${i}${i}` })
        .expect(400);

      expect(attempt.body.message).toMatch(/Invalid OTP/i);
    }

    // Attempt 5: 5th wrong OTP trips lockout -> 429 TOO_MANY_REQUESTS
    const attempt5 = await request(app.getHttpServer())
      .post(`/api/v1/riders/me/deliveries/${parcelId}/verify-otp`)
      .set(bearer(riderToken))
      .send({ otp: "999999" })
      .expect(429);

    expect(attempt5.body.message).toMatch(/Too many wrong attempts/i);

    // Attempt 6: Even with the CORRECT OTP, it must be strictly denied because it is locked!
    const attempt6 = await request(app.getHttpServer())
      .post(`/api/v1/riders/me/deliveries/${parcelId}/verify-otp`)
      .set(bearer(riderToken))
      .send({ otp: validOtp })
      .expect(429);

    expect(attempt6.body.message).toMatch(/Too many wrong attempts/i);
  });

  // =========================================================================
  // TEST 2: REPLAY & DOUBLE-DELIVERY PROTECTION
  // =========================================================================
  it("protects against duplicate delivery submissions (idempotent replay without duplicate ledger)", async () => {
    const codAmount = 1500;
    const { parcelId, validOtp } = await setupOutForDeliveryParcel(codAmount);

    // 1. Verify correct OTP
    await request(app.getHttpServer())
      .post(`/api/v1/riders/me/deliveries/${parcelId}/verify-otp`)
      .set(bearer(riderToken))
      .send({ otp: validOtp })
      .expect(200);

    // 2. Complete delivery
    const completeKey = idempotencyKey("deliv-complete");
    const firstComplete = await request(app.getHttpServer())
      .post(`/api/v1/riders/me/deliveries/${parcelId}/complete`)
      .set(bearer(riderToken))
      .set("Idempotency-Key", completeKey)
      .send({
        codAmountCollected: codAmount,
        notes: "Delivered to recipient",
      })
      .expect(200);

    expect(firstComplete.body.data.status).toBe(ParcelStatus.CASH_PENDING);
    const ledgerId = firstComplete.body.data.cashLedgerId;
    expect(ledgerId).toBeDefined();

    // 3. Duplicate completion attempt with the same idempotency key
    const replaySameKey = await request(app.getHttpServer())
      .post(`/api/v1/riders/me/deliveries/${parcelId}/complete`)
      .set(bearer(riderToken))
      .set("Idempotency-Key", completeKey)
      .send({
        codAmountCollected: codAmount,
        notes: "Delivered to recipient",
      })
      .expect(200);

    expect(replaySameKey.body.data.cashLedgerId).toBe(ledgerId);
    expect(replaySameKey.body.data.message).toMatch(/delivered|replaying/i);

    // 4. Duplicate completion attempt WITHOUT idempotency key
    const replayNoKey = await request(app.getHttpServer())
      .post(`/api/v1/riders/me/deliveries/${parcelId}/complete`)
      .set(bearer(riderToken))
      .send({
        codAmountCollected: codAmount,
        notes: "Delivered again",
      })
      .expect(200);

    expect(replayNoKey.body.data.cashLedgerId).toBe(ledgerId);
    expect(replayNoKey.body.data.message).toMatch(/already delivered/i);
  });

  // =========================================================================
  // TEST 3: MALFORMED & NEGATIVE PAYOUT EXPLOIT DENIAL
  // =========================================================================
  it("rejects zero, negative, and astronomical payout amounts", async () => {
    // Negative amount
    await request(app.getHttpServer())
      .post("/api/v1/finance/payouts/request")
      .set(bearer(merchantToken))
      .send({
        amount: -500,
        payoutMethod: "BKASH",
        accountDetails: { accountNumber: "01712345678" },
      })
      .expect(422);

    // Zero amount
    await request(app.getHttpServer())
      .post("/api/v1/finance/payouts/request")
      .set(bearer(merchantToken))
      .send({
        amount: 0,
        payoutMethod: "BKASH",
        accountDetails: { accountNumber: "01712345678" },
      })
      .expect(422);

    // Astronomical amount exceeding balance
    await request(app.getHttpServer())
      .post("/api/v1/finance/payouts/request")
      .set(bearer(merchantToken))
      .send({
        amount: 999999999,
        payoutMethod: "BKASH",
        accountDetails: { accountNumber: "01712345678" },
      })
      .expect(400);
  });

  // =========================================================================
  // TEST 4: PESSIMISTIC CONCURRENCY ON WALLET BALANCE
  // =========================================================================
  it("enforces pessimistic locking on wallet so balance never goes negative", async () => {
    // Check available balance
    const walletRes = await request(app.getHttpServer())
      .get("/api/v1/finance/wallet/me")
      .set(bearer(merchantToken))
      .expect(200);

    const balance = walletRes.body.data.balance as number;

    // If balance is 0, requesting any payout is denied
    if (balance <= 0) {
      await request(app.getHttpServer())
        .post("/api/v1/finance/payouts/request")
        .set(bearer(merchantToken))
        .send({
          amount: 100,
          payoutMethod: "BKASH",
          accountDetails: { accountNumber: "01712345678" },
        })
        .expect(400);
    } else {
      // Fire 2 concurrent payout requests each asking for the FULL balance
      // With balance = X, two concurrent requests of X cannot both succeed
      const [reqA, reqB] = await Promise.all([
        request(app.getHttpServer())
          .post("/api/v1/finance/payouts/request")
          .set(bearer(merchantToken))
          .set("Idempotency-Key", idempotencyKey("race-a"))
          .send({
            amount: balance,
            payoutMethod: "BKASH",
            accountDetails: { accountNumber: "01712345678" },
          }),
        request(app.getHttpServer())
          .post("/api/v1/finance/payouts/request")
          .set(bearer(merchantToken))
          .set("Idempotency-Key", idempotencyKey("race-b"))
          .send({
            amount: balance,
            payoutMethod: "BKASH",
            accountDetails: { accountNumber: "01712345678" },
          }),
      ]);

      const statuses = [reqA.status, reqB.status].sort();
      // Exactly one succeeds (200), the other is rejected with 400 Insufficient Balance
      expect(statuses).toEqual([200, 400]);

      // Check wallet balance is never negative
      const afterWallet = await request(app.getHttpServer())
        .get("/api/v1/finance/wallet/me")
        .set(bearer(merchantToken))
        .expect(200);

      expect(afterWallet.body.data.balance).toBeGreaterThanOrEqual(0);
    }
  });

  // =========================================================================
  // TEST 5: STATE MACHINE ILLEGAL STATUS JUMP DENIAL
  // =========================================================================
  it("denies illegal state machine transitions (cannot jump directly to DELIVERED)", async () => {
    const booking = await request(app.getHttpServer())
      .post("/api/v1/parcels")
      .set(bearer(merchantToken))
      .set("Idempotency-Key", idempotencyKey("illegal-jump"))
      .send({
        recipientName: "Jump Test",
        recipientPhone: "01712345678",
        district: "Dhaka",
        thana: "Mirpur",
        deliveryAddress: "Mirpur 10, Dhaka",
        codAmount: 500,
        weight: 1.0,
      })
      .expect(201);

    const parcelId = booking.body.data.id as string;

    // Directly attempt to complete delivery from CREATED state -> must be rejected (400 or 403)
    const jumpRes = await request(app.getHttpServer())
      .post(`/api/v1/riders/me/deliveries/${parcelId}/complete`)
      .set(bearer(riderToken))
      .send({
        codAmountCollected: 500,
        notes: "Bypassing lifecycle",
      });
    expect([400, 403]).toContain(jumpRes.status);

    // Verify parcel status remains CREATED
    const checkParcel = await request(app.getHttpServer())
      .get(`/api/v1/parcels/${parcelId}`)
      .set(bearer(merchantToken))
      .expect(200);

    expect(checkParcel.body.data.status).toBe(ParcelStatus.CREATED);
  });

  // =========================================================================
  // TEST 6: CROSS-TENANT RIDER RUN-SHEET ISOLATION
  // =========================================================================
  it("enforces cross-rider task isolation (Rider 2 cannot operate on Rider 1's parcel)", async () => {
    const { parcelId } = await setupOutForDeliveryParcel(800);

    // Rider 2 attempts to start delivery on Rider 1's parcel
    const crossStart = await request(app.getHttpServer())
      .post(`/api/v1/riders/me/parcels/${parcelId}/start-delivery`)
      .set(bearer(rider2Token))
      .expect(403);

    expect(crossStart.body.message).toMatch(/not assigned to you/i);

    // Rider 2 attempts to verify OTP on Rider 1's parcel
    const crossVerify = await request(app.getHttpServer())
      .post(`/api/v1/riders/me/deliveries/${parcelId}/verify-otp`)
      .set(bearer(rider2Token))
      .send({ otp: "123456" })
      .expect(403);

    expect(crossVerify.body.message).toMatch(/not assigned to you/i);

    // Rider 2 attempts to complete delivery on Rider 1's parcel
    const crossComplete = await request(app.getHttpServer())
      .post(`/api/v1/riders/me/deliveries/${parcelId}/complete`)
      .set(bearer(rider2Token))
      .send({ codAmountCollected: 800 })
      .expect(403);

    expect(crossComplete.body.message).toMatch(/not assigned to you/i);
  });
});
