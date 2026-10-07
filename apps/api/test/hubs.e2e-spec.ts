import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test, type TestingModule } from "@nestjs/testing";
import { type INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
import { BagStatus, HubScanType, ParcelStatus, ScanOutcome } from "@dhruto/contracts";
import { SEEDED_ACCOUNTS, bearer, idempotencyKey, loginToken } from "./utils/auth.js";

/**
 * Phase 2 hub operations, end-to-end against the real database and the real
 * authorization stack.
 *
 * Covers the operational flow (inbound -> bag -> seal -> manifest -> dispatch ->
 * receive) and the security boundaries (cross-hub isolation, unauthenticated
 * and merchant access, sealed-bag immutability, duplicate operations).
 */
describe("Hub Operations (Phase 2 E2E)", () => {
  let app: INestApplication;
  let merchantToken: string;
  let dhkToken: string;
  let ctgToken: string;
  let dhkHubId: string;
  let ctgHubId: string;

  const unique = () => Math.random().toString(36).slice(2, 8).toUpperCase();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api/v1");
    await app.init();

    [merchantToken, dhkToken, ctgToken] = await Promise.all([
      loginToken(app, SEEDED_ACCOUNTS.merchant),
      loginToken(app, SEEDED_ACCOUNTS.hubManager),
      loginToken(app, SEEDED_ACCOUNTS.hubManagerCtg),
    ]);

    const dhk = await request(app.getHttpServer())
      .get("/api/v1/hubs")
      .set(bearer(dhkToken))
      .expect(200);
    dhkHubId = dhk.body.data[0].id;

    const destinations = await request(app.getHttpServer())
      .get("/api/v1/hubs/destinations")
      .set(bearer(dhkToken))
      .expect(200);
    ctgHubId = destinations.body.data.find((hub: { code: string }) => hub.code === "HUB-CTG-01").id;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  async function bookParcel(): Promise<{ id: string; trackingCode: string }> {
    const res = await request(app.getHttpServer())
      .post("/api/v1/parcels")
      .set(bearer(merchantToken))
      .set("Idempotency-Key", idempotencyKey("phase2"))
      .send({
        recipientName: `Hub Recipient ${unique()}`,
        recipientPhone: "01712345678",
        district: "Chittagong",
        thana: "Panchlaish",
        deliveryAddress: "GEC Circle, Nasirabad, Chittagong",
        codAmount: 1200,
        weight: 1,
      })
      .expect(201);

    return { id: res.body.data.id, trackingCode: res.body.data.trackingCode };
  }

  describe("Authorization", () => {
    it("rejects anonymous access to hub endpoints", async () => {
      await request(app.getHttpServer()).get("/api/v1/hubs").expect(401);
      await request(app.getHttpServer()).get("/api/v1/bags").expect(401);
      await request(app.getHttpServer()).get("/api/v1/exceptions").expect(401);
    });

    it("rejects a merchant from hub operations", async () => {
      await request(app.getHttpServer()).get("/api/v1/hubs").set(bearer(merchantToken)).expect(403);
      await request(app.getHttpServer()).get("/api/v1/bags").set(bearer(merchantToken)).expect(403);
    });

    it("scopes a hub operator to their own hub", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/hubs")
        .set(bearer(dhkToken))
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].code).toBe("HUB-DHK-01");

      // Cross-hub reads are refused.
      await request(app.getHttpServer())
        .get("/api/v1/hubs/HUB-CTG-01/dashboard")
        .set(bearer(dhkToken))
        .expect(403);
    });
  });

  describe("Inbound scanning", () => {
    it("receives a parcel and records exactly one applied scan", async () => {
      const parcel = await bookParcel();

      const scan = await request(app.getHttpServer())
        .post(`/api/v1/hubs/${dhkHubId}/scans`)
        .set(bearer(dhkToken))
        .send({ barcode: parcel.trackingCode, scanType: HubScanType.RECEIVE_INBOUND })
        .expect(200);

      expect(scan.body.data.outcome).toBe(ScanOutcome.APPLIED);
      expect(scan.body.data.currentStatus).toBe(ParcelStatus.ORIGIN_HUB_RECEIVED);

      // A second scan of the same parcel is reported, not re-applied.
      const again = await request(app.getHttpServer())
        .post(`/api/v1/hubs/${dhkHubId}/scans`)
        .set(bearer(dhkToken))
        .send({ barcode: parcel.trackingCode, scanType: HubScanType.RECEIVE_INBOUND })
        .expect(200);
      expect(again.body.data.outcome).toBe(ScanOutcome.DUPLICATE);

      const scans = await request(app.getHttpServer())
        .get(`/api/v1/hubs/${dhkHubId}/scans?limit=100`)
        .set(bearer(dhkToken))
        .expect(200);

      const applied = scans.body.data.filter(
        (row: { trackingCode: string; outcome: string }) =>
          row.trackingCode === parcel.trackingCode && row.outcome === ScanOutcome.APPLIED,
      );
      expect(applied).toHaveLength(1);
    });

    it("rejects an unknown barcode", async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/hubs/${dhkHubId}/scans`)
        .set(bearer(dhkToken))
        .send({ barcode: "DHR-20260101-ZZZZZZ", scanType: HubScanType.RECEIVE_INBOUND })
        .expect(404);
    });

    it("serializes concurrent scans of the same parcel", async () => {
      const parcel = await bookParcel();

      const [a, b] = await Promise.all([
        request(app.getHttpServer())
          .post(`/api/v1/hubs/${dhkHubId}/scans`)
          .set(bearer(dhkToken))
          .send({ barcode: parcel.trackingCode, scanType: HubScanType.RECEIVE_INBOUND }),
        request(app.getHttpServer())
          .post(`/api/v1/hubs/${dhkHubId}/scans`)
          .set(bearer(dhkToken))
          .send({ barcode: parcel.trackingCode, scanType: HubScanType.RECEIVE_INBOUND }),
      ]);

      const outcomes = [a.body.data?.outcome, b.body.data?.outcome].sort();
      expect(outcomes).toEqual([ScanOutcome.APPLIED, ScanOutcome.DUPLICATE].sort());

      const scans = await request(app.getHttpServer())
        .get(`/api/v1/hubs/${dhkHubId}/scans?limit=100`)
        .set(bearer(dhkToken))
        .expect(200);

      const applied = scans.body.data.filter(
        (row: { trackingCode: string; outcome: string }) =>
          row.trackingCode === parcel.trackingCode && row.outcome === ScanOutcome.APPLIED,
      );
      expect(applied).toHaveLength(1);
    });
  });

  describe("Bagging", () => {
    it("bags a parcel, seals the bag and freezes membership", async () => {
      const parcel = await bookParcel();

      await request(app.getHttpServer())
        .post(`/api/v1/hubs/${dhkHubId}/scans`)
        .set(bearer(dhkToken))
        .send({ barcode: parcel.trackingCode, scanType: HubScanType.RECEIVE_INBOUND })
        .expect(200);

      const bag = await request(app.getHttpServer())
        .post(`/api/v1/hubs/${dhkHubId}/bags`)
        .set(bearer(dhkToken))
        .send({ destinationHubId: ctgHubId })
        .expect(201);

      expect(bag.body.data.status).toBe(BagStatus.OPEN);
      const bagId = bag.body.data.id;

      await request(app.getHttpServer())
        .post(`/api/v1/bags/${bagId}/parcels`)
        .set(bearer(dhkToken))
        .send({ parcelTrackingCode: parcel.trackingCode })
        .expect(200);

      // The same parcel cannot be bagged twice.
      await request(app.getHttpServer())
        .post(`/api/v1/bags/${bagId}/parcels`)
        .set(bearer(dhkToken))
        .send({ parcelTrackingCode: parcel.trackingCode })
        .expect(409);

      const sealed = await request(app.getHttpServer())
        .post(`/api/v1/bags/${bagId}/seal`)
        .set(bearer(dhkToken))
        .send({ sealTag: `SEAL-${unique()}` })
        .expect(200);
      expect(sealed.body.data.status).toBe(BagStatus.SEALED);

      // A sealed bag is immutable.
      const otherParcel = await bookParcel();
      await request(app.getHttpServer())
        .post(`/api/v1/bags/${bagId}/parcels`)
        .set(bearer(dhkToken))
        .send({ parcelTrackingCode: otherParcel.trackingCode })
        .expect(400);
    });

    it("serializes two operators bagging the same parcel into different bags", async () => {
      const parcel = await bookParcel();

      await request(app.getHttpServer())
        .post(`/api/v1/hubs/${dhkHubId}/scans`)
        .set(bearer(dhkToken))
        .send({ barcode: parcel.trackingCode, scanType: HubScanType.RECEIVE_INBOUND })
        .expect(200);

      const [bagA, bagB] = await Promise.all([
        request(app.getHttpServer())
          .post(`/api/v1/hubs/${dhkHubId}/bags`)
          .set(bearer(dhkToken))
          .send({ destinationHubId: ctgHubId })
          .expect(201),
        request(app.getHttpServer())
          .post(`/api/v1/hubs/${dhkHubId}/bags`)
          .set(bearer(dhkToken))
          .send({ destinationHubId: ctgHubId })
          .expect(201),
      ]);
      const bagAId = bagA.body.data.id as string;
      const bagBId = bagB.body.data.id as string;

      const [first, second] = await Promise.all([
        request(app.getHttpServer())
          .post(`/api/v1/bags/${bagAId}/parcels`)
          .set(bearer(dhkToken))
          .send({ parcelTrackingCode: parcel.trackingCode }),
        request(app.getHttpServer())
          .post(`/api/v1/bags/${bagBId}/parcels`)
          .set(bearer(dhkToken))
          .send({ parcelTrackingCode: parcel.trackingCode }),
      ]);

      const statuses = [first.status, second.status].sort();
      expect(statuses).toEqual([200, 409]);

      // The parcel belongs to exactly one active bag.
      const winnerId = first.status === 200 ? bagAId : bagBId;
      const winner = await request(app.getHttpServer())
        .get(`/api/v1/bags/${winnerId}`)
        .set(bearer(dhkToken))
        .expect(200);
      expect(
        winner.body.data.parcels.map((p: { trackingCode: string }) => p.trackingCode),
      ).toContain(parcel.trackingCode);
    });
  });

  describe("Manifest dispatch and receive", () => {
    it("dispatches a manifest and receives it at the destination hub", async () => {
      const parcel = await bookParcel();

      await request(app.getHttpServer())
        .post(`/api/v1/hubs/${dhkHubId}/scans`)
        .set(bearer(dhkToken))
        .send({ barcode: parcel.trackingCode, scanType: HubScanType.RECEIVE_INBOUND })
        .expect(200);

      const bag = await request(app.getHttpServer())
        .post(`/api/v1/hubs/${dhkHubId}/bags`)
        .set(bearer(dhkToken))
        .send({ destinationHubId: ctgHubId })
        .expect(201);
      const bagId = bag.body.data.id;
      const bagCode = bag.body.data.bagCode;

      await request(app.getHttpServer())
        .post(`/api/v1/bags/${bagId}/parcels`)
        .set(bearer(dhkToken))
        .send({ parcelTrackingCode: parcel.trackingCode })
        .expect(200);

      await request(app.getHttpServer())
        .post(`/api/v1/bags/${bagId}/seal`)
        .set(bearer(dhkToken))
        .send({ sealTag: `SEAL-${unique()}` })
        .expect(200);

      const manifest = await request(app.getHttpServer())
        .post(`/api/v1/hubs/${dhkHubId}/manifests`)
        .set(bearer(dhkToken))
        .send({
          destinationHubId: ctgHubId,
          bagIds: [bagId],
          vehicleNumber: `DHK-CTG-${unique()}`,
        })
        .expect(201);
      const manifestId = manifest.body.data.id;

      const dispatched = await request(app.getHttpServer())
        .post(`/api/v1/manifests/${manifestId}/dispatch`)
        .set(bearer(dhkToken))
        .expect(200);
      expect(dispatched.body.data.status).toBe("DISPATCHED");

      // Only one operator may dispatch.
      await request(app.getHttpServer())
        .post(`/api/v1/manifests/${manifestId}/dispatch`)
        .set(bearer(dhkToken))
        .expect(409);

      // The origin hub operator cannot receive their own outbound manifest.
      await request(app.getHttpServer())
        .post(`/api/v1/manifests/${manifestId}/receive`)
        .set(bearer(dhkToken))
        .send({ scannedBagCodes: [bagCode] })
        .expect(403);

      // An unexpected bag is rejected rather than absorbed.
      await request(app.getHttpServer())
        .post(`/api/v1/manifests/${manifestId}/receive`)
        .set(bearer(ctgToken))
        .send({ scannedBagCodes: [`BAG-NOT-REAL-${unique()}`] })
        .expect(400);

      const exceptions = await request(app.getHttpServer())
        .get("/api/v1/exceptions?status=OPEN")
        .set(bearer(ctgToken))
        .expect(200);
      expect(
        exceptions.body.data.some((row: { type: string }) => row.type === "UNEXPECTED_BAG"),
      ).toBe(true);

      // A missing bag blocks completion unless a partial receipt is allowed.
      await request(app.getHttpServer())
        .post(`/api/v1/manifests/${manifestId}/receive`)
        .set(bearer(ctgToken))
        .send({ scannedBagCodes: [] })
        .expect(409);

      const received = await request(app.getHttpServer())
        .post(`/api/v1/manifests/${manifestId}/receive`)
        .set(bearer(ctgToken))
        .send({ scannedBagCodes: [bagCode] })
        .expect(200);
      expect(received.body.data.status).toBe("RECEIVED");

      // Parcel arrived and its history records the full chain.
      const detail = await request(app.getHttpServer())
        .get(`/api/v1/parcels/${parcel.id}`)
        .set(bearer(merchantToken))
        .expect(200);
      expect(detail.body.data.status).toBe(ParcelStatus.DESTINATION_HUB_RECEIVED);

      const chain = detail.body.data.history
        .map(
          (h: { fromStatus: string | null; toStatus: string }) => `${h.fromStatus}->${h.toStatus}`,
        )
        .join(",");
      expect(chain).toContain("ORIGIN_HUB_RECEIVED->BAGGED");
      expect(chain).toContain("BAGGED->IN_TRANSIT");
      expect(chain).toContain("IN_TRANSIT->DESTINATION_HUB_RECEIVED");
    });
  });
});
