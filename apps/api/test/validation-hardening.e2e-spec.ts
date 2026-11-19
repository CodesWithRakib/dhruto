import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { type INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
import { DhrutoValidationPipe } from "../src/common/pipes/validation.pipe.js";
import { HubScanType } from "@dhruto/contracts";
import { SEEDED_ACCOUNTS, bearer, idempotencyKey, loginToken } from "./utils/auth.js";
import { realisticName } from "./utils/realistic.js";

/**
 * Phase 3 Slice B (T-VAL-01, T-EXC-01): input-validation hardening.
 * Malformed bodies must 422 (not 404/500); re-resolve must 409.
 */
describe("Validation hardening (Phase 3 E2E)", () => {
  let app: INestApplication;
  let merchantToken: string;
  let dhkToken: string;
  let adminToken: string;
  let dhkHubId: string;
  let ctgHubId: string;
  let bagId: string;


  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(new DhrutoValidationPipe());
    await app.init();

    [merchantToken, dhkToken, adminToken] = await Promise.all([
      loginToken(app, SEEDED_ACCOUNTS.merchant),
      loginToken(app, SEEDED_ACCOUNTS.hubManager),
      loginToken(app, SEEDED_ACCOUNTS.admin),
    ]);

    const hubs = await request(app.getHttpServer())
      .get("/api/v1/hubs")
      .set(bearer(dhkToken))
      .expect(200);
    dhkHubId = hubs.body.data[0].id as string;

    const destinations = await request(app.getHttpServer())
      .get("/api/v1/hubs/destinations")
      .set(bearer(dhkToken))
      .expect(200);
    ctgHubId = (
      destinations.body.data as Array<{ code: string; id: string }>
    ).find((h) => h.code === "HUB-CTG-01")?.id as string;

    const bag = await request(app.getHttpServer())
      .post(`/api/v1/hubs/${dhkHubId}/bags`)
      .set(bearer(dhkToken))
      .send({ destinationHubId: ctgHubId, notes: "hardening" })
      .expect(201);
    bagId = bag.body.data.id as string;
  });

  afterAll(async () => {
    await app.close();
  });

  it("rejects malformed riderId on assign with 422 (T-VAL-01)", async () => {
    const booked = await request(app.getHttpServer())
      .post("/api/v1/parcels")
      .set(bearer(merchantToken))
      .set("Idempotency-Key", idempotencyKey("harden-assign"))
      .send({
        recipientName: realisticName(),
        recipientPhone: "01712345678",
        district: "Dhaka",
        thana: "Mirpur",
        deliveryAddress: "House 1, Road 1, Mirpur, Dhaka",
        codAmount: 100,
        weight: 1,
      })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post(`/api/v1/parcels/${booked.body.data.id}/assign-rider`)
      .set(bearer(adminToken))
      .send({ riderId: "not-a-uuid" })
      .expect(422);

    expect(res.body.success).toBe(false);
  });

  it("rejects empty/oversize tracking codes on bag-add with 422 (T-VAL-01)", async () => {
    const empty = await request(app.getHttpServer())
      .post(`/api/v1/bags/${bagId}/parcels`)
      .set(bearer(dhkToken))
      .send({ parcelTrackingCode: "" })
      .expect(422);
    expect(empty.body.success).toBe(false);

    const overlong = await request(app.getHttpServer())
      .post(`/api/v1/bags/${bagId}/parcels`)
      .set(bearer(dhkToken))
      .send({ parcelTrackingCode: `DHR-${"X".repeat(70)}` })
      .expect(422);
    expect(overlong.body.success).toBe(false);
  });

  it("rejects re-resolving an exception with 409 (T-EXC-01)", async () => {
    const booked = await request(app.getHttpServer())
      .post("/api/v1/parcels")
      .set(bearer(merchantToken))
      .set("Idempotency-Key", idempotencyKey("harden-exc"))
      .send({
        recipientName: realisticName(),
        recipientPhone: "01712345678",
        district: "Dhaka",
        thana: "Mirpur",
        deliveryAddress: "House 2, Road 2, Mirpur, Dhaka",
        codAmount: 100,
        weight: 1,
      })
      .expect(201);
    const code = booked.body.data.trackingCode as string;

    // Inbound scan then duplicate scan raises a DUPLICATE_SCAN exception.
    await request(app.getHttpServer())
      .post(`/api/v1/hubs/${dhkHubId}/scans`)
      .set(bearer(dhkToken))
      .send({ barcode: code, scanType: HubScanType.RECEIVE_INBOUND })
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/hubs/${dhkHubId}/scans`)
      .set(bearer(dhkToken))
      .send({ barcode: code, scanType: HubScanType.RECEIVE_INBOUND })
      .expect(200);

    const list = await request(app.getHttpServer())
      .get(`/api/v1/exceptions?hubId=${dhkHubId}&status=OPEN`)
      .set(bearer(dhkToken))
      .expect(200);
    const target = (list.body.data as Array<{ id: string; type: string }>).find((e) =>
      e.type.includes("DUPLICATE"),
    );
    expect(target).toBeDefined();

    await request(app.getHttpServer())
      .post(`/api/v1/exceptions/${target?.id}/resolve`)
      .set(bearer(dhkToken))
      .send({ resolutionNote: "Verified duplicate scan, parcel sorted correctly." })
      .expect(200);

    const again = await request(app.getHttpServer())
      .post(`/api/v1/exceptions/${target?.id}/resolve`)
      .set(bearer(dhkToken))
      .send({ resolutionNote: "Second attempt must not rewrite history." })
      .expect(409);
    expect(JSON.stringify(again.body)).toContain("EXCEPTION_ALREADY_RESOLVED");
  });
});
