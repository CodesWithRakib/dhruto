import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

// Runs before every import below (including AppModule / ConfigModule, which
// only fills env keys that are NOT already set). AuthService seeds demo data
// on boot, so the database must be the disposable one before the app exists.
vi.hoisted(() => {
  const url = process.env.CHAT_TEST_DATABASE_URL;
  if (url) {
    process.env.DATABASE_URL = url;
    process.env.OUTBOX_POLL_MS = "600000"; // relay is driven manually for determinism
    // Keep the realtime module (Phase 3) off the developer Redis when a
    // disposable one is provided.
    if (process.env.CHAT_TEST_REDIS_URL) process.env.REDIS_URL = process.env.CHAT_TEST_REDIS_URL;
  }
});

import { randomUUID } from "node:crypto";
import { type AddressInfo } from "node:net";
import { type INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import request from "supertest";
import { io as ioClient, type Socket as ClientSocket } from "socket.io-client";
import { type Namespace } from "socket.io";
import { DataSource } from "typeorm";
import {
  ChatConversationType,
  ChatMessageType,
  DomainEventType,
  OutboxStatus,
} from "@dhruto/contracts";
import { AppModule } from "../src/app.module.js";
import { CustomJwtService } from "../src/auth/jwt/custom-jwt.service.js";
import { UserRole } from "../src/database/entities/index.js";
import { NotificationsGateway } from "../src/notifications/gateways/notifications.gateway.js";
import { OutboxRelayService } from "../src/integrations/outbox-relay.service.js";
import { ChatEventsService } from "../src/chat/services/chat-events.service.js";
import {
  CHAT_TEST_DATABASE_URL,
  assertDisposableDatabaseUrl,
  createChatTestDataSource,
} from "./utils/chat-test-db.js";

/**
 * Communication Phase 2 — REST backend integration + security regression.
 *
 * Boots the real AppModule (guards, pipes, interceptors, outbox relay,
 * notification gateway) against a DISPOSABLE PostgreSQL database supplied via
 * CHAT_TEST_DATABASE_URL. The harness drops the schema and migrates from zero.
 * DATABASE_URL is pointed at that database BEFORE AppModule is imported, and
 * the suite aborts unless the live connection's database name contains
 * "test". Skipped entirely when CHAT_TEST_DATABASE_URL is unset.
 */

interface Fixture {
  id: string;
  role: UserRole;
  phone: string;
  token: string;
}

const HUB_DHK = randomUUID();
const HUB_CTG = randomUUID();
const RECIPIENT_PHONE = "01398765432";

describe.skipIf(!CHAT_TEST_DATABASE_URL)("Communication Phase 2 — chat REST backend", () => {
  let app: INestApplication;
  let ds: DataSource;
  let baseUrl: string;
  const users: Record<string, Fixture> = {};
  let merchantA = "";
  let merchantB = "";
  let rider1 = "";
  let rider2 = "";
  let rider3 = "";
  let parcelA = "";
  let parcelB = "";

  const api = () => request(app.getHttpServer());
  const auth = (who: string) => ({ Authorization: `Bearer ${users[who]?.token ?? "missing"}` });
  const text = (content: string, clientMessageId: string = randomUUID()) => ({
    type: ChatMessageType.TEXT,
    clientMessageId,
    content,
  });

  async function insertUser(key: string, role: UserRole, phone: string): Promise<string> {
    const [row] = await ds.query(
      `INSERT INTO "users" ("name", "email", "phone", "password_hash", "role")
       VALUES ($1, $2, $3, 'x', $4) RETURNING "id"`,
      [`Chat ${key}`, `${key}@chat-test.local`, phone, role],
    );
    users[key] = { id: row.id as string, role, phone, token: "" };
    return row.id as string;
  }

  async function createParcelThread(who: string, parcelId = parcelA) {
    return api()
      .post("/api/v1/chat/conversations")
      .set(auth(who))
      .send({ type: ChatConversationType.PARCEL_DELIVERY, parcelId });
  }

  async function seqOf(conversationId: string): Promise<string> {
    const [row] = await ds.query(
      `SELECT "last_message_sequence"::text AS s FROM "chat_conversations" WHERE "id" = $1`,
      [conversationId],
    );
    return row.s as string;
  }

  beforeAll(async () => {
    const url = CHAT_TEST_DATABASE_URL as string;
    assertDisposableDatabaseUrl(url);

    // 1. Fresh schema + fixtures through the guarded harness.
    ds = createChatTestDataSource(url);
    await ds.initialize();
    await ds.runMigrations({ transaction: "each" });

    await ds.query(
      `INSERT INTO "hubs" ("id", "code", "name", "address") VALUES ($1, 'DHK-T', 'Dhaka Test', 'Dhaka'), ($2, 'CTG-T', 'Ctg Test', 'Chattogram')`,
      [HUB_DHK, HUB_CTG],
    );
    const admin = await insertUser("admin", UserRole.ADMIN, "01310000001");
    const mUserA = await insertUser("merchantA", UserRole.MERCHANT, "01310000002");
    const mUserB = await insertUser("merchantB", UserRole.MERCHANT, "01310000003");
    const rUser1 = await insertUser("rider1", UserRole.RIDER, "01310000004");
    const rUser2 = await insertUser("rider2", UserRole.RIDER, "01310000005");
    const rUser3 = await insertUser("rider3", UserRole.RIDER, "01310000006");
    const hmDhk = await insertUser("hmDhk", UserRole.HUB_MANAGER, "01310000007");
    const hmCtg = await insertUser("hmCtg", UserRole.HUB_MANAGER, "01310000008");
    await insertUser("customer", UserRole.CUSTOMER, RECIPIENT_PHONE);
    await insertUser("customer2", UserRole.CUSTOMER, "01310000010");
    void admin;

    [merchantA, merchantB] = (
      await ds.query(
        `INSERT INTO "merchants" ("user_id", "business_name", "contact_phone", "pickup_address")
         VALUES ($1, 'Shop A', '01310000002', 'Dhaka'), ($2, 'Shop B', '01310000003', 'Dhaka') RETURNING "id"`,
        [mUserA, mUserB],
      )
    ).map((r: { id: string }) => r.id);
    [rider1, rider2, rider3] = (
      await ds.query(
        `INSERT INTO "riders" ("user_id", "hub_id") VALUES ($1, $4), ($2, $5), ($3, $4) RETURNING "id"`,
        [rUser1, rUser2, rUser3, HUB_DHK, HUB_CTG],
      )
    ).map((r: { id: string }) => r.id);
    await ds.query(
      `INSERT INTO "hub_user_assignments" ("user_id", "hub_id") VALUES ($1, $3), ($2, $4)`,
      [hmDhk, hmCtg, HUB_DHK, HUB_CTG],
    );
    [parcelA, parcelB] = (
      await ds.query(
        `INSERT INTO "parcels" ("tracking_code", "merchant_id", "recipient_name", "recipient_phone", "raw_address", "current_rider_id", "current_hub_id")
         VALUES ('CHT-A-1', $1, 'Recipient', $3, 'Dhaka', $4, $5),
                ('CHT-B-1', $2, 'Other', '01799999999', 'Dhaka', NULL, $5) RETURNING "id"`,
        // Phase 5: recipient identity is exact phone equality (same rule as the
        // parcel module), so the parcel stores the customer's phone verbatim.
        [merchantA, merchantB, RECIPIENT_PHONE, rider1, HUB_DHK],
      )
    ).map((r: { id: string }) => r.id);

    // 2. The app must target the disposable DB (set in vi.hoisted above).
    if (process.env.DATABASE_URL !== url) {
      throw new Error("Refusing to boot: DATABASE_URL does not point at CHAT_TEST_DATABASE_URL");
    }
    // NestFactory (not @nestjs/testing): in this install TestingModule cannot
    // resolve the core Reflector provider (pre-existing; see PHASE-2-REPORT).
    app = await NestFactory.create(AppModule, { logger: ["error"] });
    app.setGlobalPrefix("api/v1");
    await app.listen(0, "127.0.0.1");

    const appDs = app.get(DataSource);
    const dbName = (await appDs.query(`SELECT current_database() AS db`))[0].db as string;
    if (!/test/i.test(dbName)) {
      await app.close();
      throw new Error(`Refusing to run: application connected to non-test database "${dbName}"`);
    }
    baseUrl = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;

    const jwt = app.get(CustomJwtService);
    for (const [key, u] of Object.entries(users)) {
      u.token = jwt.generateAuthTokens({
        id: u.id,
        email: `${key}@chat-test.local`,
        phone: u.phone,
        role: u.role,
      }).accessToken;
    }
  }, 240_000);

  afterAll(async () => {
    await app?.close();
    if (ds?.isInitialized) await ds.destroy();
  });

  /* ================================================================ */
  /* Conversations and tenant isolation                               */
  /* ================================================================ */

  describe("conversations", () => {
    it("creates a parcel thread with scope-derived participants and is idempotent", async () => {
      const first = await createParcelThread("merchantA");
      expect(first.status).toBe(201);
      const conversation = first.body.data;
      expect(conversation.type).toBe("PARCEL_DELIVERY");
      expect(conversation.merchantId).toBe(merchantA);
      const ids = conversation.participants.map((p: { userId: string }) => p.userId).sort();
      expect(ids).toEqual([users.merchantA?.id, users.rider1?.id, users.customer?.id].sort());
      // No phone/email in participant payloads.
      expect(JSON.stringify(conversation.participants)).not.toContain(RECIPIENT_PHONE);

      const again = await createParcelThread("rider1");
      expect(again.status).toBe(200);
      expect(again.body.data.id).toBe(conversation.id);
    });

    it("concurrent get-or-create yields exactly one conversation", async () => {
      const results = await Promise.all(
        Array.from({ length: 6 }, () => createParcelThread("customer")),
      );
      const ids = new Set(results.map((r) => r.body.data.id));
      expect(ids.size).toBe(1);
      const [{ count }] = await ds.query(
        `SELECT count(*)::int AS count FROM "chat_conversations" WHERE "parcel_id" = $1 AND "type" = 'PARCEL_DELIVERY'`,
        [parcelA],
      );
      expect(count).toBe(1);
    });

    it("merchant isolation: another merchant cannot create, read or write the thread", async () => {
      const { body } = await createParcelThread("merchantA");
      const id = body.data.id;
      expect((await createParcelThread("merchantB")).status).toBe(422);
      // Symmetric: merchant A cannot open B's parcel thread; B can.
      expect((await createParcelThread("merchantA", parcelB)).status).toBe(422);
      expect((await createParcelThread("merchantB", parcelB)).status).toBe(201);
      // A rider assigned elsewhere (CTG hub, not this parcel) cannot open it.
      expect(rider2).not.toBe(rider1);
      expect((await createParcelThread("rider2")).status).toBe(422);
      expect(
        (await api().get(`/api/v1/chat/conversations/${id}`).set(auth("merchantB"))).status,
      ).toBe(404);
      const send = await api()
        .post(`/api/v1/chat/conversations/${id}/messages`)
        .set(auth("merchantB"))
        .send(text("hi"));
      expect(send.status).toBe(404);
      expect(send.body.errorCode).toBe("CHAT_CONVERSATION_NOT_FOUND");
    });

    it("customer isolation: only the recipient customer gets in", async () => {
      const { body } = await createParcelThread("merchantA");
      expect(
        (await api().get(`/api/v1/chat/conversations/${body.data.id}`).set(auth("customer")))
          .status,
      ).toBe(200);
      expect(
        (await api().get(`/api/v1/chat/conversations/${body.data.id}`).set(auth("customer2")))
          .status,
      ).toBe(404);
      expect((await createParcelThread("customer2")).status).toBe(422);
    });

    it("rejects unknown body keys and invalid types (strict contracts)", async () => {
      const res = await api()
        .post("/api/v1/chat/conversations")
        .set(auth("merchantA"))
        .send({ type: "PARCEL_DELIVERY", parcelId: parcelA, merchantId: merchantB });
      expect(res.status).toBe(422);
      expect(res.body.errorCode).toBe("VALIDATION_ERROR");
    });

    it("merchant desk is one per merchant and the merchant id is server-derived", async () => {
      const a = await api()
        .post("/api/v1/chat/conversations")
        .set(auth("merchantA"))
        .send({ type: "MERCHANT_DESK" });
      const b = await api()
        .post("/api/v1/chat/conversations")
        .set(auth("merchantA"))
        .send({ type: "MERCHANT_DESK" });
      expect(a.status).toBe(201);
      expect(b.status).toBe(200);
      expect(b.body.data.id).toBe(a.body.data.id);
      expect(a.body.data.merchantId).toBe(merchantA);
      const spoof = await api()
        .post("/api/v1/chat/conversations")
        .set(auth("merchantA"))
        .send({ type: "MERCHANT_DESK", merchantId: merchantB });
      expect(spoof.status).toBe(422);
    });

    it("lists only the caller's conversations with unread counts and keyset cursors", async () => {
      const list = await api().get("/api/v1/chat/conversations?limit=1").set(auth("merchantA"));
      expect(list.status).toBe(200);
      expect(list.body.data.items).toHaveLength(1);
      expect(list.body.data.hasMore).toBe(true);
      const next = await api()
        .get(`/api/v1/chat/conversations?limit=1&cursor=${list.body.data.nextCursor}`)
        .set(auth("merchantA"));
      expect(next.status).toBe(200);
      expect(next.body.data.items[0].id).not.toBe(list.body.data.items[0].id);

      const merchantBList = await api().get("/api/v1/chat/conversations").set(auth("merchantB"));
      const visible = merchantBList.body.data.items.map(
        (c: { merchantId: string | null }) => c.merchantId,
      );
      expect(visible).not.toContain(merchantA);

      const bad = await api()
        .get("/api/v1/chat/conversations?cursor=garbage")
        .set(auth("merchantA"));
      expect(bad.status).toBe(422);
    });
  });

  /* ================================================================ */
  /* Participants                                                      */
  /* ================================================================ */

  describe("participants", () => {
    it("hub manager group: adds a same-hub rider, rejects other-hub rider and merchants", async () => {
      const created = await api()
        .post("/api/v1/chat/conversations")
        .set(auth("hmDhk"))
        .send({ type: "GROUP", title: "Dhaka riders", participantUserIds: [users.rider1?.id] });
      expect(created.status).toBe(201);
      const id = created.body.data.id;

      const ok = await api()
        .post(`/api/v1/chat/conversations/${id}/participants`)
        .set(auth("hmDhk"))
        .send({ userId: users.rider3?.id });
      expect(ok.status).toBe(201);
      expect(ok.body.data.map((p: { userId: string }) => p.userId)).toContain(users.rider3?.id);

      const otherHub = await api()
        .post(`/api/v1/chat/conversations/${id}/participants`)
        .set(auth("hmDhk"))
        .send({ userId: users.rider2?.id });
      expect(otherHub.status).toBe(422);
      expect(otherHub.body.errorCode).toBe("CHAT_PARTICIPANT_INELIGIBLE");

      const merchant = await api()
        .post(`/api/v1/chat/conversations/${id}/participants`)
        .set(auth("hmDhk"))
        .send({ userId: users.merchantA?.id });
      expect(merchant.status).toBe(422);

      // A plain member cannot manage participants.
      const byMember = await api()
        .post(`/api/v1/chat/conversations/${id}/participants`)
        .set(auth("rider1"))
        .send({ userId: users.rider3?.id });
      expect(byMember.status).toBe(403);

      // Members leave themselves; owner removes others; removal is audited.
      expect(
        (
          await api()
            .delete(`/api/v1/chat/conversations/${id}/participants/${users.rider3?.id}`)
            .set(auth("rider3"))
            .send({})
        ).body.data.status,
      ).toBe("LEFT");
      expect(
        (
          await api()
            .delete(`/api/v1/chat/conversations/${id}/participants/${users.rider1?.id}`)
            .set(auth("hmDhk"))
            .send({})
        ).body.data.status,
      ).toBe("REMOVED");
      expect((await api().get(`/api/v1/chat/conversations/${id}`).set(auth("rider1"))).status).toBe(
        404,
      );
      const audits = await ds.query(
        `SELECT count(*)::int AS count FROM "chat_audit_logs" WHERE "conversation_id" = $1 AND "action" = 'PARTICIPANT_REMOVED'`,
        [id],
      );
      expect(audits[0].count).toBe(2);
    });

    it("merchants and customers cannot open DIRECT or GROUP conversations", async () => {
      for (const who of ["merchantA", "customer"]) {
        const res = await api()
          .post("/api/v1/chat/conversations")
          .set(auth(who))
          .send({ type: "DIRECT", participantUserId: users.rider1?.id });
        expect(res.status).toBe(403);
      }
    });
  });

  /* ================================================================ */
  /* Messages, ordering, idempotency                                   */
  /* ================================================================ */

  describe("messages", () => {
    let conversationId = "";
    beforeAll(async () => {
      conversationId = (await createParcelThread("merchantA")).body.data.id;
    });

    it("sends with a server-assigned sequence and sender", async () => {
      const before = BigInt(await seqOf(conversationId));
      const res = await api()
        .post(`/api/v1/chat/conversations/${conversationId}/messages`)
        .set(auth("merchantA"))
        .send(text("Parcel packed"));
      expect(res.status).toBe(201);
      expect(res.body.data.senderId).toBe(users.merchantA?.id);
      expect(res.body.data.sequence).toBe(String(before + 1n));
    });

    it("rejects client-supplied sender/sequence and empty content", async () => {
      const smuggled = await api()
        .post(`/api/v1/chat/conversations/${conversationId}/messages`)
        .set(auth("merchantA"))
        .send({ ...text("hi"), senderId: users.rider1?.id, sequence: "999" });
      expect(smuggled.status).toBe(422);
      const empty = await api()
        .post(`/api/v1/chat/conversations/${conversationId}/messages`)
        .set(auth("merchantA"))
        .send(text("   "));
      expect(empty.status).toBe(422);
    });

    it("a duplicate request returns the canonical message without consuming a sequence", async () => {
      const clientId = randomUUID();
      const first = await api()
        .post(`/api/v1/chat/conversations/${conversationId}/messages`)
        .set(auth("rider1"))
        .send(text("On my way", clientId));
      const seqAfterFirst = await seqOf(conversationId);
      const retry = await api()
        .post(`/api/v1/chat/conversations/${conversationId}/messages`)
        .set(auth("rider1"))
        .send(text("On my way", clientId));
      expect(first.status).toBe(201);
      expect(retry.status).toBe(200);
      expect(retry.body.data.id).toBe(first.body.data.id);
      expect(await seqOf(conversationId)).toBe(seqAfterFirst);
    });

    it("concurrent retries of one clientMessageId persist exactly one message and one outbox event", async () => {
      const clientId = randomUUID();
      const before = BigInt(await seqOf(conversationId));
      const results = await Promise.all(
        Array.from({ length: 10 }, () =>
          api()
            .post(`/api/v1/chat/conversations/${conversationId}/messages`)
            .set(auth("customer"))
            .send(text("Where is it?", clientId)),
        ),
      );
      expect(results.every((r) => r.status === 200 || r.status === 201)).toBe(true);
      expect(results.filter((r) => r.status === 201)).toHaveLength(1);
      expect(new Set(results.map((r) => r.body.data.id)).size).toBe(1);
      expect(BigInt(await seqOf(conversationId))).toBe(before + 1n);
      const [{ count }] = await ds.query(
        `SELECT count(*)::int AS count FROM "event_outbox" WHERE "event_type" = $1 AND "payload"->>'clientMessageId' = $2`,
        [DomainEventType.CHAT_MESSAGE_CREATED, clientId],
      );
      expect(count).toBe(1);
    });

    it("concurrent distinct senders get gap-free, unique sequences", async () => {
      const before = BigInt(await seqOf(conversationId));
      const senders = ["merchantA", "rider1", "customer"];
      const results = await Promise.all(
        Array.from({ length: 24 }, (_, i) =>
          api()
            .post(`/api/v1/chat/conversations/${conversationId}/messages`)
            .set(auth(senders[i % 3] as string))
            .send(text(`burst ${i}`)),
        ),
      );
      expect(results.every((r) => r.status === 201)).toBe(true);
      const sequences = results
        .map((r) => BigInt(r.body.data.sequence))
        .sort((a, b) => (a < b ? -1 : 1));
      expect(sequences).toEqual(Array.from({ length: 24 }, (_, i) => before + BigInt(i) + 1n));
    });

    it("history is keyset paginated, chronological, bounded and carries sender info", async () => {
      const page = await api()
        .get(`/api/v1/chat/conversations/${conversationId}/messages?limit=5`)
        .set(auth("merchantA"));
      expect(page.status).toBe(200);
      const items = page.body.data.items as Array<{ sequence: string }>;
      expect(items).toHaveLength(5);
      const seqs = items.map((m) => BigInt(m.sequence));
      expect([...seqs].sort((a, b) => (a < b ? -1 : 1))).toEqual(seqs); // ascending
      expect(page.body.data.hasMore).toBe(true);
      expect(page.body.data.senders.length).toBeGreaterThan(0);

      const older = await api()
        .get(
          `/api/v1/chat/conversations/${conversationId}/messages?limit=5&beforeSequence=${page.body.data.nextBeforeSequence}`,
        )
        .set(auth("merchantA"));
      const olderMax = BigInt(older.body.data.items.at(-1).sequence);
      expect(olderMax < (seqs[0] as bigint)).toBe(true);

      const forward = await api()
        .get(`/api/v1/chat/conversations/${conversationId}/messages?afterSequence=1&limit=3`)
        .set(auth("merchantA"));
      expect(forward.body.data.items.map((m: { sequence: string }) => m.sequence)).toEqual([
        "2",
        "3",
        "4",
      ]);

      expect(
        (
          await api()
            .get(`/api/v1/chat/conversations/${conversationId}/messages?limit=101`)
            .set(auth("merchantA"))
        ).status,
      ).toBe(422);
      expect(
        (
          await api()
            .get(`/api/v1/chat/conversations/${conversationId}/messages`)
            .set(auth("rider2"))
        ).status,
      ).toBe(404);
    });

    it("rejects a reply target from another conversation", async () => {
      const other = (
        await api()
          .post("/api/v1/chat/conversations")
          .set(auth("merchantA"))
          .send({ type: "MERCHANT_DESK" })
      ).body.data.id;
      const foreign = await api()
        .post(`/api/v1/chat/conversations/${other}/messages`)
        .set(auth("merchantA"))
        .send(text("desk msg"));
      const res = await api()
        .post(`/api/v1/chat/conversations/${conversationId}/messages`)
        .set(auth("merchantA"))
        .send({ ...text("reply"), replyToMessageId: foreign.body.data.id });
      expect(res.status).toBe(422);
      expect(res.body.errorCode).toBe("CHAT_REPLY_INVALID");
    });

    it("edit: sender only, history preserved, preview refreshed", async () => {
      const sent = await api()
        .post(`/api/v1/chat/conversations/${conversationId}/messages`)
        .set(auth("rider1"))
        .send(text("ETA 10 min"));
      const id = sent.body.data.id;
      expect(
        (
          await api()
            .patch(`/api/v1/chat/messages/${id}`)
            .set(auth("merchantA"))
            .send({ content: "hacked" })
        ).status,
      ).toBe(403);
      const edited = await api()
        .patch(`/api/v1/chat/messages/${id}`)
        .set(auth("rider1"))
        .send({ content: "ETA 5 min" });
      expect(edited.status).toBe(200);
      expect(edited.body.data.content).toBe("ETA 5 min");
      expect(edited.body.data.editedAt).not.toBeNull();
      const [edit] = await ds.query(
        `SELECT "previous_content" FROM "chat_message_edits" WHERE "message_id" = $1`,
        [id],
      );
      expect(edit.previous_content).toBe("ETA 10 min");
      const [conv] = await ds.query(
        `SELECT "last_message_preview" FROM "chat_conversations" WHERE "id" = $1`,
        [conversationId],
      );
      expect(conv.last_message_preview).toBe("ETA 5 min");
    });

    it("delete: soft, content hidden from everyone, evidence kept for moderators, sequence intact", async () => {
      const sent = await api()
        .post(`/api/v1/chat/conversations/${conversationId}/messages`)
        .set(auth("customer"))
        .send(text("my secret address"));
      const id = sent.body.data.id;
      expect((await api().delete(`/api/v1/chat/messages/${id}`).set(auth("rider1"))).status).toBe(
        403,
      );
      const del = await api().delete(`/api/v1/chat/messages/${id}`).set(auth("customer"));
      expect(del.status).toBe(200);
      expect(del.body.data.deletedAt).not.toBeNull();
      const seen = await api().get(`/api/v1/chat/messages/${id}`).set(auth("merchantA"));
      expect(seen.body.data.content).toBeNull();
      expect(seen.body.data.sequence).toBe(sent.body.data.sequence);
      const [row] = await ds.query(`SELECT "content" FROM "chat_messages" WHERE "id" = $1`, [id]);
      expect(row.content).toBeNull();
      const [evidence] = await ds.query(
        `SELECT "previous_content" FROM "chat_message_edits" WHERE "message_id" = $1`,
        [id],
      );
      expect(evidence.previous_content).toBe("my secret address");
    });

    it("reactions: idempotent add, remove, member-only", async () => {
      const sent = await api()
        .post(`/api/v1/chat/conversations/${conversationId}/messages`)
        .set(auth("merchantA"))
        .send(text("Delivered?"));
      const id = sent.body.data.id;
      const add = () =>
        api()
          .post(`/api/v1/chat/messages/${id}/reactions`)
          .set(auth("customer"))
          .send({ reaction: "👍" });
      expect((await add()).status).toBe(200);
      const twice = await add();
      expect(twice.body.data.reactions).toEqual([{ reaction: "👍", count: 1, reactedByMe: true }]);
      expect(
        (
          await api()
            .post(`/api/v1/chat/messages/${id}/reactions`)
            .set(auth("merchantB"))
            .send({ reaction: "👍" })
        ).status,
      ).toBe(404);
      expect(
        (
          await api()
            .post(`/api/v1/chat/messages/${id}/reactions`)
            .set(auth("customer"))
            .send({ reaction: "<b>" })
        ).status,
      ).toBe(422);
      const removed = await api()
        .delete(`/api/v1/chat/messages/${id}/reactions/${encodeURIComponent("👍")}`)
        .set(auth("customer"));
      expect(removed.body.data.reactions).toEqual([]);
    });

    it("read / delivered cursors are monotonic, bounded and drive unread counts", async () => {
      // Sending advances the sender's own cursors, so start from the reader's
      // current position and create unread messages from someone else.
      const startRead = BigInt(
        (await api().get(`/api/v1/chat/conversations/${conversationId}`).set(auth("customer"))).body
          .data.myParticipation.lastReadSequence,
      );
      for (let i = 0; i < 3; i += 1) {
        await api()
          .post(`/api/v1/chat/conversations/${conversationId}/messages`)
          .set(auth("merchantA"))
          .send(text(`unread ${i}`));
      }
      const head = await seqOf(conversationId);
      const detail = await api()
        .get(`/api/v1/chat/conversations/${conversationId}`)
        .set(auth("customer"));
      expect(detail.body.data.unreadCount).toBe(Number(BigInt(head) - startRead));

      const delivered = await api()
        .post(`/api/v1/chat/conversations/${conversationId}/delivered`)
        .set(auth("customer"))
        .send({ lastDeliveredSequence: head });
      expect(delivered.status).toBe(200);
      expect(delivered.body.data.lastDeliveredSequence).toBe(head);
      expect(delivered.body.data.lastReadSequence).toBe(String(startRead)); // delivered does not imply read

      const partial = String(BigInt(head) - 1n);
      const read = await api()
        .post(`/api/v1/chat/conversations/${conversationId}/read`)
        .set(auth("customer"))
        .send({ lastReadSequence: partial });
      expect(read.body.data.lastReadSequence).toBe(partial);
      expect(read.body.data.unreadCount).toBe(1);

      const backwards = await api()
        .post(`/api/v1/chat/conversations/${conversationId}/read`)
        .set(auth("customer"))
        .send({ lastReadSequence: "1" });
      expect(backwards.status).toBe(200);
      expect(backwards.body.data.lastReadSequence).toBe(partial); // never moves backwards
      const backwardsDelivered = await api()
        .post(`/api/v1/chat/conversations/${conversationId}/delivered`)
        .set(auth("customer"))
        .send({ lastDeliveredSequence: "1" });
      expect(backwardsDelivered.body.data.lastDeliveredSequence).toBe(head);

      // Only cursor advances emit events (the two backwards calls emitted nothing).
      const [{ reads }] = await ds.query(
        `SELECT count(*)::int AS reads FROM "event_outbox" WHERE "event_type" = $1 AND "payload"->>'conversationId' = $2 AND "payload"->>'userId' = $3`,
        [DomainEventType.CHAT_MESSAGE_READ, conversationId, users.customer?.id],
      );
      expect(reads).toBe(1);

      const beyond = await api()
        .post(`/api/v1/chat/conversations/${conversationId}/read`)
        .set(auth("customer"))
        .send({ lastReadSequence: String(BigInt(head) + 100n) });
      expect(beyond.status).toBe(422);
      expect(beyond.body.errorCode).toBe("CHAT_INVALID_SEQUENCE");

      const outsider = await api()
        .post(`/api/v1/chat/conversations/${conversationId}/read`)
        .set(auth("rider2"))
        .send({ lastReadSequence: "1" });
      expect(outsider.status).toBe(404);

      const [{ count }] = await ds.query(
        `SELECT count(*)::int AS count FROM "chat_participants" WHERE "conversation_id" = $1`,
        [conversationId],
      );
      expect(count).toBeGreaterThan(0); // cursors live on participants; no receipt table exists
    });

    it("pins: owner/moderator capability required; reports: once per user", async () => {
      const sent = await api()
        .post(`/api/v1/chat/conversations/${conversationId}/messages`)
        .set(auth("rider1"))
        .send(text("rude words"));
      const id = sent.body.data.id;
      expect(
        (
          await api()
            .post(`/api/v1/chat/conversations/${conversationId}/pins`)
            .set(auth("customer"))
            .send({ messageId: id })
        ).status,
      ).toBe(403);

      const report = () =>
        api()
          .post(`/api/v1/chat/messages/${id}/reports`)
          .set(auth("customer"))
          .send({ reason: "ABUSE" });
      expect((await report()).status).toBe(201);
      const dup = await report();
      expect(dup.status).toBe(409);
      expect(dup.body.errorCode).toBe("CHAT_DUPLICATE_REPORT");
      expect(
        (
          await api()
            .post(`/api/v1/chat/messages/${id}/reports`)
            .set(auth("rider1"))
            .send({ reason: "SPAM" })
        ).status,
      ).toBe(403);
    });

    it("rider reassignment revokes the old rider immediately and admits the new one", async () => {
      await ds.query(`UPDATE "parcels" SET "current_rider_id" = $1 WHERE "id" = $2`, [
        rider3,
        parcelA,
      ]);
      try {
        expect(
          (await api().get(`/api/v1/chat/conversations/${conversationId}`).set(auth("rider1")))
            .status,
        ).toBe(404);
        const send = await api()
          .post(`/api/v1/chat/conversations/${conversationId}/messages`)
          .set(auth("rider1"))
          .send(text("still here?"));
        expect(send.status).toBe(404);
        const joined = await createParcelThread("rider3");
        expect(joined.status).toBe(200);
        expect(joined.body.data.id).toBe(conversationId);
        expect(
          (await api().get(`/api/v1/chat/conversations/${conversationId}`).set(auth("rider3")))
            .status,
        ).toBe(200);
      } finally {
        await ds.query(`UPDATE "parcels" SET "current_rider_id" = $1 WHERE "id" = $2`, [
          rider1,
          parcelA,
        ]);
        // Phase 5: rider3's get-or-create reconciled membership, so rider1's
        // row is now REMOVED by the workflow. Assigned back, rider1 is
        // re-admitted through get-or-create (workflow removals only).
        expect((await createParcelThread("rider1")).status).toBe(200);
      }
    });

    it("search returns only the caller's accessible messages", async () => {
      await api()
        .post(`/api/v1/chat/conversations/${conversationId}/messages`)
        .set(auth("merchantA"))
        .send(text("zebracrossing landmark"));
      const mine = await api().get(`/api/v1/chat/search?q=zebracrossing`).set(auth("customer"));
      expect(mine.status).toBe(200);
      expect(mine.body.data.items.length).toBe(1);
      expect(mine.body.data.items[0].conversationId).toBe(conversationId);
      const theirs = await api().get(`/api/v1/chat/search?q=zebracrossing`).set(auth("merchantB"));
      expect(theirs.body.data.items).toEqual([]);
      expect((await api().get(`/api/v1/chat/search?q=z`).set(auth("customer"))).status).toBe(422);
    });
  });

  /* ================================================================ */
  /* Outbox                                                            */
  /* ================================================================ */

  describe("transactional outbox", () => {
    it("events carry ids only and are processable by the existing relay", async () => {
      const conversationId = (await createParcelThread("merchantA")).body.data.id;
      const marker = `outbox-secret-${randomUUID()}`;
      const sent = await api()
        .post(`/api/v1/chat/conversations/${conversationId}/messages`)
        .set(auth("merchantA"))
        .send(text(marker));
      const [event] = await ds.query(
        `SELECT "payload", "aggregate_type" FROM "event_outbox" WHERE "payload"->>'messageId' = $1`,
        [sent.body.data.id],
      );
      expect(event.aggregate_type).toBe("chat_conversation");
      expect(JSON.stringify(event.payload)).not.toContain(marker);

      const relay = app.get(OutboxRelayService);
      for (let i = 0; i < 20; i += 1) {
        const { claimed } = await relay.pollOnce(100);
        if (claimed === 0) break;
      }
      const stuck = await ds.query(
        `SELECT "event_type", "status", "last_error" FROM "event_outbox" WHERE "event_type" LIKE 'chat.%' AND "status" <> $1`,
        [OutboxStatus.PUBLISHED],
      );
      expect(stuck).toEqual([]);
    });

    it("a failure while writing the event rolls back the message and the sequence", async () => {
      const conversationId = (await createParcelThread("merchantA")).body.data.id;
      const before = await seqOf(conversationId);
      const clientId = randomUUID();
      const spy = vi
        .spyOn(app.get(ChatEventsService), "append")
        .mockRejectedValueOnce(new Error("outbox down"));
      try {
        const res = await api()
          .post(`/api/v1/chat/conversations/${conversationId}/messages`)
          .set(auth("merchantA"))
          .send(text("never", clientId));
        expect(res.status).toBe(500);
      } finally {
        spy.mockRestore();
      }
      expect(await seqOf(conversationId)).toBe(before);
      const rows = await ds.query(`SELECT 1 FROM "chat_messages" WHERE "client_message_id" = $1`, [
        clientId,
      ]);
      expect(rows).toHaveLength(0);
      const events = await ds.query(
        `SELECT 1 FROM "event_outbox" WHERE "payload"->>'clientMessageId' = $1`,
        [clientId],
      );
      expect(events).toHaveLength(0);

      // The same clientMessageId then succeeds normally.
      const retry = await api()
        .post(`/api/v1/chat/conversations/${conversationId}/messages`)
        .set(auth("merchantA"))
        .send(text("now", clientId));
      expect(retry.status).toBe(201);
    });
  });

  /* ================================================================ */
  /* Staff / admin boundaries                                          */
  /* ================================================================ */

  describe("staff access", () => {
    let conversationId = "";
    beforeAll(async () => {
      conversationId = (await createParcelThread("merchantA")).body.data.id;
    });

    it("ADMIN has no implicit content access through participant routes", async () => {
      expect(
        (await api().get(`/api/v1/chat/conversations/${conversationId}`).set(auth("admin"))).status,
      ).toBe(404);
      expect(
        (
          await api()
            .get(`/api/v1/chat/conversations/${conversationId}/messages`)
            .set(auth("admin"))
        ).status,
      ).toBe(404);
    });

    it("staff view requires a reason and is audited; hub managers lack view-any", async () => {
      expect(
        (await api().get(`/api/v1/chat/admin/conversations/${conversationId}`).set(auth("admin")))
          .status,
      ).toBe(422);
      const reason = "Customer complaint ticket #4411";
      const view = await api()
        .get(`/api/v1/chat/admin/conversations/${conversationId}/messages`)
        .query({ reason })
        .set(auth("admin"));
      expect(view.status).toBe(200);
      const [audit] = await ds.query(
        `SELECT "reason", "actor_role" FROM "chat_audit_logs" WHERE "conversation_id" = $1 AND "action" = 'ADMIN_CONVERSATION_VIEWED' ORDER BY "createdAt" DESC LIMIT 1`,
        [conversationId],
      );
      expect(audit.reason).toBe(reason);
      expect(audit.actor_role).toBe("ADMIN");

      expect(
        (
          await api()
            .get(`/api/v1/chat/admin/conversations/${conversationId}`)
            .query({ reason })
            .set(auth("hmDhk"))
        ).status,
      ).toBe(404);
      expect((await api().get(`/api/v1/chat/admin/conversations`).set(auth("hmDhk"))).status).toBe(
        403,
      );
      expect(
        (await api().get(`/api/v1/chat/admin/conversations`).set(auth("merchantA"))).status,
      ).toBe(403);
    });

    it("platform listing returns metadata only and is audited", async () => {
      const list = await api()
        .get(`/api/v1/chat/admin/conversations?type=PARCEL_DELIVERY`)
        .set(auth("admin"));
      expect(list.status).toBe(200);
      expect(list.body.data.items[0]).not.toHaveProperty("lastMessage");
      const [{ count }] = await ds.query(
        `SELECT count(*)::int AS count FROM "chat_audit_logs" WHERE "action" = 'ADMIN_CONVERSATIONS_LISTED'`,
      );
      expect(count).toBeGreaterThan(0);
    });

    it("intervention makes the admin a visible moderator with a system message", async () => {
      const res = await api()
        .post(`/api/v1/chat/admin/conversations/${conversationId}/intervene`)
        .set(auth("admin"))
        .send({ reason: "Escalated delivery dispute" });
      expect(res.status).toBe(200);
      expect(res.body.data.myParticipation.role).toBe("MODERATOR");
      const history = await api()
        .get(`/api/v1/chat/conversations/${conversationId}/messages`)
        .set(auth("customer"));
      const last = history.body.data.items.at(-1);
      expect(last.type).toBe("SYSTEM_EVENT");
      expect(last.metadata.eventKey).toBe("chat.staff_joined");
      const [{ count }] = await ds.query(
        `SELECT count(*)::int AS count FROM "chat_audit_logs" WHERE "conversation_id" = $1 AND "action" = 'ADMIN_INTERVENTION'`,
        [conversationId],
      );
      expect(count).toBe(1);
    });

    it("hub isolation: lock needs scoped moderation + reason; other hub's manager is denied", async () => {
      expect(
        (
          await api()
            .post(`/api/v1/chat/conversations/${conversationId}/lock`)
            .set(auth("hmCtg"))
            .send({ reason: "Abuse investigation" })
        ).status,
      ).toBe(404);
      expect(
        (
          await api()
            .post(`/api/v1/chat/conversations/${conversationId}/lock`)
            .set(auth("hmDhk"))
            .send({})
        ).status,
      ).toBe(422);
      const locked = await api()
        .post(`/api/v1/chat/conversations/${conversationId}/lock`)
        .set(auth("hmDhk"))
        .send({ reason: "Abuse investigation" });
      expect(locked.status).toBe(200);
      expect(locked.body.data.status).toBe("LOCKED");

      const blocked = await api()
        .post(`/api/v1/chat/conversations/${conversationId}/messages`)
        .set(auth("merchantA"))
        .send(text("hello?"));
      expect(blocked.status).toBe(409);
      expect(blocked.body.errorCode).toBe("CHAT_CONVERSATION_NOT_WRITABLE");
      // Participants (even owners/moderators) cannot unlock without staff permission.
      expect(
        (
          await api()
            .post(`/api/v1/chat/conversations/${conversationId}/reopen`)
            .set(auth("admin"))
            .send({})
        ).status,
      ).toBe(409);
      expect(
        (
          await api()
            .post(`/api/v1/chat/conversations/${conversationId}/unlock`)
            .set(auth("hmDhk"))
            .send({ reason: "Investigation complete" })
        ).status,
      ).toBe(200);
    });

    it("moderator removal is audited and works for scoped hub staff", async () => {
      const sent = await api()
        .post(`/api/v1/chat/conversations/${conversationId}/messages`)
        .set(auth("customer"))
        .send(text("offensive"));
      expect(
        (
          await api()
            .post(`/api/v1/chat/messages/${sent.body.data.id}/remove`)
            .set(auth("hmCtg"))
            .send({ reason: "Offensive language" })
        ).status,
      ).toBe(404);
      const removed = await api()
        .post(`/api/v1/chat/messages/${sent.body.data.id}/remove`)
        .set(auth("hmDhk"))
        .send({ reason: "Offensive language" });
      expect(removed.status).toBe(200);
      expect(removed.body.data.content).toBeNull();
      const [audit] = await ds.query(
        `SELECT "reason" FROM "chat_audit_logs" WHERE "target_id" = $1 AND "action" = 'MESSAGE_REMOVED_BY_MODERATOR'`,
        [sent.body.data.id],
      );
      expect(audit.reason).toBe("Offensive language");
    });

    it("internal notes never reach participant endpoints and are staff-scoped", async () => {
      const note = await api()
        .post(`/api/v1/chat/admin/conversations/${conversationId}/notes`)
        .set(auth("hmDhk"))
        .send({ body: "Customer is VIP-SECRET-NOTE" });
      expect(note.status).toBe(201);
      expect(
        (
          await api()
            .get(`/api/v1/chat/admin/conversations/${conversationId}/notes`)
            .set(auth("hmCtg"))
        ).status,
      ).toBe(404);
      expect(
        (
          await api()
            .get(`/api/v1/chat/admin/conversations/${conversationId}/notes`)
            .set(auth("merchantA"))
        ).status,
      ).toBe(403);
      expect(
        (
          await api()
            .get(`/api/v1/chat/admin/conversations/${conversationId}/notes`)
            .set(auth("admin"))
        ).body.data,
      ).toHaveLength(1);

      const participantViews = await Promise.all([
        api().get(`/api/v1/chat/conversations/${conversationId}`).set(auth("customer")),
        api()
          .get(`/api/v1/chat/conversations/${conversationId}/messages?limit=100`)
          .set(auth("customer")),
        api().get(`/api/v1/chat/conversations`).set(auth("customer")),
        api().get(`/api/v1/chat/search?q=VIP-SECRET-NOTE`).set(auth("customer")),
      ]);
      for (const view of participantViews) {
        expect(view.status).toBe(200);
        // Inspect the payload only (the envelope echoes the request path/query).
        expect(JSON.stringify(view.body.data)).not.toContain("VIP-SECRET-NOTE");
      }
    });

    it("report review and audit log reading are admin-only and audited", async () => {
      const reports = await api().get(`/api/v1/chat/admin/reports?status=OPEN`).set(auth("admin"));
      expect(reports.status).toBe(200);
      const reportId = reports.body.data.items[0]?.id as string;
      const reviewed = await api()
        .post(`/api/v1/chat/admin/reports/${reportId}/review`)
        .set(auth("admin"))
        .send({ status: "RESOLVED", resolutionNote: "Warned user" });
      expect(reviewed.body.data.status).toBe("RESOLVED");
      expect((await api().get(`/api/v1/chat/admin/reports`).set(auth("hmDhk"))).status).toBe(403);

      const logs = await api().get(`/api/v1/chat/admin/audit-logs?limit=5`).set(auth("admin"));
      expect(logs.status).toBe(200);
      const [{ count }] = await ds.query(
        `SELECT count(*)::int AS count FROM "chat_audit_logs" WHERE "action" = 'AUDIT_LOG_VIEWED'`,
      );
      expect(count).toBe(1);
    });
  });

  /* ================================================================ */
  /* Legacy WebSocket containment (S-1)                                */
  /* ================================================================ */

  describe("legacy NotificationsGateway (S-1)", () => {
    const connect = (token?: string): ClientSocket =>
      ioClient(baseUrl, {
        transports: ["websocket"],
        forceNew: true,
        reconnection: false,
        ...(token ? { auth: { token } } : {}),
      });

    const chatRooms = (): string[] => {
      // With `namespace: "/"`, @WebSocketServer() injects the socket.io
      // Namespace at runtime (the gateway field is typed as Server).
      const injected: unknown = app.get(NotificationsGateway).server;
      const namespace = injected as Namespace;
      return [...namespace.adapter.rooms.keys()].filter((room) => room.startsWith("chat:"));
    };

    it("exposes no chat message handlers", () => {
      const proto = NotificationsGateway.prototype as unknown as Record<string, unknown>;
      for (const legacy of [
        "handleChatJoin",
        "handleChatLeave",
        "handleChatMessage",
        "handleChatTyping",
      ]) {
        expect(proto[legacy]).toBeUndefined();
      }
    });

    it("unauthenticated sockets are disconnected", async () => {
      const socket = connect();
      const disconnected = await new Promise<boolean>((resolve) => {
        socket.on("disconnect", () => resolve(true));
        setTimeout(() => resolve(false), 5000);
      });
      socket.close();
      expect(disconnected).toBe(true);
    });

    it("an authenticated non-member cannot join or broadcast to a chat room", async () => {
      const conversationId = (await createParcelThread("merchantA")).body.data.id;
      const intruder = connect(users.merchantB?.token);
      const member = connect(users.customer?.token);
      await Promise.all(
        [intruder, member].map(
          (s) => new Promise<void>((resolve) => s.on("connection:ready", () => resolve())),
        ),
      );
      const leaked: unknown[] = [];
      member.on("chat:message", (payload: unknown) => leaked.push(payload));
      member.on("chat:user_joined", (payload: unknown) => leaked.push(payload));

      const exceptions: Array<{ message: string }> = [];
      intruder.on("exception", (payload: { message: string }) => exceptions.push(payload));
      for (const event of ["chat:join", "chat:message", "chat:typing", "chat:leave"]) {
        intruder.emit(event, { roomId: conversationId, content: "injected", isTyping: true });
      }
      // Also try the member's own conversation room from the member socket.
      member.emit("chat:join", { roomId: conversationId });

      await new Promise((resolve) => setTimeout(resolve, 500));
      expect(exceptions).toHaveLength(4);
      expect(exceptions[0]?.message).toMatch(/not supported/i);
      expect(chatRooms()).toEqual([]); // no socket was ever placed in a chat:* room
      expect(leaked).toEqual([]); // nothing was broadcast
      intruder.close();
      member.close();
    });

    it("a flood of rejected chat events does not crash the server", async () => {
      const socket = connect(users.merchantB?.token);
      await new Promise<void>((resolve) => socket.on("connection:ready", () => resolve()));
      for (let i = 0; i < 50; i += 1) socket.emit("chat:join", { roomId: randomUUID() });
      await new Promise((resolve) => setTimeout(resolve, 300));
      socket.close();
      const health = await api().get("/api/v1/chat/conversations").set(auth("merchantB"));
      expect(health.status).toBe(200);
    });

    it("unrelated notification delivery still works", async () => {
      const socket = connect(users.merchantA?.token);
      await new Promise<void>((resolve) => socket.on("connection:ready", () => resolve()));
      const received = new Promise<unknown>((resolve) => socket.on("notification:new", resolve));
      expect(
        app
          .get(NotificationsGateway)
          .emitToUser(users.merchantA?.id as string, "notification:new", { ok: true }),
      ).toBe(true);
      expect(await received).toEqual({ ok: true });
      socket.close();
    });
  });
});
