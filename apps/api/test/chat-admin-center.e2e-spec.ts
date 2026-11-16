import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

// Runs before every import: the app must target the disposable services.
vi.hoisted(() => {
  const db = process.env.CHAT_TEST_DATABASE_URL;
  const redis = process.env.CHAT_TEST_REDIS_URL;
  const s3 = process.env.CHAT_TEST_S3_ENDPOINT;
  if (db && redis && s3) {
    process.env.DATABASE_URL = db;
    process.env.REDIS_URL = redis;
    process.env.OUTBOX_POLL_MS = "600000"; // relay driven manually
    process.env.CHAT_ROOM_REVALIDATE_MS = "600000";
    process.env.CHAT_RATE_LIMIT_SEND_PER_MIN = "1000";
    process.env.CHAT_RATE_LIMIT_CREATE_PER_MIN = "1000";
    process.env.CHAT_RATE_LIMIT_UPLOAD_PER_MIN = "1000";
    process.env.CHAT_RATE_LIMIT_DOWNLOAD_PER_MIN = "1000";
    process.env.CHAT_RATE_LIMIT_ADMIN_PER_MIN = "1000";
    process.env.CHAT_RATE_LIMIT_REPORT_PER_MIN = "1000";
    process.env.CHAT_RATE_LIMIT_MUTATE_PER_MIN = "1000";
    process.env.CHAT_STORAGE_BUCKET = "dhruto-chat-p7-test";
    process.env.CHAT_STORAGE_REGION = "us-east-1";
    process.env.CHAT_STORAGE_ENDPOINT = s3;
    process.env.CHAT_STORAGE_FORCE_PATH_STYLE = "true";
    process.env.CHAT_STORAGE_ACCESS_KEY_ID = "test";
    process.env.CHAT_STORAGE_SECRET_ACCESS_KEY = "test";
    process.env.CHAT_ATTACHMENT_CLEANUP_ENABLED = "false";
    process.env.CHAT_MALWARE_SCAN_ENABLED = "false"; // runOnce driven by the tests
    process.env.CHAT_MALWARE_SCAN_MAX_ATTEMPTS = "2";
    process.env.CHAT_DELETED_MESSAGE_ATTACHMENT_RETENTION_SECONDS = "86400";
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
import { io as ioClient, type Socket as ClientSocket } from "socket.io-client";
import { ChatConversationType, ChatMessageType, ChatServerEvent } from "@dhruto/contracts";
import { AppModule } from "../src/app.module.js";
import { CustomJwtService } from "../src/auth/jwt/custom-jwt.service.js";
import { UserRole } from "../src/database/entities/index.js";
import { ChatAttachmentScanService } from "../src/chat/attachments/chat-attachment-scan.service.js";
import { ChatAttachmentCleanupService } from "../src/chat/attachments/chat-attachment-cleanup.service.js";
import { OutboxRelayService } from "../src/integrations/outbox-relay.service.js";
import {
  StaffGrantError,
  grantStaffPermission,
  revokeStaffPermission,
} from "../src/chat/staff-grants/chat-staff-grants.js";
import {
  CHAT_TEST_DATABASE_URL,
  assertDisposableDatabaseUrl,
  createChatTestDataSource,
} from "./utils/chat-test-db.js";
import { EICAR_TEST_STRING, startFakeClamd, type FakeClamd } from "./utils/fake-clamd.js";

/**
 * Communication Phase 7 — Admin Communication Center integration.
 *
 * Real AppModule against DISPOSABLE PostgreSQL + Redis + LocalStack S3 and a
 * test-only clamd protocol stand-in (`fake-clamd.ts`) behind the real ClamAV
 * adapter. Covers authorization (incl. per-user grants), inbox, intervention,
 * internal-note confidentiality on REST/search/outbox/sockets, escalation,
 * reports + moderation, the malware-scan gate, restricted staff access,
 * retention and audit.
 */

const BUCKET = "dhruto-chat-p7-test";
const HUB_DHK = randomUUID();
const HUB_CTG = randomUUID();
const RECIPIENT = "01397900001";
const NOTE_TOKEN = `P7NOTE${randomUUID().slice(0, 8)}`;

const PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, 9,
  8, 7, 6,
]);
const pdf = (body: string) => new TextEncoder().encode(`%PDF-1.7\n${body}\n%%EOF\n`);
const sha256 = (data: Uint8Array) => createHash("sha256").update(data).digest("hex");

interface Fixture {
  id: string;
  role: UserRole;
  phone: string;
  token: string;
}

describe.skipIf(
  !CHAT_TEST_DATABASE_URL || !process.env.CHAT_TEST_REDIS_URL || !process.env.CHAT_TEST_S3_ENDPOINT,
)("Communication Phase 7 — admin communication center", () => {
  let app: INestApplication;
  let ds: DataSource;
  let s3: S3Client;
  let clamd: FakeClamd;
  let baseUrl = "";
  const users: Record<string, Fixture> = {};
  const sockets: ClientSocket[] = [];
  let threadA = "";
  let threadB = "";
  let merchantMessageId = "";

  const api = () => request(app.getHttpServer());
  const auth = (who: string) => ({ Authorization: `Bearer ${users[who]?.token ?? "missing"}` });
  const REASON = "Customer complaint ticket #4471 review";

  async function insertUser(key: string, role: UserRole, phone: string): Promise<string> {
    const [row] = await ds.query(
      `INSERT INTO "users" ("name", "email", "phone", "password_hash", "role") VALUES ($1, $2, $3, 'x', $4) RETURNING "id"`,
      [`P7 ${key}`, `${key}@p7-test.local`, phone, role],
    );
    users[key] = { id: row.id as string, role, phone, token: "" };
    return row.id as string;
  }

  const send = (who: string, conversationId: string, body: Record<string, unknown>) =>
    api()
      .post(`/api/v1/chat/conversations/${conversationId}/messages`)
      .set(auth(who))
      .send({ clientMessageId: randomUUID(), ...body });

  async function upload(
    who: string,
    conversationId: string,
    data: Uint8Array,
    name: string,
    mime: string,
  ) {
    const ticket = await api()
      .post(`/api/v1/chat/conversations/${conversationId}/attachments`)
      .set(auth(who))
      .send({
        originalFilename: name,
        mimeType: mime,
        sizeBytes: data.byteLength,
        checksumSha256: sha256(data),
      });
    expect(ticket.status, JSON.stringify(ticket.body)).toBe(201);
    const put = await fetch(ticket.body.data.upload.url, {
      method: "PUT",
      headers: ticket.body.data.upload.headers,
      body: data,
    });
    expect(put.status).toBe(200);
    const id = ticket.body.data.attachment.id as string;
    const done = await api().post(`/api/v1/chat/attachments/${id}/complete`).set(auth(who));
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect(done.body.data.scanStatus).toBe("PENDING");
    return id;
  }

  const download = (who: string, id: string) =>
    api().get(`/api/v1/chat/attachments/${id}/download`).set(auth(who));
  const scan = () => app.get(ChatAttachmentScanService).runOnce();
  const auditCount = async (action: string, targetId?: string) =>
    (
      await ds.query(
        `SELECT count(*)::int AS c FROM "chat_audit_logs" WHERE "action" = $1 AND ($2::uuid IS NULL OR "target_id" = $2::uuid)`,
        [action, targetId ?? null],
      )
    )[0].c as number;
  const attachmentRow = async (id: string) =>
    (await ds.query(`SELECT * FROM "chat_attachments" WHERE "id" = $1`, [id]))[0];
  const objectExists = async (key: string) => {
    try {
      await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
      return true;
    } catch {
      return false;
    }
  };
  async function drainRelay(): Promise<void> {
    const relay = app.get(OutboxRelayService);
    for (let i = 0; i < 20; i += 1) {
      if ((await relay.pollOnce(100)).claimed === 0) return;
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
      `INSERT INTO "hubs" ("id", "code", "name", "address") VALUES ($1, 'P7DH', 'Dhaka Hub', 'Dhaka'), ($2, 'P7CT', 'Ctg Hub', 'Ctg')`,
      [HUB_DHK, HUB_CTG],
    );
    const mA = await insertUser("merchantA", UserRole.MERCHANT, "01397910001");
    const mB = await insertUser("merchantB", UserRole.MERCHANT, "01397910002");
    const r1 = await insertUser("rider1", UserRole.RIDER, "01397910003");
    const r2 = await insertUser("rider2", UserRole.RIDER, "01397910004");
    await insertUser("customer", UserRole.CUSTOMER, RECIPIENT);
    await insertUser("admin", UserRole.ADMIN, "01397910005");
    await insertUser("adminSec", UserRole.ADMIN, "01397910006");
    const hmDhk = await insertUser("hmDhk", UserRole.HUB_MANAGER, "01397910007");
    const hmCtg = await insertUser("hmCtg", UserRole.HUB_MANAGER, "01397910008");
    await ds.query(
      `INSERT INTO "hub_user_assignments" ("user_id", "hub_id") VALUES ($1, $3), ($2, $4)`,
      [hmDhk, hmCtg, HUB_DHK, HUB_CTG],
    );
    const [merchantA, merchantB] = (
      await ds.query(
        `INSERT INTO "merchants" ("user_id", "business_name", "contact_phone", "pickup_address")
         VALUES ($1, 'P7 Shop A', '01397910001', 'Dhaka'), ($2, 'P7 Shop B', '01397910002', 'Dhaka') RETURNING "id"`,
        [mA, mB],
      )
    ).map((r: { id: string }) => r.id);
    const [rider1] = (
      await ds.query(
        `INSERT INTO "riders" ("user_id", "hub_id") VALUES ($1, $3), ($2, $3) RETURNING "id"`,
        [r1, r2, HUB_DHK],
      )
    ).map((r: { id: string }) => r.id);
    const parcels = (
      await ds.query(
        `INSERT INTO "parcels" ("tracking_code", "merchant_id", "recipient_name", "recipient_phone", "raw_address", "current_rider_id", "current_hub_id")
         VALUES ('P7-A-0001', $1, 'Recipient', $3, 'Dhaka', $4, $5), ('P7-B-0001', $2, 'Other', '01397999999', 'Ctg', NULL, $6) RETURNING "id"`,
        [merchantA, merchantB, RECIPIENT, rider1, HUB_DHK, HUB_CTG],
      )
    ).map((r: { id: string }) => r.id);

    clamd = await startFakeClamd();
    process.env.CHAT_CLAMAV_HOST = "127.0.0.1";
    process.env.CHAT_CLAMAV_PORT = String(clamd.port);
    if (process.env.DATABASE_URL !== url)
      throw new Error("Refusing to boot: not the disposable DB");
    app = await NestFactory.create(AppModule, { logger: ["error"] });
    app.setGlobalPrefix("api/v1");
    await app.listen(0, "127.0.0.1");
    baseUrl = await app.getUrl();
    const dbName = (await app.get(DataSource).query(`SELECT current_database() AS db`))[0]
      .db as string;
    if (!/test/i.test(dbName)) throw new Error(`Refusing to run against "${dbName}"`);
    const jwt = app.get(CustomJwtService);
    for (const [key, u] of Object.entries(users)) {
      u.token = jwt.generateAuthTokens({
        id: u.id,
        email: `${key}@p7-test.local`,
        phone: u.phone,
        role: u.role,
      }).accessToken;
    }

    const open = (who: string, parcelId: string) =>
      api()
        .post("/api/v1/chat/conversations")
        .set(auth(who))
        .send({ type: ChatConversationType.PARCEL_DELIVERY, parcelId });
    threadA = (await open("merchantA", parcels[0])).body.data.id;
    threadB = (await open("merchantB", parcels[1])).body.data.id;
    await open("customer", parcels[0]);
    const sent = await send("merchantA", threadA, {
      type: ChatMessageType.TEXT,
      content: "Your parcel ships today",
    });
    merchantMessageId = sent.body.data.id;
    await send("merchantB", threadB, {
      type: ChatMessageType.TEXT,
      content: "Shop B private chat",
    });
  }, 240_000);

  afterAll(async () => {
    for (const s of sockets) s.close();
    await app?.close();
    if (ds?.isInitialized) await ds.destroy();
    s3?.destroy();
    await clamd?.close();
  });

  /* ================================================================ */
  describe("tenant isolation and staff authorization", () => {
    it("merchant, rider, customer and hub managers cannot use the admin center", async () => {
      for (const who of ["merchantA", "rider1", "customer"]) {
        expect((await api().get("/api/v1/chat/admin/inbox").set(auth(who))).status).toBe(403);
        expect((await api().get("/api/v1/chat/admin/metrics").set(auth(who))).status).toBe(403);
      }
      // Hub managers pass the coarse role guard but lack platform VIEW_ANY.
      expect((await api().get("/api/v1/chat/admin/inbox").set(auth("hmDhk"))).status).toBe(403);
      expect((await api().get("/api/v1/chat/admin/inbox")).status).toBe(401);
    });

    it("merchant cannot access another merchant's conversation; unassigned rider cannot access the parcel thread", async () => {
      expect(
        (await api().get(`/api/v1/chat/conversations/${threadB}/messages`).set(auth("merchantA")))
          .status,
      ).toBe(404);
      expect(
        (await api().get(`/api/v1/chat/conversations/${threadA}/messages`).set(auth("rider2")))
          .status,
      ).toBe(404);
      expect(
        (await api().get(`/api/v1/chat/conversations/${threadA}/messages`).set(auth("rider1")))
          .status,
      ).toBe(200);
    });

    it("hub manager of another hub cannot reach hub-scoped staff paths (404, no existence leak)", async () => {
      expect(
        (await api().get(`/api/v1/chat/admin/conversations/${threadA}/notes`).set(auth("hmCtg")))
          .status,
      ).toBe(404);
      expect(
        (await api().get(`/api/v1/chat/admin/conversations/${threadA}/notes`).set(auth("hmDhk")))
          .status,
      ).toBe(200);
    });

    it("effective permissions: an ordinary admin has no grant-required permission", async () => {
      const me = await api().get("/api/v1/chat/admin/me").set(auth("admin"));
      expect(me.status).toBe(200);
      expect(me.body.data.permissions).toContain("chat.conversation.view_any");
      expect(me.body.data.permissions).toContain("chat.escalation.manage");
      expect(me.body.data.permissions).not.toContain("chat.attachment.restricted_access");
      expect(me.body.data.permissions).not.toContain("chat.retention.manage");
    });

    it("grants: only active admins, idempotent, audited; expiry and revocation take effect immediately", async () => {
      const base = {
        permission: "chat.attachment.restricted_access",
        reason: "Security on-call rotation",
        operator: "test-operator",
      };
      await expect(
        grantStaffPermission(ds, { ...base, user: users.hmDhk.id }),
      ).rejects.toBeInstanceOf(StaffGrantError);
      await expect(
        grantStaffPermission(ds, { ...base, user: users.merchantA.id }),
      ).rejects.toBeInstanceOf(StaffGrantError);
      await expect(
        grantStaffPermission(ds, {
          ...base,
          permission: "chat.audit.view",
          user: users.adminSec.id,
        }),
      ).rejects.toBeInstanceOf(StaffGrantError);
      await expect(
        grantStaffPermission(ds, { ...base, reason: "short", user: users.adminSec.id }),
      ).rejects.toBeInstanceOf(StaffGrantError);
      expect(await grantStaffPermission(ds, { ...base, user: "adminsec@p7-test.local" })).toBe(
        "granted",
      );
      expect(await grantStaffPermission(ds, { ...base, user: users.adminSec.id })).toBe(
        "unchanged",
      );
      expect(await auditCount("STAFF_GRANT_CHANGED")).toBe(1);
      let me = await api().get("/api/v1/chat/admin/me").set(auth("adminSec"));
      expect(me.body.data.permissions).toContain("chat.attachment.restricted_access");

      await ds.query(
        `UPDATE "chat_staff_grants" SET "expires_at" = now() - interval '1 minute' WHERE "user_id" = $1`,
        [users.adminSec.id],
      );
      me = await api().get("/api/v1/chat/admin/me").set(auth("adminSec"));
      expect(me.body.data.permissions).not.toContain("chat.attachment.restricted_access");
      await ds.query(`UPDATE "chat_staff_grants" SET "expires_at" = NULL WHERE "user_id" = $1`, [
        users.adminSec.id,
      ]);

      // There is no HTTP route that writes grants.
      expect(
        (await api().post("/api/v1/chat/admin/grants").set(auth("admin")).send(base)).status,
      ).toBe(404);
    });
  });

  /* ================================================================ */
  describe("operational inbox", () => {
    it("lists metadata with parcel code and counts; no content for non-participants; listing audited without search text", async () => {
      const res = await api().get("/api/v1/chat/admin/inbox").set(auth("admin"));
      expect(res.status).toBe(200);
      const a = res.body.data.items.find((i: { id: string }) => i.id === threadA);
      expect(a.parcel.trackingCode).toBe("P7-A-0001");
      expect(a.hubName).toBe("Dhaka Hub");
      expect(a.merchantName).toBe("P7 Shop A");
      expect(a.isParticipant).toBe(false);
      expect(a.lastMessagePreview).toBeNull();
      expect(a.unreadCount).toBeNull();
      expect(JSON.stringify(res.body.data)).not.toContain("Shop B private chat");

      await api().get("/api/v1/chat/admin/inbox?q=p7-a-0001").set(auth("admin"));
      const [log] = await ds.query(
        `SELECT "metadata" FROM "chat_audit_logs" WHERE "action" = 'ADMIN_CONVERSATIONS_LISTED' ORDER BY "createdAt" DESC LIMIT 1`,
      );
      expect(log.metadata.view).toBe("inbox");
      expect(JSON.stringify(log.metadata)).not.toMatch(/p7-a-0001/i);
    });

    it("exact identifier search (tracking code, conversation id) and filters", async () => {
      const byCode = await api().get("/api/v1/chat/admin/inbox?q=p7-a-0001").set(auth("admin"));
      expect(byCode.body.data.items.map((i: { id: string }) => i.id)).toEqual([threadA]);
      const byId = await api().get(`/api/v1/chat/admin/inbox?q=${threadB}`).set(auth("admin"));
      expect(byId.body.data.items.map((i: { id: string }) => i.id)).toEqual([threadB]);
      const none = await api().get("/api/v1/chat/admin/inbox?q=P7-A").set(auth("admin"));
      expect(none.body.data.items).toEqual([]);
      const byHub = await api().get(`/api/v1/chat/admin/inbox?hubId=${HUB_CTG}`).set(auth("admin"));
      expect(byHub.body.data.items.map((i: { id: string }) => i.id)).toEqual([threadB]);
      const byParticipant = await api()
        .get(`/api/v1/chat/admin/inbox?participantUserId=${users.customer.id}`)
        .set(auth("admin"));
      expect(byParticipant.body.data.items.map((i: { id: string }) => i.id)).toEqual([threadA]);
      expect(
        (await api().get("/api/v1/chat/admin/inbox?q=' OR 1=1 --").set(auth("admin"))).body.data
          .items,
      ).toEqual([]);
      expect((await api().get("/api/v1/chat/admin/inbox?bogus=1").set(auth("admin"))).status).toBe(
        422,
      );
    });

    it("keyset pagination is stable and complete", async () => {
      const first = await api().get("/api/v1/chat/admin/inbox?limit=1").set(auth("admin"));
      expect(first.body.data.hasMore).toBe(true);
      const second = await api()
        .get(`/api/v1/chat/admin/inbox?limit=1&cursor=${first.body.data.nextCursor}`)
        .set(auth("admin"));
      const ids = [first.body.data.items[0].id, second.body.data.items[0].id];
      expect(new Set(ids).size).toBe(2);
      expect(ids.sort()).toEqual([threadA, threadB].sort());
      expect(
        (await api().get("/api/v1/chat/admin/inbox?cursor=garbage").set(auth("admin"))).status,
      ).toBe(422);
    });
  });

  /* ================================================================ */
  describe("intervention, staff messages and internal notes", () => {
    it("staff cannot read or intervene without a reason; with a reason it is audited", async () => {
      expect(
        (await api().get(`/api/v1/chat/admin/conversations/${threadA}`).set(auth("admin"))).status,
      ).toBe(422);
      expect(
        (
          await api()
            .post(`/api/v1/chat/admin/conversations/${threadA}/intervene`)
            .set(auth("admin"))
            .send({})
        ).status,
      ).toBe(422);
      const view = await api()
        .get(`/api/v1/chat/admin/conversations/${threadA}?reason=${encodeURIComponent(REASON)}`)
        .set(auth("admin"));
      expect(view.status).toBe(200);
      expect(await auditCount("ADMIN_CONVERSATION_VIEWED")).toBeGreaterThanOrEqual(1);
      const joined = await api()
        .post(`/api/v1/chat/admin/conversations/${threadA}/intervene`)
        .set(auth("admin"))
        .send({ reason: REASON });
      expect(joined.status).toBe(200);
      expect(await auditCount("ADMIN_INTERVENTION")).toBe(1);
    });

    it("a participant-visible staff message uses the normal path and identifies the staff sender", async () => {
      const sent = await send("admin", threadA, {
        type: ChatMessageType.TEXT,
        content: "Operations here: we are on it",
      });
      expect(sent.status).toBe(201);
      const history = await api()
        .get(`/api/v1/chat/conversations/${threadA}/messages`)
        .set(auth("customer"));
      const staff = history.body.data.items.find((m: { id: string }) => m.id === sent.body.data.id);
      expect(staff.senderId).toBe(users.admin.id);
      const detail = await api().get(`/api/v1/chat/conversations/${threadA}`).set(auth("customer"));
      const p = detail.body.data.participants.find(
        (x: { userId: string }) => x.userId === users.admin.id,
      );
      expect(p.platformRole).toBe("ADMIN");
      expect(p.role).toBe("MODERATOR");
      // Now a participant, the inbox shows the admin a preview.
      const inbox = await api().get(`/api/v1/chat/admin/inbox?q=${threadA}`).set(auth("admin"));
      expect(inbox.body.data.items[0].isParticipant).toBe(true);
      expect(inbox.body.data.items[0].lastMessagePreview).toContain("Operations here");
    });

    it("internal notes stay private across REST, search, exports, outbox and participant sockets", async () => {
      const customerSocket = await new Promise<ClientSocket>((resolve, reject) => {
        const socket = ioClient(`${baseUrl}/chat`, {
          transports: ["websocket"],
          forceNew: true,
          reconnection: false,
          auth: { token: users.customer.token },
        });
        sockets.push(socket);
        socket.on(ChatServerEvent.SESSION_READY, () => resolve(socket));
        socket.on("connect_error", reject);
      });
      const received: string[] = [];
      customerSocket.onAny((event: string, payload: unknown) =>
        received.push(`${event}:${JSON.stringify(payload)}`),
      );

      const note = await api()
        .post(`/api/v1/chat/admin/conversations/${threadA}/notes`)
        .set(auth("admin"))
        .send({ body: `Suspected fraud pattern ${NOTE_TOKEN}` });
      expect(note.status).toBe(201);
      // Positive control: a normal message after the note must reach the socket.
      const control = await send("merchantA", threadA, {
        type: ChatMessageType.TEXT,
        content: "control message p7",
      });
      expect(control.status).toBe(201);
      await drainRelay();
      const deadline = Date.now() + 8000;
      while (
        !received.some((r) => r.startsWith(ChatServerEvent.MESSAGE_NEW)) &&
        Date.now() < deadline
      ) {
        await new Promise((r) => setTimeout(r, 100));
      }
      expect(received.some((r) => r.startsWith(ChatServerEvent.MESSAGE_NEW))).toBe(true);
      expect(received.join("\n")).not.toContain(NOTE_TOKEN);

      // Outbox never carries notes.
      const [{ c: outboxHits }] = await ds.query(
        `SELECT count(*)::int AS c FROM "event_outbox" WHERE "payload"::text LIKE $1`,
        [`%${NOTE_TOKEN}%`],
      );
      expect(outboxHits).toBe(0);

      // Participant REST paths and search never include notes.
      for (const who of ["customer", "merchantA"]) {
        const history = await api()
          .get(`/api/v1/chat/conversations/${threadA}/messages`)
          .set(auth(who));
        expect(JSON.stringify(history.body.data)).not.toContain(NOTE_TOKEN);
        const detail = await api().get(`/api/v1/chat/conversations/${threadA}`).set(auth(who));
        expect(JSON.stringify(detail.body.data)).not.toContain(NOTE_TOKEN);
        const search = await api().get(`/api/v1/chat/search?q=${NOTE_TOKEN}`).set(auth(who));
        expect(search.status).toBe(200);
        expect(search.body.data.items).toEqual([]);
        expect(
          (await api().get(`/api/v1/chat/admin/conversations/${threadA}/notes`).set(auth(who)))
            .status,
        ).toBe(403);
      }
      // Ordinary exports never include notes.
      const exported = await api()
        .get(
          `/api/v1/chat/admin/conversations/${threadA}/export?reason=${encodeURIComponent(REASON)}`,
        )
        .set(auth("admin"));
      expect(JSON.stringify(exported.body.data)).not.toContain(NOTE_TOKEN);

      // Authorized staff read it, and the read is audited.
      const before = await auditCount("INTERNAL_NOTE_VIEWED");
      const notes = await api()
        .get(`/api/v1/chat/admin/conversations/${threadA}/notes`)
        .set(auth("admin"));
      expect(notes.body.data[0].body).toContain(NOTE_TOKEN);
      expect(await auditCount("INTERNAL_NOTE_VIEWED")).toBe(before + 1);
    });
  });

  /* ================================================================ */
  describe("escalation workflow", () => {
    const put = (who: string, body: Record<string, unknown>, id = threadB) =>
      api().put(`/api/v1/chat/admin/conversations/${id}/escalation`).set(auth(who)).send(body);

    it("requires permission and a reason; non-staff and hub managers cannot change it", async () => {
      expect(
        (await put("merchantB", { status: "ESCALATED", note: "Please escalate this" })).status,
      ).toBe(403);
      expect(
        (await put("hmCtg", { status: "ESCALATED", note: "Please escalate this" })).status,
      ).toBe(404);
      expect((await put("admin", { status: "ESCALATED" })).status).toBe(422);
      expect(
        (await put("admin", { status: "RESOLVED", note: "Nothing to resolve yet" })).status,
      ).toBe(409);
    });

    it("escalate → assign → review → resolve → close, audited, idempotent, lifecycle untouched", async () => {
      const esc = await put("admin", {
        status: "ESCALATED",
        note: "Merchant reports rider threat",
      });
      expect(esc.status).toBe(200);
      expect(esc.body.data.current.status).toBe("ESCALATED");
      const audits = await auditCount("ESCALATION_CHANGED");
      expect(
        (await put("admin", { status: "ESCALATED", note: "Merchant reports rider threat" })).status,
      ).toBe(200);
      expect(await auditCount("ESCALATION_CHANGED")).toBe(audits); // retry is a no-op

      const assigned = await put("admin", {
        status: "IN_REVIEW",
        assigneeUserId: users.adminSec.id,
      });
      expect(assigned.status).toBe(200);
      expect(assigned.body.data.current.assigneeName).toBe("P7 adminSec");
      const [{ c: notified }] = await ds.query(
        `SELECT count(*)::int AS c FROM "notifications" WHERE "user_id" = $1 AND "metadata"->>'kind' = 'chat_escalation_assigned'`,
        [users.adminSec.id],
      );
      expect(notified).toBe(1);
      expect(
        (await put("admin", { status: "IN_REVIEW", assigneeUserId: users.merchantA.id })).status,
      ).toBe(409);

      expect(
        (await put("admin", { status: "CLOSED", note: "Closing without resolution" })).status,
      ).toBe(409);
      expect((await put("adminSec", { status: "RESOLVED" })).status).toBe(422);
      expect(
        (await put("adminSec", { status: "RESOLVED", note: "Rider reassigned, merchant informed" }))
          .status,
      ).toBe(200);
      const closed = await put("adminSec", { status: "CLOSED", note: "Confirmed with merchant" });
      expect(closed.body.data.history.map((h: { to: string }) => h.to)).toEqual([
        "CLOSED",
        "RESOLVED",
        "IN_REVIEW",
        "ESCALATED",
      ]);

      const [conv] = await ds.query(`SELECT "status" FROM "chat_conversations" WHERE "id" = $1`, [
        threadB,
      ]);
      expect(conv.status).toBe("ACTIVE");
      const participantView = await api()
        .get(`/api/v1/chat/conversations/${threadB}`)
        .set(auth("merchantB"));
      expect(JSON.stringify(participantView.body.data)).not.toMatch(/escalat/i);
    });

    it("the escalation queue filter works", async () => {
      await put("admin", { status: "OPEN", note: "New cycle: repeat complaint" });
      const active = await api()
        .get("/api/v1/chat/admin/inbox?escalation=ACTIVE")
        .set(auth("admin"));
      expect(active.body.data.items.map((i: { id: string }) => i.id)).toEqual([threadB]);
      expect(active.body.data.items[0].escalation.status).toBe("OPEN");
      const none = await api().get("/api/v1/chat/admin/inbox?escalation=NONE").set(auth("admin"));
      expect(none.body.data.items.map((i: { id: string }) => i.id)).toEqual([threadA]);
    });
  });

  /* ================================================================ */
  describe("reports and moderation", () => {
    let reportId = "";

    it("report queue is admin-only, filterable by conversation, and shows the indicator", async () => {
      const r = await api()
        .post(`/api/v1/chat/messages/${merchantMessageId}/reports`)
        .set(auth("customer"))
        .send({ reason: "ABUSE", details: "Rude message" });
      expect(r.status).toBe(201);
      reportId = r.body.data.id;
      expect((await api().get("/api/v1/chat/admin/reports").set(auth("hmDhk"))).status).toBe(403);
      const list = await api()
        .get(`/api/v1/chat/admin/reports?conversationId=${threadA}`)
        .set(auth("admin"));
      expect(list.body.data.items.map((i: { id: string }) => i.id)).toEqual([reportId]);
      const empty = await api()
        .get(`/api/v1/chat/admin/reports?conversationId=${threadB}`)
        .set(auth("admin"));
      expect(empty.body.data.items).toEqual([]);
      const flagged = await api()
        .get("/api/v1/chat/admin/inbox?hasOpenReports=true")
        .set(auth("admin"));
      expect(flagged.body.data.items.map((i: { id: string }) => i.id)).toEqual([threadA]);
      expect(flagged.body.data.items[0].openReportCount).toBe(1);
    });

    it("review start is audited and idempotent; dismiss/resolve need a note", async () => {
      const review = (body: Record<string, unknown>) =>
        api().post(`/api/v1/chat/admin/reports/${reportId}/review`).set(auth("admin")).send(body);
      expect((await review({ status: "UNDER_REVIEW" })).status).toBe(200);
      expect(await auditCount("REPORT_REVIEW_STARTED", reportId)).toBe(1);
      expect((await review({ status: "UNDER_REVIEW" })).status).toBe(200);
      expect(await auditCount("REPORT_REVIEW_STARTED", reportId)).toBe(1);
      expect((await review({ status: "DISMISSED" })).status).toBe(422);
    });

    it("moderation removes the message but preserves evidence; resolution recorded", async () => {
      const removed = await api()
        .post(`/api/v1/chat/messages/${merchantMessageId}/remove`)
        .set(auth("admin"))
        .send({ reason: "Abusive language confirmed by review" });
      expect(removed.status).toBe(200);
      expect(removed.body.data.deletedAt).not.toBeNull();
      const [evidence] = await ds.query(
        `SELECT "previous_content" FROM "chat_message_edits" WHERE "message_id" = $1 ORDER BY "createdAt" DESC LIMIT 1`,
        [merchantMessageId],
      );
      expect(evidence.previous_content).toBe("Your parcel ships today");
      const resolved = await api()
        .post(`/api/v1/chat/admin/reports/${reportId}/review`)
        .set(auth("admin"))
        .send({ status: "RESOLVED", resolutionNote: "Message removed, merchant warned" });
      expect(resolved.body.data.status).toBe("RESOLVED");
      expect(await auditCount("REPORT_RESOLVED", reportId)).toBe(1);
      expect(await auditCount("MESSAGE_REMOVED_BY_MODERATOR", merchantMessageId)).toBe(1);
    });
  });

  /* ================================================================ */
  describe("malware-scan gate and restricted attachment access", () => {
    let cleanId = "";
    let infectedId = "";
    let failedId = "";

    it("unscanned files are not downloadable; outsiders still get 404; a clean scan unlocks them", async () => {
      cleanId = await upload("merchantA", threadA, PNG, "label.png", "image/png");
      expect(
        (
          await send("merchantA", threadA, {
            type: ChatMessageType.IMAGE,
            attachmentIds: [cleanId],
          })
        ).status,
      ).toBe(201);
      const pending = await download("customer", cleanId);
      expect(pending.status).toBe(409);
      expect(pending.body.errorCode ?? pending.body.error).toBeDefined();
      expect(JSON.stringify(pending.body)).toContain("CHAT_ATTACHMENT_SCAN_PENDING");
      expect((await download("merchantB", cleanId)).status).toBe(404);
      const result = await scan();
      expect(result.clean).toBeGreaterThanOrEqual(1);
      const row = await attachmentRow(cleanId);
      expect(row.scan_status).toBe("CLEAN");
      expect(row.scanned_sha256).toBe(row.checksum_sha256);
      expect((await download("customer", cleanId)).status).toBe(200);
      const history = await api()
        .get(`/api/v1/chat/conversations/${threadA}/messages`)
        .set(auth("customer"));
      expect(JSON.stringify(history.body.data)).toContain('"scanStatus":"CLEAN"');
    });

    it("an infected file is quarantined, never served, audited, and cannot be re-sent", async () => {
      infectedId = await upload(
        "merchantA",
        threadA,
        pdf(EICAR_TEST_STRING),
        "invoice.pdf",
        "application/pdf",
      );
      expect(
        (
          await send("merchantA", threadA, {
            type: ChatMessageType.FILE,
            attachmentIds: [infectedId],
          })
        ).status,
      ).toBe(201);
      await scan();
      const row = await attachmentRow(infectedId);
      expect(row.scan_status).toBe("INFECTED");
      expect(row.scan_threat).toBe("Eicar-Test-Signature");
      expect(row.quarantined_at).not.toBeNull();
      for (const who of ["customer", "merchantA"]) {
        const res = await download(who, infectedId);
        expect(res.status).toBe(409);
        expect(JSON.stringify(res.body)).toContain("CHAT_ATTACHMENT_BLOCKED");
      }
      expect(await auditCount("ATTACHMENT_QUARANTINED", infectedId)).toBe(1);

      const unsentInfected = await upload(
        "merchantA",
        threadA,
        pdf(`${EICAR_TEST_STRING} 2`),
        "x.pdf",
        "application/pdf",
      );
      await scan();
      const blockedSend = await send("merchantA", threadA, {
        type: ChatMessageType.FILE,
        attachmentIds: [unsentInfected],
      });
      expect(blockedSend.status).toBe(422);
    });

    // Phase 8 changed the outage behavior: an unreachable scanner no longer
    // consumes retry budgets (files stay PENDING and recover by themselves);
    // per-file scanner errors still retry and then FAIL closed.
    it("scanner outage keeps files pending (blocked); per-file scanner errors retry, then FAIL", async () => {
      failedId = await upload(
        "merchantA",
        threadA,
        pdf("outage test"),
        "outage.pdf",
        "application/pdf",
      );
      await send("merchantA", threadA, { type: ChatMessageType.FILE, attachmentIds: [failedId] });
      clamd.setMode("down");
      const skipped = await app.get(ChatAttachmentScanService).runOnce(new Date(Date.now() + 1000));
      expect(skipped.scannerUnavailable).toBe(true);
      expect(skipped.claimed).toBe(0);
      let row = await attachmentRow(failedId);
      expect(row.scan_status).toBe("PENDING");
      expect(row.scan_attempts).toBe(0);
      expect((await download("customer", failedId)).status).toBe(409);

      clamd.setMode("garbage"); // reachable, but returns an invalid scan result
      const first = await app.get(ChatAttachmentScanService).runOnce(new Date(Date.now() + 20_000));
      expect(first.retried).toBeGreaterThanOrEqual(1);
      row = await attachmentRow(failedId);
      expect(row.scan_status).toBe("PENDING");
      expect(row.scan_attempts).toBe(1);
      expect((await download("customer", failedId)).status).toBe(409);
      await app.get(ChatAttachmentScanService).runOnce(new Date(Date.now() + 3600_000));
      row = await attachmentRow(failedId);
      expect(row.scan_status).toBe("FAILED");
      expect(row.scan_error).toBe("protocol");
      expect((await download("customer", failedId)).status).toBe(409);
      clamd.setMode("normal");
    });

    it("a verdict is bound to the exact object: replaced bytes fail integrity and can never be released", async () => {
      const id = await upload("merchantA", threadA, PNG, "swap.png", "image/png");
      const row = await attachmentRow(id);
      await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: row.storage_key,
          Body: new Uint8Array([1, 2, 3]),
        }),
      );
      await scan();
      const after = await attachmentRow(id);
      expect(after.scan_status).toBe("FAILED");
      expect(after.scan_error).toBe("checksum_mismatch");
      await grantStaffPermission(ds, {
        user: users.adminSec.id,
        permission: "chat.attachment.quarantine_manage",
        reason: "Security on-call rotation",
        operator: "test-operator",
      });
      const release = await api()
        .post(`/api/v1/chat/admin/attachments/${id}/decision`)
        .set(auth("adminSec"))
        .send({ action: "RELEASE", reason: "Trying to release tampered file" });
      expect(release.status).toBe(422);
    });

    it("restricted access requires the explicit grant AND a reason; audited without URLs", async () => {
      // Ordinary admin (no grant): no queue, no content, no decisions.
      expect((await api().get("/api/v1/chat/admin/attachments").set(auth("admin"))).status).toBe(
        403,
      );
      expect(
        (
          await api()
            .get(
              `/api/v1/chat/admin/attachments/${infectedId}/download?reason=${encodeURIComponent(REASON)}`,
            )
            .set(auth("admin"))
        ).status,
      ).toBe(404);
      expect(
        (
          await api()
            .post(`/api/v1/chat/admin/attachments/${infectedId}/decision`)
            .set(auth("admin"))
            .send({ action: "RELEASE", reason: REASON })
        ).status,
      ).toBe(404);

      const queue = await api().get("/api/v1/chat/admin/attachments").set(auth("adminSec"));
      expect(queue.status).toBe(200);
      const ids = queue.body.data.items.map((i: { id: string }) => i.id);
      expect(ids).toEqual(expect.arrayContaining([infectedId, failedId]));
      expect(JSON.stringify(queue.body.data)).not.toContain("chat/");

      expect(
        (
          await api()
            .get(`/api/v1/chat/admin/attachments/${infectedId}/download`)
            .set(auth("adminSec"))
        ).status,
      ).toBe(422);
      const dl = await api()
        .get(
          `/api/v1/chat/admin/attachments/${infectedId}/download?reason=${encodeURIComponent(REASON)}`,
        )
        .set(auth("adminSec"));
      expect(dl.status).toBe(200);
      expect(dl.body.data.disposition).toBe("attachment");
      const fetched = await fetch(dl.body.data.url);
      expect(fetched.headers.get("content-type")).toBe("application/octet-stream");
      expect(await auditCount("ATTACHMENT_RESTRICTED_ACCESSED", infectedId)).toBe(1);
      const [{ c: leaked }] = await ds.query(
        `SELECT count(*)::int AS c FROM "chat_audit_logs" WHERE "metadata"::text ~* 'X-Amz-|signature=|chat/'`,
      );
      expect(leaked).toBe(0);
    });

    it("release and rescan are grant-gated, reasoned, audited decisions", async () => {
      const released = await api()
        .post(`/api/v1/chat/admin/attachments/${infectedId}/decision`)
        .set(auth("adminSec"))
        .send({ action: "RELEASE", reason: "Confirmed false positive with vendor" });
      expect(released.status).toBe(200);
      expect(released.body.data.scanStatus).toBe("CLEAN");
      expect(released.body.data.scanEngine).toBe("manual-release");
      expect(await auditCount("ATTACHMENT_RELEASED", infectedId)).toBe(1);
      expect((await download("customer", infectedId)).status).toBe(200);

      const rescan = await api()
        .post(`/api/v1/chat/admin/attachments/${failedId}/decision`)
        .set(auth("adminSec"))
        .send({ action: "RESCAN", reason: "Scanner restored after outage" });
      expect(rescan.body.data.scanStatus).toBe("PENDING");
      await scan();
      expect((await attachmentRow(failedId)).scan_status).toBe("CLEAN");
      expect(await auditCount("ATTACHMENT_RESCAN_REQUESTED", failedId)).toBe(1);

      expect(
        await revokeStaffPermission(ds, {
          user: users.adminSec.id,
          permission: "chat.attachment.restricted_access",
          reason: "Rotation ended for this week",
          operator: "test-operator",
        }),
      ).toBe("revoked");
      expect(
        (
          await api()
            .get(
              `/api/v1/chat/admin/attachments/${cleanId}/download?reason=${encodeURIComponent(REASON)}`,
            )
            .set(auth("adminSec"))
        ).status,
      ).toBe(404);
    });
  });

  /* ================================================================ */
  describe("retention", () => {
    it("purges objects of deleted messages after the configured period, honoring evidence holds; rows and audit stay", async () => {
      const goneId = await upload(
        "merchantA",
        threadA,
        pdf("retention gone"),
        "gone.pdf",
        "application/pdf",
      );
      const heldId = await upload(
        "merchantA",
        threadA,
        pdf("retention held"),
        "held.pdf",
        "application/pdf",
      );
      const keptId = await upload(
        "merchantA",
        threadA,
        pdf("retention kept"),
        "kept.pdf",
        "application/pdf",
      );
      await scan();
      const m1 = (
        await send("merchantA", threadA, { type: ChatMessageType.FILE, attachmentIds: [goneId] })
      ).body.data.id;
      const m2 = (
        await send("merchantA", threadA, { type: ChatMessageType.FILE, attachmentIds: [heldId] })
      ).body.data.id;
      await send("merchantA", threadA, { type: ChatMessageType.FILE, attachmentIds: [keptId] });
      await api()
        .post(`/api/v1/chat/messages/${m2}/reports`)
        .set(auth("customer"))
        .send({ reason: "FRAUD" });
      await api().delete(`/api/v1/chat/messages/${m1}`).set(auth("merchantA"));
      await api().delete(`/api/v1/chat/messages/${m2}`).set(auth("merchantA"));

      const keys = {
        gone: (await attachmentRow(goneId)).storage_key as string,
        held: (await attachmentRow(heldId)).storage_key as string,
        kept: (await attachmentRow(keptId)).storage_key as string,
      };
      const cleanup = app.get(ChatAttachmentCleanupService);
      const early = await cleanup.runOnce(new Date());
      expect(early.deletedMessageObjects).toBe(0);
      const later = await cleanup.runOnce(new Date(Date.now() + 2 * 86_400_000));
      expect(later.deletedMessageObjects).toBe(1);
      expect(await objectExists(keys.gone)).toBe(false);
      expect((await attachmentRow(goneId)).object_purged_at).not.toBeNull();
      expect(await objectExists(keys.held)).toBe(true); // open report = evidence hold
      expect(await objectExists(keys.kept)).toBe(true); // message not deleted
      expect(await auditCount("ATTACHMENT_OBJECT_PURGED", goneId)).toBe(1);
      expect(
        (await cleanup.runOnce(new Date(Date.now() + 2 * 86_400_000))).deletedMessageObjects,
      ).toBe(0);
    });

    it("retention status requires its own grant", async () => {
      expect((await api().get("/api/v1/chat/admin/retention").set(auth("admin"))).status).toBe(403);
      await grantStaffPermission(ds, {
        user: users.admin.id,
        permission: "chat.retention.manage",
        reason: "Data protection officer duties",
        operator: "test-operator",
      });
      const status = await api().get("/api/v1/chat/admin/retention").set(auth("admin"));
      expect(status.status).toBe(200);
      expect(status.body.data.scannerConfigured).toBe(true);
      const dm = status.body.data.policies.find(
        (p: { category: string }) => p.category === "deleted_message_objects",
      );
      expect(dm.retentionSeconds).toBe(86400);
      const q = status.body.data.policies.find(
        (p: { category: string }) => p.category === "quarantined_objects",
      );
      expect(q.retentionSeconds).toBeNull();
    });
  });

  /* ================================================================ */
  describe("audit history and metrics", () => {
    it("audit history is filterable by action, read-only and append-only", async () => {
      const logs = await api()
        .get(`/api/v1/chat/admin/audit-logs?conversationId=${threadB}&action=ESCALATION_CHANGED`)
        .set(auth("admin"));
      expect(logs.status).toBe(200);
      expect(logs.body.data.items.length).toBe(5);
      expect(
        logs.body.data.items.every((i: { action: string }) => i.action === "ESCALATION_CHANGED"),
      ).toBe(true);
      expect((await api().get("/api/v1/chat/admin/audit-logs").set(auth("hmDhk"))).status).toBe(
        403,
      );
      expect(
        (
          await api()
            .delete(`/api/v1/chat/admin/audit-logs/${logs.body.data.items[0].id}`)
            .set(auth("admin"))
        ).status,
      ).toBe(404);
      await expect(
        ds.query(`UPDATE "chat_audit_logs" SET "reason" = 'tampered'`),
      ).rejects.toThrow();
    });

    it("metrics reflect real data", async () => {
      const res = await api().get("/api/v1/chat/admin/metrics").set(auth("admin"));
      expect(res.status).toBe(200);
      const m = res.body.data;
      expect(m.conversations.total).toBe(2);
      expect(m.escalations.open).toBe(1);
      expect(m.reports.open).toBe(1); // the retention-hold report
      expect(m.needsAttention).toBe(2);
      expect(m.interventionsLast7Days).toBe(1);
      expect(m.conversationVolume).toHaveLength(14);
      expect(m.conversationVolume.at(-1).count).toBe(2);
    });
  });
});
