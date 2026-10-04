import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { type INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
import { ZodValidationPipe } from "nestjs-zod";

describe("Financial Settlement & Wallet Payouts (Phase 4 E2E)", () => {
  let app: INestApplication;
  let merchantToken: string;
  let riderToken: string;
  let riderId: string;
  let parcelId: string;
  let deliveryOtp: string;
  let cashLedgerId: string;
  let payoutRequestId: string;
  let initialBalance = 0;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(new ZodValidationPipe());
    await app.init();

    // 1. Authenticate as merchant
    const merchantLogin = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({
        emailOrPhone: "merchant@dhruto.com",
        password: "dhruto123",
      })
      .expect(200);

    merchantToken = merchantLogin.body.data.tokens.accessToken;
    expect(merchantToken).toBeDefined();

    // 2. Authenticate as rider
    const riderLogin = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({
        emailOrPhone: "rider@dhruto.com",
        password: "dhruto123",
      })
      .expect(200);

    riderToken = riderLogin.body.data.tokens.accessToken;
    expect(riderToken).toBeDefined();

    const meRes = await request(app.getHttpServer())
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${riderToken}`)
      .expect(200);
    riderId = meRes.body.data.rider?.id;
    expect(riderId).toBeDefined();
  });

  afterAll(async () => {
    await app.close();
  });

  it("1. Fetch initial merchant wallet status via GET /api/v1/finance/wallet/me", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/finance/wallet/me")
      .set("Authorization", `Bearer ${merchantToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(typeof res.body.data.balance).toBe("number");
    initialBalance = res.body.data.balance;
    expect(res.body.data.currency).toBe("BDT");
  });

  it("2. Setup parcel, assign rider, deliver with COD ৳3000, and hand in cash", async () => {
    // 2a. Book parcel
    const parcelRes = await request(app.getHttpServer())
      .post("/api/v1/parcels")
      .set("Authorization", `Bearer ${merchantToken}`)
      .send({
        recipientName: "Finance Test Customer",
        recipientPhone: "01711223344",
        district: "Dhaka",
        thana: "Mirpur",
        deliveryAddress: "House 12, Road 5, Mirpur 2, Dhaka",
        codAmount: 3000,
        weight: 1.0,
      })
      .expect(201);

    parcelId = parcelRes.body.data.id;
    expect(parcelId).toBeDefined();

    // 2b. Assign parcel to rider
    await request(app.getHttpServer())
      .post(`/api/v1/parcels/${parcelId}/assign-rider`)
      .send({ riderId })
      .expect(200);

    // 2c. Rider starts delivery
    const startRes = await request(app.getHttpServer())
      .post(`/api/v1/riders/me/parcels/${parcelId}/start-delivery`)
      .set("Authorization", `Bearer ${riderToken}`)
      .expect(200);

    deliveryOtp = startRes.body.data.deliveryOtp;
    expect(deliveryOtp).toBeDefined();

    // 2d. Rider completes delivery with COD collection
    const completeRes = await request(app.getHttpServer())
      .post(`/api/v1/riders/me/deliveries/${parcelId}/complete`)
      .set("Authorization", `Bearer ${riderToken}`)
      .send({
        otp: deliveryOtp,
        codAmountCollected: 3000,
        remarks: "Customer paid ৳3000 cash in full.",
      })
      .expect(200);

    expect(completeRes.body.data.status).toBe("CASH_PENDING");
    cashLedgerId = completeRes.body.data.cashLedgerId;
    expect(cashLedgerId).toBeDefined();

    // 2e. Rider hands in cash to hub
    await request(app.getHttpServer())
      .post("/api/v1/riders/me/cash/hand-in")
      .set("Authorization", `Bearer ${riderToken}`)
      .send({ notes: "COD handover at Mirpur Hub" })
      .expect(200);
  });

  it("3. Hub Manager lists pending reconciliations via GET /api/v1/finance/reconciliation/pending", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/finance/reconciliation/pending")
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);

    const match = res.body.data.find((item: any) => item.id === cashLedgerId);
    expect(match).toBeDefined();
    expect(match.amount).toBe(3000);
    expect(match.netPayable).toBeGreaterThan(0);
  });

  it("4. Hub Manager verifies cash hand-in and triggers auto-settlement to merchant wallet", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/finance/reconciliation/verify")
      .send({
        cashLedgerId,
        actualAmount: 3000,
        notes: "Full ৳3000 cash physically counted and deposited into safe.",
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.cashLedger.handInStatus).toBe("VERIFIED");
    expect(res.body.data.netSettled).toBeGreaterThan(0);
    expect(res.body.data.newWalletBalance).toBeGreaterThan(initialBalance);
  });

  it("5. Verify merchant wallet updated with net settlement balance and ledger history", async () => {
    const walletRes = await request(app.getHttpServer())
      .get("/api/v1/finance/wallet/me")
      .set("Authorization", `Bearer ${merchantToken}`)
      .expect(200);

    expect(walletRes.body.success).toBe(true);
    const updatedBalance = walletRes.body.data.balance;
    expect(updatedBalance).toBeGreaterThan(initialBalance);

    // Fetch transactions
    const txRes = await request(app.getHttpServer())
      .get("/api/v1/finance/wallet/transactions")
      .set("Authorization", `Bearer ${merchantToken}`)
      .expect(200);

    expect(txRes.body.success).toBe(true);
    expect(txRes.body.data.length).toBeGreaterThanOrEqual(2);

    const types = txRes.body.data.map((t: any) => t.type);
    expect(types).toContain("COD_CREDIT");
    expect(types).toContain("DELIVERY_FEE");
  });

  it("6. Merchant submits payout request with pessimistic lock balance deduction", async () => {
    const payoutAmount = 500;

    const res = await request(app.getHttpServer())
      .post("/api/v1/finance/payouts/request")
      .set("Authorization", `Bearer ${merchantToken}`)
      .send({
        amount: payoutAmount,
        payoutMethod: "BKASH",
        accountDetails: {
          accountNumber: "01700112233",
          accountType: "PERSONAL",
        },
        notes: "Weekly earnings withdrawal",
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.amount).toBe(payoutAmount);
    expect(res.body.data.status).toBe("REQUESTED");
    payoutRequestId = res.body.data.id;
    expect(payoutRequestId).toBeDefined();

    // Verify wallet balance was immediately deducted
    const walletRes = await request(app.getHttpServer())
      .get("/api/v1/finance/wallet/me")
      .set("Authorization", `Bearer ${merchantToken}`)
      .expect(200);

    expect(walletRes.body.data.withdrawnTotal).toBeGreaterThanOrEqual(payoutAmount);
  });

  it("7. Reject excessive payout request exceeding available balance", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/finance/payouts/request")
      .set("Authorization", `Bearer ${merchantToken}`)
      .send({
        amount: 999999999,
        payoutMethod: "NAGAD",
        accountDetails: {
          accountNumber: "01811223344",
        },
      })
      .expect(400);
  });

  it("8. Admin approves payout request via POST /api/v1/finance/payouts/:id/process", async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/finance/payouts/${payoutRequestId}/process`)
      .send({
        status: "COMPLETED",
        transactionReference: "BKP7788990011",
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("COMPLETED");
    expect(res.body.data.transactionReference).toBe("BKP7788990011");
  });

  it("9. Financial reconciliation summary provides platform-wide balance overview", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/finance/reconciliation/summary")
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.totalWallets).toBeGreaterThanOrEqual(1);
    expect(res.body.data.totalMerchantBalance).toBeGreaterThanOrEqual(0);
    expect(typeof res.body.data.pendingReconciliationsCount).toBe("number");
  });
});
