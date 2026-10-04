import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { type INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
import { ZodValidationPipe } from "nestjs-zod";
import { WebhookEvent, NotificationChannel } from "@dhruto/contracts";

describe("Notifications & Webhooks Integration (Phase 5 E2E)", () => {
  let app: INestApplication;
  let merchantToken: string;
  let subscriptionId: string;
  let deliveryId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(new ZodValidationPipe());
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
  });

  afterAll(async () => {
    await app.close();
  });

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
    expect(Array.isArray(listRes.body.data)).toBe(true);
  });

  it("2. Dispatch a simulated SMS notification via POST /api/v1/notifications/test-sms", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/notifications/test-sms")
      .set("Authorization", `Bearer ${merchantToken}`)
      .send({
        phone: "01712345678",
        message: "Dhruto Express: Test E2E SMS Notification",
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.channel).toBe(NotificationChannel.SMS);
    expect(res.body.data.recipientTarget).toBe("+8801712345678");
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
        description: "Primary Production Integration Webhook",
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.secret).toMatch(/^dhr_whsec_/);
    expect(res.body.data.url).toBe("https://example.com/webhook-receiver");

    subscriptionId = res.body.data.id;
  });

  it("4. List webhook subscriptions via GET /api/v1/webhooks/subscriptions", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/webhooks/subscriptions")
      .set("Authorization", `Bearer ${merchantToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    const sub = res.body.data.find((s: any) => s.id === subscriptionId);
    expect(sub).toBeDefined();
    expect(sub.secret).toBeDefined();
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

    deliveryId = res.body.data.id;
  });

  it("6. Retrieve deliveries and audit log via GET /api/v1/webhooks/deliveries", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/webhooks/deliveries")
      .set("Authorization", `Bearer ${merchantToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    const foundDelivery = res.body.data.find((d: any) => d.id === deliveryId);
    expect(foundDelivery).toBeDefined();
    expect(foundDelivery.signature).toBeDefined();
  });

  it("7. Dispatches automated webhook and in-app notification upon parcel creation", async () => {
    // Create a new parcel booking
    const bookingRes = await request(app.getHttpServer())
      .post("/api/v1/parcels")
      .set("Authorization", `Bearer ${merchantToken}`)
      .send({
        recipientName: "Webhook Recipient",
        recipientPhone: "01899998888",
        deliveryAddress: "House 10, Road 4, Dhanmondi",
        district: "Dhaka",
        thana: "Dhanmondi",
        codAmount: 1800,
        weight: 1.5,
      })
      .expect(201);

    expect(bookingRes.body.data.trackingCode).toBeDefined();

    // Verify in deliveries that a parcel.created webhook was logged
    const deliveriesRes = await request(app.getHttpServer())
      .get("/api/v1/webhooks/deliveries")
      .set("Authorization", `Bearer ${merchantToken}`)
      .expect(200);

    const parcelCreatedDelivery = deliveriesRes.body.data.find(
      (d: any) => d.event === WebhookEvent.PARCEL_CREATED,
    );
    expect(parcelCreatedDelivery).toBeDefined();
    expect(parcelCreatedDelivery.signature).toMatch(/^t=\d+,v1=[0-9a-f]{64}$/);

    // Verify an in-app notification was created
    const notifsRes = await request(app.getHttpServer())
      .get("/api/v1/notifications/me")
      .set("Authorization", `Bearer ${merchantToken}`)
      .expect(200);

    const createdNotif = notifsRes.body.data.find(
      (n: any) => n.channel === NotificationChannel.IN_APP,
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
});
