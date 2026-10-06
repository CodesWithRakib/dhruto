import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test, type TestingModule } from "@nestjs/testing";
import { type INestApplication } from "@nestjs/common";
import request from "supertest";
import { DataSource } from "typeorm";
import { AppModule } from "../src/app.module.js";
import {
  SEEDED_ACCOUNTS,
  bearer,
  idempotencyKey,
  loginToken,
} from "./utils/auth.js";

/**
 * Phase 4 finance ledger, end-to-end against the real database.
 *
 * Verifies authorization, double-entry invariants, idempotent money
 * movements, concurrent payout safety, discrepancy handling, adjustments,
 * reversals and the automated reconciliation check.
 */
describe("Finance Ledger (Phase 4 E2E)", () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let merchantToken: string;
  let merchant2Token: string;
  let adminToken: string;
  let dhkManagerToken: string;
  let ctgManagerToken: string;
  let riderToken: string;
  let rider2Token: string;
  let merchantId: string;

  const unique = () => Math.random().toString(36).slice(2, 8).toUpperCase();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api/v1");
    await app.init();
    dataSource = moduleFixture.get(DataSource);

    [merchantToken, merchant2Token, adminToken, dhkManagerToken, ctgManagerToken] =
      await Promise.all([
        loginToken(app, SEEDED_ACCOUNTS.merchant),
        loginToken(app, SEEDED_ACCOUNTS.merchant2),
        loginToken(app, SEEDED_ACCOUNTS.admin),
        loginToken(app, SEEDED_ACCOUNTS.hubManager),
        loginToken(app, SEEDED_ACCOUNTS.hubManagerCtg),
      ]);
    [riderToken, rider2Token] = await Promise.all([
      loginToken(app, "rider@dhruto.com"),
      loginToken(app, "rider2@dhruto.com"),
    ]);

    const me = await request(app.getHttpServer())
      .get("/api/v1/auth/me")
      .set(bearer(merchantToken))
      .expect(200);
    merchantId = me.body.data.merchant.id as string;
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  async function riderIdFor(token: string): Promise<string> {
    const me = await request(app.getHttpServer())
      .get("/api/v1/auth/me")
      .set(bearer(token))
      .expect(200);
    return me.body.data.rider.id as string;
  }

  async function deliverCod(
    codAmount: number,
    riderAuth = riderToken,
  ): Promise<{ parcelId: string; trackingCode: string; cashLedgerId: string }> {
    const booked = await request(app.getHttpServer())
      .post("/api/v1/parcels")
      .set(bearer(merchantToken))
      .set("Idempotency-Key", idempotencyKey("fin4"))
      .send({
        recipientName: `Finance Four ${unique()}`,
        recipientPhone: "01712345678",
        district: "Dhaka",
        thana: "Mirpur",
        deliveryAddress: `House 9, Road 9, Mirpur ${unique()}`,
        codAmount,
        weight: 1,
      })
      .expect(201);
    const parcelId = booked.body.data.id as string;

    const riderId = await riderIdFor(riderAuth);
    await request(app.getHttpServer())
      .post(`/api/v1/parcels/${parcelId}/assign-rider`)
      .set(bearer(dhkManagerToken))
      .send({ riderId })
      .expect(200);
    const started = await request(app.getHttpServer())
      .post(`/api/v1/riders/me/parcels/${parcelId}/start-delivery`)
      .set(bearer(riderAuth))
      .expect(200);
    const completed = await request(app.getHttpServer())
      .post(`/api/v1/riders/me/deliveries/${parcelId}/complete`)
      .set(bearer(riderAuth))
      .set("Idempotency-Key", idempotencyKey("fin4-complete"))
      .send({ otp: started.body.data.otp, codAmountCollected: codAmount })
      .expect(200);
    await request(app.getHttpServer())
      .post("/api/v1/riders/me/cash/hand-in")
      .set(bearer(riderAuth))
      .set("Idempotency-Key", idempotencyKey("fin4-handin"))
      .send({})
      .expect(200);

    return {
      parcelId,
      trackingCode: booked.body.data.trackingCode as string,
      cashLedgerId: completed.body.data.cashLedgerId as string,
    };
  }

  function verifyLedger(cashLedgerId: string, actualAmount?: number, token = dhkManagerToken) {
    return request(app.getHttpServer())
      .post("/api/v1/finance/reconciliation/verify")
      .set(bearer(token))
      .send(actualAmount === undefined ? { cashLedgerId } : { cashLedgerId, actualAmount });
  }

  describe("Authorization", () => {
    it("rejects anonymous and cross-role finance access", async () => {
      await request(app.getHttpServer()).get("/api/v1/finance/wallet/me").expect(401);
      await request(app.getHttpServer())
        .get("/api/v1/finance/wallet/me")
        .set(bearer(riderToken))
        .expect(403);
      await request(app.getHttpServer())
        .get("/api/v1/finance/reconciliation/pending")
        .set(bearer(merchantToken))
        .expect(403);
      await request(app.getHttpServer())
        .get("/api/v1/admin/finance/overview")
        .set(bearer(dhkManagerToken))
        .expect(403);
      await request(app.getHttpServer())
        .get("/api/v1/finance/reconciliation/pending")
        .expect(401);
    });

    it("isolates merchants from each other's wallets", async () => {
      const mine = await request(app.getHttpServer())
        .get("/api/v1/finance/wallet/me")
        .set(bearer(merchantToken))
        .expect(200);
      const other = await request(app.getHttpServer())
        .get("/api/v1/finance/wallet/me")
        .set(bearer(merchant2Token))
        .expect(200);
      expect(mine.body.data.merchantId).not.toBe(other.body.data.merchantId);
    });

    it("scopes hub managers to their own hub cash", async () => {
      const dhk = await deliverCod(1100);
      await verifyLedger(dhk.cashLedgerId).expect(200);

      // A CTG manager cannot verify DHK cash.
      const ctg = await deliverCod(1100, rider2Token);
      await verifyLedger(ctg.cashLedgerId, undefined, ctgManagerToken).expect(403);

      const pending = await request(app.getHttpServer())
        .get("/api/v1/finance/reconciliation/pending")
        .set(bearer(ctgManagerToken))
        .expect(200);
      for (const row of pending.body.data as Array<{ trackingCode: string }>) {
        expect(row.trackingCode).not.toBe(dhk.trackingCode);
      }
      // Clean up: DHK verifies the second parcel too.
      await verifyLedger(ctg.cashLedgerId).expect(200);
    });
  });

  describe("Settlement ledger invariants", () => {
    it("posts balanced journal entries and preserves fee snapshots", async () => {
      const parcel = await deliverCod(2000);
      const verified = await verifyLedger(parcel.cashLedgerId).expect(200);
      expect(verified.body.data.settlementCode).toMatch(/^SET-\d{6}$/);
      expect(verified.body.data.discrepancyId).toBeNull();

      const settlements = await request(app.getHttpServer())
        .get("/api/v1/finance/settlements/me?limit=5")
        .set(bearer(merchantToken))
        .expect(200);
      const settlement = settlements.body.data.items.find(
        (s: { parcelId: string }) => s.parcelId === parcel.parcelId,
      );
      expect(settlement).toBeDefined();
      expect(settlement.grossMinor - settlement.feeMinor).toBe(settlement.netMinor);

      const transactions = await request(app.getHttpServer())
        .get("/api/v1/admin/finance/transactions?limit=50")
        .set(bearer(adminToken))
        .expect(200);
      const journal = transactions.body.data.items.find(
        (t: { referenceId: string; type: string }) =>
          t.referenceId === parcel.cashLedgerId && t.type === "COD_SETTLEMENT",
      );
      expect(journal).toBeDefined();
      const debit = journal.entries
        .filter((e: { direction: string }) => e.direction === "DEBIT")
        .reduce((sum: number, e: { amountMinor: number }) => sum + e.amountMinor, 0);
      const credit = journal.entries
        .filter((e: { direction: string }) => e.direction === "CREDIT")
        .reduce((sum: number, e: { amountMinor: number }) => sum + e.amountMinor, 0);
      expect(debit).toBeGreaterThan(0);
      expect(debit).toBe(credit);
    });

    it("serializes double verification to a single settlement", async () => {
      const parcel = await deliverCod(1300);
      const [a, b] = await Promise.all([
        verifyLedger(parcel.cashLedgerId),
        verifyLedger(parcel.cashLedgerId),
      ]);
      const statuses = [a.status, b.status].sort();
      expect(statuses).toEqual([200, 400]);

      const count = await dataSource.query(
        `SELECT COUNT(*)::int AS count FROM settlements WHERE cash_ledger_id = $1`,
        [parcel.cashLedgerId],
      );
      expect(count[0].count).toBe(1);
    });
  });

  describe("Discrepancies", () => {
    it("records SHORT variance without absorbing it", async () => {
      const parcel = await deliverCod(10000);
      const verified = await verifyLedger(parcel.cashLedgerId, 9500).expect(200);
      expect(verified.body.data.discrepancyId).toBeDefined();
      expect(verified.body.data.netSettled).toBeLessThan(10000);

      const open = await request(app.getHttpServer())
        .get("/api/v1/finance/discrepancies?status=OPEN")
        .set(bearer(dhkManagerToken))
        .expect(200);
      const record = open.body.data.find(
        (d: { cashLedgerId: string }) => d.cashLedgerId === parcel.cashLedgerId,
      );
      expect(record).toBeDefined();
      expect(record.type).toBe("SHORT");
      expect(record.differenceMinor).toBe(-50000);
      expect(record.status).toBe("OPEN");

      // Collected amount preserved; counted amount stored separately.
      const ledger = await dataSource.query(
        `SELECT amount, verified_amount, hand_in_status FROM cash_ledgers WHERE id = $1`,
        [parcel.cashLedgerId],
      );
      expect(Number(ledger[0].amount)).toBe(10000);
      expect(Number(ledger[0].verified_amount)).toBe(9500);

      // Resolve with a recovery posting back to the merchant wallet.
      const walletBefore = await request(app.getHttpServer())
        .get("/api/v1/finance/wallet/me")
        .set(bearer(merchantToken))
        .expect(200);
      await request(app.getHttpServer())
        .post(`/api/v1/admin/finance/discrepancies/${record.id}/resolve`)
        .set(bearer(adminToken))
        .send({ recoveredAmount: 500, reason: "Rider made good the shortfall in cash" })
        .expect(200);
      const walletAfter = await request(app.getHttpServer())
        .get("/api/v1/finance/wallet/me")
        .set(bearer(merchantToken))
        .expect(200);
      expect(walletAfter.body.data.balance - walletBefore.body.data.balance).toBe(500);

      const resolved = await request(app.getHttpServer())
        .get("/api/v1/finance/discrepancies?status=RESOLVED")
        .set(bearer(adminToken))
        .expect(200);
      expect(
        resolved.body.data.some((d: { id: string }) => d.id === record.id),
      ).toBe(true);
    });
  });

  describe("Payout state machine", () => {
    async function fundedMerchant(): Promise<{ balance: number }> {
      const parcel = await deliverCod(5000);
      await verifyLedger(parcel.cashLedgerId).expect(200);
      const wallet = await request(app.getHttpServer())
        .get("/api/v1/finance/wallet/me")
        .set(bearer(merchantToken))
        .expect(200);
      return { balance: wallet.body.data.balance as number };
    }

    it("requires approval before completion and blocks invalid jumps", async () => {
      await fundedMerchant();
      const requested = await request(app.getHttpServer())
        .post("/api/v1/finance/payouts/request")
        .set(bearer(merchantToken))
        .set("Idempotency-Key", idempotencyKey("fin4-payout"))
        .send({
          amount: 500,
          payoutMethod: "BKASH",
          accountDetails: { accountNumber: "01700112233" },
        })
        .expect(200);
      expect(requested.body.data.payoutCode).toMatch(/^PAY-\d{6}$/);
      expect(requested.body.data.status).toBe("REQUESTED");
      // Account number is masked in every response.
      expect(requested.body.data.accountDetails.accountNumber).toBe("01******233");
      const payoutId = requested.body.data.id as string;

      // Completion before approval is rejected.
      await request(app.getHttpServer())
        .post(`/api/v1/admin/finance/payouts/${payoutId}/process`)
        .set(bearer(adminToken))
        .send({ status: "COMPLETED", transactionReference: "TRX-1" })
        .expect(400);

      await request(app.getHttpServer())
        .post(`/api/v1/admin/finance/payouts/${payoutId}/approve`)
        .set(bearer(adminToken))
        .send({})
        .expect(200);

      await request(app.getHttpServer())
        .post(`/api/v1/admin/finance/payouts/${payoutId}/process`)
        .set(bearer(adminToken))
        .send({ status: "COMPLETED", transactionReference: "TRX-1" })
        .expect(200);

      // Terminal states reject further transitions.
      await request(app.getHttpServer())
        .post(`/api/v1/admin/finance/payouts/${payoutId}/process`)
        .set(bearer(adminToken))
        .send({ status: "COMPLETED", transactionReference: "TRX-2" })
        .expect(400);
      await request(app.getHttpServer())
        .post(`/api/v1/admin/finance/payouts/${payoutId}/approve`)
        .set(bearer(adminToken))
        .send({})
        .expect(400);
    });

    it("replays duplicate payout requests on the same idempotency key", async () => {
      await fundedMerchant();
      const key = idempotencyKey("fin4-dup");
      const body = {
        amount: 400,
        payoutMethod: "NAGAD",
        accountDetails: { accountNumber: "01800112233" },
      };
      const first = await request(app.getHttpServer())
        .post("/api/v1/finance/payouts/request")
        .set(bearer(merchantToken))
        .set("Idempotency-Key", key)
        .send(body)
        .expect(200);
      const second = await request(app.getHttpServer())
        .post("/api/v1/finance/payouts/request")
        .set(bearer(merchantToken))
        .set("Idempotency-Key", key)
        .send(body)
        .expect(200);
      expect(second.body.data.id).toBe(first.body.data.id);

      const mine = await request(app.getHttpServer())
        .get("/api/v1/finance/payouts/me")
        .set(bearer(merchantToken))
        .expect(200);
      const matches = (mine.body.data as Array<{ payoutCode: string }>).filter(
        (p) => p.payoutCode === first.body.data.payoutCode,
      );
      expect(matches).toHaveLength(1);
    });

    it("lets only one of two concurrent payouts succeed", async () => {
      const { balance } = await fundedMerchant();
      expect(balance).toBeGreaterThan(0);
      // Drain to a known small available balance via a first payout, then race.
      const wallet = await request(app.getHttpServer())
        .get("/api/v1/finance/wallet/me")
        .set(bearer(merchantToken))
        .expect(200);
      const available = Math.floor(wallet.body.data.balance as number);
      const each = Math.floor(available / 2) + 100;
      if (each < 100) return;

      const payload = (suffix: string) => ({
        amount: each,
        payoutMethod: "BKASH",
        accountDetails: { accountNumber: `0170099${suffix}` },
      });
      const [a, b] = await Promise.all([
        request(app.getHttpServer())
          .post("/api/v1/finance/payouts/request")
          .set(bearer(merchantToken))
          .set("Idempotency-Key", idempotencyKey("fin4-race-a"))
          .send(payload("111")),
        request(app.getHttpServer())
          .post("/api/v1/finance/payouts/request")
          .set(bearer(merchantToken))
          .set("Idempotency-Key", idempotencyKey("fin4-race-b"))
          .send(payload("222")),
      ]);
      const statuses = [a.status, b.status].sort();
      expect(statuses).toEqual([200, 400]);

      const after = await request(app.getHttpServer())
        .get("/api/v1/finance/wallet/me")
        .set(bearer(merchantToken))
        .expect(200);
      expect(after.body.data.balance).toBeGreaterThanOrEqual(0);
    });

    it("releases funds through reversal postings on reject and failure", async () => {
      await fundedMerchant();
      const before = await request(app.getHttpServer())
        .get("/api/v1/finance/wallet/me")
        .set(bearer(merchantToken))
        .expect(200);

      const requested = await request(app.getHttpServer())
        .post("/api/v1/finance/payouts/request")
        .set(bearer(merchantToken))
        .set("Idempotency-Key", idempotencyKey("fin4-reject"))
        .send({ amount: 300, payoutMethod: "ROCKET", accountDetails: { accountNumber: "01900112233" } })
        .expect(200);
      await request(app.getHttpServer())
        .post(`/api/v1/admin/finance/payouts/${requested.body.data.id}/process`)
        .set(bearer(adminToken))
        .send({ status: "REJECTED", rejectionReason: "Test rejection" })
        .expect(200);

      const after = await request(app.getHttpServer())
        .get("/api/v1/finance/wallet/me")
        .set(bearer(merchantToken))
        .expect(200);
      expect(after.body.data.balance).toBe(before.body.data.balance);

      // A failed disbursement restores funds the same way.
      const second = await request(app.getHttpServer())
        .post("/api/v1/finance/payouts/request")
        .set(bearer(merchantToken))
        .set("Idempotency-Key", idempotencyKey("fin4-fail"))
        .send({ amount: 300, payoutMethod: "BKASH", accountDetails: { accountNumber: "01700112244" } })
        .expect(200);
      await request(app.getHttpServer())
        .post(`/api/v1/admin/finance/payouts/${second.body.data.id}/approve`)
        .set(bearer(adminToken))
        .send({})
        .expect(200);
      await request(app.getHttpServer())
        .post(`/api/v1/admin/finance/payouts/${second.body.data.id}/process`)
        .set(bearer(adminToken))
        .send({ status: "FAILED", failureReason: "Provider timeout" })
        .expect(200);
      const restored = await request(app.getHttpServer())
        .get("/api/v1/finance/wallet/me")
        .set(bearer(merchantToken))
        .expect(200);
      expect(restored.body.data.balance).toBe(before.body.data.balance);
    });
  });

  describe("Adjustments, reversals and settlement batches", () => {
    it("posts adjustments idempotently and reverses settlements", async () => {
      const parcel = await deliverCod(2500);
      await verifyLedger(parcel.cashLedgerId).expect(200);

      const key = idempotencyKey("fin4-adj");
      const body = {
        merchantId,
        direction: "CREDIT",
        amount: 100,
        reason: "Goodwill credit for delayed delivery",
      };
      const first = await request(app.getHttpServer())
        .post("/api/v1/admin/finance/adjustments")
        .set(bearer(adminToken))
        .set("Idempotency-Key", key)
        .send(body)
        .expect(201);
      const second = await request(app.getHttpServer())
        .post("/api/v1/admin/finance/adjustments")
        .set(bearer(adminToken))
        .set("Idempotency-Key", key)
        .send(body)
        .expect(201);
      expect(second.body.data.id).toBe(first.body.data.id);

      const settlements = await request(app.getHttpServer())
        .get("/api/v1/finance/settlements/me?limit=10")
        .set(bearer(merchantToken))
        .expect(200);
      const settlement = settlements.body.data.items.find(
        (s: { parcelId: string }) => s.parcelId === parcel.parcelId,
      );
      expect(settlement).toBeDefined();

      const batch = await request(app.getHttpServer())
        .post("/api/v1/admin/finance/settlements/batches")
        .set(bearer(adminToken))
        .send({ merchantId, settlementIds: [settlement.id] })
        .expect(201);
      expect(batch.body.data.netMinor).toBe(settlement.netMinor);
      await request(app.getHttpServer())
        .post(`/api/v1/admin/finance/settlements/batches/${batch.body.data.id}/complete`)
        .set(bearer(adminToken))
        .expect(200);

      // Reverse the settlement: wallet unwinds, original marked REVERSED.
      const walletBefore = await request(app.getHttpServer())
        .get("/api/v1/finance/wallet/me")
        .set(bearer(merchantToken))
        .expect(200);
      const txns = await request(app.getHttpServer())
        .get("/api/v1/admin/finance/transactions?type=COD_SETTLEMENT&limit=50")
        .set(bearer(adminToken))
        .expect(200);
      const txn = txns.body.data.items.find(
        (t: { referenceId: string }) => t.referenceId === parcel.cashLedgerId,
      );
      expect(txn).toBeDefined();
      await request(app.getHttpServer())
        .post(`/api/v1/admin/finance/transactions/${txn.id}/reverse`)
        .set(bearer(adminToken))
        .send({ reason: "Test reversal of settlement posting" })
        .expect(200);
      const walletAfter = await request(app.getHttpServer())
        .get("/api/v1/finance/wallet/me")
        .set(bearer(merchantToken))
        .expect(200);
      expect(walletAfter.body.data.balance).toBeLessThan(walletBefore.body.data.balance);
    });
  });

  describe("Reconciliation check and reports", () => {
    it("holds every invariant across merchants, riders, settlements and postings", async () => {
      const check = await request(app.getHttpServer())
        .get("/api/v1/admin/finance/reconciliation/check")
        .set(bearer(adminToken))
        .expect(200);
      expect(check.body.data.ok).toBe(true);
      for (const merchant of check.body.data.merchants as Array<{ balanced: boolean }>) {
        expect(merchant.balanced).toBe(true);
      }
      for (const txn of check.body.data.transactions as Array<{ balanced: boolean }>) {
        expect(txn.balanced).toBe(true);
      }
      for (const settlement of check.body.data.settlements as Array<{ balanced: boolean }>) {
        expect(settlement.balanced).toBe(true);
      }
    });

    it("serves filtered reports and CSV exports", async () => {
      const cod = await request(app.getHttpServer())
        .get(`/api/v1/admin/finance/reports/cod?merchantId=${merchantId}&limit=5`)
        .set(bearer(adminToken))
        .expect(200);
      expect(cod.body.data.total).toBeGreaterThan(0);

      const csv = await request(app.getHttpServer())
        .get("/api/v1/admin/finance/reports/payouts?format=csv")
        .set(bearer(adminToken))
        .expect(200);
      expect(csv.body.data.filename).toBe("payout-report.csv");
      expect(csv.body.data.csv).toContain("payoutCode");

      const fees = await request(app.getHttpServer())
        .get("/api/v1/admin/finance/reports/fees")
        .set(bearer(adminToken))
        .expect(200);
      expect(Array.isArray(fees.body.data.items)).toBe(true);
    });
  });
});
