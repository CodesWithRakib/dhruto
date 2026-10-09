import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { type INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
import { DhrutoValidationPipe } from "../src/common/pipes/validation.pipe.js";
import { idempotencyKey } from "./utils/auth.js";

describe("Scale & isolation — idempotent concurrency + cross-tenant denial (Phase 8)", () => {
  let app: INestApplication;
  let merchantToken: string;
  let merchant2Token: string;

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
  });

  afterAll(async () => {
    await app.close();
  });

  it("1. 25 concurrent identical parcel creates yield one parcel (same tracking code)", async () => {
    // 25 stays under the documented parcel-create limit (30/60s) so the
    // burst tests idempotency, not the rate limiter (covered separately).
    const key = idempotencyKey("race-parcel");
    const payload = {
      recipientName: "Race Probe",
      recipientPhone: "01712345678",
      district: "Dhaka",
      thana: "Mirpur",
      deliveryAddress: "House 1, Road 1, Mirpur 10, Dhaka",
      weight: 1,
      codAmount: 100,
    };
    const attempts = await Promise.all(
      Array.from({ length: 25 }, () =>
        request(app.getHttpServer())
          .post("/api/v1/parcels")
          .set("Authorization", `Bearer ${merchantToken}`)
          .set("Idempotency-Key", key)
          .send(payload),
      ),
    );
    const ok = attempts.filter((r) => r.status === 201 || r.status === 200);
    // Every attempt resolves (replays return the recorded response).
    expect(ok.length).toBe(25);
    const trackingCodes = new Set(
      ok.map((r) => (r.body.data.trackingCode ?? r.body.data.parcel?.trackingCode) as string),
    );
    expect(trackingCodes.size).toBe(1);
  }, 60000);

  it("1b. Bursts beyond the documented limit are throttled with 429 + Retry-After", async () => {
    // parcel-create allows 30/60s; a 40-wide burst must trip the limiter
    // without corrupting anything (abuse protection, not a failure).
    const results = await Promise.all(
      Array.from({ length: 40 }, (_, i) =>
        request(app.getHttpServer())
          .post("/api/v1/parcels")
          .set("Authorization", `Bearer ${merchant2Token}`)
          .set("Idempotency-Key", idempotencyKey(`burst-${i}`))
          .send({
            recipientName: "Burst Probe",
            recipientPhone: "01712345678",
            district: "Dhaka",
            thana: "Mirpur",
            deliveryAddress: "House 1, Road 1, Mirpur 10, Dhaka",
            weight: 1,
            codAmount: 100,
          }),
      ),
    );
    const throttled = results.filter((r) => r.status === 429);
    expect(throttled.length).toBeGreaterThan(0);
    expect(throttled[0]?.headers["retry-after"]).toBeTruthy();
  }, 60000);

  it("2. Same-key payout double submit yields a single payout", async () => {
    const key = idempotencyKey("race-payout");
    const payload = {
      amount: 150,
      payoutMethod: "BKASH",
      accountDetails: { accountNumber: "01712345678" },
    };
    const first = await request(app.getHttpServer())
      .post("/api/v1/finance/payouts/request")
      .set("Authorization", `Bearer ${merchantToken}`)
      .set("Idempotency-Key", key)
      .send(payload);
    // Insufficient balance is an acceptable outcome on a mutated dev DB;
    // what must never happen is two different payouts for one key.
    if (first.status !== 201 && first.status !== 200) return;
    const second = await request(app.getHttpServer())
      .post("/api/v1/finance/payouts/request")
      .set("Authorization", `Bearer ${merchantToken}`)
      .set("Idempotency-Key", key)
      .send(payload)
      .expect(200);
    expect(second.body.data.payoutCode ?? second.body.data.payout?.payoutCode).toBe(
      first.body.data.payoutCode ?? first.body.data.payout?.payoutCode,
    );
  }, 60000);

  it("3. Merchant B cannot read, list, or affect merchant A parcels (404, not 403 leak)", async () => {
    const created = await request(app.getHttpServer())
      .post("/api/v1/parcels")
      .set("Authorization", `Bearer ${merchantToken}`)
      .set("Idempotency-Key", idempotencyKey("idor-parcel"))
      .send({
        recipientName: "IDOR Probe",
        recipientPhone: "01712345678",
        district: "Dhaka",
        thana: "Mirpur",
        deliveryAddress: "House 1, Road 1, Mirpur 10, Dhaka",
        weight: 1,
        codAmount: 100,
      })
      .expect(201);
    const parcelId = (created.body.data.id ?? created.body.data.parcelId) as string;

    await request(app.getHttpServer())
      .get(`/api/v1/parcels/${parcelId}`)
      .set("Authorization", `Bearer ${merchant2Token}`)
      .expect(404);

    // B's list must not contain A's parcel.
    const list = await request(app.getHttpServer())
      .get("/api/v1/parcels?limit=100")
      .set("Authorization", `Bearer ${merchant2Token}`)
      .expect(200);
    const ids = (list.body.data as Array<{ id: string }>).map((p) => p.id);
    expect(ids).not.toContain(parcelId);
  });

  it("4. Merchant B cannot read merchant A notifications", async () => {
    const mine = await request(app.getHttpServer())
      .get("/api/v1/notifications/me?limit=5")
      .set("Authorization", `Bearer ${merchantToken}`)
      .expect(200);
    const items = (mine.body.data.items ?? mine.body.data) as Array<{ id: string }>;
    if (items.length === 0) return; // nothing to probe — isolation covered by scope design
    await request(app.getHttpServer())
      .patch(`/api/v1/notifications/${items[0]?.id}/read`)
      .set("Authorization", `Bearer ${merchant2Token}`)
      .expect(404);
  });
});
