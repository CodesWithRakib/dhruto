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
    process.env.CHAT_RATE_LIMIT_ADMIN_PER_MIN = "1000";
    process.env.CHAT_RATE_LIMIT_MUTATE_PER_MIN = "1000";
    process.env.CHAT_RATE_LIMIT_SEARCH_PER_MIN = "3"; // rate-limit probe
    process.env.CHAT_STORAGE_BUCKET = "dhruto-chat-p8-test";
    process.env.CHAT_STORAGE_REGION = "us-east-1";
    process.env.CHAT_STORAGE_ENDPOINT = s3;
    process.env.CHAT_STORAGE_FORCE_PATH_STYLE = "true";
    process.env.CHAT_STORAGE_ACCESS_KEY_ID = "test";
    process.env.CHAT_STORAGE_SECRET_ACCESS_KEY = "test";
    process.env.CHAT_ATTACHMENT_CLEANUP_ENABLED = "false";
    process.env.CHAT_MALWARE_SCAN_ENABLED = "false"; // runOnce driven by the tests
    process.env.CHAT_MALWARE_SCAN_BATCH = "20";
    process.env.CHAT_MALWARE_SCAN_CONCURRENCY = "4";
    process.env.CHAT_MALWARE_SCAN_MAX_ATTEMPTS = "3";
    process.env.CHAT_MALWARE_SCAN_LEASE_SECONDS = "300";
    process.env.CHAT_CLAMAV_TIMEOUT_MS = "1000";
    process.env.CHAT_DELETED_MESSAGE_ATTACHMENT_RETENTION_SECONDS = "86400";
  }
});

import { execFileSync } from "node:child_process";
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
import { ChatAttachmentScanService } from "../src/chat/attachments/chat-attachment-scan.service.js";
import { ChatAttachmentCleanupService } from "../src/chat/attachments/chat-attachment-cleanup.service.js";
import {
  CHAT_TEST_DATABASE_URL,
  assertDisposableDatabaseUrl,
  createChatTestDataSource,
} from "./utils/chat-test-db.js";
import { startFakeClamd, type FakeClamd } from "./utils/fake-clamd.js";

/**
 * Communication Phase 8 — production-readiness hardening.
 *
 * Fail-closed scanner matrix, backlog processing behavior, retention guards,
 * observability output and a few security probes, against DISPOSABLE
 * PostgreSQL + Redis + LocalStack S3 and the test-only clamd double behind
 * the real ClamAV adapter. The Redis-outage case additionally needs
 * CHAT_TEST_REDIS_CONTAINER (a disposable container it may stop/start).
 */

const BUCKET = "dhruto-chat-p8-test";
const HUB = randomUUID();
const RECIPIENT = "01398800001";
const REDIS_CONTAINER = process.env.CHAT_TEST_REDIS_CONTAINER;
const pdf = (body: string) => new TextEncoder().encode(`%PDF-1.7\n${body}\n%%EOF\n`);
const sha256 = (data: Uint8Array) => createHash("sha256").update(data).digest("hex");

describe.skipIf(
  !CHAT_TEST_DATABASE_URL || !process.env.CHAT_TEST_REDIS_URL || !process.env.CHAT_TEST_S3_ENDPOINT,
)("Communication Phase 8 — hardening", () => {
  let app: INestApplication;
  let ds: DataSource;
  let s3: S3Client;
  let clamd: FakeClamd;
  const users: Record<string, { id: string; role: UserRole; phone: string; token: string }> = {};
  let thread = "";

  const api = () => request(app.getHttpServer());
  const auth = (who: string) => ({ Authorization: `Bearer ${users[who]?.token ?? "missing"}` });
  const scanSvc = () => app.get(ChatAttachmentScanService);
  const row = async (id: string) =>
    (await ds.query(`SELECT * FROM "chat_attachments" WHERE "id" = $1`, [id]))[0];
  const download = (who: string, id: string) =>
    api().get(`/api/v1/chat/attachments/${id}/download`).set(auth(who));
  const send = (who: string, body: Record<string, unknown>) =>
    api()
      .post(`/api/v1/chat/conversations/${thread}/messages`)
      .set(auth(who))
      .send({ clientMessageId: randomUUID(), ...body });

  async function insertUser(key: string, role: UserRole, phone: string): Promise<string> {
    const [r] = await ds.query(
      `INSERT INTO "users" ("name", "email", "phone", "password_hash", "role") VALUES ($1, $2, $3, 'x', $4) RETURNING "id"`,
      [`P8 ${key}`, `${key}@p8-test.local`, phone, role],
    );
    users[key] = { id: r.id as string, role, phone, token: "" };
    return r.id as string;
  }

  async function upload(data: Uint8Array, name = "f.pdf"): Promise<string> {
    const ticket = await api()
      .post(`/api/v1/chat/conversations/${thread}/attachments`)
      .set(auth("merchant"))
      .send({
        originalFilename: name,
        mimeType: "application/pdf",
        sizeBytes: data.byteLength,
        checksumSha256: sha256(data),
      });
    expect(ticket.status, JSON.stringify(ticket.body)).toBe(201);
    await fetch(ticket.body.data.upload.url, {
      method: "PUT",
      headers: ticket.body.data.upload.headers,
      body: data,
    });
    const id = ticket.body.data.attachment.id as string;
    expect(
      (await api().post(`/api/v1/chat/attachments/${id}/complete`).set(auth("merchant"))).status,
    ).toBe(200);
    return id;
  }

  /** Synthetic backlog row (as migration 0012 leaves pre-existing uploads): object + UPLOADED/PENDING row. */
  async function backlogRow(i: number, scanStatus = "PENDING"): Promise<string> {
    const id = randomUUID();
    const data = pdf(`backlog ${i} ${id}`);
    const key = `chat/${thread}/${id}`;
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: data,
        ContentType: "application/pdf",
      }),
    );
    const checksum = sha256(data);
    await ds.query(
      `INSERT INTO "chat_attachments" ("id", "conversation_id", "uploader_user_id", "storage_key", "original_filename",
         "mime_type", "size_bytes", "checksum_sha256", "status", "uploaded_at", "scan_status", "scanned_at", "scanned_sha256")
       VALUES ($1, $2, $3, $4, $5, 'application/pdf', $6, $7::char(64), 'UPLOADED', now(),
               $8::text::"chat_attachments_scan_status_enum",
               CASE WHEN $8::text = 'CLEAN' THEN now() END, CASE WHEN $8::text = 'CLEAN' THEN $7::char(64) END)`,
      [
        id,
        thread,
        users.merchant.id,
        key,
        `backlog-${i}.pdf`,
        data.byteLength,
        checksum,
        scanStatus,
      ],
    );
    return id;
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
      `INSERT INTO "hubs" ("id", "code", "name", "address") VALUES ($1, 'P8H', 'P8 Hub', 'Dhaka')`,
      [HUB],
    );
    const m = await insertUser("merchant", UserRole.MERCHANT, "01398810001");
    const mB = await insertUser("merchantB", UserRole.MERCHANT, "01398810002");
    const r1 = await insertUser("rider", UserRole.RIDER, "01398810003");
    await insertUser("customer", UserRole.CUSTOMER, RECIPIENT);
    await insertUser("admin", UserRole.ADMIN, "01398810005");
    const [merchantId] = (
      await ds.query(
        `INSERT INTO "merchants" ("user_id", "business_name", "contact_phone", "pickup_address")
         VALUES ($1, 'P8 A', '01398810001', 'Dhaka'), ($2, 'P8 B', '01398810002', 'Dhaka') RETURNING "id"`,
        [m, mB],
      )
    ).map((x: { id: string }) => x.id);
    const [riderId] = (
      await ds.query(`INSERT INTO "riders" ("user_id", "hub_id") VALUES ($1, $2) RETURNING "id"`, [
        r1,
        HUB,
      ])
    ).map((x: { id: string }) => x.id);
    const [parcel] = (
      await ds.query(
        `INSERT INTO "parcels" ("tracking_code", "merchant_id", "recipient_name", "recipient_phone", "raw_address", "current_rider_id", "current_hub_id")
         VALUES ('P8-0001', $1, 'R', $2, 'Dhaka', $3, $4) RETURNING "id"`,
        [merchantId, RECIPIENT, riderId, HUB],
      )
    ).map((x: { id: string }) => x.id);

    clamd = await startFakeClamd();
    process.env.CHAT_CLAMAV_HOST = "127.0.0.1";
    process.env.CHAT_CLAMAV_PORT = String(clamd.port);
    if (process.env.DATABASE_URL !== url)
      throw new Error("Refusing to boot: not the disposable DB");
    app = await NestFactory.create(AppModule, { logger: ["error"] });
    app.setGlobalPrefix("api/v1", { exclude: ["health", "health/(.*)"] });
    await app.listen(0, "127.0.0.1");
    const jwt = app.get(CustomJwtService);
    for (const [key, u] of Object.entries(users)) {
      u.token = jwt.generateAuthTokens({
        id: u.id,
        email: `${key}@p8-test.local`,
        phone: u.phone,
        role: u.role,
      }).accessToken;
    }
    const open = (who: string) =>
      api()
        .post("/api/v1/chat/conversations")
        .set(auth(who))
        .send({ type: ChatConversationType.PARCEL_DELIVERY, parcelId: parcel });
    thread = (await open("merchant")).body.data.id;
    await open("customer");
  }, 240_000);

  afterAll(async () => {
    await app?.close();
    if (ds?.isInitialized) await ds.destroy();
    s3?.destroy();
    await clamd?.close();
  });

  /* ================================================================ */
  describe("fail-closed scanner matrix", () => {
    it("scan timeout: no verdict, retried, file stays unavailable", async () => {
      const id = await upload(pdf("timeout case"));
      await send("merchant", { type: ChatMessageType.FILE, attachmentIds: [id] });
      clamd.setMode("hang");
      const run = await scanSvc().runOnce(new Date(Date.now() + 1000));
      expect(run.retried).toBeGreaterThanOrEqual(1);
      const r = await row(id);
      expect(r.scan_status).toBe("PENDING");
      expect(r.scan_error).toBe("timeout");
      expect((await download("customer", id)).status).toBe(409);
      clamd.setMode("normal");
      await scanSvc().runOnce(new Date(Date.now() + 3600_000)); // after backoff: safe recovery
      expect((await row(id)).scan_status).toBe("CLEAN");
      expect((await download("customer", id)).status).toBe(200);
    });

    it("duplicate concurrent scan jobs never scan or transition one file twice", async () => {
      const ids = await Promise.all([1, 2, 3, 4, 5, 6].map((i) => upload(pdf(`dup ${i}`))));
      const before = clamd.scans();
      const runs = await Promise.all([
        scanSvc().runOnce(),
        scanSvc().runOnce(),
        scanSvc().runOnce(),
      ]);
      const claimed = runs.reduce((sum, r) => sum + r.claimed, 0);
      expect(claimed).toBe(6);
      expect(clamd.scans() - before).toBe(6);
      for (const id of ids) {
        const r = await row(id);
        expect(r.scan_status).toBe("CLEAN");
        expect(r.scan_attempts).toBe(1);
      }
    });

    it("an unconfigured or unreachable scanner never makes files available", async () => {
      const id = await upload(pdf("down case"));
      clamd.setMode("down");
      for (let i = 0; i < 5; i += 1) {
        const run = await scanSvc().runOnce(new Date(Date.now() + i * 3600_000));
        expect(run.claimed).toBe(0);
      }
      const r = await row(id);
      expect(r.scan_status).toBe("PENDING");
      expect(r.scan_attempts).toBe(0); // retry budget untouched during the outage
      clamd.setMode("normal");
      await scanSvc().runOnce();
      expect((await row(id)).scan_status).toBe("CLEAN");
    });

    it.skipIf(!REDIS_CONTAINER)(
      "Redis unavailable: no bypass — pending stays 409, clean stays served, outsiders 404",
      async () => {
        const pending = await upload(pdf("redis down pending"));
        const clean = await upload(pdf("redis down clean"));
        clamd.setMode("normal");
        // Scan only `clean`, leaving `pending` unscanned.
        await ds.query(
          `UPDATE "chat_attachments" SET "scan_next_attempt_at" = now() + interval '1 day' WHERE "id" = $1`,
          [pending],
        );
        await scanSvc().runOnce();
        await send("merchant", { type: ChatMessageType.FILE, attachmentIds: [pending] });
        await send("merchant", { type: ChatMessageType.FILE, attachmentIds: [clean] });
        execFileSync("docker", ["stop", REDIS_CONTAINER as string], { stdio: "ignore" });
        try {
          expect((await download("customer", pending)).status).toBe(409);
          expect((await download("customer", clean)).status).toBe(200);
          expect((await download("merchantB", pending)).status).toBe(404);
        } finally {
          execFileSync("docker", ["start", REDIS_CONTAINER as string], { stdio: "ignore" });
        }
      },
    );
  });

  /* ================================================================ */
  describe("hung Redis (paused, TCP open) does not stall chat REST", () => {
    it.skipIf(!REDIS_CONTAINER)(
      "sends and reads complete within seconds while Redis does not answer",
      async () => {
        execFileSync("docker", ["pause", REDIS_CONTAINER as string], { stdio: "ignore" });
        try {
          const t0 = Date.now();
          const sent = await send("merchant", {
            type: ChatMessageType.TEXT,
            content: "while redis hangs",
          });
          const read = await api()
            .get(`/api/v1/chat/conversations/${thread}/messages?limit=5`)
            .set(auth("customer"));
          const elapsed = Date.now() - t0;
          expect(sent.status).toBe(201);
          expect(read.status).toBe(200);
          // Before the Phase 8 fix both requests hung for > 60 s (cache commands had no timeout).
          expect(elapsed).toBeLessThan(5000);
        } finally {
          execFileSync("docker", ["unpause", REDIS_CONTAINER as string], { stdio: "ignore" });
        }
      },
      30_000,
    );
  });

  /* ================================================================ */
  describe("backlog processing", () => {
    it("processes a synthetic backlog in bounded batches, skips existing verdicts, survives a crashed worker", async () => {
      clamd.setMode("normal");
      const alreadyClean = await backlogRow(-1, "CLEAN");
      const ids: string[] = [];
      for (let i = 0; i < 50; i += 1) ids.push(await backlogRow(i));
      // A worker that crashed mid-batch: 5 rows claimed with a lease, never finished.
      await ds.query(
        `UPDATE "chat_attachments" SET "scan_attempts" = 1, "scan_next_attempt_at" = now() + interval '300 seconds'
          WHERE "id" = ANY($1::uuid[])`,
        [ids.slice(0, 5)],
      );
      const before = clamd.scans();
      const runs = [];
      for (let i = 0; i < 5; i += 1) {
        const r = await scanSvc().runOnce();
        runs.push(r.claimed);
        expect(r.claimed).toBeLessThanOrEqual(20);
      }
      expect(runs.reduce((a, b) => a + b, 0)).toBe(45); // leased rows are not re-claimed early
      const leased = await row(ids[0] as string);
      expect(leased.scan_status).toBe("PENDING");
      // After the lease expires the crashed rows are picked up and finished.
      const after = await scanSvc().runOnce(new Date(Date.now() + 301_000));
      expect(after.claimed).toBe(5);
      expect(clamd.scans() - before).toBe(50);
      const [{ pending }] = await ds.query(
        `SELECT count(*)::int AS pending FROM "chat_attachments" WHERE "id" = ANY($1::uuid[]) AND "scan_status" <> 'CLEAN'`,
        [ids],
      );
      expect(pending).toBe(0);
      const kept = await row(alreadyClean);
      expect(kept.scan_attempts).toBe(0); // existing checksum-bound verdict never rescanned
    }, 120_000);
  });

  /* ================================================================ */
  describe("retention guards", () => {
    it("never purges objects of live messages or under an active escalation", async () => {
      clamd.setMode("normal");
      const live = await upload(pdf("retention live"));
      const held = await upload(pdf("retention escalation hold"));
      await scanSvc().runOnce();
      await send("merchant", { type: ChatMessageType.FILE, attachmentIds: [live] });
      const heldMsg = (
        await send("merchant", { type: ChatMessageType.FILE, attachmentIds: [held] })
      ).body.data.id;
      await api().delete(`/api/v1/chat/messages/${heldMsg}`).set(auth("merchant"));
      await api()
        .put(`/api/v1/chat/admin/conversations/${thread}/escalation`)
        .set(auth("admin"))
        .send({ status: "ESCALATED", note: "Fraud investigation in progress" });
      const res = await app
        .get(ChatAttachmentCleanupService)
        .runOnce(new Date(Date.now() + 30 * 86_400_000));
      expect(res.deletedMessageObjects).toBe(0);
      for (const id of [live, held]) {
        const r = await row(id);
        expect(r.object_purged_at).toBeNull();
        await expect(
          s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: r.storage_key })),
        ).resolves.toBeTruthy();
      }
    });
  });

  /* ================================================================ */
  describe("observability", () => {
    it("reports scanner reachability, signature freshness, backlog and outbox lag without identifiers", async () => {
      clamd.setMode("normal");
      await new Promise((r) => setTimeout(r, 10_100)); // expire the probe cache
      const ok = await api().get("/health/chat");
      expect(ok.status).toBe(200);
      expect(ok.body.data?.scanner ?? ok.body.scanner).toBeTruthy();
      const body = ok.body.data ?? ok.body;
      expect(body.scanner.reachable).toBe(true);
      expect(body.scanner.signatureStale).toBe(false);
      expect(JSON.stringify(body)).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-|chat\//);

      clamd.setMode("stale");
      await new Promise((r) => setTimeout(r, 10_100));
      const stale = (await api().get("/health/chat")).body;
      expect((stale.data ?? stale).scanner.signatureStale).toBe(true);
      expect((stale.data ?? stale).status).toBe("degraded");

      const prom = await api().get("/health/metrics/prometheus");
      expect(prom.status).toBe(200);
      for (const metric of [
        "dhruto_chat_scanner_up",
        "dhruto_chat_scanner_signature_age_seconds",
        "dhruto_chat_attachments_scan_pending",
        "dhruto_chat_attachments_blocked",
        "dhruto_chat_outbox_oldest_pending_seconds",
        "dhruto_chat_socket_connections",
      ]) {
        expect(prom.text).toContain(metric);
      }
      expect(prom.text).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/);
      clamd.setMode("normal");
    }, 60_000);
  });

  /* ================================================================ */
  describe("security probes", () => {
    it("rejects mass assignment of server-owned fields", async () => {
      for (const extra of [
        { senderId: users.customer.id },
        { sequence: "1" },
        { conversationId: randomUUID() },
        { deletedAt: null },
      ]) {
        const res = await send("merchant", {
          type: ChatMessageType.TEXT,
          content: "hello",
          ...extra,
        });
        expect(res.status, JSON.stringify(extra)).toBe(422);
      }
    });

    it("stores markup as inert text (rendering is escaped by React; no HTML is ever produced server-side)", async () => {
      const payload = `<img src=x onerror="alert(1)"><script>alert(2)</script>`;
      const res = await send("merchant", { type: ChatMessageType.TEXT, content: payload });
      expect(res.status).toBe(201);
      expect(res.headers["content-type"]).toMatch(/application\/json/);
      expect(res.body.data.content).toBe(payload);
    });

    it("enforces per-user rate limits (search)", async () => {
      const statuses: number[] = [];
      for (let i = 0; i < 5; i += 1) {
        statuses.push(
          (await api().get(`/api/v1/chat/search?q=hello${i}`).set(auth("customer"))).status,
        );
      }
      expect(statuses.slice(0, 3).every((s) => s === 200)).toBe(true);
      expect(statuses).toContain(429);
      // Another user has an independent budget.
      expect((await api().get(`/api/v1/chat/search?q=hello`).set(auth("merchant"))).status).toBe(
        200,
      );
    });

    it("audit rows cannot be updated; deletion is only possible with direct DB privileges (documented)", async () => {
      await expect(ds.query(`UPDATE "chat_audit_logs" SET "reason" = 'x'`)).rejects.toThrow();
      const [{ c }] = await ds.query(`SELECT count(*)::int AS c FROM "chat_audit_logs"`);
      expect(c).toBeGreaterThan(0);
      // No HTTP route mutates audit history.
      expect((await api().delete(`/api/v1/chat/admin/audit-logs`).set(auth("admin"))).status).toBe(
        404,
      );
      expect(
        (await api().patch(`/api/v1/chat/admin/audit-logs`).set(auth("admin")).send({})).status,
      ).toBe(404);
    });
  });
});
