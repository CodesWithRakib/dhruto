import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

// Runs before every import (ConfigModule only fills env keys that are NOT
// already set). AuthService seeds demo data at boot, so the database and Redis
// must be the disposable ones before any app exists.
vi.hoisted(() => {
  const db = process.env.CHAT_TEST_DATABASE_URL;
  const redis = process.env.CHAT_TEST_REDIS_URL;
  if (db && redis) {
    process.env.DATABASE_URL = db;
    process.env.REDIS_URL = redis;
    process.env.OUTBOX_POLL_MS = "600000"; // relay driven manually
    // Revalidation off: socket revocation below must come from the workflow event.
    process.env.CHAT_ROOM_REVALIDATE_MS = "600000";
    process.env.CHAT_REALTIME_REDIS_PROBE_MS = "500";
    process.env.CHAT_SOCKET_CONNECTIONS_PER_MINUTE = "1000";
    process.env.CHAT_RATE_LIMIT_SEND_PER_MIN = "1000";
    process.env.CHAT_RATE_LIMIT_CREATE_PER_MIN = "1000";
  }
});

import { randomUUID } from "node:crypto";
import { type AddressInfo } from "node:net";
import { type INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import request from "supertest";
import { io as ioClient, type Socket as ClientSocket } from "socket.io-client";
import { DataSource } from "typeorm";
import {
  CHAT_LOGISTICS_EVENT_KEYS,
  ChatClientEvent,
  ChatConversationType,
  ChatMessageType,
  ChatServerEvent,
  DeliveryFailureReason,
  OutboxStatus,
  type ChatSocketAck,
} from "@dhruto/contracts";
import { AppModule } from "../src/app.module.js";
import { CustomJwtService } from "../src/auth/jwt/custom-jwt.service.js";
import { UserRole } from "../src/database/entities/index.js";
import { OutboxRelayService } from "../src/integrations/outbox-relay.service.js";
import { DomainEventPublisher } from "../src/events/publishers/domain-event-publisher.service.js";
import { ParcelDeliveredEvent, ParcelFailedEvent } from "../src/events/domain/parcel.events.js";
import {
  CHAT_TEST_DATABASE_URL,
  assertDisposableDatabaseUrl,
  createChatTestDataSource,
} from "./utils/chat-test-db.js";

/**
 * Communication Phase 5 — logistics workflows and parcel-linked messaging.
 *
 * Real AppModule against DISPOSABLE PostgreSQL + Redis (CHAT_TEST_DATABASE_URL
 * / CHAT_TEST_REDIS_URL). Rider assignment goes through the real
 * `POST /parcels/:id/assign-rider` → transactional outbox → relay → chat
 * logistics handler → chat outbox → realtime fan-out.
 *
 * Harness shim: migrations do not create `parcels.delivery_otp_code` (the
 * documented pre-existing drift, deliberately NOT repaired in migrations), so
 * full Parcel entity loads fail on a schema migrated from zero. This suite
 * adds that single column to the THROWAWAY database only, so the real parcel
 * workflow can run. No migration or shared database is changed.
 */

interface Fixture {
  id: string;
  role: UserRole;
  phone: string;
  token: string;
}

const HUB_DHK = randomUUID();
const HUB_CTG = randomUUID();
const RECIPIENT = "01398700001";

describe.skipIf(!CHAT_TEST_DATABASE_URL || !process.env.CHAT_TEST_REDIS_URL)(
  "Communication Phase 5 — logistics workflows",
  () => {
    let app: INestApplication;
    let ds: DataSource;
    let baseUrl: string;
    const users: Record<string, Fixture> = {};
    const riders: Record<string, string> = {};
    const parcels: Record<string, string> = {};
    let merchantA = "";
    const opened: ClientSocket[] = [];

    const api = () => request(app.getHttpServer());
    const auth = (who: string) => ({ Authorization: `Bearer ${users[who]?.token ?? "missing"}` });
    const text = (content: string) => ({
      type: ChatMessageType.TEXT,
      clientMessageId: randomUUID(),
      content,
    });

    async function insertUser(key: string, role: UserRole, phone: string): Promise<string> {
      const [row] = await ds.query(
        `INSERT INTO "users" ("name", "email", "phone", "password_hash", "role")
         VALUES ($1, $2, $3, 'x', $4) RETURNING "id"`,
        [`Logistics ${key}`, `${key}@logistics-test.local`, phone, role],
      );
      users[key] = { id: row.id as string, role, phone, token: "" };
      return row.id as string;
    }

    async function insertParcel(key: string, merchantId: string, hubId: string): Promise<string> {
      const [row] = await ds.query(
        `INSERT INTO "parcels" ("tracking_code", "merchant_id", "recipient_name", "recipient_phone", "raw_address", "current_hub_id", "status")
         VALUES ($1, $2, 'Recipient Name', $3, 'House 1, Dhaka', $4, 'DESTINATION_HUB_RECEIVED') RETURNING "id"`,
        [`LG-${key}-${randomUUID().slice(0, 6)}`.toUpperCase(), merchantId, RECIPIENT, hubId],
      );
      parcels[key] = row.id as string;
      return row.id as string;
    }

    const openThread = (who: string, parcel: string, reason?: string) =>
      api()
        .post("/api/v1/chat/conversations")
        .set(auth(who))
        .send({
          type: ChatConversationType.PARCEL_DELIVERY,
          parcelId: parcels[parcel],
          ...(reason ? { reason } : {}),
        });

    const assign = (parcel: string, rider: string, who = "hmDhk") =>
      api()
        .post(`/api/v1/parcels/${parcels[parcel]}/assign-rider`)
        .set(auth(who))
        .send({ riderId: riders[rider] });

    async function drainRelay(): Promise<void> {
      const relay = app.get(OutboxRelayService);
      for (let i = 0; i < 30; i += 1) {
        const { claimed } = await relay.pollOnce(100);
        if (claimed === 0) return;
      }
    }

    async function participantStatus(conversationId: string, who: string): Promise<string | null> {
      const [row] = await ds.query(
        `SELECT "status" FROM "chat_participants" WHERE "conversation_id" = $1 AND "user_id" = $2`,
        [conversationId, users[who]?.id],
      );
      return (row?.status as string | undefined) ?? null;
    }

    async function systemMessages(conversationId: string, eventKey: string) {
      return ds.query(
        `SELECT "id", "client_message_id", "metadata" FROM "chat_messages"
          WHERE "conversation_id" = $1 AND "type" = 'SYSTEM_EVENT' AND "metadata"->>'eventKey' = $2`,
        [conversationId, eventKey],
      ) as Promise<
        Array<{ id: string; client_message_id: string; metadata: Record<string, unknown> }>
      >;
    }

    function connect(token: string): Promise<ClientSocket> {
      return new Promise((resolve, reject) => {
        const socket = ioClient(`${baseUrl}/chat`, {
          transports: ["websocket"],
          forceNew: true,
          reconnection: false,
          auth: { token },
        });
        opened.push(socket);
        const timer = setTimeout(() => reject(new Error("connect timeout")), 8000);
        socket.on(ChatServerEvent.SESSION_READY, () => {
          clearTimeout(timer);
          resolve(socket);
        });
        socket.on("connect_error", (error) => {
          clearTimeout(timer);
          reject(error);
        });
      });
    }

    function waitFor<T>(socket: ClientSocket, event: string, ms = 6000): Promise<T> {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`timeout waiting for ${event}`)), ms);
        socket.once(event, (payload: T) => {
          clearTimeout(timer);
          resolve(payload);
        });
      });
    }

    beforeAll(async () => {
      const url = CHAT_TEST_DATABASE_URL as string;
      assertDisposableDatabaseUrl(url);
      ds = createChatTestDataSource(url);
      await ds.initialize();
      await ds.runMigrations({ transaction: "each" });
      // Harness shim (see file header): throwaway database only.
      await ds.query(
        `ALTER TABLE "parcels" ADD COLUMN IF NOT EXISTS "delivery_otp_code" character varying(10)`,
      );

      await ds.query(
        `INSERT INTO "hubs" ("id", "code", "name", "address") VALUES ($1, 'LDHK', 'Dhaka L', 'Dhaka'), ($2, 'LCTG', 'Ctg L', 'Chattogram')`,
        [HUB_DHK, HUB_CTG],
      );
      await insertUser("admin", UserRole.ADMIN, "01398800001");
      const mA = await insertUser("merchantA", UserRole.MERCHANT, "01398800002");
      const mB = await insertUser("merchantB", UserRole.MERCHANT, "01398800003");
      const r1 = await insertUser("rider1", UserRole.RIDER, "01398800004");
      const r2 = await insertUser("rider2", UserRole.RIDER, "01398800005");
      const r3 = await insertUser("rider3", UserRole.RIDER, "01398800006");
      const hmDhk = await insertUser("hmDhk", UserRole.HUB_MANAGER, "01398800007");
      const hmCtg = await insertUser("hmCtg", UserRole.HUB_MANAGER, "01398800008");
      await insertUser("customer", UserRole.CUSTOMER, RECIPIENT);
      // Same number, another format: a different account (users.phone is unique raw).
      await insertUser("customerPlus88", UserRole.CUSTOMER, `+88${RECIPIENT}`);

      const merchantRows: Array<{ id: string }> = await ds.query(
        `INSERT INTO "merchants" ("user_id", "business_name", "contact_phone", "pickup_address")
         VALUES ($1, 'Logistics A', '01398800002', 'Dhaka'), ($2, 'Logistics B', '01398800003', 'Dhaka') RETURNING "id"`,
        [mA, mB],
      );
      merchantA = merchantRows[0]!.id;
      const merchantB = merchantRows[1]!.id;
      const riderRows: Array<{ id: string }> = await ds.query(
        `INSERT INTO "riders" ("user_id", "hub_id") VALUES ($1, $4), ($2, $4), ($3, $5) RETURNING "id"`,
        [r1, r2, r3, HUB_DHK, HUB_CTG],
      );
      riders.rider1 = riderRows[0]!.id;
      riders.rider2 = riderRows[1]!.id;
      riders.rider3 = riderRows[2]!.id;
      await ds.query(
        `INSERT INTO "hub_user_assignments" ("user_id", "hub_id") VALUES ($1, $3), ($2, $4)`,
        [hmDhk, hmCtg, HUB_DHK, HUB_CTG],
      );
      await insertParcel("A", merchantA, HUB_DHK);
      await insertParcel("B", merchantB, HUB_CTG);
      await insertParcel("C", merchantA, HUB_DHK);
      await insertParcel("D", merchantA, HUB_DHK);
      await insertParcel("E", merchantA, HUB_DHK);

      if (process.env.DATABASE_URL !== url) {
        throw new Error("Refusing to boot: DATABASE_URL does not point at CHAT_TEST_DATABASE_URL");
      }
      app = await NestFactory.create(AppModule, { logger: ["error"] });
      app.setGlobalPrefix("api/v1");
      await app.listen(0, "127.0.0.1");
      const dbName = (await app.get(DataSource).query(`SELECT current_database() AS db`))[0]
        .db as string;
      if (!/test/i.test(dbName)) {
        await app.close();
        throw new Error(`Refusing to run against non-test database "${dbName}"`);
      }
      baseUrl = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
      const jwt = app.get(CustomJwtService);
      for (const [key, u] of Object.entries(users)) {
        u.token = jwt.generateAuthTokens({
          id: u.id,
          email: `${key}@logistics-test.local`,
          phone: u.phone,
          role: u.role,
        }).accessToken;
      }
    }, 240_000);

    afterAll(async () => {
      for (const socket of opened) socket.close();
      await app?.close();
      if (ds?.isInitialized) await ds.destroy();
    });

    /* ================================================================ */
    /* Parcel thread creation, reuse and eligibility                     */
    /* ================================================================ */

    describe("parcel-linked conversation get-or-create", () => {
      it("creates once, then returns the same thread to every eligible party", async () => {
        const first = await openThread("merchantA", "A");
        expect(first.status).toBe(201);
        const id = first.body.data.id as string;
        const again = await openThread("merchantA", "A");
        expect(again.status).toBe(200);
        expect(again.body.data.id).toBe(id);
        const customer = await openThread("customer", "A");
        expect(customer.status).toBe(200);
        expect(customer.body.data.id).toBe(id);
        const hub = await openThread("hmDhk", "A");
        expect(hub.status).toBe(200);
        expect(hub.body.data.id).toBe(id);
      });

      it("rejects other tenants, other hubs, unassigned riders and a different-format phone account", async () => {
        for (const who of ["merchantB", "hmCtg", "rider1", "rider3", "customerPlus88"]) {
          const res = await openThread(who, "A");
          expect(res.status, who).toBe(422);
          expect(res.body.errorCode, who).toBe("CHAT_SCOPE_INVALID");
        }
        const id = (await openThread("merchantA", "A")).body.data.id as string;
        for (const who of ["merchantB", "hmCtg", "rider1", "customerPlus88"]) {
          expect(
            (await api().get(`/api/v1/chat/conversations/${id}`).set(auth(who))).status,
            who,
          ).toBe(404);
        }
      });

      it("concurrent get-or-create requests produce exactly one conversation", async () => {
        const results = await Promise.all(
          Array.from({ length: 8 }, (_, i) =>
            openThread(i % 2 === 0 ? "merchantA" : "customer", "C"),
          ),
        );
        expect(results.every((r) => r.status === 200 || r.status === 201)).toBe(true);
        expect(results.filter((r) => r.status === 201)).toHaveLength(1);
        expect(new Set(results.map((r) => r.body.data.id)).size).toBe(1);
        const [{ count }] = await ds.query(
          `SELECT count(*)::int AS count FROM "chat_conversations" WHERE "parcel_id" = $1`,
          [parcels.C],
        );
        expect(count).toBe(1);
      });

      it("exposes minimal parcel context from the server — no recipient contact data", async () => {
        const detail = (await openThread("customer", "A")).body.data;
        expect(detail.parcel).toEqual({
          id: parcels.A,
          trackingCode: expect.stringMatching(/^LG-A-/),
          status: "DESTINATION_HUB_RECEIVED",
        });
        const list = await api().get("/api/v1/chat/conversations?limit=20").set(auth("customer"));
        const item = list.body.data.items.find((c: { id: string }) => c.id === detail.id);
        expect(item.parcel.trackingCode).toBe(detail.parcel.trackingCode);
        const serialized = JSON.stringify(list.body.data);
        expect(serialized).not.toContain(RECIPIENT);
        expect(serialized).not.toContain("House 1");
      });
    });

    /* ================================================================ */
    /* Rider assignment, reassignment and revocation                     */
    /* ================================================================ */

    describe("rider assignment lifecycle", () => {
      let threadId = "";
      let rider1MessageId = "";

      it("a committed assignment admits the rider and posts one system message", async () => {
        threadId = (await openThread("merchantA", "D")).body.data.id as string;
        expect(await participantStatus(threadId, "rider1")).toBeNull();
        expect((await assign("D", "rider1")).status).toBe(200);
        await drainRelay();

        expect(await participantStatus(threadId, "rider1")).toBe("ACTIVE");
        const msgs = await systemMessages(threadId, CHAT_LOGISTICS_EVENT_KEYS.RIDER_ASSIGNED);
        expect(msgs).toHaveLength(1);
        expect(msgs[0]!.metadata).toEqual({
          eventKey: CHAT_LOGISTICS_EVENT_KEYS.RIDER_ASSIGNED,
          params: { trackingCode: expect.stringMatching(/^LG-D-/) },
        });
        const detail = await api()
          .get(`/api/v1/chat/conversations/${threadId}`)
          .set(auth("rider1"));
        expect(detail.status).toBe(200);
        const sent = await api()
          .post(`/api/v1/chat/conversations/${threadId}/messages`)
          .set(auth("rider1"))
          .send(text("On my way to the hub"));
        expect(sent.status).toBe(201);
        rider1MessageId = sent.body.data.id as string;
      });

      it("an outbox retry of the same event does not duplicate the system message", async () => {
        const [event] = await ds.query(
          `SELECT "id", "event_id" FROM "event_outbox" WHERE "event_type" = 'parcel.assigned.v1' AND "aggregate_id" = $1`,
          [parcels.D],
        );
        await ds.query(
          `UPDATE "event_outbox" SET "status" = $1, "available_at" = now(), "published_at" = NULL WHERE "id" = $2`,
          [OutboxStatus.PENDING, event.id],
        );
        await drainRelay();
        const msgs = await systemMessages(threadId, CHAT_LOGISTICS_EVENT_KEYS.RIDER_ASSIGNED);
        expect(msgs).toHaveLength(1);
        expect(msgs[0]!.client_message_id).toBe(event.event_id);
      });

      it("reassignment removes the previous rider (REST + socket) and admits the new rider", async () => {
        const socket = await connect(users.rider1!.token);
        const join = (await socket
          .timeout(8000)
          .emitWithAck(ChatClientEvent.CONVERSATION_JOIN, {
            conversationId: threadId,
          })) as ChatSocketAck<unknown>;
        expect(join.ok).toBe(true);
        const revoked = waitFor<{ conversationId: string; reason: string }>(
          socket,
          ChatServerEvent.MEMBERSHIP_REVOKED,
        );

        const res = await assign("D", "rider2");
        expect(res.status).toBe(200);
        expect(res.body.data.reassigned).toBe(true);
        // Live eligibility denies the old rider before any async processing.
        expect(
          (await api().get(`/api/v1/chat/conversations/${threadId}`).set(auth("rider1"))).status,
        ).toBe(404);

        await drainRelay(); // parcel event -> chat sync -> chat events -> realtime
        expect((await revoked).conversationId).toBe(threadId);

        // The database no longer contradicts live authorization.
        expect(await participantStatus(threadId, "rider1")).toBe("REMOVED");
        expect(await participantStatus(threadId, "rider2")).toBe("ACTIVE");
        const [audit] = await ds.query(
          `SELECT "actor_user_id", "metadata" FROM "chat_audit_logs"
            WHERE "conversation_id" = $1 AND "action" = 'PARTICIPANT_REMOVED' AND "target_id" = $2
            ORDER BY "createdAt" DESC LIMIT 1`,
          [threadId, users.rider1!.id],
        );
        expect(audit.actor_user_id).toBeNull();
        expect(audit.metadata).toMatchObject({ workflow: "parcel_event", reason: "ineligible" });

        // No history through REST or socket for the previous rider.
        for (const path of [
          `/api/v1/chat/conversations/${threadId}`,
          `/api/v1/chat/conversations/${threadId}/messages`,
          `/api/v1/chat/messages/${rider1MessageId}`,
        ]) {
          expect((await api().get(path).set(auth("rider1"))).status, path).toBe(404);
        }
        const rejoin = (await socket
          .timeout(8000)
          .emitWithAck(ChatClientEvent.CONVERSATION_JOIN, {
            conversationId: threadId,
          })) as ChatSocketAck<unknown>;
        expect(rejoin.ok).toBe(false);

        // New rider has access; history and authorship are preserved.
        const history = await api()
          .get(`/api/v1/chat/conversations/${threadId}/messages`)
          .set(auth("rider2"));
        expect(history.status).toBe(200);
        const old = history.body.data.items.find((m: { id: string }) => m.id === rider1MessageId);
        expect(old.senderId).toBe(users.rider1!.id);
        expect(old.content).toBe("On my way to the hub");
        expect(
          await systemMessages(threadId, CHAT_LOGISTICS_EVENT_KEYS.RIDER_REASSIGNED),
        ).toHaveLength(1);
        socket.close();
      });

      it("assigned back, the previous rider is re-admitted (workflow removal only)", async () => {
        expect((await assign("D", "rider1")).status).toBe(200);
        await drainRelay();
        expect(await participantStatus(threadId, "rider1")).toBe("ACTIVE");
        expect(await participantStatus(threadId, "rider2")).toBe("REMOVED");
        expect(
          (await api().get(`/api/v1/chat/conversations/${threadId}`).set(auth("rider1"))).status,
        ).toBe(200);
      });

      it("a rider removed by a moderator is never silently re-admitted by the workflow", async () => {
        // Staff joins (with reason) and removes rider1 as a moderator.
        expect((await openThread("admin", "D", "Escalation: rider conduct review")).status).toBe(
          200,
        );
        const removed = await api()
          .delete(`/api/v1/chat/conversations/${threadId}/participants/${users.rider1!.id}`)
          .set(auth("admin"))
          .send({ reason: "Moderator removal for conduct review" });
        expect(removed.status).toBe(200);
        expect(await participantStatus(threadId, "rider1")).toBe("REMOVED");

        expect((await assign("D", "rider2")).status).toBe(200);
        await drainRelay();
        expect((await assign("D", "rider1")).status).toBe(200);
        await drainRelay();
        expect(await participantStatus(threadId, "rider1")).toBe("REMOVED");
        expect((await openThread("rider1", "D")).status).toBe(403);
      });

      it("repeated and concurrent assignment changes converge to one ACTIVE rider row", async () => {
        const id = (await openThread("merchantA", "E")).body.data.id as string;
        expect((await assign("E", "rider1")).status).toBe(200);
        const outcomes = await Promise.all([assign("E", "rider2"), assign("E", "rider2")]);
        // The parcel row lock serializes them: one reassigns, one is a no-op conflict.
        expect(outcomes.map((r) => r.status).sort()).toEqual([200, 409]);
        await drainRelay();
        await drainRelay();
        const rows: Array<{ user_id: string; status: string }> = await ds.query(
          `SELECT "user_id", "status" FROM "chat_participants" WHERE "conversation_id" = $1 AND "user_id" IN ($2, $3)`,
          [id, users.rider1!.id, users.rider2!.id],
        );
        const byUser = new Map(rows.map((r) => [r.user_id, r.status]));
        // Sync is state-based: both changes committed before the relay ran, so
        // rider1 was never admitted (no row) or is REMOVED — never ACTIVE.
        expect(byUser.get(users.rider1!.id)).not.toBe("ACTIVE");
        expect(byUser.get(users.rider2!.id)).toBe("ACTIVE");
        expect(await systemMessages(id, CHAT_LOGISTICS_EVENT_KEYS.RIDER_ASSIGNED)).toHaveLength(1);
        expect(await systemMessages(id, CHAT_LOGISTICS_EVENT_KEYS.RIDER_REASSIGNED)).toHaveLength(
          1,
        );
      });
    });

    /* ================================================================ */
    /* Hub scope and transfer                                            */
    /* ================================================================ */

    describe("hub manager scope", () => {
      it("hub transfer moves access to the new hub's manager and reconciles the old row", async () => {
        const id = (await openThread("hmDhk", "C")).body.data.id as string;
        expect(await participantStatus(id, "hmDhk")).toBe("ACTIVE");
        await ds.query(`UPDATE "parcels" SET "current_hub_id" = $1 WHERE "id" = $2`, [
          HUB_CTG,
          parcels.C,
        ]);
        try {
          expect(
            (await api().get(`/api/v1/chat/conversations/${id}`).set(auth("hmDhk"))).status,
          ).toBe(404);
          const ctg = await openThread("hmCtg", "C");
          expect(ctg.status).toBe(200);
          expect(ctg.body.data.id).toBe(id);
          expect(await participantStatus(id, "hmDhk")).toBe("REMOVED");
        } finally {
          await ds.query(`UPDATE "parcels" SET "current_hub_id" = $1 WHERE "id" = $2`, [
            HUB_DHK,
            parcels.C,
          ]);
        }
      });
    });

    /* ================================================================ */
    /* Staff access                                                      */
    /* ================================================================ */

    describe("staff intervention through get-or-create", () => {
      it("admin needs a reason to join an existing thread; the join is audited and visible", async () => {
        const id = (await openThread("merchantA", "A")).body.data.id as string;
        const noReason = await openThread("admin", "A");
        expect(noReason.status).toBe(422);
        expect(noReason.body.errorCode).toBe("CHAT_REASON_REQUIRED");
        expect(await participantStatus(id, "admin")).toBeNull();
        expect((await openThread("admin", "A", "short")).status).toBe(422);

        const joined = await openThread("admin", "A", "Customer escalation about delivery delay");
        expect(joined.status).toBe(200);
        expect(await participantStatus(id, "admin")).toBe("ACTIVE");
        const [audit] = await ds.query(
          `SELECT "reason", "metadata", "actor_role" FROM "chat_audit_logs"
            WHERE "conversation_id" = $1 AND "action" = 'ADMIN_INTERVENTION' ORDER BY "createdAt" DESC LIMIT 1`,
          [id],
        );
        expect(audit.reason).toBe("Customer escalation about delivery delay");
        expect(audit.actor_role).toBe("ADMIN");
        expect(audit.metadata).toMatchObject({ via: "get_or_create" });
        expect(await systemMessages(id, "chat.staff_joined")).toHaveLength(1);
        // Already a participant: no reason needed, no second intervention.
        expect((await openThread("admin", "A")).status).toBe(200);
        expect(await systemMessages(id, "chat.staff_joined")).toHaveLength(1);
      });

      it("merchant desk: own tenant only; admin joins with a reason; notes stay staff-only", async () => {
        const desk = await api()
          .post("/api/v1/chat/conversations")
          .set(auth("merchantA"))
          .send({ type: ChatConversationType.MERCHANT_DESK });
        expect(desk.status).toBe(201);
        const id = desk.body.data.id as string;
        expect(
          (await api().get(`/api/v1/chat/conversations/${id}`).set(auth("merchantB"))).status,
        ).toBe(404);

        const deskAs = (reason?: string) =>
          api()
            .post("/api/v1/chat/conversations")
            .set(auth("admin"))
            .send({
              type: ChatConversationType.MERCHANT_DESK,
              merchantId,
              ...(reason ? { reason } : {}),
            });
        const merchantId = merchantA;
        expect((await deskAs()).status).toBe(422);
        expect((await deskAs("Merchant requested settlement help")).status).toBe(200);

        const note = await api()
          .post(`/api/v1/chat/admin/conversations/${id}/notes`)
          .set(auth("admin"))
          .send({ body: "Internal: merchant has a pending payout dispute" });
        expect(note.status).toBe(201);
        const staffMsg = await api()
          .post(`/api/v1/chat/conversations/${id}/messages`)
          .set(auth("admin"))
          .send(text("Hello from operations"));
        expect(staffMsg.status).toBe(201);

        const history = await api()
          .get(`/api/v1/chat/conversations/${id}/messages`)
          .set(auth("merchantA"));
        expect(history.status).toBe(200);
        expect(JSON.stringify(history.body.data)).not.toContain("pending payout dispute");
        expect(
          history.body.data.items.some(
            (m: { content: string | null }) => m.content === "Hello from operations",
          ),
        ).toBe(true);
        expect(
          (await api().get(`/api/v1/chat/admin/conversations/${id}/notes`).set(auth("merchantA")))
            .status,
        ).not.toBe(200);
      });
    });

    /* ================================================================ */
    /* Lifecycle system messages and outbox semantics                    */
    /* ================================================================ */

    describe("lifecycle system messages", () => {
      it("a rolled-back business transaction produces no chat message", async () => {
        const id = (await openThread("merchantA", "A")).body.data.id as string;
        const publisher = app.get(DomainEventPublisher);
        const runner = app.get(DataSource).createQueryRunner();
        await runner.connect();
        await runner.startTransaction();
        try {
          await publisher.publish(
            runner.manager,
            new ParcelDeliveredEvent(
              { aggregateId: parcels.A!, merchantId: merchantA },
              {
                parcelId: parcels.A,
                merchantId: merchantA,
                trackingCode: "LG-ROLLBACK",
                riderId: riders.rider1!,
                codCollected: 0,
              },
            ),
          );
        } finally {
          await runner.rollbackTransaction();
          await runner.release();
        }
        await drainRelay();
        expect(await systemMessages(id, CHAT_LOGISTICS_EVENT_KEYS.DELIVERED)).toHaveLength(0);
      });

      it("a committed failure posts one safe message visible to the customer", async () => {
        const id = (await openThread("merchantA", "A")).body.data.id as string;
        const publisher = app.get(DomainEventPublisher);
        await app.get(DataSource).transaction((manager) =>
          publisher.publish(
            manager,
            new ParcelFailedEvent(
              { aggregateId: parcels.A!, merchantId: merchantA },
              {
                parcelId: parcels.A,
                merchantId: merchantA,
                recipientPhone: RECIPIENT,
                recipientName: "Recipient Name",
                trackingCode: "LG-FAIL-1",
                riderId: riders.rider1!,
                reason: DeliveryFailureReason.CUSTOMER_UNAVAILABLE,
              },
            ),
          ),
        );
        await drainRelay();
        await drainRelay();
        const msgs = await systemMessages(id, CHAT_LOGISTICS_EVENT_KEYS.DELIVERY_FAILED);
        expect(msgs).toHaveLength(1);
        expect(msgs[0]!.metadata).toEqual({
          eventKey: CHAT_LOGISTICS_EVENT_KEYS.DELIVERY_FAILED,
          params: { trackingCode: "LG-FAIL-1", reason: DeliveryFailureReason.CUSTOMER_UNAVAILABLE },
        });
        const seen = await api()
          .get(`/api/v1/chat/conversations/${id}/messages`)
          .set(auth("customer"));
        const item = seen.body.data.items.find((m: { id: string }) => m.id === msgs[0]!.id);
        expect(item.type).toBe(ChatMessageType.SYSTEM_EVENT);
        expect(item.senderId).toBeNull();
        expect(JSON.stringify(item)).not.toContain(RECIPIENT);
        // Nothing stuck in the outbox for parcel or chat events.
        const stuck = await ds.query(
          `SELECT "event_type", "last_error" FROM "event_outbox" WHERE "status" <> $1 AND ("event_type" LIKE 'chat.%' OR "event_type" LIKE 'parcel.%')`,
          [OutboxStatus.PUBLISHED],
        );
        expect(stuck).toEqual([]);
      });

      it("lifecycle events never auto-create a conversation", async () => {
        const [{ count }] = await ds.query(
          `SELECT count(*)::int AS count FROM "chat_conversations" WHERE "parcel_id" = $1`,
          [parcels.B],
        );
        expect(count).toBe(0);
      });
    });

    /* ================================================================ */
    /* Global unread indicator                                           */
    /* ================================================================ */

    describe("unread summary", () => {
      it("counts accessible unread conversations and clears after reading", async () => {
        const id = (await openThread("merchantA", "A")).body.data.id as string;
        const sent = await api()
          .post(`/api/v1/chat/conversations/${id}/messages`)
          .set(auth("merchantA"))
          .send(text("Your parcel is at the hub"));
        const before = await api()
          .get("/api/v1/chat/conversations/unread-summary")
          .set(auth("customer"));
        expect(before.status).toBe(200);
        expect(before.body.data.unreadConversations).toBeGreaterThanOrEqual(1);
        expect(before.body.data.capped).toBe(false);
        await api()
          .post(`/api/v1/chat/conversations/${id}/read`)
          .set(auth("customer"))
          .send({ lastReadSequence: sent.body.data.sequence });
        const after = await api()
          .get("/api/v1/chat/conversations/unread-summary")
          .set(auth("customer"));
        expect(after.body.data.unreadConversations).toBe(before.body.data.unreadConversations - 1);
        const other = await api()
          .get("/api/v1/chat/conversations/unread-summary")
          .set(auth("merchantB"));
        expect(other.body.data).toEqual({ unreadConversations: 0, capped: false });
      });
    });
  },
);
