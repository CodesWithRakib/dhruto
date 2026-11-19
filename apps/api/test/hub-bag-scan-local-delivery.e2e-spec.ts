import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test, type TestingModule } from "@nestjs/testing";
import { type INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
import { DhrutoValidationPipe } from "../src/common/pipes/validation.pipe.js";
import { HubScanType, ParcelStatus } from "@dhruto/contracts";
import { SEEDED_ACCOUNTS, bearer, idempotencyKey, loginToken } from "./utils/auth.js";
import { realisticName } from "./utils/realistic.js";

/**
 * Regressions found in the browser walkthrough:
 *  1. Receiving a line-haul bag by scanning its bag code (RECEIVE_TRANSFER)
 *     returned 500: the bag query used FOR UPDATE across LEFT JOINs.
 *  2. Same-city parcels needed a fake bag/manifest trip before a rider could
 *     be assigned; inter-district parcels must still be refused at origin.
 */
describe("Hub bag scan + local delivery E2E", () => {
  let app: INestApplication;
  let merchantToken: string;
  let dhkToken: string;
  let ctgToken: string;
  let dhkHubId: string;
  let ctgHubId: string;
  let dhkRiderId: string;
  const unique = () => Math.random().toString(36).slice(2, 8).toUpperCase();

  const book = async (district: string, thana: string) => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/parcels")
      .set(bearer(merchantToken))
      .set("Idempotency-Key", idempotencyKey("bagscan"))
      .send({
        recipientName: realisticName(),
        recipientPhone: "01812345678",
        district,
        thana,
        deliveryAddress: `House 1, Road 2, ${thana}, ${district}`,
        codAmount: 500,
        weight: 1,
      })
      .expect(201);
    return { id: res.body.data.id as string, code: res.body.data.trackingCode as string };
  };

  const inbound = (code: string) =>
    request(app.getHttpServer())
      .post(`/api/v1/hubs/${dhkHubId}/scans`)
      .set(bearer(dhkToken))
      .send({ barcode: code, scanType: HubScanType.RECEIVE_INBOUND })
      .expect(200);

  beforeAll(async () => {
    process.env.CHAT_REALTIME_REDIS_ENABLED = "false";
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api/v1", { exclude: ["health", "health/(.*)"] });
    app.useGlobalPipes(new DhrutoValidationPipe());
    await app.init();
    [merchantToken, dhkToken, ctgToken] = await Promise.all([
      loginToken(app, SEEDED_ACCOUNTS.merchant),
      loginToken(app, SEEDED_ACCOUNTS.hubManager),
      loginToken(app, SEEDED_ACCOUNTS.hubManagerCtg),
    ]);
    dhkHubId = (await request(app.getHttpServer()).get("/api/v1/hubs").set(bearer(dhkToken))).body
      .data[0].id;
    ctgHubId = (await request(app.getHttpServer()).get("/api/v1/hubs").set(bearer(ctgToken))).body
      .data[0].id;
    const riders = await request(app.getHttpServer())
      .get(`/api/v1/riders?hubId=${dhkHubId}&limit=100`)
      .set(bearer(dhkToken))
      .expect(200);
    dhkRiderId = (riders.body.data as Array<{ id: string; status: string }>).find(
      (r) => r.status === "ACTIVE" || r.status === "ON_DUTY",
    )!.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it("receives a line-haul bag at the destination hub by scanning the bag code", async () => {
    const parcel = await book("Chittagong", "Panchlaish");
    await inbound(parcel.code);
    const bag = await request(app.getHttpServer())
      .post(`/api/v1/hubs/${dhkHubId}/bags`)
      .set(bearer(dhkToken))
      .send({ destinationHubId: ctgHubId })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/bags/${bag.body.data.id}/parcels`)
      .set(bearer(dhkToken))
      .send({ parcelTrackingCode: parcel.code })
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/bags/${bag.body.data.id}/seal`)
      .set(bearer(dhkToken))
      .send({ sealTag: `SEAL-${unique()}` })
      .expect(200);
    const manifest = await request(app.getHttpServer())
      .post(`/api/v1/hubs/${dhkHubId}/manifests`)
      .set(bearer(dhkToken))
      .send({ destinationHubId: ctgHubId, bagIds: [bag.body.data.id], vehicleNumber: `TEST-${unique()}` })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/manifests/${manifest.body.data.id}/dispatch`)
      .set(bearer(dhkToken))
      .expect(200);

    const scan = await request(app.getHttpServer())
      .post(`/api/v1/hubs/${ctgHubId}/scans`)
      .set(bearer(ctgToken))
      .send({ barcode: bag.body.data.bagCode, scanType: HubScanType.RECEIVE_TRANSFER });
    expect(scan.status).toBe(200);

    const after = await request(app.getHttpServer())
      .get(`/api/v1/parcels/${parcel.id}`)
      .set(bearer(merchantToken))
      .expect(200);
    expect(after.body.data.status).toBe(ParcelStatus.DESTINATION_HUB_RECEIVED);
  });

  it("assigns a same-city parcel straight from the origin hub", async () => {
    const parcel = await book("Dhaka", "Mirpur");
    await inbound(parcel.code);
    const res = await request(app.getHttpServer())
      .post(`/api/v1/parcels/${parcel.id}/assign-rider`)
      .set(bearer(dhkToken))
      .send({ riderId: dhkRiderId });
    expect(res.status).toBeLessThan(300);
    const after = await request(app.getHttpServer())
      .get(`/api/v1/parcels/${parcel.id}`)
      .set(bearer(merchantToken))
      .expect(200);
    expect(after.body.data.status).toBe(ParcelStatus.ASSIGNED_TO_RIDER);
    expect(after.body.data.history.at(-1).description).toMatch(/Local delivery/);
  });

  it("refuses rider assignment at origin for another district", async () => {
    const parcel = await book("Chittagong", "Panchlaish");
    await inbound(parcel.code);
    await request(app.getHttpServer())
      .post(`/api/v1/parcels/${parcel.id}/assign-rider`)
      .set(bearer(dhkToken))
      .send({ riderId: dhkRiderId })
      .expect(400);
  });
});
