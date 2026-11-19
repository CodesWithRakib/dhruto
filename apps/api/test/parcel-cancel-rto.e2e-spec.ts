import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { type INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
import { DhrutoValidationPipe } from "../src/common/pipes/validation.pipe.js";
import { WebhookEvent } from "@dhruto/contracts";
import { SEEDED_ACCOUNTS, bearer, idempotencyKey, loginToken } from "./utils/auth.js";
import { realisticName } from "./utils/realistic.js";

/**
 * Phase 3 Slice C (T-CANCEL-01, T-RTO-01): cancel + RTO initiation.
 * Policy = the lifecycle matrix: pre-pickup cancel, RTO from failed delivery.
 */
describe("Parcel cancel & RTO initiation (Phase 3 E2E)", () => {
  let app: INestApplication;
  let merchantToken: string;
  let merchant2Token: string;
  let adminToken: string;
  let dhkToken: string;
  let ctgToken: string;
  let riderToken: string;
  let riderId: string;


  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(new DhrutoValidationPipe());
    await app.init();

    [merchantToken, merchant2Token, adminToken, dhkToken, ctgToken] = await Promise.all([
      loginToken(app, SEEDED_ACCOUNTS.merchant),
      loginToken(app, SEEDED_ACCOUNTS.merchant2),
      loginToken(app, SEEDED_ACCOUNTS.admin),
      loginToken(app, SEEDED_ACCOUNTS.hubManager),
      loginToken(app, SEEDED_ACCOUNTS.hubManagerCtg),
    ]);
    riderToken = await loginToken(app, SEEDED_ACCOUNTS.rider);
    const me = await request(app.getHttpServer())
      .get("/api/v1/auth/me")
      .set(bearer(riderToken))
      .expect(200);
    riderId = me.body.data.rider.id as string;
  });

  afterAll(async () => {
    await app.close();
  });

  async function book(tag: string): Promise<{ id: string; trackingCode: string }> {
    const res = await request(app.getHttpServer())
      .post("/api/v1/parcels")
      .set(bearer(merchantToken))
      .set("Idempotency-Key", idempotencyKey(`cancel-rto-${tag}`))
      .send({
        recipientName: realisticName(),
        recipientPhone: "01712345678",
        district: "Dhaka",
        thana: "Mirpur",
        deliveryAddress: "House 3, Road 3, Mirpur, Dhaka",
        codAmount: 400,
        weight: 1,
      })
      .expect(201);
    return { id: res.body.data.id as string, trackingCode: res.body.data.trackingCode as string };
  }

  it("merchant cancels own CREATED parcel; repeat replays CANCELLED", async () => {
    const parcel = await book("cancel-ok");

    const first = await request(app.getHttpServer())
      .post(`/api/v1/parcels/${parcel.id}/cancel`)
      .set(bearer(merchantToken))
      .expect(200);
    expect(first.body.data.status).toBe("CANCELLED");

    const again = await request(app.getHttpServer())
      .post(`/api/v1/parcels/${parcel.id}/cancel`)
      .set(bearer(merchantToken))
      .expect(200);
    expect(again.body.data.status).toBe("CANCELLED");

    const history = await request(app.getHttpServer())
      .get(`/api/v1/parcels/${parcel.id}/history`)
      .set(bearer(merchantToken))
      .expect(200);
    expect(
      (history.body.data as Array<{ toStatus: string }>).some((h) => h.toStatus === "CANCELLED"),
    ).toBe(true);
  });

  it("cross-merchant cancel is 404 and late cancel is 400", async () => {
    const parcel = await book("cancel-foreign");
    await request(app.getHttpServer())
      .post(`/api/v1/parcels/${parcel.id}/cancel`)
      .set(bearer(merchant2Token))
      .expect(404);

    // Advance beyond the pre-pickup window, then cancel must fail.
    const hubs = await request(app.getHttpServer())
      .get("/api/v1/hubs")
      .set(bearer(dhkToken))
      .expect(200);
    const hubId = hubs.body.data[0].id as string;
    await request(app.getHttpServer())
      .post(`/api/v1/hubs/${hubId}/scans`)
      .set(bearer(dhkToken))
      .send({ barcode: parcel.trackingCode, scanType: "RECEIVE_INBOUND" })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/v1/parcels/${parcel.id}/cancel`)
      .set(bearer(merchantToken))
      .expect(400);
  });

  it("hub manager initiates RTO from failed delivery; repeat replays", async () => {
    const parcel = await book("rto-ok");

    await request(app.getHttpServer())
      .post(`/api/v1/parcels/${parcel.id}/assign-rider`)
      .set(bearer(dhkToken))
      .send({ riderId })
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/riders/me/parcels/${parcel.id}/start-delivery`)
      .set(bearer(riderToken))
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/riders/me/deliveries/${parcel.id}/fail`)
      .set(bearer(riderToken))
      .send({ reason: "CUSTOMER_UNAVAILABLE" })
      .expect(200);

    const first = await request(app.getHttpServer())
      .post(`/api/v1/parcels/${parcel.id}/rto`)
      .set(bearer(dhkToken))
      .expect(200);
    expect(first.body.data.status).toBe("RTO_INITIATED");

    const again = await request(app.getHttpServer())
      .post(`/api/v1/parcels/${parcel.id}/rto`)
      .set(bearer(dhkToken))
      .expect(200);
    expect(again.body.data.status).toBe("RTO_INITIATED");
  });

  it("merchant cannot initiate RTO and RTO from CREATED is 400", async () => {
    const parcel = await book("rto-deny");

    await request(app.getHttpServer())
      .post(`/api/v1/parcels/${parcel.id}/rto`)
      .set(bearer(merchantToken))
      .expect(403);

    await request(app.getHttpServer())
      .post(`/api/v1/parcels/${parcel.id}/rto`)
      .set(bearer(adminToken))
      .expect(400);
  });

  it("cross-hub RTO initiation is 403 (Phase 4 hub scoping)", async () => {
    const parcel = await book("rto-xhub");

    await request(app.getHttpServer())
      .post(`/api/v1/parcels/${parcel.id}/assign-rider`)
      .set(bearer(dhkToken))
      .send({ riderId })
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/riders/me/parcels/${parcel.id}/start-delivery`)
      .set(bearer(riderToken))
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/riders/me/deliveries/${parcel.id}/fail`)
      .set(bearer(riderToken))
      .send({ reason: "CUSTOMER_UNAVAILABLE" })
      .expect(200);

    // CTG manager has no assignment on the DHK parcel's hub.
    await request(app.getHttpServer())
      .post(`/api/v1/parcels/${parcel.id}/rto`)
      .set(bearer(ctgToken))
      .expect(403);

    // DHK manager is in scope.
    await request(app.getHttpServer())
      .post(`/api/v1/parcels/${parcel.id}/rto`)
      .set(bearer(dhkToken))
      .expect(200);
  });

  it("advances RTO to transit and completes the return with event fan-out", async () => {
    // Test-hygiene: remove stale subscriptions from earlier runs so this
    // run fans out to exactly one subscription (otherwise every parcel
    // event multiplies across accumulated subs and slows the relay).
    const existing = await request(app.getHttpServer())
      .get("/api/v1/webhooks/subscriptions")
      .set(bearer(merchantToken))
      .expect(200);
    for (const sub of existing.body.data as Array<{ id: string }>) {
      await request(app.getHttpServer())
        .delete(`/api/v1/webhooks/subscriptions/${sub.id}`)
        .set(bearer(merchantToken))
        .expect(200);
    }
    // Merchant webhook subscription so the PARCEL_RETURNED fan-out is observable.
    await request(app.getHttpServer())
      .post("/api/v1/webhooks/subscriptions")
      .set(bearer(merchantToken))
      .send({
        url: "https://example.com/rto-receiver",
        events: [WebhookEvent.PARCEL_RETURNED],
        description: "RTO test subscription",
      })
      .expect(201);

    const parcel = await book("rto-full");

    await request(app.getHttpServer())
      .post(`/api/v1/parcels/${parcel.id}/assign-rider`)
      .set(bearer(dhkToken))
      .send({ riderId })
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/riders/me/parcels/${parcel.id}/start-delivery`)
      .set(bearer(riderToken))
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/riders/me/deliveries/${parcel.id}/fail`)
      .set(bearer(riderToken))
      .send({ reason: "CUSTOMER_REFUSED" })
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/parcels/${parcel.id}/rto`)
      .set(bearer(dhkToken))
      .expect(200);

    // Wrong order: complete before advance must fail.
    await request(app.getHttpServer())
      .post(`/api/v1/parcels/${parcel.id}/rto-complete`)
      .set(bearer(dhkToken))
      .expect(400);

    const advanced = await request(app.getHttpServer())
      .post(`/api/v1/parcels/${parcel.id}/rto-advance`)
      .set(bearer(dhkToken))
      .expect(200);
    expect(advanced.body.data.status).toBe("RETURN_IN_TRANSIT");

    const completed = await request(app.getHttpServer())
      .post(`/api/v1/parcels/${parcel.id}/rto-complete`)
      .set(bearer(dhkToken))
      .expect(200);
    expect(completed.body.data.status).toBe("RETURNED_TO_MERCHANT");

    // Repeat completion replays without duplicating the event.
    const replay = await request(app.getHttpServer())
      .post(`/api/v1/parcels/${parcel.id}/rto-complete`)
      .set(bearer(dhkToken))
      .expect(200);
    expect(replay.body.data.status).toBe("RETURNED_TO_MERCHANT");

    // The relay fans out one parcel.returned delivery per ACTIVE
    // subscription (rerun-safe: filter to this parcel, assert no dupes).
    // Generous deadline: on a shared disposable DB the relay may be
    // draining backlog from earlier suites.
    const deadline = Date.now() + 60000;
    let rows: Array<{ event: string; subscriptionId: string; signature: string }> = [];
    for (;;) {
      const deliveries = await request(app.getHttpServer())
        .get("/api/v1/webhooks/deliveries")
        .set(bearer(merchantToken))
        .expect(200);
      rows = (
        deliveries.body.data.items as Array<{
          event: string;
          subscriptionId: string;
          signature: string;
          payload?: { data?: { trackingCode?: string } };
        }>
      ).filter(
        (d) =>
          d.event === WebhookEvent.PARCEL_RETURNED &&
          d.payload?.data?.trackingCode === parcel.trackingCode,
      );
      if (rows.length >= 1) break;
      if (Date.now() > deadline) {
        throw new Error("Timed out waiting for parcel.returned delivery");
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    expect(new Set(rows.map((r) => r.subscriptionId)).size).toBe(rows.length);
    for (const row of rows) {
      expect(row.signature).toMatch(/^t=\d+,v1=[0-9a-f]{64}$/);
    }
  });
});
