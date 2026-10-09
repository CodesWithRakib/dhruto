import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { type INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import request from "supertest";
import { DhrutoValidationPipe } from "../src/common/pipes/validation.pipe.js";
import { AppModule } from "../src/app.module.js";
import { SEEDED_ACCOUNTS, bearer, idempotencyKey, loginToken } from "./utils/auth.js";

const VALID_BOOKING = {
  recipientName: "Rafiqul Islam",
  recipientPhone: "01712345678",
  district: "Dhaka",
  thana: "Mirpur",
  deliveryAddress: "Section 10, Block C, Mirpur, Dhaka",
  codAmount: 1200,
  weight: 1.5,
};

describe("Parcels API — Phase 1 merchant parcel core (E2E / Integration)", () => {
  let app: INestApplication;
  let merchantToken: string;
  let merchant2Token: string;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(new DhrutoValidationPipe());
    await app.init();

    merchantToken = await loginToken(app, SEEDED_ACCOUNTS.merchant);
    merchant2Token = await loginToken(app, SEEDED_ACCOUNTS.merchant2);
    adminToken = await loginToken(app, SEEDED_ACCOUNTS.admin);
  });

  afterAll(async () => {
    await app.close();
  });

  describe("Authorization", () => {
    it("rejects an unauthenticated booking with 401", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/parcels")
        .set("Idempotency-Key", idempotencyKey("noauth"))
        .send(VALID_BOOKING);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("rejects an unauthenticated parcel list with 401", async () => {
      const res = await request(app.getHttpServer()).get("/api/v1/parcels");
      expect(res.status).toBe(401);
    });

    it("rejects a merchant token on a hub-manager-only command with 403", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/parcels/00000000-0000-0000-0000-000000000000/assign-rider")
        .set(bearer(merchantToken))
        .send({ riderId: "00000000-0000-0000-0000-000000000000" });

      expect(res.status).toBe(403);
    });
  });

  describe("Booking validation", () => {
    it("requires an Idempotency-Key", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/parcels")
        .set(bearer(merchantToken))
        .send(VALID_BOOKING);

      expect(res.status).toBe(400);
      expect(res.body.errorCode).toBe("IDEMPOTENCY_KEY_REQUIRED");
    });

    it("rejects an invalid Bangladesh phone with 422", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/parcels")
        .set(bearer(merchantToken))
        .set("Idempotency-Key", idempotencyKey("bad-phone"))
        .send({ ...VALID_BOOKING, recipientPhone: "01112345678" });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.errorCode).toBe("VALIDATION_ERROR");
      expect(res.body.errors.some((e: { field: string }) => e.field === "recipientPhone")).toBe(
        true,
      );
    });

    it("rejects a negative COD amount with 422", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/parcels")
        .set(bearer(merchantToken))
        .set("Idempotency-Key", idempotencyKey("bad-cod"))
        .send({ ...VALID_BOOKING, codAmount: -50 });

      expect(res.status).toBe(422);
      expect(res.body.errors.some((e: { field: string }) => e.field === "codAmount")).toBe(true);
    });

    it("rejects a missing district with 422", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/parcels")
        .set(bearer(merchantToken))
        .set("Idempotency-Key", idempotencyKey("bad-district"))
        .send({ ...VALID_BOOKING, district: "" });

      expect(res.status).toBe(422);
      expect(res.body.errors.some((e: { field: string }) => e.field === "district")).toBe(true);
    });

    it("rejects zero weight with 422", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/parcels")
        .set(bearer(merchantToken))
        .set("Idempotency-Key", idempotencyKey("bad-weight"))
        .send({ ...VALID_BOOKING, weight: 0 });

      expect(res.status).toBe(422);
    });

    it("normalizes a +880 phone number to canonical 01XXXXXXXXX", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/parcels")
        .set(bearer(merchantToken))
        .set("Idempotency-Key", idempotencyKey("normalize-phone"))
        .send({ ...VALID_BOOKING, recipientPhone: "+8801712345678" })
        .expect(201);

      expect(res.body.data.recipientPhone).toBe("01712345678");
    });
  });

  describe("Booking creation", () => {
    it("creates a parcel with server-calculated pricing and an initial history row", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/parcels")
        .set(bearer(merchantToken))
        .set("Idempotency-Key", idempotencyKey("create-ok"))
        .send(VALID_BOOKING)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.statusCode).toBe(201);

      const parcel = res.body.data;
      expect(parcel.id).toBeDefined();
      expect(parcel.trackingCode).toMatch(/^DHR-\d{8}-[0-9A-Z]{6}$/);
      expect(parcel.status).toBe("CREATED");
      // Inside Dhaka, 1 extra kg beyond the included 1 kg -> 60 + 20.
      expect(parcel.deliveryFee).toBe(80);
      expect(parcel.district).toBe("Dhaka");
      expect(parcel.thana).toBe("Mirpur");
      // Internal columns must never be exposed.
      expect(parcel.normalizedAddress).toBeUndefined();
      expect(parcel.merchantId).toBeUndefined();

      const history = await request(app.getHttpServer())
        .get(`/api/v1/parcels/${parcel.id}/history`)
        .set(bearer(merchantToken))
        .expect(200);

      expect(history.body.data).toHaveLength(1);
      expect(history.body.data[0].toStatus).toBe("CREATED");
      expect(history.body.data[0].eventType).toBe("PARCEL_CREATED");
      expect(history.body.data[0].actorRole).toBe("MERCHANT");
    });
  });

  describe("Idempotency", () => {
    it("replays the original result for the same key and payload", async () => {
      const key = idempotencyKey("replay");

      const first = await request(app.getHttpServer())
        .post("/api/v1/parcels")
        .set(bearer(merchantToken))
        .set("Idempotency-Key", key)
        .send(VALID_BOOKING)
        .expect(201);

      const second = await request(app.getHttpServer())
        .post("/api/v1/parcels")
        .set(bearer(merchantToken))
        .set("Idempotency-Key", key)
        .send(VALID_BOOKING)
        .expect(201);

      expect(second.body.data.id).toBe(first.body.data.id);
      expect(second.body.data.trackingCode).toBe(first.body.data.trackingCode);
    });

    it("returns 409 when the key is reused with a different payload", async () => {
      const key = idempotencyKey("conflict");

      await request(app.getHttpServer())
        .post("/api/v1/parcels")
        .set(bearer(merchantToken))
        .set("Idempotency-Key", key)
        .send(VALID_BOOKING)
        .expect(201);

      const conflict = await request(app.getHttpServer())
        .post("/api/v1/parcels")
        .set(bearer(merchantToken))
        .set("Idempotency-Key", key)
        .send({ ...VALID_BOOKING, codAmount: 9999 });

      expect(conflict.status).toBe(409);
      expect(conflict.body.errorCode).toBe("IDEMPOTENCY_CONFLICT");
    });

    it("creates exactly one parcel for concurrent duplicate submissions", async () => {
      const key = idempotencyKey("concurrent");
      // Unique per run so the assertion is not polluted by earlier test data.
      const marker = `Concurrent Duplicate ${key}`;
      const payload = { ...VALID_BOOKING, recipientName: marker };

      const [a, b] = await Promise.all([
        request(app.getHttpServer())
          .post("/api/v1/parcels")
          .set(bearer(merchantToken))
          .set("Idempotency-Key", key)
          .send(payload),
        request(app.getHttpServer())
          .post("/api/v1/parcels")
          .set(bearer(merchantToken))
          .set("Idempotency-Key", key)
          .send(payload),
      ]);

      const statuses = [a.status, b.status].sort();
      // One request claims the key; the other either replays the winner or is
      // told the command is still in progress. Neither may create a new parcel.
      expect(statuses[0]).toBe(201);
      expect([201, 409]).toContain(statuses[1]);

      const list = await request(app.getHttpServer())
        .get("/api/v1/parcels")
        .query({ search: marker })
        .set(bearer(merchantToken))
        .expect(200);

      expect(list.body.data).toHaveLength(1);

      if (b.status === 201) {
        expect(b.body.data.id).toBe(a.body.data.id);
      }
    });
  });

  describe("Merchant ownership isolation", () => {
    let merchantOneParcelId: string;
    let merchantOneTrackingCode: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/parcels")
        .set(bearer(merchantToken))
        .set("Idempotency-Key", idempotencyKey("ownership"))
        .send({ ...VALID_BOOKING, recipientName: "Ownership Fixture" })
        .expect(201);

      merchantOneParcelId = res.body.data.id;
      merchantOneTrackingCode = res.body.data.trackingCode;
    });

    it("lets the owner read the parcel", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/parcels/${merchantOneParcelId}`)
        .set(bearer(merchantToken))
        .expect(200);
      expect(res.body.data.id).toBe(merchantOneParcelId);
    });

    it("hides another merchant's parcel from a different merchant", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/parcels/${merchantOneParcelId}`)
        .set(bearer(merchant2Token));
      expect(res.status).toBe(404);
    });

    it("hides another merchant's label", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/parcels/${merchantOneParcelId}/label`)
        .set(bearer(merchant2Token));
      expect(res.status).toBe(404);
    });

    it("hides another merchant's history", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/parcels/${merchantOneParcelId}/history`)
        .set(bearer(merchant2Token));
      expect(res.status).toBe(404);
    });

    it("never lists another merchant's parcels", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/parcels")
        .query({ search: merchantOneTrackingCode })
        .set(bearer(merchant2Token))
        .expect(200);
      expect(res.body.data).toHaveLength(0);
    });

    it("allows the platform admin to read any parcel", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/parcels/${merchantOneParcelId}`)
        .set(bearer(adminToken))
        .expect(200);
      expect(res.body.data.id).toBe(merchantOneParcelId);
    });
  });

  describe("Pagination, search and filters", () => {
    it("returns a paginated envelope with pagination metadata", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/parcels")
        .query({ page: 1, limit: 2 })
        .set(bearer(merchantToken))
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeLessThanOrEqual(2);
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(2);
      expect(typeof res.body.meta.total).toBe("number");
      expect(res.body.meta.hasPreviousPage).toBe(false);
      expect(res.body.requestId).toBeDefined();
    });

    it("filters by status", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/parcels")
        .query({ status: "CREATED", limit: 5 })
        .set(bearer(merchantToken))
        .expect(200);

      expect(res.body.data.every((p: { status: string }) => p.status === "CREATED")).toBe(true);
    });

    it("filters by district", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/parcels")
        .query({ district: "Dhaka", limit: 5 })
        .set(bearer(merchantToken))
        .expect(200);

      expect(res.body.data.every((p: { district: string }) => p.district === "Dhaka")).toBe(true);
    });

    it("rejects an invalid status filter with 422", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/parcels")
        .query({ status: "NOT_A_STATUS" })
        .set(bearer(merchantToken));
      expect(res.status).toBe(422);
    });

    it("rejects a limit beyond the maximum with 422", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/parcels")
        .query({ limit: 5000 })
        .set(bearer(merchantToken));
      expect(res.status).toBe(422);
    });
  });

  describe("Shipping label", () => {
    it("returns a Code128 barcode encoding the tracking code", async () => {
      const created = await request(app.getHttpServer())
        .post("/api/v1/parcels")
        .set(bearer(merchantToken))
        .set("Idempotency-Key", idempotencyKey("label"))
        .send(VALID_BOOKING)
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/parcels/${created.body.data.id}/label`)
        .set(bearer(merchantToken))
        .expect(200);

      const label = res.body.data;
      expect(label.trackingCode).toBe(created.body.data.trackingCode);
      expect(label.barcodeSvg).toContain("<svg");
      expect(label.barcodeSvg).toContain(label.trackingCode);
      expect(label.recipientName).toBe(VALID_BOOKING.recipientName);
      expect(label.codAmount).toBe(VALID_BOOKING.codAmount);
      expect(label.district).toBe("Dhaka");
      expect(label.routingHub).toBeTruthy();
    });
  });

  describe("Public tracking", () => {
    it("returns public-safe tracking data without authentication", async () => {
      const created = await request(app.getHttpServer())
        .post("/api/v1/parcels")
        .set(bearer(merchantToken))
        .set("Idempotency-Key", idempotencyKey("tracking"))
        .send(VALID_BOOKING)
        .expect(201);

      const trackingCode = created.body.data.trackingCode;

      const res = await request(app.getHttpServer())
        .get(`/api/v1/tracking/${trackingCode}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.trackingCode).toBe(trackingCode);
      expect(res.body.data.status).toBe("CREATED");
      expect(res.body.data.recipientPhoneMasked).toBe("017****5678");
      expect(res.body.data.timeline).toHaveLength(1);
      expect(res.body.data.timeline[0].labelBn).toBeTruthy();

      const serialized = JSON.stringify(res.body.data);
      expect(serialized).not.toContain("Rafiqul Islam");
      expect(serialized).not.toContain("01712345678");
      expect(serialized).not.toContain("1200");
      expect(serialized).not.toContain("deliveryFee");
      expect(serialized).not.toContain("merchantId");
    });

    it("returns 404 for an unknown tracking code", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/tracking/DHR-20200101-ZZZZZZ")
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.errorCode).toBe("TRACKING_NOT_FOUND");
    });
  });

  describe("Pricing", () => {
    it("returns the authoritative breakdown for outside-Dhaka delivery", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/pricing/calculate")
        .set(bearer(merchantToken))
        .send({
          district: "Khulna",
          thana: "Sonadanga",
          weight: 1.5,
          codAmount: 2000,
        })
        .expect(200);

      expect(res.body.data.zone).toBe("OUTSIDE_DHAKA");
      expect(res.body.data.baseFee).toBe(130);
      expect(res.body.data.weightFee).toBe(25);
      expect(res.body.data.codFee).toBe(20);
      expect(res.body.data.additionalCharge).toBe(0);
      expect(res.body.data.discount).toBe(0);
      expect(res.body.data.totalFee).toBe(175);
    });

    it("requires authentication", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/pricing/calculate")
        .send({ district: "Dhaka", weight: 1, codAmount: 0 });
      expect(res.status).toBe(401);
    });
  });
});
