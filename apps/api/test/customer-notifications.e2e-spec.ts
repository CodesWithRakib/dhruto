import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test, type TestingModule } from "@nestjs/testing";
import { type INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
import { DhrutoValidationPipe } from "../src/common/pipes/validation.pipe.js";
import { SEEDED_ACCOUNTS, bearer, idempotencyKey, loginToken } from "./utils/auth.js";
import { realisticAddress, realisticProduct } from "./utils/realistic.js";

/**
 * Recipients with a customer-portal account get in-app updates about parcels
 * addressed to their phone (matched exactly like the customer parcel scope),
 * deep-linking to the tracking page and never carrying the delivery OTP.
 */
describe("Customer in-app parcel notifications E2E", () => {
  let app: INestApplication;
  let merchantToken: string;
  let hubToken: string;
  let riderToken: string;
  let customerToken: string;
  let riderId: string;
  let customerPhone: string;
  let customerName: string;

  type Item = { title: string; message: string; channel: string; metadata?: { route?: string } };
  const customerInbox = async (): Promise<Item[]> =>
    (
      await request(app.getHttpServer())
        .get("/api/v1/notifications/me?limit=50")
        .set(bearer(customerToken))
        .expect(200)
    ).body.data.items as Item[];

  const waitFor = async <T>(poll: () => Promise<T>, ok: (v: T) => boolean, label: string): Promise<T> => {
    const deadline = Date.now() + 20000;
    for (;;) {
      const value = await poll();
      if (ok(value)) return value;
      if (Date.now() > deadline) throw new Error(`Timed out waiting for ${label}`);
      await new Promise((r) => setTimeout(r, 500));
    }
  };

  beforeAll(async () => {
    process.env.CHAT_REALTIME_REDIS_ENABLED = "false";
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api/v1", { exclude: ["health", "health/(.*)"] });
    app.useGlobalPipes(new DhrutoValidationPipe());
    await app.init();
    [merchantToken, hubToken, riderToken, customerToken] = await Promise.all([
      loginToken(app, SEEDED_ACCOUNTS.merchant),
      loginToken(app, SEEDED_ACCOUNTS.hubManager),
      loginToken(app, SEEDED_ACCOUNTS.rider),
      loginToken(app, "customer@dhruto.com"),
    ]);
    riderId = (await request(app.getHttpServer()).get("/api/v1/auth/me").set(bearer(riderToken))).body.data.rider.id;
    const me = (await request(app.getHttpServer()).get("/api/v1/auth/me").set(bearer(customerToken))).body.data;
    customerPhone = me.phone;
    customerName = me.name;
  });

  afterAll(async () => {
    await app.close();
  });

  it("tells the recipient's customer account when their parcel is out for delivery", async () => {
    const booked = await request(app.getHttpServer())
      .post("/api/v1/parcels")
      .set(bearer(merchantToken))
      .set("Idempotency-Key", idempotencyKey("customer-notify"))
      .send({
        recipientName: customerName,
        recipientPhone: customerPhone,
        district: "Dhaka",
        thana: "Uttara",
        deliveryAddress: realisticAddress("Dhaka", "Uttara"),
        parcelDescription: realisticProduct(),
        codAmount: 1250,
        weight: 0.8,
      })
      .expect(201);
    const { id, trackingCode } = booked.body.data as { id: string; trackingCode: string };

    await request(app.getHttpServer())
      .post(`/api/v1/parcels/${id}/assign-rider`)
      .set(bearer(hubToken))
      .send({ riderId })
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/riders/me/parcels/${id}/start-delivery`)
      .set(bearer(riderToken))
      .expect(200);

    const inbox = await waitFor(
      customerInbox,
      (items) => items.some((n) => n.message.includes(trackingCode)),
      "customer out-for-delivery notification",
    );
    const note = inbox.find((n) => n.message.includes(trackingCode))!;
    expect(note.channel).toBe("IN_APP");
    expect(note.title).toMatch(/out for delivery/i);
    expect(note.metadata?.route).toBe(`/customer/track/${trackingCode}`);
    // The OTP travels by SMS only — never in the in-app copy.
    expect(note.message).not.toMatch(/\b\d{6}\b/);
  });
});
