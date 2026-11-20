import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { type INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
import { DhrutoValidationPipe } from "../src/common/pipes/validation.pipe.js";
import { WebhookEvent, NotificationChannel } from "@dhruto/contracts";
import { DataSource } from "typeorm";
import { realisticName, realisticPhone } from "./utils/realistic.js";

describe("Notifications & Webhooks Integration (Phase 5 E2E)", () => {
  let app: INestApplication;
  let merchantToken: string;
  let subscriptionId: string;
  let deliveryId: string;
  let adminToken: string;
  let merchantId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(new DhrutoValidationPipe());
    await app.init();

    // Authenticate as merchant
    const merchantLogin = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({
        emailOrPhone: "merchant@dhruto.com",
        password: "dhruto123",
      })
      .expect(200);

    merchantToken = merchantLogin.body.data.tokens.accessToken;
    expect(merchantToken).toBeDefined();
    merchantId = merchantLogin.body.data.user.merchantId ??
      (await request(app.getHttpServer()).get("/api/v1/auth/me").set("Authorization", `Bearer ${merchantToken}`))
        .body.data.merchant.id;

    const adminLogin = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ emailOrPhone: "admin@dhruto.com", password: "dhruto123" })
      .expect(200);
    adminToken = adminLogin.body.data.tokens.accessToken;
  });

  afterAll(async () => {
    // Remove only what this run created, so dev never accumulates endpoints
    // that dead-letter every parcel event.
    if (subscriptionId) {
      await request(app.getHttpServer())
        .delete(`/api/v1/webhooks/subscriptions/${subscriptionId}`)
        .set("Authorization", `Bearer ${merchantToken}`);
    }
    await app.close();
  });

  async function waitFor<T>(
    poll: () => Promise<T>,
    predicate: (value: T) => boolean,
    label: string,
  ): Promise<T> {
    const deadline = Date.now() + 20000;
    let last: T | undefined;
    for (;;) {
      last = await poll();
      if (predicate(last)) return last;
      if (Date.now() > deadline) {
        throw new Error(`Timed out waiting for ${label}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  it("1. Fetch initial merchant in-app notification list and unread count", async () => {
    const countRes = await request(app.getHttpServer())
      .get("/api/v1/notifications/unread-count")
      .set("Authorization", `Bearer ${merchantToken}`)
      .expect(200);

    expect(countRes.body.success).toBe(true);
    expect(typeof countRes.body.data.unreadCount).toBe("number");

    const listRes = await request(app.getHttpServer())
      .get("/api/v1/notifications/me")
      .set("Authorization", `Bearer ${merchantToken}`)
      .expect(200);

    expect(listRes.body.success).toBe(true);
    expect(Array.isArray(listRes.body.data.items)).toBe(true);
    expect(typeof listRes.body.data.total).toBe("number");
  });

  it("2. The SMS gateway test is admin-only (arbitrary text to any number)", async () => {
    const payload = {
      phone: realisticPhone(),
      message: "Dhruto Express: your parcel is out for delivery today.",
    };
    await request(app.getHttpServer())
      .post("/api/v1/notifications/test-sms")
      .set("Authorization", `Bearer ${merchantToken}`)
      .send(payload)
      .expect(403);
    await request(app.getHttpServer())
      .post("/api/v1/notifications/test-inapp")
      .set("Authorization", `Bearer ${merchantToken}`)
      .send({})
      .expect(403);

    const res = await request(app.getHttpServer())
      .post("/api/v1/notifications/test-sms")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(payload)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.channel).toBe(NotificationChannel.SMS);
    expect(res.body.data.recipientTarget).toMatch(/^(?:\+?880|880|0)1\d{9}$/);
  });

  it("3. Register a new webhook subscription via POST /api/v1/webhooks/subscriptions", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/webhooks/subscriptions")
      .set("Authorization", `Bearer ${merchantToken}`)
      .send({
        url: "https://example.com/webhook-receiver",
        events: [
          WebhookEvent.PARCEL_CREATED,
          WebhookEvent.PARCEL_DELIVERED,
          WebhookEvent.CASH_VERIFIED,
          WebhookEvent.PING,
        ],
        description: "Order sync for Rahim Enterprise storefront",
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    // Full secret is shown exactly once, on creation.
    expect(res.body.data.secret).toMatch(/^dhr_whsec_/);
    expect(res.body.data.url).toBe("https://example.com/webhook-receiver");

    subscriptionId = res.body.data.id;
  });

  it("4. List webhook subscriptions with masked secrets", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/webhooks/subscriptions")
      .set("Authorization", `Bearer ${merchantToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    const sub = res.body.data.find((s: { id: string }) => s.id === subscriptionId);
    expect(sub).toBeDefined();
    // Secrets never leak through list responses.
    expect(sub.secret).not.toMatch(/^dhr_whsec_/);
    expect(sub.secretPreview).toMatch(/^dhr_\*\*\*[0-9a-f]{4}$/);
  });

  it("5. Dispatch a test ping event via POST /api/v1/webhooks/subscriptions/:id/ping", async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/webhooks/subscriptions/${subscriptionId}/ping`)
      .set("Authorization", `Bearer ${merchantToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.event).toBe(WebhookEvent.PING);
    expect(res.body.data.signature).toMatch(/^t=\d+,v1=[0-9a-f]{64}$/);
    expect(res.body.data.subscriptionId).toBe(subscriptionId);
    expect(res.body.data.attemptCount).toBeGreaterThanOrEqual(1);

    deliveryId = res.body.data.id;
  });

  it("6. Retrieve deliveries and audit log via GET /api/v1/webhooks/deliveries", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/webhooks/deliveries")
      .set("Authorization", `Bearer ${merchantToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
    const foundDelivery = res.body.data.items.find((d: { id: string }) => d.id === deliveryId);
    expect(foundDelivery).toBeDefined();
    expect(foundDelivery.signature).toBeDefined();
  });

  it("7. Parcel booking fans out through the outbox (webhook + in-app)", async () => {
    // Create a new parcel booking
    const bookingRes = await request(app.getHttpServer())
      .post("/api/v1/parcels")
      .set("Authorization", `Bearer ${merchantToken}`)
      .set("Idempotency-Key", `webhook-parcel-${Date.now()}`)
      .send({
        recipientName: realisticName(),
        recipientPhone: "01899998888",
        deliveryAddress: "House 10, Road 4, Dhanmondi",
        district: "Dhaka",
        thana: "Dhanmondi",
        codAmount: 1800,
        weight: 1.5,
      })
      .expect(201);

    expect(bookingRes.body.data.trackingCode).toBeDefined();

    // The relay polls the outbox asynchronously: wait for the delivery row.
    const delivery = await waitFor(
      async () => {
        const deliveriesRes = await request(app.getHttpServer())
          .get("/api/v1/webhooks/deliveries")
          .set("Authorization", `Bearer ${merchantToken}`)
          .expect(200);
        return deliveriesRes.body.data.items.find(
          (d: { event: string }) => d.event === WebhookEvent.PARCEL_CREATED,
        ) as { signature: string } | undefined;
      },
      (found) => found !== undefined,
      "parcel.created webhook delivery",
    );
    expect(delivery.signature).toMatch(/^t=\d+,v1=[0-9a-f]{64}$/);

    // And the merchant in-app notice from the same event.
    const createdNotif = await waitFor(
      async () => {
        const notifsRes = await request(app.getHttpServer())
          .get("/api/v1/notifications/me")
          .set("Authorization", `Bearer ${merchantToken}`)
          .expect(200);
        return notifsRes.body.data.items.find(
          (n: { channel: string }) => n.channel === NotificationChannel.IN_APP,
        ) as { channel: string } | undefined;
      },
      (found) => found !== undefined,
      "parcel.created in-app notification",
    );
    expect(createdNotif).toBeDefined();
  });

  it("8. Manually replay/retry delivery via POST /api/v1/webhooks/deliveries/:id/retry", async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/webhooks/deliveries/${deliveryId}/retry`)
      .set("Authorization", `Bearer ${merchantToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(deliveryId);
    expect(res.body.data.attemptCount).toBeGreaterThanOrEqual(2);
  });

  it("9. Mark all notifications as read via POST /api/v1/notifications/read-all", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/notifications/read-all")
      .set("Authorization", `Bearer ${merchantToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);

    const unreadRes = await request(app.getHttpServer())
      .get("/api/v1/notifications/unread-count")
      .set("Authorization", `Bearer ${merchantToken}`)
      .expect(200);

    expect(unreadRes.body.data.unreadCount).toBe(0);
  });

  it("10. The inbox is in-app only and read-all never rewrites SMS delivery status", async () => {
    const listRes = await request(app.getHttpServer())
      .get("/api/v1/notifications/me?limit=100")
      .set("Authorization", `Bearer ${merchantToken}`)
      .expect(200);
    const channels = new Set(
      (listRes.body.data.items as Array<{ channel: string }>).map((n) => n.channel),
    );
    expect([...channels]).toEqual([NotificationChannel.IN_APP]);

    // A delivered SMS record attributed to this merchant (e.g. a customer SMS).
    const ds = app.get(DataSource);
    const [{ id: smsId }] = await ds.query(
      `INSERT INTO notifications (merchant_id, channel, type, title, message, recipient_target, status, sent_at)
       VALUES ($1, 'SMS', 'PARCEL_STATUS_UPDATE', 'Parcel delivered', 'Dhruto: your parcel was delivered.', $2, 'SENT', now())
       RETURNING id`,
      [merchantId, realisticPhone()],
    );
    await request(app.getHttpServer())
      .post("/api/v1/notifications/read-all")
      .set("Authorization", `Bearer ${merchantToken}`)
      .expect(200);
    const [sms] = await ds.query("SELECT status, read_at FROM notifications WHERE id = $1", [smsId]);
    expect(sms.status).toBe("SENT");
    expect(sms.read_at).toBeNull();
  });
});
