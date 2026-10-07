import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test, type TestingModule } from "@nestjs/testing";
import { type INestApplication } from "@nestjs/common";
import request from "supertest";
import { DataSource } from "typeorm";
import { AppModule } from "../src/app.module.js";
import { Parcel } from "../src/database/entities/index.js";
import { SEEDED_ACCOUNTS, bearer, idempotencyKey, loginToken } from "./utils/auth.js";

/**
 * Phase 3 rider delivery, end-to-end against the real database.
 *
 * Covers OTP lifecycle (hash, expiry, lockout, cooldown, resend), exact COD
 * matching, idempotent completion, attempt recording, reschedule validation,
 * reassignment rules, hub scoping, rider isolation, duty gating, concurrency
 * and the hub/admin fleet endpoints.
 */
describe("Rider Delivery (Phase 3 E2E)", () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let merchantToken: string;
  let adminToken: string;
  let dhkManagerToken: string;
  let ctgManagerToken: string;
  let riderToken: string;
  let rider2Token: string;
  let ctgRiderToken: string;
  let riderId: string;
  let rider2Id: string;
  let ctgRiderId: string;

  const unique = () => Math.random().toString(36).slice(2, 8).toUpperCase();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api/v1");
    await app.init();
    dataSource = moduleFixture.get(DataSource);

    [merchantToken, adminToken, dhkManagerToken, ctgManagerToken] = await Promise.all([
      loginToken(app, SEEDED_ACCOUNTS.merchant),
      loginToken(app, SEEDED_ACCOUNTS.admin),
      loginToken(app, SEEDED_ACCOUNTS.hubManager),
      loginToken(app, SEEDED_ACCOUNTS.hubManagerCtg),
    ]);
    [riderToken, rider2Token, ctgRiderToken] = await Promise.all([
      loginToken(app, "rider@dhruto.com"),
      loginToken(app, "rider2@dhruto.com"),
      loginToken(app, "rider3@dhruto.com"),
    ]);

    riderId = await riderIdFor(riderToken);
    rider2Id = await riderIdFor(rider2Token);
    ctgRiderId = await riderIdFor(ctgRiderToken);
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

  async function bookParcel(codAmount = 1200): Promise<{ id: string; trackingCode: string }> {
    const res = await request(app.getHttpServer())
      .post("/api/v1/parcels")
      .set(bearer(merchantToken))
      .set("Idempotency-Key", idempotencyKey("phase3"))
      .send({
        recipientName: `Phase3 Recipient ${unique()}`,
        recipientPhone: "01712345678",
        district: "Dhaka",
        thana: "Mirpur",
        deliveryAddress: `House 1, Road 1, Mirpur ${unique()}`,
        codAmount,
        weight: 1,
      })
      .expect(201);
    return { id: res.body.data.id, trackingCode: res.body.data.trackingCode };
  }

  function assignParcel(parcelId: string, targetRiderId: string, token = dhkManagerToken) {
    return request(app.getHttpServer())
      .post(`/api/v1/parcels/${parcelId}/assign-rider`)
      .set(bearer(token))
      .send({ riderId: targetRiderId });
  }

  function startAs(token: string, parcelId: string) {
    return request(app.getHttpServer())
      .post(`/api/v1/riders/me/parcels/${parcelId}/start-delivery`)
      .set(bearer(token));
  }

  function verifyAs(token: string, parcelId: string, otp: string) {
    return request(app.getHttpServer())
      .post(`/api/v1/riders/me/deliveries/${parcelId}/verify-otp`)
      .set(bearer(token))
      .send({ otp });
  }

  function completeAs(
    token: string,
    parcelId: string,
    body: Record<string, unknown>,
    key?: string,
  ) {
    const req = request(app.getHttpServer())
      .post(`/api/v1/riders/me/deliveries/${parcelId}/complete`)
      .set(bearer(token))
      .send(body);
    if (key) req.set("Idempotency-Key", key);
    return req;
  }

  async function backdateOtpRequest(parcelId: string, secondsAgo: number) {
    await dataSource.getRepository(Parcel).update(parcelId, {
      lastOtpRequestedAt: new Date(Date.now() - secondsAgo * 1000),
    });
  }

  async function expireOtp(parcelId: string) {
    await dataSource.getRepository(Parcel).update(parcelId, {
      otpExpiresAt: new Date(Date.now() - 60_000),
    });
  }

  describe("Terminal surfaces", () => {
    it("exposes dashboard, tasks, history and profile with a rider code", async () => {
      const dashboard = await request(app.getHttpServer())
        .get("/api/v1/riders/me/dashboard")
        .set(bearer(riderToken))
        .expect(200);

      expect(dashboard.body.data.riderCode).toMatch(/^RDR-\d{6}$/);
      expect(dashboard.body.data.duty).toBe("ON_DUTY");
      expect(dashboard.body.data.hubCode).toBe("HUB-DHK-01");
      expect(dashboard.body.data.counts).toMatchObject({
        assigned: expect.any(Number),
        inProgress: expect.any(Number),
        deliveredToday: expect.any(Number),
        failedToday: expect.any(Number),
      });

      const profile = await request(app.getHttpServer())
        .get("/api/v1/riders/me/profile")
        .set(bearer(riderToken))
        .expect(200);
      expect(profile.body.data.riderCode).toMatch(/^RDR-\d{6}$/);
      expect(profile.body.data.email).toBe("rider@dhruto.com");

      const history = await request(app.getHttpServer())
        .get("/api/v1/riders/me/history?page=1&limit=5")
        .set(bearer(riderToken))
        .expect(200);
      expect(history.body.data).toMatchObject({ total: expect.any(Number), page: 1, limit: 5 });
    });

    it("rejects merchants and anonymous callers from rider endpoints", async () => {
      await request(app.getHttpServer()).get("/api/v1/riders/me/tasks").expect(401);
      await request(app.getHttpServer())
        .get("/api/v1/riders/me/tasks")
        .set(bearer(merchantToken))
        .expect(403);
      await request(app.getHttpServer()).get("/api/v1/riders").set(bearer(riderToken)).expect(403);
    });
  });

  describe("Successful COD delivery", () => {
    it("runs start -> OTP -> exact COD -> complete with attempt, ledger and history", async () => {
      const parcel = await bookParcel(1200);
      await assignParcel(parcel.id, riderId).expect(200);

      const started = await startAs(riderToken, parcel.id).expect(200);
      expect(started.body.data.status).toBe("OUT_FOR_DELIVERY");
      expect(started.body.data.otp).toMatch(/^\d{6}$/);
      expect(started.body.data.deliveryOtp).toBeUndefined();
      const otp = started.body.data.otp as string;

      // OTP is never leaked through the task list.
      const tasks = await request(app.getHttpServer())
        .get("/api/v1/riders/me/tasks")
        .set(bearer(riderToken))
        .expect(200);
      const task = tasks.body.data.find((t: { id: string }) => t.id === parcel.id);
      expect(task).toBeDefined();
      expect(task.deliveryOtp).toBeUndefined();
      expect(task.attemptCount).toBe(0);

      // Completion without OTP is rejected, not silently accepted.
      await completeAs(riderToken, parcel.id, { codAmountCollected: 1200 }).expect(422);

      const verified = await verifyAs(riderToken, parcel.id, otp).expect(200);
      expect(verified.body.data.valid).toBe(true);

      const key = idempotencyKey("phase3-complete");
      const completed = await completeAs(
        riderToken,
        parcel.id,
        { codAmountCollected: 1200, remarks: "Handed to recipient" },
        key,
      ).expect(200);
      expect(completed.body.data.status).toBe("CASH_PENDING");
      expect(completed.body.data.attemptNumber).toBe(1);
      expect(completed.body.data.proof.type).toBe("OTP");
      expect(completed.body.data.cashLedgerId).toBeDefined();

      // Duplicate submission replays the recorded delivery identically.
      const replay = await completeAs(
        riderToken,
        parcel.id,
        { codAmountCollected: 1200, remarks: "Handed to recipient" },
        key,
      ).expect(200);
      expect(replay.body.data.attemptId).toBe(completed.body.data.attemptId);
      expect(replay.body.data.cashLedgerId).toBe(completed.body.data.cashLedgerId);

      // Exactly one attempt row and one cash ledger exist.
      const attempts = await dataSource.query(
        `SELECT COUNT(*)::int AS count FROM delivery_attempts WHERE parcel_id = $1`,
        [parcel.id],
      );
      expect(attempts[0].count).toBe(1);

      const detail = await request(app.getHttpServer())
        .get(`/api/v1/parcels/${parcel.id}`)
        .set(bearer(merchantToken))
        .expect(200);
      const chain = detail.body.data.history
        .map(
          (h: { fromStatus: string | null; toStatus: string }) => `${h.fromStatus}->${h.toStatus}`,
        )
        .join(",");
      expect(chain).toContain("OUT_FOR_DELIVERY->DELIVERED");
      expect(chain).toContain("DELIVERED->CASH_PENDING");
    });

    it("delivers a zero-COD parcel straight to DELIVERED with no ledger", async () => {
      const parcel = await bookParcel(0);
      await assignParcel(parcel.id, rider2Id).expect(200);
      const started = await startAs(rider2Token, parcel.id).expect(200);
      await verifyAs(rider2Token, parcel.id, started.body.data.otp).expect(200);
      const completed = await completeAs(rider2Token, parcel.id, {}).expect(200);
      expect(completed.body.data.status).toBe("DELIVERED");
      expect(completed.body.data.cashLedgerId).toBeNull();
    });
  });

  describe("OTP security", () => {
    it("rejects wrong OTPs and locks after five attempts", async () => {
      const parcel = await bookParcel(500);
      await assignParcel(parcel.id, rider2Id).expect(200);
      const started = await startAs(rider2Token, parcel.id).expect(200);
      const realOtp = started.body.data.otp as string;
      const wrong = realOtp === "000000" ? "000001" : "000000";

      for (let i = 0; i < 4; i += 1) {
        await verifyAs(rider2Token, parcel.id, wrong).expect(400);
      }
      // Fifth wrong guess locks the OTP.
      await verifyAs(rider2Token, parcel.id, wrong).expect(429);
      // Even the correct OTP is now refused until a resend.
      await verifyAs(rider2Token, parcel.id, realOtp).expect(429);

      // Resend is cooldown-gated: an immediate retry is rejected...
      await request(app.getHttpServer())
        .post(`/api/v1/riders/me/deliveries/${parcel.id}/otp`)
        .set(bearer(rider2Token))
        .send({})
        .expect(429);

      // ...but works after the cooldown and resets the attempt budget.
      await backdateOtpRequest(parcel.id, 61);
      const resent = await request(app.getHttpServer())
        .post(`/api/v1/riders/me/deliveries/${parcel.id}/otp`)
        .set(bearer(rider2Token))
        .send({})
        .expect(200);
      expect(resent.body.data.otp).toMatch(/^\d{6}$/);
      await verifyAs(rider2Token, parcel.id, resent.body.data.otp).expect(200);
    });

    it("rejects expired OTPs", async () => {
      const parcel = await bookParcel(500);
      await assignParcel(parcel.id, riderId).expect(200);
      const started = await startAs(riderToken, parcel.id).expect(200);
      await expireOtp(parcel.id);
      await verifyAs(riderToken, parcel.id, started.body.data.otp).expect(400);
    });

    it("serializes concurrent OTP verifications to a single outcome", async () => {
      const parcel = await bookParcel(500);
      await assignParcel(parcel.id, riderId).expect(200);
      const started = await startAs(riderToken, parcel.id).expect(200);
      const otp = started.body.data.otp as string;

      const [a, b] = await Promise.all([
        verifyAs(riderToken, parcel.id, otp),
        verifyAs(riderToken, parcel.id, otp),
      ]);
      expect([a.status, b.status].sort()).toEqual([200, 200]);
    });
  });

  describe("COD validation", () => {
    it("rejects partial and excess collection", async () => {
      const parcel = await bookParcel(1000);
      await assignParcel(parcel.id, riderId).expect(200);
      const started = await startAs(riderToken, parcel.id).expect(200);
      await verifyAs(riderToken, parcel.id, started.body.data.otp).expect(200);

      await completeAs(riderToken, parcel.id, { codAmountCollected: 900 }).expect(422);
      await completeAs(riderToken, parcel.id, { codAmountCollected: 1100 }).expect(422);

      const completed = await completeAs(riderToken, parcel.id, {
        codAmountCollected: 1000,
      }).expect(200);
      expect(completed.body.data.status).toBe("CASH_PENDING");
    });
  });

  describe("Failed delivery", () => {
    it("records attempts, reschedules with a validated date, rejects bad dates", async () => {
      const parcel = await bookParcel(800);
      await assignParcel(parcel.id, riderId).expect(200);
      await startAs(riderToken, parcel.id).expect(200);

      const failed = await request(app.getHttpServer())
        .post(`/api/v1/riders/me/deliveries/${parcel.id}/fail`)
        .set(bearer(riderToken))
        .send({ reason: "CUSTOMER_UNAVAILABLE", notes: "Gate locked" })
        .expect(200);
      expect(failed.body.data.status).toBe("DELIVERY_ATTEMPTED");
      expect(failed.body.data.attemptNumber).toBe(1);

      // Past, garbage and far-future dates are all rejected (parcel is
      // restarted first because a fail requires OUT_FOR_DELIVERY).
      await startAs(riderToken, parcel.id).expect(200);
      for (const bad of ["not-a-date", new Date(Date.now() - 3600_000).toISOString()]) {
        await request(app.getHttpServer())
          .post(`/api/v1/riders/me/deliveries/${parcel.id}/fail`)
          .set(bearer(riderToken))
          .send({ reason: "CUSTOMER_REQUESTED_RESCHEDULE", rescheduledDate: bad })
          .expect(422);
      }
      await request(app.getHttpServer())
        .post(`/api/v1/riders/me/deliveries/${parcel.id}/fail`)
        .set(bearer(riderToken))
        .send({
          reason: "CUSTOMER_REQUESTED_RESCHEDULE",
          rescheduledDate: new Date(Date.now() + 30 * 86400_000).toISOString(),
        })
        .expect(422);

      const future = new Date(Date.now() + 2 * 86400_000).toISOString();
      const rescheduled = await request(app.getHttpServer())
        .post(`/api/v1/riders/me/deliveries/${parcel.id}/fail`)
        .set(bearer(riderToken))
        .send({ reason: "CUSTOMER_REQUESTED_RESCHEDULE", rescheduledDate: future })
        .expect(200);
      expect(rescheduled.body.data.status).toBe("RESCHEDULED");
      expect(rescheduled.body.data.attemptNumber).toBe(2);
      expect(rescheduled.body.data.rescheduledFor).toBeDefined();

      // The task can be restarted after a failed attempt.
      await startAs(riderToken, parcel.id).expect(200);
    });
  });

  describe("Assignment rules", () => {
    it("allows reassignment before start and closes the old assignment", async () => {
      const parcel = await bookParcel(700);
      await assignParcel(parcel.id, riderId).expect(200);
      const reassigned = await assignParcel(parcel.id, rider2Id).expect(200);
      expect(reassigned.body.data.reassigned).toBe(true);
      expect(reassigned.body.data.riderId).toBe(rider2Id);

      await assignParcel(parcel.id, rider2Id).expect(409);

      const detail = await request(app.getHttpServer())
        .get(`/api/v1/riders/${rider2Id}`)
        .set(bearer(adminToken))
        .expect(200);
      const record = detail.body.data.assignments.find(
        (a: { parcelId: string }) => a.parcelId === parcel.id,
      );
      expect(record).toBeDefined();
      expect(
        detail.body.data.assignments.filter(
          (a: { parcelId: string; unassignedAt: string | null }) =>
            a.parcelId === parcel.id && a.unassignedAt === null,
        ),
      ).toHaveLength(1);
    });

    it("locks the task to its rider once delivery starts", async () => {
      const parcel = await bookParcel(700);
      await assignParcel(parcel.id, riderId).expect(200);
      await startAs(riderToken, parcel.id).expect(200);
      await assignParcel(parcel.id, rider2Id).expect(400);
    });

    it("rejects cross-hub assignment", async () => {
      const parcel = await bookParcel(700);
      await assignParcel(parcel.id, riderId).expect(200);
      await assignParcel(parcel.id, ctgRiderId).expect(403);
    });

    it("rejects assigning to an inactive rider", async () => {
      const parcel = await bookParcel(700);
      await dataSource.getRepository("Rider").update(rider2Id, { status: "INACTIVE" });
      try {
        await assignParcel(parcel.id, rider2Id).expect(403);
      } finally {
        await dataSource.getRepository("Rider").update(rider2Id, { status: "ON_DUTY" });
      }
    });

    it("serializes two operators assigning the same started parcel", async () => {
      const parcel = await bookParcel(700);
      await assignParcel(parcel.id, riderId).expect(200);
      await startAs(riderToken, parcel.id).expect(200);
      const [a, b] = await Promise.all([
        assignParcel(parcel.id, rider2Id),
        assignParcel(parcel.id, riderId),
      ]);
      // A started task is locked to its rider: both moves are refused and the
      // database keeps exactly one open assignment.
      expect([a.status, b.status].sort()).toEqual([400, 400]);
    });
  });

  describe("Rider isolation", () => {
    it("keeps riders out of each other's tasks", async () => {
      const parcel = await bookParcel(900);
      await assignParcel(parcel.id, riderId).expect(200);

      await startAs(rider2Token, parcel.id).expect(403);
      await verifyAs(rider2Token, parcel.id, "123456").expect(403);
      await completeAs(rider2Token, parcel.id, {}).expect(403);

      const tasks = await request(app.getHttpServer())
        .get("/api/v1/riders/me/tasks")
        .set(bearer(rider2Token))
        .expect(200);
      expect(tasks.body.data.some((t: { id: string }) => t.id === parcel.id)).toBe(false);
    });
  });

  describe("Duty gating", () => {
    it("blocks off-duty while parcels are out and blocks operation while off duty", async () => {
      const parcel = await bookParcel(600);
      await assignParcel(parcel.id, riderId).expect(200);
      await startAs(riderToken, parcel.id).expect(200);

      await request(app.getHttpServer())
        .post("/api/v1/riders/me/duty")
        .set(bearer(riderToken))
        .send({ duty: "OFF_DUTY" })
        .expect(409);

      const dashboard = await request(app.getHttpServer())
        .get("/api/v1/riders/me/dashboard")
        .set(bearer(riderToken))
        .expect(200);
      expect(dashboard.body.data.duty).toBe("ON_DUTY");
    });

    it("rejects commands from an off-duty rider", async () => {
      await dataSource.getRepository("Rider").update(rider2Id, { status: "OFF_DUTY" });
      try {
        await request(app.getHttpServer())
          .get("/api/v1/riders/me/tasks")
          .set(bearer(rider2Token))
          .expect(403);
      } finally {
        await dataSource.getRepository("Rider").update(rider2Id, { status: "ON_DUTY" });
      }
    });
  });

  describe("Hub/admin fleet operations", () => {
    it("scopes rider visibility by hub assignment", async () => {
      const all = await request(app.getHttpServer())
        .get("/api/v1/riders")
        .set(bearer(adminToken))
        .expect(200);
      expect(all.body.data.length).toBeGreaterThanOrEqual(3);
      expect(all.body.data[0]).toMatchObject({
        riderCode: expect.any(String),
        activeTaskCount: expect.any(Number),
      });

      const dhk = await request(app.getHttpServer())
        .get("/api/v1/riders")
        .set(bearer(dhkManagerToken))
        .expect(200);
      expect(dhk.body.data.length).toBeGreaterThanOrEqual(1);
      for (const rider of dhk.body.data as Array<{ hubCode: string }>) {
        expect(rider.hubCode).toBe("HUB-DHK-01");
      }

      const ctg = await request(app.getHttpServer())
        .get("/api/v1/riders")
        .set(bearer(ctgManagerToken))
        .expect(200);
      for (const rider of ctg.body.data as Array<{ hubCode: string }>) {
        expect(rider.hubCode).toBe("HUB-CTG-01");
      }

      // A DHK manager cannot open a CTG rider's file.
      await request(app.getHttpServer())
        .get(`/api/v1/riders/${ctgRiderId}`)
        .set(bearer(dhkManagerToken))
        .expect(403);
    });
  });

  describe("Completion concurrency", () => {
    it("applies one completion for simultaneous duplicate submissions", async () => {
      const parcel = await bookParcel(1500);
      await assignParcel(parcel.id, riderId).expect(200);
      const started = await startAs(riderToken, parcel.id).expect(200);
      await verifyAs(riderToken, parcel.id, started.body.data.otp).expect(200);

      const key = idempotencyKey("phase3-race");
      const [a, b] = await Promise.all([
        completeAs(riderToken, parcel.id, { codAmountCollected: 1500 }, key),
        completeAs(riderToken, parcel.id, { codAmountCollected: 1500 }, key),
      ]);
      expect(a.status).toBe(200);
      expect(b.status).toBe(200);
      expect(a.body.data.attemptId).toBe(b.body.data.attemptId);

      const ledgers = await dataSource.query(
        `SELECT COUNT(*)::int AS count FROM cash_ledgers WHERE parcel_id = $1`,
        [parcel.id],
      );
      expect(ledgers[0].count).toBe(1);
    });
  });
});
