import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { type INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import request from "supertest";
import { DataSource } from "typeorm";
import type { ParcelListItem } from "@dhruto/contracts";
import { AppModule } from "../src/app.module.js";
import { DhrutoValidationPipe } from "../src/common/pipes/validation.pipe.js";
import { CacheService } from "../src/common/cache/cache.service.js";
import {
  SEEDED_ACCOUNTS,
  SEEDED_PASSWORD,
  bearer,
  idempotencyKey,
  loginToken,
} from "./utils/auth.js";

const CUSTOMER = "customer@dhruto.com";

/** YYYY-MM-DD on the Asia/Dhaka calendar, `days` from now. */
const dhakaDay = (days: number) =>
  new Date(Date.now() + 6 * 3_600_000 + days * 86_400_000).toISOString().slice(0, 10);

/**
 * Customer portal: real recipient data in the parcel list (merchant, rider
 * contact, preference) and the delivery-preference ("Reschedule") endpoint.
 */
describe("Customer delivery preference & recipient view E2E", () => {
  let app: INestApplication;
  let merchantToken: string;
  let customerToken: string;
  let riderToken: string;
  let ownParcelId: string;
  let foreignParcelId: string;
  let customerPhone: string;

  const book = async (recipientPhone: string) => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/parcels")
      .set(bearer(merchantToken))
      .set("Idempotency-Key", idempotencyKey("pref"))
      .send({
        recipientName: "Preference Probe",
        recipientPhone,
        district: "Dhaka",
        thana: "Mirpur",
        deliveryAddress: "House 9, Road 4, Mirpur, Dhaka",
        codAmount: 750,
        weight: 1,
      })
      .expect(201);
    return res.body.data.id as string;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api/v1", { exclude: ["health", "health/(.*)"] });
    app.useGlobalPipes(new DhrutoValidationPipe());
    await app.init();

    merchantToken = await loginToken(app, SEEDED_ACCOUNTS.merchant);
    riderToken = await loginToken(app, SEEDED_ACCOUNTS.rider);
    const login = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ emailOrPhone: CUSTOMER, password: SEEDED_PASSWORD })
      .expect(200);
    customerToken = login.body.data.tokens.accessToken as string;
    customerPhone = login.body.data.user.phone as string;
    // The endpoint allows 10 req/min per user (shared in Redis); start this
    // suite with a clean bucket so back-to-back runs stay deterministic.
    await app
      .get<CacheService>(CacheService)
      .del(`rl:parcel-delivery-preference:user:${login.body.data.user.id as string}`);

    ownParcelId = await book(customerPhone);
    foreignParcelId = await book("01999888777");
  });

  afterAll(async () => {
    await app.close();
  });

  const setPref = (id: string, token: string, body: object) =>
    request(app.getHttpServer())
      .post(`/api/v1/parcels/${id}/delivery-preference`)
      .set(bearer(token))
      .send(body);

  it("lists the customer's own parcels with the real merchant name", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/parcels?limit=50")
      .set(bearer(customerToken))
      .expect(200);
    const items = res.body.data as Array<Record<string, unknown>>;
    const own = items.find((p) => p.id === ownParcelId);
    expect(own).toBeDefined();
    expect(typeof own?.merchantName).toBe("string");
    expect(own?.merchantName).not.toBe("");
    // Not yet assigned: no rider contact is exposed.
    expect(own?.riderName).toBeNull();
    expect(own?.riderPhone).toBeNull();
    expect(items.some((p) => p.id === foreignParcelId)).toBe(false);
  });

  it("saves a preference without changing parcel status and returns it in the list", async () => {
    const date = dhakaDay(1);
    const res = await setPref(ownParcelId, customerToken, {
      date,
      slot: "02:00 PM - 05:00 PM",
      note: "  Leave with the building guard  ",
    }).expect(200);
    expect(res.body.data).toMatchObject({
      date,
      slot: "02:00 PM - 05:00 PM",
      note: "Leave with the building guard",
    });

    const list = await request(app.getHttpServer())
      .get("/api/v1/parcels?limit=50")
      .set(bearer(customerToken))
      .expect(200);
    const own = (list.body.data as ParcelListItem[]).find((p) => p.id === ownParcelId);
    expect(own?.status).toBe("CREATED");
    expect(own?.deliveryPreference).toMatchObject({ date, slot: "02:00 PM - 05:00 PM" });
  });

  it("records the preference in the parcel history for merchants/hubs", async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/parcels/${ownParcelId}/history`)
      .set(bearer(merchantToken))
      .expect(200);
    const events = (res.body.data as Array<{ eventType: string }>).map((e) => e.eventType);
    expect(events).toContain("DELIVERY_PREFERENCE_UPDATED");
  });

  it("rejects dates in the past or beyond the 7-day window", async () => {
    await setPref(ownParcelId, customerToken, { date: dhakaDay(-1), slot: "Any time" }).expect(400);
    await setPref(ownParcelId, customerToken, { date: dhakaDay(8), slot: "Any time" }).expect(400);
    await setPref(ownParcelId, customerToken, { date: "2026-02-31", slot: "Any time" }).expect(400);
  });

  it("validates the body", async () => {
    const res = await setPref(ownParcelId, customerToken, { date: "tomorrow", slot: "" });
    expect([400, 422]).toContain(res.status);
  });

  it("hides other recipients' parcels (404, not 403)", async () => {
    await setPref(foreignParcelId, customerToken, { date: dhakaDay(1), slot: "Any time" }).expect(
      404,
    );
  });

  it("forbids non-recipient roles", async () => {
    await setPref(ownParcelId, merchantToken, { date: dhakaDay(1), slot: "Any time" }).expect(403);
    await setPref(ownParcelId, riderToken, { date: dhakaDay(1), slot: "Any time" }).expect(403);
  });

  it("exposes the assigned rider's contact to the recipient once assigned", async () => {
    const adminToken = await loginToken(app, SEEDED_ACCOUNTS.admin);
    const riders = await request(app.getHttpServer())
      .get("/api/v1/riders")
      .set(bearer(adminToken))
      .expect(200);
    const list = (riders.body.data?.items ?? riders.body.data) as Array<{ id: string }>;
    const riderId = list[0]?.id;
    expect(riderId).toBeDefined();

    await request(app.getHttpServer())
      .post(`/api/v1/parcels/${ownParcelId}/assign-rider`)
      .set(bearer(adminToken))
      .send({ riderId })
      .expect((r) => expect(r.status).toBeLessThan(300));

    const res = await request(app.getHttpServer())
      .get("/api/v1/parcels?limit=50")
      .set(bearer(customerToken))
      .expect(200);
    const own = (res.body.data as ParcelListItem[]).find((p) => p.id === ownParcelId);
    expect(own?.status).toBe("ASSIGNED_TO_RIDER");
    expect(typeof own?.riderName).toBe("string");
    expect(typeof own?.riderPhone).toBe("string");
  });

  it("refuses preferences on closed parcels", async () => {
    const closedId = await book(
      (
        await request(app.getHttpServer())
          .post("/api/v1/auth/login")
          .send({ emailOrPhone: CUSTOMER, password: SEEDED_PASSWORD })
      ).body.data.user.phone as string,
    );
    await request(app.getHttpServer())
      .post(`/api/v1/parcels/${closedId}/cancel`)
      .set(bearer(merchantToken))
      .send({ reason: "Customer changed mind" })
      .expect((r) => expect(r.status).toBeLessThan(300));
    await setPref(closedId, customerToken, { date: dhakaDay(1), slot: "Any time" }).expect(409);
  });

  it("keeps the booking risk snapshot for operators and hides it from customers", async () => {
    const [asMerchant, asCustomer] = await Promise.all([
      request(app.getHttpServer()).get("/api/v1/parcels?limit=50").set(bearer(merchantToken)),
      request(app.getHttpServer()).get("/api/v1/parcels?limit=50").set(bearer(customerToken)),
    ]);
    const merchantRow = (asMerchant.body.data as Array<Record<string, unknown>>).find(
      (p) => p.id === ownParcelId,
    );
    expect(merchantRow).toBeDefined();
    for (const key of ["riskScore", "riskTier", "rtoProbability", "addressConfidenceTier"]) {
      expect(merchantRow).toHaveProperty(key);
    }
    for (const row of asCustomer.body.data as Array<Record<string, unknown>>) {
      expect(row).not.toHaveProperty("riskScore");
      expect(row).not.toHaveProperty("riskTier");
      expect(row).not.toHaveProperty("rtoProbability");
    }
  });

  it("shows the rider's name and real handoff time on delivered parcels, never the phone", async () => {
    const deliveredId = await book(customerPhone);
    const adminToken = await loginToken(app, SEEDED_ACCOUNTS.admin);
    const riders = await request(app.getHttpServer())
      .get("/api/v1/riders")
      .set(bearer(adminToken))
      .expect(200);
    const riderId = ((riders.body.data?.items ?? riders.body.data) as Array<{ id: string }>)[0]?.id;
    await request(app.getHttpServer())
      .post(`/api/v1/parcels/${deliveredId}/assign-rider`)
      .set(bearer(adminToken))
      .send({ riderId })
      .expect((r) => expect(r.status).toBeLessThan(300));
    // Projection test: drive the stored state to an OTP-verified delivery directly.
    const handoff = new Date("2026-11-17T08:30:00.000Z");
    await app
      .get(DataSource)
      .query(`UPDATE parcels SET status = 'DELIVERED', otp_verified_at = $2 WHERE id = $1`, [
        deliveredId,
        handoff,
      ]);

    const res = await request(app.getHttpServer())
      .get("/api/v1/parcels?limit=50")
      .set(bearer(customerToken))
      .expect(200);
    const row = (res.body.data as ParcelListItem[]).find((p) => p.id === deliveredId);
    expect(row?.status).toBe("DELIVERED");
    expect(typeof row?.riderName).toBe("string");
    expect(row?.riderPhone).toBeNull();
    expect(row?.deliveredAt).toBe(handoff.toISOString());
  });
});
