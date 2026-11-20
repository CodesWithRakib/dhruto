import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test, type TestingModule } from "@nestjs/testing";
import { type INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
import { DhrutoValidationPipe } from "../src/common/pipes/validation.pipe.js";
import { DomainEventType, HubScanType, ParcelStatus } from "@dhruto/contracts";
import { DataSource } from "typeorm";
import { SEEDED_ACCOUNTS, bearer, idempotencyKey, loginToken } from "./utils/auth.js";
import { realisticAddress, realisticName, realisticPhone, realisticProduct } from "./utils/realistic.js";

/**
 * First-mile pickup leg: merchant requests a pickup → the hub serving the
 * merchant's pickup district sees it → assigns its rider → the rider confirms
 * collection → the hub inbound scan releases the pickup rider.
 */
describe("First-mile pickups E2E", () => {
  let app: INestApplication;
  let merchantToken: string;
  let dhkToken: string;
  let ctgToken: string;
  let riderToken: string;
  let dhkHubId: string;
  let ctgHubId: string;
  let riderId: string;

  const bookAndRequestPickup = async () => {
    const booked = await request(app.getHttpServer())
      .post("/api/v1/parcels")
      .set(bearer(merchantToken))
      .set("Idempotency-Key", idempotencyKey("pickup"))
      .send({
        recipientName: realisticName(),
        recipientPhone: realisticPhone(),
        district: "Dhaka",
        thana: "Mirpur",
        deliveryAddress: realisticAddress("Dhaka", "Mirpur"),
        parcelDescription: realisticProduct(),
        codAmount: 1450,
        weight: 1.2,
      })
      .expect(201);
    const id = booked.body.data.id as string;
    await request(app.getHttpServer())
      .post(`/api/v1/parcels/${id}/request-pickup`)
      .set(bearer(merchantToken))
      .send({ notes: "Collect from the shop counter after 3 PM" })
      .expect((r) => expect(r.status).toBeLessThan(300));
    return { id, code: booked.body.data.trackingCode as string };
  };

  beforeAll(async () => {
    process.env.CHAT_REALTIME_REDIS_ENABLED = "false";
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api/v1", { exclude: ["health", "health/(.*)"] });
    app.useGlobalPipes(new DhrutoValidationPipe());
    await app.init();
    [merchantToken, dhkToken, ctgToken, riderToken] = await Promise.all([
      loginToken(app, SEEDED_ACCOUNTS.merchant),
      loginToken(app, SEEDED_ACCOUNTS.hubManager),
      loginToken(app, SEEDED_ACCOUNTS.hubManagerCtg),
      loginToken(app, SEEDED_ACCOUNTS.rider),
    ]);
    // The seeded merchant picks up from its Uttara (Dhaka) warehouse.
    await request(app.getHttpServer())
      .patch("/api/v1/merchants/me")
      .set(bearer(merchantToken))
      .send({ pickupDistrict: "Dhaka", pickupThana: "Uttara" })
      .expect((r) => expect(r.status).toBeLessThan(300));
    dhkHubId = (await request(app.getHttpServer()).get("/api/v1/hubs").set(bearer(dhkToken))).body.data[0].id;
    ctgHubId = (await request(app.getHttpServer()).get("/api/v1/hubs").set(bearer(ctgToken))).body.data[0].id;
    riderId = (await request(app.getHttpServer()).get("/api/v1/auth/me").set(bearer(riderToken))).body.data.rider.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it("routes a pickup request to the hub serving the merchant's district only", async () => {
    const parcel = await bookAndRequestPickup();
    const dhk = await request(app.getHttpServer())
      .get(`/api/v1/hubs/${dhkHubId}/pickup-requests`)
      .set(bearer(dhkToken))
      .expect(200);
    const ids = (dhk.body.data as Array<{ parcels: Array<{ id: string; pickupInstructions: string | null }> }>).flatMap((g) => g.parcels);
    const mine = ids.find((p) => p.id === parcel.id);
    expect(mine).toBeDefined();
    expect(mine?.pickupInstructions).toMatch(/shop counter/);

    const ctg = await request(app.getHttpServer())
      .get(`/api/v1/hubs/${ctgHubId}/pickup-requests`)
      .set(bearer(ctgToken))
      .expect(200);
    const ctgIds = (ctg.body.data as Array<{ parcels: Array<{ id: string }> }>).flatMap((g) => g.parcels.map((p) => p.id));
    expect(ctgIds).not.toContain(parcel.id);
  });

  it("assigns a pickup rider, the rider confirms, and the hub inbound releases the rider", async () => {
    const parcel = await bookAndRequestPickup();
    await request(app.getHttpServer())
      .post(`/api/v1/hubs/${dhkHubId}/pickups/assign`)
      .set(bearer(dhkToken))
      .send({ riderId, parcelIds: [parcel.id] })
      .expect(200);

    const mine = await request(app.getHttpServer()).get("/api/v1/riders/me/pickups").set(bearer(riderToken)).expect(200);
    expect((mine.body.data as Array<{ parcels: Array<{ id: string }> }>).flatMap((g) => g.parcels.map((p) => p.id))).toContain(parcel.id);

    await request(app.getHttpServer())
      .post("/api/v1/riders/me/pickups/confirm")
      .set(bearer(riderToken))
      .send({ parcelIds: [parcel.id] })
      .expect(200);
    let p = (await request(app.getHttpServer()).get(`/api/v1/parcels/${parcel.id}`).set(bearer(merchantToken))).body.data;
    expect(p.status).toBe(ParcelStatus.PICKED_UP);
    expect(p.currentRiderName).toBeTruthy();
    // Every first-mile step is announced through the transactional outbox:
    // request → serving hub, assignment → rider + merchant, pickup → merchant.
    const eventsOf = (type: DomainEventType) =>
      app
        .get(DataSource)
        .query("SELECT payload FROM event_outbox WHERE aggregate_id = $1 AND event_type = $2", [
          parcel.id,
          type,
        ]) as Promise<Array<{ payload: Record<string, unknown> }>>;
    const [requested] = await eventsOf(DomainEventType.PARCEL_PICKUP_REQUESTED);
    expect(requested?.payload.pickupDistrict).toBe("Dhaka");
    const [assigned] = await eventsOf(DomainEventType.PARCEL_PICKUP_ASSIGNED);
    expect(assigned?.payload).toMatchObject({ riderId, parcelCount: 1, hubId: dhkHubId });
    const pickedUp = await eventsOf(DomainEventType.PARCEL_PICKED_UP);
    expect(pickedUp).toHaveLength(1);
    expect(pickedUp[0]!.payload.trackingCode).toBe(parcel.code);

    await request(app.getHttpServer())
      .post(`/api/v1/hubs/${dhkHubId}/scans`)
      .set(bearer(dhkToken))
      .send({ barcode: parcel.code, scanType: HubScanType.RECEIVE_INBOUND })
      .expect(200);
    p = (await request(app.getHttpServer()).get(`/api/v1/parcels/${parcel.id}`).set(bearer(merchantToken))).body.data;
    expect(p.status).toBe(ParcelStatus.ORIGIN_HUB_RECEIVED);
    expect(p.currentRiderName).toBeNull();
  });

  it("refuses assignment from a hub outside the merchant's pickup district", async () => {
    const parcel = await bookAndRequestPickup();
    const ctgRiders = await request(app.getHttpServer())
      .get(`/api/v1/riders?hubId=${ctgHubId}&limit=100`)
      .set(bearer(ctgToken))
      .expect(200);
    const ctgRider = (ctgRiders.body.data as Array<{ id: string }>)[0]!;
    await request(app.getHttpServer())
      .post(`/api/v1/hubs/${ctgHubId}/pickups/assign`)
      .set(bearer(ctgToken))
      .send({ riderId: ctgRider.id, parcelIds: [parcel.id] })
      .expect(403);
  });

  it("does not let a rider confirm someone else's pickup", async () => {
    const parcel = await bookAndRequestPickup();
    await request(app.getHttpServer())
      .post("/api/v1/riders/me/pickups/confirm")
      .set(bearer(riderToken))
      .send({ parcelIds: [parcel.id] })
      .expect(400);
  });
});
