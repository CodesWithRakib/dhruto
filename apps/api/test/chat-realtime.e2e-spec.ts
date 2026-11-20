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
    process.env.CHAT_ROOM_REVALIDATE_MS = "600000"; // revalidation driven manually
    process.env.CHAT_REALTIME_REDIS_PROBE_MS = "500";
    // This suite exercises the multi-instance Redis adapter, which defaults
    // to OFF under NODE_ENV=test (single-instance mode).
    process.env.CHAT_REALTIME_REDIS_ENABLED = "true";
    process.env.CHAT_SOCKET_CONNECTIONS_PER_MINUTE = "1000";
    process.env.CHAT_RATE_LIMIT_SEND_PER_MIN = "1000";
  }
});

import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { type AddressInfo } from "node:net";
import { type INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import request from "supertest";
import { io as ioClient, type Socket as ClientSocket } from "socket.io-client";
import { DataSource } from "typeorm";
import {
  ChatClientEvent,
  ChatConversationType,
  ChatMessageType,
  ChatServerEvent,
  ChatSocketErrorCode,
  DomainEventType,
  type ChatMessageEvent,
  type ChatSocketAck,
  type ChatSocketJoinResult,
} from "@dhruto/contracts";
import { AppModule } from "../src/app.module.js";
import { type AuthConfig } from "../src/config/auth.config.js";
import { CustomJwtService } from "../src/auth/jwt/custom-jwt.service.js";
import { UserRole } from "../src/database/entities/index.js";
import { OutboxRelayService } from "../src/integrations/outbox-relay.service.js";
import {
  REALTIME_FANOUT_HANDLER,
  type RealtimeFanoutHandler,
} from "../src/integrations/realtime-fanout.port.js";
import { ChatEventsService } from "../src/chat/services/chat-events.service.js";
import { ChatGateway } from "../src/chat/realtime/chat.gateway.js";
import { ChatRedisService } from "../src/chat/realtime/chat-redis.service.js";
import { CHAT_TEST_DATABASE_URL, createChatTestDataSource } from "./utils/chat-test-db.js";
import { seedChatFixtures, type ChatFixtures } from "./utils/chat-fixtures.js";

/**
 * Communication Phase 3 — realtime engine integration.
 *
 * Two independent AppModule instances (A and B) share one DISPOSABLE
 * PostgreSQL and one DISPOSABLE Redis. Durable events are relayed by A's
 * outbox relay and must reach sockets connected to B through the Redis
 * adapter. The Redis-outage test stops/starts the disposable Redis container
 * named by CHAT_TEST_REDIS_CONTAINER (skipped when unset).
 */
const REDIS_URL = process.env.CHAT_TEST_REDIS_URL;
const REDIS_CONTAINER = process.env.CHAT_TEST_REDIS_CONTAINER;

type ConnectOptions = { auth?: Record<string, unknown>; extraHeaders?: Record<string, string> };

describe.skipIf(!CHAT_TEST_DATABASE_URL || !REDIS_URL)(
  "Communication Phase 3 — realtime engine",
  () => {
    let appA: INestApplication;
    let appB: INestApplication;
    let baseA = "";
    let baseB = "";
    let ds: DataSource;
    let fx: ChatFixtures;
    const tokens: Record<string, string> = {};
    const opened: ClientSocket[] = [];

    /* ---------------- helpers ---------------- */

    const api = (app: INestApplication = appA) => request(app.getHttpServer());
    const auth = (who: string) => ({ Authorization: `Bearer ${tokens[who] ?? "missing"}` });

    function chatUrl(base: string): string {
      return `${base}/chat`;
    }

    function connect(
      base: string,
      token: string | undefined,
      options: ConnectOptions = {},
    ): Promise<ClientSocket> {
      return new Promise((resolve, reject) => {
        const socket = ioClient(chatUrl(base), {
          transports: ["websocket"],
          forceNew: true,
          reconnection: false,
          auth: options.auth ?? (token ? { token } : {}),
          extraHeaders: options.extraHeaders,
        });
        opened.push(socket);
        const timer = setTimeout(() => reject(new Error("connect timeout")), 8000);
        socket.on(ChatServerEvent.SESSION_READY, () => {
          clearTimeout(timer);
          resolve(socket);
        });
        socket.on("connect_error", (err) => {
          clearTimeout(timer);
          socket.close();
          reject(err);
        });
      });
    }

    async function connectError(
      base: string,
      token: string | undefined,
      options: ConnectOptions = {},
    ) {
      try {
        await connect(base, token, options);
        return null;
      } catch (error) {
        const err = error as Error & { data?: { code?: string } };
        return { message: err.message, code: err.data?.code ?? null };
      }
    }

    async function ack<T>(
      socket: ClientSocket,
      event: string,
      payload: unknown,
    ): Promise<ChatSocketAck<T>> {
      return (await socket.timeout(8000).emitWithAck(event, payload)) as ChatSocketAck<T>;
    }

    function waitFor<T>(
      socket: ClientSocket,
      event: string,
      predicate: (p: T) => boolean = () => true,
      ms = 6000,
    ): Promise<T> {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          socket.off(event, handler);
          reject(new Error(`timeout waiting for ${event}`));
        }, ms);
        const handler = (payload: T) => {
          if (!predicate(payload)) return;
          clearTimeout(timer);
          socket.off(event, handler);
          resolve(payload);
        };
        socket.on(event, handler);
      });
    }

    function collect<T>(socket: ClientSocket, event: string): T[] {
      const items: T[] = [];
      socket.on(event, (payload: T) => items.push(payload));
      return items;
    }

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    async function drainRelay(app: INestApplication = appA): Promise<void> {
      const relay = app.get(OutboxRelayService);
      for (let i = 0; i < 20; i += 1) {
        const { claimed } = await relay.pollOnce(100);
        if (claimed === 0) return;
      }
    }

    async function parcelThread(who = "merchantA"): Promise<string> {
      const res = await api()
        .post("/api/v1/chat/conversations")
        .set(auth(who))
        .send({ type: ChatConversationType.PARCEL_DELIVERY, parcelId: fx.parcelA });
      expect([200, 201]).toContain(res.status);
      return res.body.data.id as string;
    }

    async function send(conversationId: string, who: string, content: string, app = appA) {
      const res = await api(app)
        .post(`/api/v1/chat/conversations/${conversationId}/messages`)
        .set(auth(who))
        .send({ type: ChatMessageType.TEXT, clientMessageId: randomUUID(), content });
      return res;
    }

    /* ---------------- setup ---------------- */

    beforeAll(async () => {
      ds = createChatTestDataSource(CHAT_TEST_DATABASE_URL as string);
      await ds.initialize();
      await ds.runMigrations({ transaction: "each" });
      fx = await seedChatFixtures(ds, "p3");
      await ds.query(`SELECT 1`);

      if (
        process.env.DATABASE_URL !== CHAT_TEST_DATABASE_URL ||
        process.env.REDIS_URL !== REDIS_URL
      ) {
        throw new Error(
          "Refusing to boot: DATABASE_URL/REDIS_URL are not the disposable test targets",
        );
      }
      appA = await NestFactory.create(AppModule, { logger: ["error"] });
      appA.setGlobalPrefix("api/v1");
      await appA.listen(0, "127.0.0.1");
      appB = await NestFactory.create(AppModule, { logger: ["error"] });
      appB.setGlobalPrefix("api/v1");
      await appB.listen(0, "127.0.0.1");

      for (const app of [appA, appB]) {
        const db = (await app.get(DataSource).query(`SELECT current_database() AS db`))[0]
          .db as string;
        if (!/test/i.test(db)) throw new Error(`Refusing to run against non-test database "${db}"`);
      }
      baseA = `http://127.0.0.1:${(appA.getHttpServer().address() as AddressInfo).port}`;
      baseB = `http://127.0.0.1:${(appB.getHttpServer().address() as AddressInfo).port}`;

      const jwt = appA.get(CustomJwtService);
      for (const [key, u] of Object.entries(fx.users)) {
        tokens[key] = jwt.generateAuthTokens({
          id: u.id,
          email: u.email,
          phone: u.phone,
          role: u.role,
        }).accessToken;
      }

      // Both instances' Redis adapters must be healthy before cross-instance tests.
      for (let i = 0; i < 40; i += 1) {
        if (
          appA.get(ChatRedisService).status().healthy &&
          appB.get(ChatRedisService).status().healthy
        )
          break;
        await sleep(250);
      }
    }, 240_000);

    afterAll(async () => {
      for (const socket of opened) socket.close();
      await appA?.close();
      await appB?.close();
      if (ds?.isInitialized) await ds.destroy();
    });

    /* ================================================================ */
    /* Authentication                                                    */
    /* ================================================================ */

    describe("handshake authentication", () => {
      it("valid JWT connects and identity comes from the token, not the client", async () => {
        const socket = await connect(baseA, undefined, {
          auth: { token: tokens.customer, userId: fx.users.merchantB?.id, role: "ADMIN" },
        });
        const join = await ack<ChatSocketJoinResult>(socket, ChatClientEvent.CONVERSATION_JOIN, {
          conversationId: await parcelThread(),
        });
        expect(join.ok).toBe(true); // joined as the customer (recipient), not as merchantB/ADMIN
        socket.close();
      });

      it("session:ready carries the authenticated user and token expiry", async () => {
        const socket = ioClient(chatUrl(baseA), {
          transports: ["websocket"],
          forceNew: true,
          reconnection: false,
          auth: { token: tokens.merchantA },
        });
        opened.push(socket);
        const ready = await waitFor<{ userId: string; expiresAt: string }>(
          socket,
          ChatServerEvent.SESSION_READY,
        );
        expect(ready.userId).toBe(fx.users.merchantA?.id);
        expect(Date.parse(ready.expiresAt)).toBeGreaterThan(Date.now());
        socket.close();
      });

      it("rejects missing, tampered and expired tokens and inactive accounts", async () => {
        expect((await connectError(baseA, undefined))?.code).toBe(
          ChatSocketErrorCode.UNAUTHENTICATED,
        );
        const tampered = `${tokens.customer?.slice(0, -4)}AAAA`;
        expect((await connectError(baseA, tampered))?.code).toBe(
          ChatSocketErrorCode.UNAUTHENTICATED,
        );

        const secret = appA.get(ConfigService).get<AuthConfig>("auth")?.jwtAccessSecret ?? "";
        const u = fx.users.customer!;
        const expired = appA
          .get(CustomJwtService)
          .sign(
            { sub: u.id, email: u.email, phone: u.phone, role: UserRole.CUSTOMER, type: "access" },
            secret,
            -60,
          );
        expect((await connectError(baseA, expired))?.code).toBe(ChatSocketErrorCode.TOKEN_EXPIRED);

        expect((await connectError(baseA, tokens.suspended))?.code).toBe(
          ChatSocketErrorCode.UNAUTHENTICATED,
        );

        // A refresh token is not an access token.
        const refresh = appA
          .get(CustomJwtService)
          .generateAuthTokens({
            id: u.id,
            email: u.email,
            phone: u.phone,
            role: u.role,
          }).refreshToken;
        expect((await connectError(baseA, refresh))?.code).toBe(
          ChatSocketErrorCode.UNAUTHENTICATED,
        );
      });

      it("rejects untrusted browser origins (S-2) and accepts the trusted one", async () => {
        expect(
          await connectError(baseA, tokens.customer, {
            extraHeaders: { origin: "https://evil.example" },
          }),
        ).not.toBeNull();
        const ok = await connect(baseA, tokens.customer, {
          extraHeaders: { origin: "http://localhost:5000" },
        });
        ok.close();
      });

      it("rejected handshakes do not crash or degrade the server", async () => {
        await Promise.all(Array.from({ length: 20 }, () => connectError(baseA, "garbage")));
        const res = await api().get("/api/v1/health/realtime");
        expect(res.body.gatewayInitialized).toBe(true);
        expect(res.body.connections.rejected).toBeGreaterThan(0);
      });
    });

    /* ================================================================ */
    /* Authorization                                                     */
    /* ================================================================ */

    describe("room authorization", () => {
      it("members join with authoritative head, cursors and presence", async () => {
        const conversationId = await parcelThread();
        const socket = await connect(baseA, tokens.rider1);
        const res = await ack<ChatSocketJoinResult>(socket, ChatClientEvent.CONVERSATION_JOIN, {
          conversationId,
        });
        expect(res.ok).toBe(true);
        if (res.ok) {
          expect(res.data.conversationId).toBe(conversationId);
          expect(res.data.presence.find((p) => p.userId === fx.users.rider1?.id)?.status).toBe(
            "online",
          );
        }
        socket.close();
      });

      it("non-members, other hubs, other merchants, admins without membership and arbitrary rooms are denied", async () => {
        const conversationId = await parcelThread();
        for (const who of ["merchantB", "hmCtg", "rider2", "customer2", "admin"]) {
          const socket = await connect(baseA, tokens[who]);
          const res = await ack(socket, ChatClientEvent.CONVERSATION_JOIN, { conversationId });
          expect(res.ok ? "joined" : res.error.code).toBe(ChatSocketErrorCode.NOT_FOUND);
          socket.close();
        }
        const socket = await connect(baseA, tokens.customer);
        expect(
          (await ack(socket, ChatClientEvent.CONVERSATION_JOIN, { conversationId: randomUUID() }))
            .ok,
        ).toBe(false);
        const room = await ack(socket, ChatClientEvent.CONVERSATION_JOIN, {
          conversationId: `u:${fx.users.merchantA?.id}`,
        });
        expect(room.ok ? "joined" : room.error.code).toBe(ChatSocketErrorCode.INVALID_PAYLOAD);
        const extra = await ack(socket, ChatClientEvent.CONVERSATION_JOIN, {
          conversationId,
          room: "c:x",
        });
        expect(extra.ok ? "joined" : extra.error.code).toBe(ChatSocketErrorCode.INVALID_PAYLOAD);
        socket.close();
      });

      it("admin joins only after an audited intervention", async () => {
        const conversationId = await parcelThread();
        const res = await api()
          .post(`/api/v1/chat/admin/conversations/${conversationId}/intervene`)
          .set(auth("admin"))
          .send({ reason: "Realtime escalation drill" });
        expect(res.status).toBe(200);
        const socket = await connect(baseA, tokens.admin);
        expect((await ack(socket, ChatClientEvent.CONVERSATION_JOIN, { conversationId })).ok).toBe(
          true,
        );
        socket.close();
      });

      it("a removed participant is evicted, notified, and cannot rejoin", async () => {
        const created = await api()
          .post("/api/v1/chat/conversations")
          .set(auth("hmDhk"))
          .send({
            type: "GROUP",
            title: "Realtime riders",
            participantUserIds: [fx.users.rider3?.id],
          });
        const conversationId = created.body.data.id as string;
        const socket = await connect(baseB, tokens.rider3);
        expect((await ack(socket, ChatClientEvent.CONVERSATION_JOIN, { conversationId })).ok).toBe(
          true,
        );
        const revoked = waitFor<{ conversationId: string; reason: string }>(
          socket,
          ChatServerEvent.MEMBERSHIP_REVOKED,
        );
        await api()
          .delete(
            `/api/v1/chat/conversations/${conversationId}/participants/${fx.users.rider3?.id}`,
          )
          .set(auth("hmDhk"))
          .send({});
        await drainRelay();
        expect(await revoked).toMatchObject({ conversationId, reason: "removed" });
        const rejoin = await ack(socket, ChatClientEvent.CONVERSATION_JOIN, { conversationId });
        expect(rejoin.ok ? "joined" : rejoin.error.code).toBe(ChatSocketErrorCode.NOT_FOUND);
        // Typing into the old room is refused (no longer joined).
        const typing = await ack(socket, ChatClientEvent.TYPING_START, { conversationId });
        expect(typing.ok ? "typed" : typing.error.code).toBe(ChatSocketErrorCode.NOT_JOINED);
        socket.close();
      });

      it("a reassigned rider loses the room on revalidation and stops receiving messages", async () => {
        const conversationId = await parcelThread();
        const socket = await connect(baseA, tokens.rider1);
        expect((await ack(socket, ChatClientEvent.CONVERSATION_JOIN, { conversationId })).ok).toBe(
          true,
        );
        await ds.query(`UPDATE "parcels" SET "current_rider_id" = $1 WHERE "id" = $2`, [
          fx.rider3,
          fx.parcelA,
        ]);
        try {
          const revoked = waitFor<{ reason: string }>(socket, ChatServerEvent.MEMBERSHIP_REVOKED);
          const count = await appA.get(ChatGateway).revalidateRooms();
          expect(count).toBeGreaterThanOrEqual(1);
          expect((await revoked).reason).toBe("ineligible");
          const leaked = collect<ChatMessageEvent>(socket, ChatServerEvent.MESSAGE_NEW);
          await send(conversationId, "merchantA", "after reassignment");
          await drainRelay();
          await sleep(400);
          expect(leaked).toEqual([]);
          const rejoin = await ack(socket, ChatClientEvent.CONVERSATION_JOIN, { conversationId });
          expect(rejoin.ok).toBe(false);
        } finally {
          await ds.query(`UPDATE "parcels" SET "current_rider_id" = $1 WHERE "id" = $2`, [
            fx.rider1,
            fx.parcelA,
          ]);
        }
        socket.close();
      });
    });

    /* ================================================================ */
    /* Durable events across instances                                   */
    /* ================================================================ */

    describe("durable realtime fan-out", () => {
      it("a committed message relayed by instance A reaches B's authorized sockets only", async () => {
        const conversationId = await parcelThread();
        const customer = await connect(baseB, tokens.customer);
        const outsider = await connect(baseB, tokens.merchantB);
        const leaked = collect(outsider, ChatServerEvent.MESSAGE_NEW);
        const marker = `cross-instance-${randomUUID()}`;
        const received = waitFor<ChatMessageEvent>(
          customer,
          ChatServerEvent.MESSAGE_NEW,
          (e) => e.message.content === marker,
        );
        const res = await send(conversationId, "merchantA", marker, appA);
        expect(res.status).toBe(201);
        await drainRelay(appA);
        const event = await received;
        expect(event.conversationId).toBe(conversationId);
        expect(event.sequence).toBe(res.body.data.sequence);
        expect(event.eventId).toMatch(/[0-9a-f-]{36}/);
        await sleep(300);
        expect(leaked).toEqual([]);
        customer.close();
        outsider.close();
      });

      it("edit, delete, reaction and pin events are scoped to members", async () => {
        const conversationId = await parcelThread();
        const rider = await connect(baseB, tokens.rider1);
        const outsider = await connect(baseA, tokens.customer2);
        const outsiderEvents = [
          ...[
            ChatServerEvent.MESSAGE_UPDATED,
            ChatServerEvent.MESSAGE_DELETED,
            ChatServerEvent.REACTION_UPDATED,
            ChatServerEvent.PIN_UPDATED,
          ],
        ].map((event) => collect(outsider, event));

        const sent = await send(conversationId, "merchantA", "original");
        const messageId = sent.body.data.id as string;
        await drainRelay();

        const updated = waitFor<ChatMessageEvent>(
          rider,
          ChatServerEvent.MESSAGE_UPDATED,
          (e) => e.message.id === messageId,
        );
        await api()
          .patch(`/api/v1/chat/messages/${messageId}`)
          .set(auth("merchantA"))
          .send({ content: "edited" });
        await drainRelay();
        expect((await updated).message.content).toBe("edited");

        const reacted = waitFor<{ action: string; reaction: string }>(
          rider,
          ChatServerEvent.REACTION_UPDATED,
        );
        await api()
          .post(`/api/v1/chat/messages/${messageId}/reactions`)
          .set(auth("customer"))
          .send({ reaction: "👍" });
        await drainRelay();
        expect(await reacted).toMatchObject({ action: "added", reaction: "👍" });

        // Staff moderator (hub manager of the parcel's hub) pins via intervention-free moderation? Pins need OWNER/MODERATOR:
        await api()
          .post(`/api/v1/chat/admin/conversations/${conversationId}/intervene`)
          .set(auth("admin"))
          .send({ reason: "Pin drill for realtime" });
        await drainRelay();
        const pinned = waitFor<{ action: string; messageId: string }>(
          rider,
          ChatServerEvent.PIN_UPDATED,
        );
        expect(
          (
            await api()
              .post(`/api/v1/chat/conversations/${conversationId}/pins`)
              .set(auth("admin"))
              .send({ messageId })
          ).status,
        ).toBe(200);
        await drainRelay();
        expect(await pinned).toMatchObject({ action: "pinned", messageId });

        const deleted = waitFor<{ messageId: string; moderated: boolean }>(
          rider,
          ChatServerEvent.MESSAGE_DELETED,
        );
        await api().delete(`/api/v1/chat/messages/${messageId}`).set(auth("merchantA"));
        await drainRelay();
        expect(await deleted).toMatchObject({ messageId, moderated: false });

        await sleep(300);
        for (const list of outsiderEvents) expect(list).toEqual([]);
        rider.close();
        outsider.close();
      });

      it("cursor updates sync across the reader's devices and are authorized", async () => {
        const conversationId = await parcelThread();
        await send(conversationId, "merchantA", "please read");
        await drainRelay();
        const deviceA = await connect(baseA, tokens.customer);
        const deviceB = await connect(baseB, tokens.customer);
        const head = (
          await ds.query(
            `SELECT "last_message_sequence"::text AS s FROM "chat_conversations" WHERE "id" = $1`,
            [conversationId],
          )
        )[0].s as string;

        const synced = waitFor<{ userId: string; lastReadSequence: string }>(
          deviceB,
          ChatServerEvent.CURSOR_UPDATED,
          (e) => e.userId === fx.users.customer?.id && e.lastReadSequence === head,
        );
        const res = await ack<{ lastReadSequence: string; unreadCount: number }>(
          deviceA,
          ChatClientEvent.CURSOR_READ,
          {
            conversationId,
            lastReadSequence: head,
          },
        );
        expect(res.ok && res.data.lastReadSequence).toBe(head);
        await drainRelay();
        expect((await synced).lastReadSequence).toBe(head);

        const backwards = await ack<{ lastReadSequence: string }>(
          deviceA,
          ChatClientEvent.CURSOR_READ,
          {
            conversationId,
            lastReadSequence: "1",
          },
        );
        expect(backwards.ok && backwards.data.lastReadSequence).toBe(head); // never moves backwards
        const beyond = await ack(deviceA, ChatClientEvent.CURSOR_READ, {
          conversationId,
          lastReadSequence: String(BigInt(head) + 50n),
        });
        expect(beyond.ok ? "ok" : beyond.error.code).toBe(ChatSocketErrorCode.INVALID_SEQUENCE);

        const outsider = await connect(baseA, tokens.merchantB);
        const denied = await ack(outsider, ChatClientEvent.CURSOR_READ, {
          conversationId,
          lastReadSequence: "1",
        });
        expect(denied.ok ? "ok" : denied.error.code).toBe(ChatSocketErrorCode.NOT_FOUND);
        deviceA.close();
        deviceB.close();
        outsider.close();
      });

      it("a rolled-back message produces no realtime event", async () => {
        const conversationId = await parcelThread();
        const customer = await connect(baseB, tokens.customer);
        const events = collect<ChatMessageEvent>(customer, ChatServerEvent.MESSAGE_NEW);
        const spy = vi
          .spyOn(appA.get(ChatEventsService), "append")
          .mockRejectedValueOnce(new Error("outbox down"));
        try {
          expect((await send(conversationId, "merchantA", "never committed")).status).toBe(500);
        } finally {
          spy.mockRestore();
        }
        await drainRelay();
        await sleep(400);
        expect(events.filter((e) => e.message.content === "never committed")).toEqual([]);
        customer.close();
      });

      it("duplicate outbox processing re-emits the same eventId (client dedupe key) without side effects", async () => {
        const conversationId = await parcelThread();
        const customer = await connect(baseB, tokens.customer);
        const events = collect<ChatMessageEvent>(customer, ChatServerEvent.MESSAGE_NEW);
        const sent = await send(conversationId, "merchantA", "dup-check");
        await drainRelay();
        const [row] = await ds.query(
          `SELECT "event_id", "event_type", "aggregate_type", "aggregate_id", "actor_id", "payload", "createdAt" FROM "event_outbox" WHERE "payload"->>'messageId' = $1`,
          [sent.body.data.id],
        );
        const handler = appA.get<RealtimeFanoutHandler>(REALTIME_FANOUT_HANDLER);
        const replay = {
          eventId: row.event_id as string,
          eventType: row.event_type as DomainEventType,
          aggregateType: row.aggregate_type as string,
          aggregateId: row.aggregate_id as string,
          actorId: row.actor_id as string | null,
          payload: row.payload as Record<string, unknown>,
          createdAt: new Date(row.createdAt as string),
        };
        await handler.handle(replay);
        await handler.handle(replay);
        await sleep(500);
        const mine = events.filter((e) => e.message.id === sent.body.data.id);
        expect(mine.length).toBe(3);
        expect(new Set(mine.map((e) => e.eventId)).size).toBe(1);
        const [{ count }] = await ds.query(
          `SELECT count(*)::int AS count FROM "chat_messages" WHERE "id" = $1`,
          [sent.body.data.id],
        );
        expect(count).toBe(1);
        customer.close();
      });

      it("reconnecting clients recover missed messages via afterSequence gap-fill", async () => {
        const conversationId = await parcelThread();
        const socket = await connect(baseB, tokens.customer);
        const join = await ack<ChatSocketJoinResult>(socket, ChatClientEvent.CONVERSATION_JOIN, {
          conversationId,
        });
        const lastSeen = join.ok ? join.data.lastMessageSequence : "0";
        socket.close();

        await send(conversationId, "merchantA", "missed-1");
        await send(conversationId, "rider1", "missed-2");
        await drainRelay();

        const back = await connect(baseB, tokens.customer);
        const rejoin = await ack<ChatSocketJoinResult>(back, ChatClientEvent.CONVERSATION_JOIN, {
          conversationId,
        });
        expect(rejoin.ok).toBe(true);
        if (!rejoin.ok) return;
        expect(BigInt(rejoin.data.lastMessageSequence) - BigInt(lastSeen)).toBe(2n);
        const gap = await api(appB)
          .get(
            `/api/v1/chat/conversations/${conversationId}/messages?afterSequence=${lastSeen}&limit=100`,
          )
          .set(auth("customer"));
        expect(gap.body.data.items.map((m: { content: string }) => m.content)).toEqual([
          "missed-1",
          "missed-2",
        ]);
        back.close();
      });
    });

    /* ================================================================ */
    /* Ephemeral: typing and presence                                    */
    /* ================================================================ */

    describe("typing and presence", () => {
      it("typing reaches joined members only, is throttled, and expires automatically", async () => {
        const conversationId = await parcelThread();
        const merchant = await connect(baseA, tokens.merchantA);
        const customer = await connect(baseB, tokens.customer);
        const notJoined = await connect(baseB, tokens.rider1);
        for (const s of [merchant, customer]) {
          expect((await ack(s, ChatClientEvent.CONVERSATION_JOIN, { conversationId })).ok).toBe(
            true,
          );
        }
        const typingEvents = collect<{ isTyping: boolean; userId: string }>(
          customer,
          ChatServerEvent.TYPING,
        );
        const leaked = collect(notJoined, ChatServerEvent.TYPING);
        expect((await ack(notJoined, ChatClientEvent.TYPING_START, { conversationId })).ok).toBe(
          false,
        );

        for (let i = 0; i < 5; i += 1)
          await ack(merchant, ChatClientEvent.TYPING_START, { conversationId });
        await sleep(500);
        expect(typingEvents.filter((e) => e.isTyping)).toHaveLength(1); // throttled
        const stopped = await waitFor<{ isTyping: boolean }>(
          customer,
          ChatServerEvent.TYPING,
          (e) => !e.isTyping,
          9000,
        );
        expect(stopped.isTyping).toBe(false); // auto-expired without an explicit stop
        expect(leaked).toEqual([]);
        merchant.close();
        customer.close();
        notJoined.close();
      }, 20_000);

      it("disconnect clears typing state", async () => {
        const conversationId = await parcelThread();
        const merchant = await connect(baseA, tokens.merchantA);
        const customer = await connect(baseB, tokens.customer);
        for (const s of [merchant, customer])
          await ack(s, ChatClientEvent.CONVERSATION_JOIN, { conversationId });
        const started = waitFor<{ isTyping: boolean }>(
          customer,
          ChatServerEvent.TYPING,
          (e) => e.isTyping,
        );
        await ack(merchant, ChatClientEvent.TYPING_START, { conversationId });
        await started;
        const stopped = waitFor<{ isTyping: boolean }>(
          customer,
          ChatServerEvent.TYPING,
          (e) => !e.isTyping,
          3000,
        );
        merchant.close();
        expect((await stopped).isTyping).toBe(false);
        customer.close();
      });

      it("presence is multi-device safe and visible only within shared conversations", async () => {
        const conversationId = await parcelThread();
        const watcher = await connect(baseA, tokens.merchantA);
        await ack(watcher, ChatClientEvent.CONVERSATION_JOIN, { conversationId });
        const outsider = await connect(baseA, tokens.customer2);
        const outsiderPresence = collect(outsider, ChatServerEvent.PRESENCE);
        const presenceEvents = collect<{ userId: string; status: string }>(
          watcher,
          ChatServerEvent.PRESENCE,
        );

        const phone = await connect(baseB, tokens.rider1);
        const laptop = await connect(baseA, tokens.rider1);
        phone.close(); // laptop still connected -> no offline
        await sleep(600);
        expect(
          presenceEvents.filter((e) => e.userId === fx.users.rider1?.id && e.status === "offline"),
        ).toEqual([]);
        const query = await ack<Array<{ userId: string; status: string }>>(
          watcher,
          ChatClientEvent.PRESENCE_QUERY,
          { conversationId },
        );
        expect(query.ok && query.data.find((p) => p.userId === fx.users.rider1?.id)?.status).toBe(
          "online",
        );

        const offline = waitFor<{ userId: string; status: string }>(
          watcher,
          ChatServerEvent.PRESENCE,
          (e) => e.userId === fx.users.rider1?.id && e.status === "offline",
        );
        laptop.close();
        expect((await offline).status).toBe("offline");
        expect(outsiderPresence).toEqual([]);
        const denied = await ack(outsider, ChatClientEvent.PRESENCE_QUERY, { conversationId });
        expect(denied.ok ? "ok" : denied.error.code).toBe(ChatSocketErrorCode.NOT_JOINED);
        watcher.close();
        outsider.close();
      });
    });

    /* ================================================================ */
    /* Abuse protection                                                  */
    /* ================================================================ */

    describe("abuse protection", () => {
      it("event floods are rate limited and eventually disconnected; the API stays responsive", async () => {
        const conversationId = await parcelThread();
        const socket = await connect(baseA, tokens.customer);
        const disconnected = new Promise<boolean>((resolve) =>
          socket.on("disconnect", () => resolve(true)),
        );
        const results = await Promise.all(
          Array.from({ length: 80 }, () =>
            ack<unknown>(socket, ChatClientEvent.TYPING_STOP, { conversationId }).catch(() => null),
          ),
        );
        const limited = results.filter(
          (r) => r && !r.ok && r.error.code === ChatSocketErrorCode.RATE_LIMITED,
        );
        expect(limited.length).toBeGreaterThan(0);
        expect(await Promise.race([disconnected, sleep(3000).then(() => false)])).toBe(true);
        expect((await api().get("/api/v1/chat/conversations").set(auth("customer"))).status).toBe(
          200,
        );
      });

      it("oversized packets are refused without affecting the server", async () => {
        const socket = await connect(baseA, tokens.customer);
        const disconnected = new Promise<boolean>((resolve) =>
          socket.on("disconnect", () => resolve(true)),
        );
        socket.emit(ChatClientEvent.CONVERSATION_JOIN, { conversationId: "x".repeat(200_000) });
        expect(await Promise.race([disconnected, sleep(3000).then(() => false)])).toBe(true);
        expect((await api().get("/api/v1/health/realtime")).body.gatewayInitialized).toBe(true);
      });
    });

    /* ================================================================ */
    /* Redis outage                                                      */
    /* ================================================================ */

    describe.skipIf(!REDIS_CONTAINER)("Redis outage and recovery", () => {
      it("keeps durable messages, retries fan-out, and recovers cross-instance delivery", async () => {
        const conversationId = await parcelThread();
        const customer = await connect(baseB, tokens.customer);
        execFileSync("docker", ["stop", REDIS_CONTAINER as string], { stdio: "ignore" });
        try {
          for (let i = 0; i < 40 && appA.get(ChatRedisService).status().healthy; i += 1)
            await sleep(250);
          expect(appA.get(ChatRedisService).status().healthy).toBe(false);
          const health = await api().get("/api/v1/health/realtime");
          expect(health.body.status).not.toBe("ready"); // degraded or not_ready, never "ready"

          const marker = `outage-${randomUUID()}`;
          const sent = await send(conversationId, "merchantA", marker);
          expect(sent.status).toBe(201); // REST + PostgreSQL unaffected
          await appA.get(OutboxRelayService).pollOnce(100);
          const [row] = await ds.query(
            `SELECT "status", "attempt_count", "last_error" FROM "event_outbox" WHERE "payload"->>'messageId' = $1`,
            [sent.body.data.id],
          );
          expect(row.status).toBe("PENDING"); // retryable, not lost
          expect(row.attempt_count).toBeGreaterThanOrEqual(1);
          expect(String(row.last_error)).toMatch(/unavailable/i);

          execFileSync("docker", ["start", REDIS_CONTAINER as string], { stdio: "ignore" });
          for (let i = 0; i < 80; i += 1) {
            if (
              appA.get(ChatRedisService).status().healthy &&
              appB.get(ChatRedisService).status().healthy
            )
              break;
            await sleep(250);
          }
          expect(appB.get(ChatRedisService).status().healthy).toBe(true);
          await sleep(500); // subscriber re-subscribed
          const received = waitFor<ChatMessageEvent>(
            customer,
            ChatServerEvent.MESSAGE_NEW,
            (e) => e.message.content === marker,
            8000,
          );
          await ds.query(
            `UPDATE "event_outbox" SET "available_at" = now() WHERE "status" = 'PENDING'`,
          );
          await drainRelay();
          expect((await received).message.content).toBe(marker);
          const [after] = await ds.query(
            `SELECT "status" FROM "event_outbox" WHERE "payload"->>'messageId' = $1`,
            [sent.body.data.id],
          );
          expect(after.status).toBe("PUBLISHED");
        } finally {
          try {
            execFileSync("docker", ["start", REDIS_CONTAINER as string], { stdio: "ignore" });
          } catch {
            // already running
          }
        }
        customer.close();
      }, 60_000);
    });
  },
);
