import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

// Runs before every import: the app must target the disposable services.
vi.hoisted(() => {
  const db = process.env.CHAT_TEST_DATABASE_URL;
  const redis = process.env.CHAT_TEST_REDIS_URL;
  const s3 = process.env.CHAT_TEST_S3_ENDPOINT;
  if (db && redis && s3) {
    process.env.DATABASE_URL = db;
    process.env.REDIS_URL = redis;
    process.env.OUTBOX_POLL_MS = "600000";
    process.env.CHAT_ROOM_REVALIDATE_MS = "600000";
    process.env.CHAT_RATE_LIMIT_SEND_PER_MIN = "1000";
    process.env.CHAT_RATE_LIMIT_CREATE_PER_MIN = "1000";
    process.env.CHAT_RATE_LIMIT_UPLOAD_PER_MIN = "1000";
    process.env.CHAT_RATE_LIMIT_DOWNLOAD_PER_MIN = "1000";
    process.env.CHAT_STORAGE_BUCKET = "dhruto-chat-attachments-test";
    process.env.CHAT_STORAGE_REGION = "us-east-1";
    process.env.CHAT_STORAGE_ENDPOINT = s3;
    process.env.CHAT_STORAGE_FORCE_PATH_STYLE = "true";
    process.env.CHAT_STORAGE_ACCESS_KEY_ID = "test";
    process.env.CHAT_STORAGE_SECRET_ACCESS_KEY = "test";
    process.env.CHAT_ATTACHMENT_CLEANUP_ENABLED = "false"; // runOnce is driven by the tests
    process.env.CHAT_MAX_PENDING_UPLOADS_PER_USER = "5";
  }
});

import { createHash, randomUUID } from "node:crypto";
import { type INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import request from "supertest";
import { DataSource } from "typeorm";
import {
  CreateBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { ChatConversationType, ChatMessageType } from "@dhruto/contracts";
import { AppModule } from "../src/app.module.js";
import { CustomJwtService } from "../src/auth/jwt/custom-jwt.service.js";
import { UserRole } from "../src/database/entities/index.js";
import { ChatAttachmentCleanupService } from "../src/chat/attachments/chat-attachment-cleanup.service.js";
import {
  CHAT_TEST_DATABASE_URL,
  assertDisposableDatabaseUrl,
  createChatTestDataSource,
} from "./utils/chat-test-db.js";

/**
 * Communication Phase 6 — attachment lifecycle integration.
 *
 * Real AppModule against DISPOSABLE PostgreSQL + Redis + LocalStack S3
 * (CHAT_TEST_DATABASE_URL / CHAT_TEST_REDIS_URL / CHAT_TEST_S3_ENDPOINT).
 * Uploads use the real presigned PUT URLs; downloads fetch the real
 * presigned GET URLs.
 */

const BUCKET = "dhruto-chat-attachments-test";
const HUB = randomUUID();
const RECIPIENT = "01397700001";

const PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, 1,
  2, 3, 4,
]);
const PDF = new TextEncoder().encode("%PDF-1.7\n1 0 obj\n<<>>\nendobj\ntrailer\n%%EOF\n");
const WEBM = new Uint8Array([
  0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 0x01, 0x42, 0xf7, 0x81,
]);
const HTML = new TextEncoder().encode("<!doctype html><script>alert(1)</script>");

const sha256 = (data: Uint8Array) => createHash("sha256").update(data).digest("hex");

interface Fixture {
  id: string;
  role: UserRole;
  phone: string;
  token: string;
}

describe.skipIf(
  !CHAT_TEST_DATABASE_URL || !process.env.CHAT_TEST_REDIS_URL || !process.env.CHAT_TEST_S3_ENDPOINT,
)("Communication Phase 6 — attachments", () => {
  let app: INestApplication;
  let ds: DataSource;
  let s3: S3Client;
  const users: Record<string, Fixture> = {};
  let threadA = "";
  let threadB = "";

  const api = () => request(app.getHttpServer());
  const auth = (who: string) => ({ Authorization: `Bearer ${users[who]?.token ?? "missing"}` });

  async function insertUser(key: string, role: UserRole, phone: string): Promise<string> {
    const [row] = await ds.query(
      `INSERT INTO "users" ("name", "email", "phone", "password_hash", "role") VALUES ($1, $2, $3, 'x', $4) RETURNING "id"`,
      [`Media ${key}`, `${key}@media-test.local`, phone, role],
    );
    users[key] = { id: row.id as string, role, phone, token: "" };
    return row.id as string;
  }

  function reserve(
    who: string,
    conversationId: string,
    data: Uint8Array,
    name: string,
    mimeType: string,
    overrides = {},
  ) {
    return api()
      .post(`/api/v1/chat/conversations/${conversationId}/attachments`)
      .set(auth(who))
      .send({
        originalFilename: name,
        mimeType,
        sizeBytes: data.byteLength,
        checksumSha256: sha256(data),
        ...overrides,
      });
  }

  async function put(
    ticket: { upload: { url: string; headers: Record<string, string> } },
    data: Uint8Array,
  ) {
    return fetch(ticket.upload.url, { method: "PUT", headers: ticket.upload.headers, body: data });
  }

  const complete = (who: string, id: string) =>
    api().post(`/api/v1/chat/attachments/${id}/complete`).set(auth(who));
  const download = (who: string, id: string) =>
    api().get(`/api/v1/chat/attachments/${id}/download`).set(auth(who));

  /** Reserve → PUT → complete; returns the attachment id. */
  async function uploadReady(
    who: string,
    conversationId: string,
    data = PNG,
    name = "photo.png",
    mime = "image/png",
  ) {
    const ticket = await reserve(who, conversationId, data, name, mime);
    expect(ticket.status, JSON.stringify(ticket.body)).toBe(201);
    expect((await put(ticket.body.data, data)).status).toBe(200);
    const done = await complete(who, ticket.body.data.attachment.id);
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    return ticket.body.data.attachment.id as string;
  }

  const send = (who: string, conversationId: string, body: Record<string, unknown>) =>
    api()
      .post(`/api/v1/chat/conversations/${conversationId}/messages`)
      .set(auth(who))
      .send({ clientMessageId: randomUUID(), ...body });

  async function status(id: string): Promise<string | null> {
    const [row] = await ds.query(`SELECT "status" FROM "chat_attachments" WHERE "id" = $1`, [id]);
    return (row?.status as string | undefined) ?? null;
  }
  async function keyOf(id: string): Promise<string> {
    const [row] = await ds.query(`SELECT "storage_key" FROM "chat_attachments" WHERE "id" = $1`, [
      id,
    ]);
    return row.storage_key as string;
  }
  async function objectExists(key: string): Promise<boolean> {
    try {
      await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
      return true;
    } catch {
      return false;
    }
  }

  beforeAll(async () => {
    const url = CHAT_TEST_DATABASE_URL as string;
    assertDisposableDatabaseUrl(url);
    ds = createChatTestDataSource(url);
    await ds.initialize();
    await ds.runMigrations({ transaction: "each" });

    s3 = new S3Client({
      region: "us-east-1",
      endpoint: process.env.CHAT_TEST_S3_ENDPOINT,
      forcePathStyle: true,
      credentials: { accessKeyId: "test", secretAccessKey: "test" },
    });
    await s3.send(new CreateBucketCommand({ Bucket: BUCKET })).catch(() => undefined);

    await ds.query(
      `INSERT INTO "hubs" ("id", "code", "name", "address") VALUES ($1, 'MDHK', 'Media Hub', 'Dhaka')`,
      [HUB],
    );
    const mA = await insertUser("merchantA", UserRole.MERCHANT, "01397800001");
    const mB = await insertUser("merchantB", UserRole.MERCHANT, "01397800002");
    const r1 = await insertUser("rider1", UserRole.RIDER, "01397800003");
    await insertUser("rider2", UserRole.RIDER, "01397800004");
    await insertUser("customer", UserRole.CUSTOMER, RECIPIENT);
    await insertUser("admin", UserRole.ADMIN, "01397800005");
    // merchantB exists only as an outsider (other tenant) for denial checks.
    const [merchantA] = (
      await ds.query(
        `INSERT INTO "merchants" ("user_id", "business_name", "contact_phone", "pickup_address")
         VALUES ($1, 'Media A', '01397800001', 'Dhaka'), ($2, 'Media B', '01397800002', 'Dhaka') RETURNING "id"`,
        [mA, mB],
      )
    ).map((r: { id: string }) => r.id);
    const [rider1] = (
      await ds.query(`INSERT INTO "riders" ("user_id", "hub_id") VALUES ($1, $2) RETURNING "id"`, [
        r1,
        HUB,
      ])
    ).map((r: { id: string }) => r.id);
    const parcels = (
      await ds.query(
        `INSERT INTO "parcels" ("tracking_code", "merchant_id", "recipient_name", "recipient_phone", "raw_address", "current_rider_id", "current_hub_id")
         VALUES ('MD-A-1', $1, 'Recipient', $2, 'Dhaka', $3, $4), ('MD-B-1', $1, 'Recipient', $2, 'Dhaka', NULL, $4) RETURNING "id"`,
        [merchantA, RECIPIENT, rider1, HUB],
      )
    ).map((r: { id: string }) => r.id);

    if (process.env.DATABASE_URL !== url)
      throw new Error("Refusing to boot: DATABASE_URL is not the disposable DB");
    app = await NestFactory.create(AppModule, { logger: ["error"] });
    app.setGlobalPrefix("api/v1");
    await app.listen(0, "127.0.0.1");
    const dbName = (await app.get(DataSource).query(`SELECT current_database() AS db`))[0]
      .db as string;
    if (!/test/i.test(dbName)) throw new Error(`Refusing to run against "${dbName}"`);
    const jwt = app.get(CustomJwtService);
    for (const [key, u] of Object.entries(users)) {
      u.token = jwt.generateAuthTokens({
        id: u.id,
        email: `${key}@media-test.local`,
        phone: u.phone,
        role: u.role,
      }).accessToken;
    }
    const open = (parcelId: string) =>
      api()
        .post("/api/v1/chat/conversations")
        .set(auth("merchantA"))
        .send({ type: ChatConversationType.PARCEL_DELIVERY, parcelId });
    threadA = (await open(parcels[0])).body.data.id;
    threadB = (await open(parcels[1])).body.data.id;
    // The customer joins thread A (exact recipient phone).
    await api()
      .post("/api/v1/chat/conversations")
      .set(auth("customer"))
      .send({ type: ChatConversationType.PARCEL_DELIVERY, parcelId: parcels[0] });
  }, 240_000);

  afterAll(async () => {
    await app?.close();
    if (ds?.isInitialized) await ds.destroy();
    s3?.destroy();
  });

  /* ================================================================ */
  /* Upload authorization and policy                                    */
  /* ================================================================ */

  describe("upload authorization", () => {
    it("reserves a PENDING attachment with a short-lived presigned PUT and no storage internals", async () => {
      const res = await reserve("merchantA", threadA, PNG, "photo.png", "image/png");
      expect(res.status).toBe(201);
      const ticket = res.body.data;
      expect(ticket.attachment).toMatchObject({
        status: "PENDING",
        kind: "image",
        mimeType: "image/png",
      });
      expect(ticket.attachment.storageKey).toBeUndefined();
      expect(ticket.upload.method).toBe("PUT");
      expect(ticket.upload.headers).toEqual({ "Content-Type": "image/png" });
      expect(new Date(ticket.upload.expiresAt).getTime()).toBeGreaterThan(Date.now());
      expect(await keyOf(ticket.attachment.id)).toBe(`chat/${threadA}/${ticket.attachment.id}`);
      expect(ticket.upload.url).toContain(`chat/${threadA}/${ticket.attachment.id}`);
    });

    it("non-members, ineligible users and other tenants cannot reserve", async () => {
      for (const who of ["merchantB", "rider2", "admin"]) {
        const res = await reserve(who, threadA, PNG, "photo.png", "image/png");
        expect(res.status, who).toBe(404);
      }
    });

    it("enforces the upload policy before issuing a URL", async () => {
      expect((await reserve("merchantA", threadA, PNG, "x.svg", "image/svg+xml")).status).toBe(422);
      expect((await reserve("merchantA", threadA, PNG, "photo.html", "image/png")).status).toBe(
        422,
      );
      expect(
        (
          await reserve("merchantA", threadA, PNG, "big.png", "image/png", {
            sizeBytes: 11 * 1024 * 1024,
          })
        ).status,
      ).toBe(422);
      expect((await reserve("merchantA", threadA, PNG, "../../x.png", "image/png")).status).toBe(
        422,
      );
    });

    it("limits unfinished uploads per user", async () => {
      const statuses: number[] = [];
      for (let i = 0; i < 6; i += 1)
        statuses.push(
          (await reserve("customer", threadA, PDF, `doc${i}.pdf`, "application/pdf")).status,
        );
      expect(statuses.slice(0, 5).every((s) => s === 201)).toBe(true);
      expect(statuses[5]).toBe(422);
      await ds.query(
        `DELETE FROM "chat_attachments" WHERE "uploader_user_id" = $1 AND "status" = 'PENDING'`,
        [users.customer!.id],
      );
    });
  });

  /* ================================================================ */
  /* Completion and server-side verification                             */
  /* ================================================================ */

  describe("completion verifies the stored object", () => {
    it("completes after upload and is idempotent", async () => {
      const ticket = await reserve("merchantA", threadA, PNG, "photo.png", "image/png");
      const id = ticket.body.data.attachment.id;
      const early = await complete("merchantA", id);
      expect(early.status).toBe(422); // not uploaded yet — stays PENDING, can retry
      expect(await status(id)).toBe("PENDING");
      expect((await put(ticket.body.data, PNG)).status).toBe(200);
      const first = await complete("merchantA", id);
      expect(first.status).toBe(200);
      expect(first.body.data).toMatchObject({ status: "UPLOADED", kind: "image" });
      const [again, concurrent] = await Promise.all([
        complete("merchantA", id),
        complete("merchantA", id),
      ]);
      expect([again.status, concurrent.status]).toEqual([200, 200]);
      expect(await status(id)).toBe("UPLOADED");
    });

    it("rejects content that does not match its declared type (magic bytes) and deletes it", async () => {
      const ticket = await reserve("merchantA", threadA, HTML, "fake.png", "image/png");
      const id = ticket.body.data.attachment.id;
      await put(ticket.body.data, HTML);
      const res = await complete("merchantA", id);
      expect(res.status).toBe(422);
      expect(res.body.errorCode).toBe("CHAT_ATTACHMENT_INVALID");
      expect(await status(id)).toBe("REJECTED");
      expect(await objectExists(await keyOf(id))).toBe(false);
      const [audit] = await ds.query(
        `SELECT "metadata", "actor_role" FROM "chat_audit_logs" WHERE "action" = 'ATTACHMENT_REJECTED' AND "target_id" = $1`,
        [id],
      );
      expect(audit.metadata.reason).toBe("signature");
      expect(audit.actor_role).toBe("MERCHANT");
      // A rejected attachment stays rejected.
      expect((await complete("merchantA", id)).status).toBe(422);
    });

    it("rejects checksum and size mismatches", async () => {
      const bad = await reserve("merchantA", threadA, PNG, "photo.png", "image/png", {
        checksumSha256: "0".repeat(64),
      });
      await put(bad.body.data, PNG);
      expect((await complete("merchantA", bad.body.data.attachment.id)).status).toBe(422);
      expect(await status(bad.body.data.attachment.id)).toBe("REJECTED");

      const short = PNG.subarray(0, 12);
      const lied = await reserve("merchantA", threadA, PNG, "photo.png", "image/png");
      await put(lied.body.data, short);
      expect((await complete("merchantA", lied.body.data.attachment.id)).status).toBe(422);
      expect(await status(lied.body.data.attachment.id)).toBe("REJECTED");
    });

    it("only the uploader can complete or cancel; others see 404", async () => {
      const ticket = await reserve("merchantA", threadA, PNG, "photo.png", "image/png");
      const id = ticket.body.data.attachment.id;
      await put(ticket.body.data, PNG);
      expect((await complete("customer", id)).status).toBe(404);
      expect(
        (await api().delete(`/api/v1/chat/attachments/${id}`).set(auth("customer"))).status,
      ).toBe(404);
      expect((await complete("merchantA", id)).status).toBe(200);
    });
  });

  /* ================================================================ */
  /* Message association                                               */
  /* ================================================================ */

  describe("messages with attachments", () => {
    let imageMessageId = "";
    let imageId = "";

    it("sends an image message; history carries safe metadata only", async () => {
      imageId = await uploadReady("merchantA", threadA);
      const res = await send("merchantA", threadA, {
        type: ChatMessageType.IMAGE,
        attachmentIds: [imageId],
        content: "Package photo",
      });
      expect(res.status).toBe(201);
      imageMessageId = res.body.data.id;
      const history = await api()
        .get(`/api/v1/chat/conversations/${threadA}/messages`)
        .set(auth("customer"));
      const message = history.body.data.items.find((m: { id: string }) => m.id === imageMessageId);
      expect(message.attachments).toEqual([
        expect.objectContaining({
          id: imageId,
          kind: "image",
          status: "UPLOADED",
          mimeType: "image/png",
          sizeBytes: PNG.byteLength,
        }),
      ]);
      const serialized = JSON.stringify(message);
      expect(serialized).not.toContain("chat/");
      expect(serialized).not.toContain("X-Amz");
    });

    it("authorized participants download the exact bytes with the verified type", async () => {
      const res = await download("customer", imageId);
      expect(res.status).toBe(200);
      expect(res.body.data.disposition).toBe("inline");
      const file = await fetch(res.body.data.url);
      expect(file.status).toBe(200);
      expect(file.headers.get("content-type")).toBe("image/png");
      expect(new Uint8Array(await file.arrayBuffer())).toEqual(PNG);
      // Explicit download action: same authorization, attachment disposition.
      const forced = await api()
        .get(`/api/v1/chat/attachments/${imageId}/download?download=true`)
        .set(auth("customer"));
      expect(forced.body.data.disposition).toBe("attachment");
      const saved = await fetch(forced.body.data.url);
      expect(saved.headers.get("content-disposition")).toContain(
        'attachment; filename="photo.png"',
      );
    });

    it("non-members, other tenants, ineligible riders and admins without intervention get 404", async () => {
      for (const who of ["merchantB", "rider2", "admin"]) {
        expect((await download(who, imageId)).status, who).toBe(404);
      }
      expect((await download("customer", randomUUID())).status).toBe(404);
    });

    it("documents download as attachments; multiple attachments in one message work", async () => {
      const pdf = await uploadReady("merchantA", threadA, PDF, "invoice.pdf", "application/pdf");
      const png = await uploadReady("merchantA", threadA);
      const res = await send("merchantA", threadA, {
        type: ChatMessageType.FILE,
        attachmentIds: [pdf, png],
      });
      expect(res.status).toBe(201);
      expect(res.body.data.attachments).toHaveLength(2);
      const link = await download("customer", pdf);
      expect(link.body.data.disposition).toBe("attachment");
      const file = await fetch(link.body.data.url);
      expect(file.headers.get("content-disposition")).toContain(
        'attachment; filename="invoice.pdf"',
      );
      expect(file.headers.get("content-type")).toBe("application/pdf");
    });

    it("voice messages carry exactly one verified audio attachment", async () => {
      const voice = await uploadReady("customer", threadA, WEBM, "voice.webm", "audio/webm");
      const res = await send("customer", threadA, {
        type: ChatMessageType.VOICE,
        attachmentIds: [voice],
        metadata: { durationMs: 4200 },
      });
      expect(res.status).toBe(201);
      expect(res.body.data.attachments[0].kind).toBe("audio");
    });

    it("rejects pending, rejected, foreign, reused and cross-conversation attachments", async () => {
      const pending = (await reserve("merchantA", threadA, PNG, "p.png", "image/png")).body.data
        .attachment.id;
      expect(
        (
          await send("merchantA", threadA, {
            type: ChatMessageType.IMAGE,
            attachmentIds: [pending],
          })
        ).status,
      ).toBe(422);
      const foreign = await uploadReady("customer", threadA);
      expect(
        (
          await send("merchantA", threadA, {
            type: ChatMessageType.IMAGE,
            attachmentIds: [foreign],
          })
        ).status,
      ).toBe(422);
      expect(
        (
          await send("merchantA", threadA, {
            type: ChatMessageType.IMAGE,
            attachmentIds: [imageId],
          })
        ).status,
      ).toBe(422);
      const other = await uploadReady("merchantA", threadB);
      expect(
        (await send("merchantA", threadA, { type: ChatMessageType.IMAGE, attachmentIds: [other] }))
          .status,
      ).toBe(422);
      const audio = await uploadReady("merchantA", threadA, WEBM, "v.webm", "audio/webm");
      expect(
        (await send("merchantA", threadA, { type: ChatMessageType.IMAGE, attachmentIds: [audio] }))
          .status,
      ).toBe(422);
    });

    it("a failed send rolls back: valid attachments stay unlinked and reusable", async () => {
      const good = await uploadReady("merchantA", threadA);
      const res = await send("merchantA", threadA, {
        type: ChatMessageType.IMAGE,
        attachmentIds: [good, randomUUID()],
      });
      expect(res.status).toBe(422);
      const [row] = await ds.query(`SELECT "message_id" FROM "chat_attachments" WHERE "id" = $1`, [
        good,
      ]);
      expect(row.message_id).toBeNull();
      expect(
        (await send("merchantA", threadA, { type: ChatMessageType.IMAGE, attachmentIds: [good] }))
          .status,
      ).toBe(201);
    });

    it("retrying a send with the same clientMessageId does not duplicate the message or links", async () => {
      const id = await uploadReady("merchantA", threadA);
      const clientMessageId = randomUUID();
      const body = { clientMessageId, type: ChatMessageType.IMAGE, attachmentIds: [id] };
      const first = await api()
        .post(`/api/v1/chat/conversations/${threadA}/messages`)
        .set(auth("merchantA"))
        .send(body);
      const retry = await api()
        .post(`/api/v1/chat/conversations/${threadA}/messages`)
        .set(auth("merchantA"))
        .send(body);
      expect(first.status).toBe(201);
      expect(retry.status).toBe(200);
      expect(retry.body.data.id).toBe(first.body.data.id);
      const [{ count }] = await ds.query(
        `SELECT count(*)::int AS count FROM "chat_messages" WHERE "client_message_id" = $1`,
        [clientMessageId],
      );
      expect(count).toBe(1);
    });

    it("pending and rejected attachments are never downloadable; unsent ones only by the uploader", async () => {
      const pending = (await reserve("merchantA", threadA, PNG, "p.png", "image/png")).body.data
        .attachment.id;
      expect((await download("merchantA", pending)).status).toBe(404);
      const unsent = await uploadReady("merchantA", threadA);
      expect((await download("merchantA", unsent)).status).toBe(200);
      expect((await download("customer", unsent)).status).toBe(404);
    });

    it("deleting the message stops downloads but keeps the object for moderation", async () => {
      expect(
        (await api().delete(`/api/v1/chat/messages/${imageMessageId}`).set(auth("merchantA")))
          .status,
      ).toBe(200);
      expect((await download("customer", imageId)).status).toBe(404);
      expect((await download("merchantA", imageId)).status).toBe(404);
      expect(await objectExists(await keyOf(imageId))).toBe(true);
    });

    it("cancelling removes unsent attachments only", async () => {
      const unsent = await uploadReady("merchantA", threadA);
      const key = await keyOf(unsent);
      const res = await api().delete(`/api/v1/chat/attachments/${unsent}`).set(auth("merchantA"));
      expect(res.status).toBe(200);
      expect(await status(unsent)).toBeNull();
      expect(await objectExists(key)).toBe(false);
      expect(
        (await api().delete(`/api/v1/chat/attachments/${imageId}`).set(auth("merchantA"))).status,
      ).toBe(422);
    });

    it("text-only messaging is unchanged", async () => {
      const res = await send("customer", threadA, {
        type: ChatMessageType.TEXT,
        content: "Thanks!",
      });
      expect(res.status).toBe(201);
      expect(res.body.data.attachments).toEqual([]);
    });
  });

  /* ================================================================ */
  /* Storage cleanup                                                   */
  /* ================================================================ */

  describe("cleanup", () => {
    it("removes expired, unsent, rejected and orphaned data — never linked attachments — idempotently", async () => {
      const cleanup = app.get(ChatAttachmentCleanupService);
      // Expired PENDING with an object present (upload finished, never completed).
      const pendingTicket = await reserve("merchantA", threadA, PNG, "late.png", "image/png");
      const pendingId = pendingTicket.body.data.attachment.id;
      await put(pendingTicket.body.data, PNG);
      await ds.query(
        `UPDATE "chat_attachments" SET "createdAt" = now() - interval '2 hours' WHERE "id" = $1`,
        [pendingId],
      );
      // Unsent UPLOADED older than 24 h.
      const unsentId = await uploadReady("merchantA", threadA);
      await ds.query(
        `UPDATE "chat_attachments" SET "uploaded_at" = now() - interval '2 days' WHERE "id" = $1`,
        [unsentId],
      );
      // Linked attachment, very old: must survive.
      const linkedId = await uploadReady("merchantA", threadA);
      expect(
        (
          await send("merchantA", threadA, {
            type: ChatMessageType.IMAGE,
            attachmentIds: [linkedId],
          })
        ).status,
      ).toBe(201);
      await ds.query(
        `UPDATE "chat_attachments" SET "createdAt" = now() - interval '90 days', "uploaded_at" = now() - interval '90 days' WHERE "id" = $1`,
        [linkedId],
      );
      // Orphan object with no row.
      const orphanKey = `chat/${threadA}/${randomUUID()}`;
      await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: orphanKey, Body: PNG }));

      const keys = {
        pending: await keyOf(pendingId),
        unsent: await keyOf(unsentId),
        linked: await keyOf(linkedId),
      };
      // "now" in the future makes freshly written objects old enough for the orphan sweep.
      const future = new Date(Date.now() + 8 * 86_400_000);
      let orphans = 0;
      for (let i = 0; i < 10; i += 1) {
        const run = await cleanup.runOnce(future);
        orphans += run.orphanObjects;
        if (run.expiredPending + run.unsent + run.rejected + run.orphanObjects === 0 && i > 0)
          break;
      }
      expect(await status(pendingId)).toBeNull();
      expect(await objectExists(keys.pending)).toBe(false);
      expect(await status(unsentId)).toBeNull();
      expect(await objectExists(keys.unsent)).toBe(false);
      expect(await objectExists(orphanKey)).toBe(false);
      expect(orphans).toBeGreaterThanOrEqual(1);
      expect(await status(linkedId)).toBe("UPLOADED");
      expect(await objectExists(keys.linked)).toBe(true);
      const [{ rejected }] = await ds.query(
        `SELECT count(*)::int AS rejected FROM "chat_attachments" WHERE "status" = 'REJECTED'`,
      );
      expect(rejected).toBe(0);
      // Idempotent: nothing left to do.
      const again = await cleanup.runOnce(future);
      expect(again.expiredPending + again.unsent + again.rejected).toBe(0);
      expect((await download("customer", linkedId)).status).toBe(200);
    });
  });
});
