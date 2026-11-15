import { HttpException, HttpStatus, Logger, type OnModuleDestroy } from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  type OnGatewayInit,
} from "@nestjs/websockets";
import { type Namespace, type Socket } from "socket.io";
import { type ZodType, type ZodTypeDef } from "zod";
import {
  ApiErrorCode,
  CHAT_MAX_JOINED_CONVERSATIONS_PER_SOCKET,
  CHAT_SOCKET_NAMESPACE,
  CHAT_TYPING_TTL_MS,
  ChatClientEvent,
  ChatParticipantStatus,
  ChatServerEvent,
  ChatSocketErrorCode,
  chatSocketConversationSchema,
  chatSocketDeliveredSchema,
  chatSocketPresenceQuerySchema,
  chatSocketReadSchema,
  type ChatCursorState,
  type ChatMembershipRevokedEvent,
  type ChatPresenceEntry,
  type ChatPresenceEvent,
  type ChatSessionReady,
  type ChatSocketAck,
  type ChatSocketJoinResult,
  type ChatTypingEvent,
} from "@dhruto/contracts";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { ChatParticipant } from "../../database/entities/index.js";
import { SOCKET_SERVER_OPTIONS } from "../../common/websocket/socket-server.options.js";
import { type AuthenticatedUser } from "../../auth/jwt/jwt.interface.js";
import { ChatAuthorizationService } from "../services/chat-authorization.service.js";
import { ChatCursorService } from "../services/chat-cursor.service.js";
import { conversationIdFromRoom, conversationRoom, userRoom } from "./chat-rooms.js";
import { ChatPresenceService } from "./chat-presence.service.js";
import { ChatRealtimeMetricsService } from "./chat-realtime-metrics.service.js";
import { loadChatRealtimeConfig, type ChatRealtimeConfig } from "./chat-realtime.config.js";
import { ChatRedisService } from "./chat-redis.service.js";
import { ChatSocketAuthError, ChatSocketAuthenticator } from "./chat-socket-auth.js";
import { ChatSocketServer } from "./chat-socket-server.js";
import { ChatTypingTracker } from "./chat-typing.tracker.js";
import { TokenBucket } from "./token-bucket.js";

interface ChatSession {
  user: AuthenticatedUser;
  expiresAt: number;
  events: TokenBucket;
  joins: TokenBucket;
  strikes: number;
  typing: ChatTypingTracker;
  expiryTimer: ReturnType<typeof setTimeout> | null;
}

const MAX_TIMER_MS = 2_147_483_647;
const PRESENCE_FANOUT_CONVERSATIONS = 200;

const fail = (code: ChatSocketErrorCode, message: string): ChatSocketAck<never> => ({
  ok: false,
  error: { code, message },
});

/**
 * Realtime chat gateway — namespace `/chat`.
 *
 * Coexistence with S-1: the legacy guard is per-socket middleware installed
 * only on default-namespace (`/`) sockets by NotificationsGateway. `/chat`
 * sockets are distinct Socket objects, so legitimate chat events never reach
 * that guard, and this namespace exposes no `chat:`-prefixed events.
 *
 * Security model:
 *  - handshake authentication (ChatSocketAuthenticator) — no session, no socket;
 *  - rooms are joined only by the server: `u:<userId>` on connect, `c:<id>`
 *    after ChatAuthorizationService.requireMember (membership + live
 *    eligibility); joined rooms are re-authorized periodically and on removal;
 *  - durable events are delivered by the outbox fan-out to `u:` rooms of
 *    currently eligible participants, never to client-chosen rooms;
 *  - every inbound event is rate limited (token bucket), schema-validated and
 *    authorized; failures are returned as typed acks, never thrown.
 */
@WebSocketGateway({ ...SOCKET_SERVER_OPTIONS, namespace: CHAT_SOCKET_NAMESPACE })
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy
{
  @WebSocketServer()
  nsp: Namespace;

  private readonly logger = new Logger(ChatGateway.name);
  private readonly config: ChatRealtimeConfig = loadChatRealtimeConfig();
  private readonly sessions = new Map<string, ChatSession>();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private revalidateTimer: ReturnType<typeof setInterval> | null = null;
  private revalidating = false;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly authenticator: ChatSocketAuthenticator,
    private readonly authz: ChatAuthorizationService,
    private readonly cursors: ChatCursorService,
    private readonly presence: ChatPresenceService,
    private readonly redis: ChatRedisService,
    private readonly metrics: ChatRealtimeMetricsService,
    private readonly socketServer: ChatSocketServer,
  ) {}

  /* ---------------------------------------------------------------- */
  /* Lifecycle                                                         */
  /* ---------------------------------------------------------------- */

  afterInit(nsp: Namespace): void {
    this.socketServer.register(nsp);
    this.redis.attachAdapter(nsp.server);
    this.metrics.presenceBackend = () => this.presence.backend();
    nsp.use((socket, next) => {
      this.authenticator
        .authenticate(socket)
        .then((identity) => {
          this.pendingIdentity.set(socket.id, identity);
          next();
        })
        .catch((error: unknown) => {
          this.metrics.connectionRejected();
          const authError =
            error instanceof ChatSocketAuthError
              ? error
              : new ChatSocketAuthError(ChatSocketErrorCode.INTERNAL, "Authentication failed");
          if (!(error instanceof ChatSocketAuthError)) {
            this.logger.error(
              `SOCKET_AUTH_ERROR socket=${socket.id}`,
              error instanceof Error ? error.stack : undefined,
            );
          }
          this.logger.log(`SOCKET_REJECTED socket=${socket.id} code=${authError.data.code}`);
          next(authError);
        });
    });
    this.heartbeatTimer = setInterval(() => void this.heartbeat(), this.config.presenceHeartbeatMs);
    this.heartbeatTimer.unref?.();
    this.revalidateTimer = setInterval(
      () => void this.revalidateRooms(),
      this.config.roomRevalidateMs,
    );
    this.revalidateTimer.unref?.();
    this.metrics.gatewayReady();
    this.logger.log(`Chat gateway ready on namespace ${CHAT_SOCKET_NAMESPACE}`);
  }

  onModuleDestroy(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.revalidateTimer) clearInterval(this.revalidateTimer);
    for (const session of this.sessions.values()) {
      if (session.expiryTimer) clearTimeout(session.expiryTimer);
    }
  }

  /** Identity resolved by the handshake middleware, consumed on connection. */
  private readonly pendingIdentity = new Map<
    string,
    { user: AuthenticatedUser; expiresAt: number }
  >();

  async handleConnection(socket: Socket): Promise<void> {
    const identity = this.pendingIdentity.get(socket.id);
    this.pendingIdentity.delete(socket.id);
    if (!identity) {
      socket.disconnect(true);
      return;
    }
    const { user, expiresAt } = identity;
    const session: ChatSession = {
      user,
      expiresAt,
      events: new TokenBucket(this.config.eventBurst, this.config.eventsPerSecond),
      joins: new TokenBucket(this.config.joinsPerMinute, this.config.joinsPerMinute / 60),
      strikes: 0,
      typing: new ChatTypingTracker((conversationId, isTyping) =>
        this.broadcastTyping(socket, user.id, conversationId, isTyping),
      ),
      expiryTimer: null,
    };
    this.sessions.set(socket.id, session);
    this.metrics.connectionOpened();
    await socket.join(userRoom(user.id));

    session.expiryTimer = setTimeout(
      () => {
        socket.emit(ChatServerEvent.SESSION_EXPIRED, {
          expiresAt: new Date(expiresAt).toISOString(),
        });
        socket.disconnect(true);
      },
      Math.min(Math.max(0, expiresAt - Date.now()), MAX_TIMER_MS),
    );
    session.expiryTimer.unref?.();

    const ready: ChatSessionReady = {
      userId: user.id,
      sessionId: socket.id,
      expiresAt: new Date(expiresAt).toISOString(),
      serverTime: new Date().toISOString(),
    };
    socket.emit(ChatServerEvent.SESSION_READY, ready);
    this.logger.log(
      `SOCKET_CONNECTED nsp=${CHAT_SOCKET_NAMESPACE} socket=${socket.id} user=${user.id} role=${user.role}`,
    );

    if (await this.presence.connected(user.id, socket.id)) {
      await this.broadcastPresence(user.id, "online", null);
    }
  }

  async handleDisconnect(socket: Socket): Promise<void> {
    this.pendingIdentity.delete(socket.id);
    const session = this.sessions.get(socket.id);
    if (!session) return;
    this.sessions.delete(socket.id);
    this.metrics.connectionClosed();
    if (session.expiryTimer) clearTimeout(session.expiryTimer);
    session.typing.stopAll();
    this.logger.log(
      `SOCKET_DISCONNECTED nsp=${CHAT_SOCKET_NAMESPACE} socket=${socket.id} user=${session.user.id}`,
    );
    if (await this.presence.disconnected(session.user.id, socket.id)) {
      await this.broadcastPresence(session.user.id, "offline", new Date().toISOString());
    }
  }

  /* ---------------------------------------------------------------- */
  /* Client events                                                     */
  /* ---------------------------------------------------------------- */

  @SubscribeMessage(ChatClientEvent.CONVERSATION_JOIN)
  async onJoin(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: unknown,
  ): Promise<ChatSocketAck<ChatSocketJoinResult>> {
    const gate = this.admit(socket, body, chatSocketConversationSchema);
    if (!gate.ok) return gate.ack;
    const { session, payload } = gate;
    if (!session.joins.tryRemove()) return this.rateLimited(socket, session);
    const joined = [...socket.rooms].filter((room) => conversationIdFromRoom(room) !== null);
    const room = conversationRoom(payload.conversationId);
    if (!socket.rooms.has(room) && joined.length >= CHAT_MAX_JOINED_CONVERSATIONS_PER_SOCKET) {
      return fail(
        ChatSocketErrorCode.LIMIT_EXCEEDED,
        "Too many joined conversations; leave one first",
      );
    }
    try {
      const access = await this.authz.requireMember(session.user, payload.conversationId);
      await socket.join(room);
      const recipients = await this.authz.eligibleRecipientIds(payload.conversationId);
      const presence: ChatPresenceEntry[] = await this.presence.getPresence(recipients);
      return {
        ok: true,
        data: {
          conversationId: payload.conversationId,
          lastMessageSequence: access.conversation.lastMessageSequence,
          lastReadSequence: access.participant.lastReadSequence,
          lastDeliveredSequence: access.participant.lastDeliveredSequence,
          presence,
        },
      };
    } catch (error) {
      this.metrics.joinDenied();
      return this.toAck(error, "join");
    }
  }

  @SubscribeMessage(ChatClientEvent.CONVERSATION_LEAVE)
  async onLeave(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: unknown,
  ): Promise<ChatSocketAck<{ conversationId: string }>> {
    const gate = this.admit(socket, body, chatSocketConversationSchema);
    if (!gate.ok) return gate.ack;
    gate.session.typing.stop(gate.payload.conversationId);
    await socket.leave(conversationRoom(gate.payload.conversationId));
    return { ok: true, data: { conversationId: gate.payload.conversationId } };
  }

  @SubscribeMessage(ChatClientEvent.TYPING_START)
  onTypingStart(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: unknown,
  ): ChatSocketAck<{ expiresInMs: number }> {
    const gate = this.admit(socket, body, chatSocketConversationSchema);
    if (!gate.ok) return gate.ack;
    if (!socket.rooms.has(conversationRoom(gate.payload.conversationId))) {
      return fail(ChatSocketErrorCode.NOT_JOINED, "Join the conversation first");
    }
    gate.session.typing.start(gate.payload.conversationId);
    return { ok: true, data: { expiresInMs: CHAT_TYPING_TTL_MS } };
  }

  @SubscribeMessage(ChatClientEvent.TYPING_STOP)
  onTypingStop(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: unknown,
  ): ChatSocketAck<{ conversationId: string }> {
    const gate = this.admit(socket, body, chatSocketConversationSchema);
    if (!gate.ok) return gate.ack;
    gate.session.typing.stop(gate.payload.conversationId);
    return { ok: true, data: { conversationId: gate.payload.conversationId } };
  }

  /** Same authorization + monotonic semantics as `POST /chat/conversations/:id/read`. */
  @SubscribeMessage(ChatClientEvent.CURSOR_READ)
  async onRead(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: unknown,
  ): Promise<ChatSocketAck<ChatCursorState>> {
    const gate = this.admit(socket, body, chatSocketReadSchema);
    if (!gate.ok) return gate.ack;
    try {
      const state = await this.cursors.markRead(
        { user: gate.session.user, requestId: null },
        gate.payload.conversationId,
        gate.payload.lastReadSequence,
      );
      return { ok: true, data: state };
    } catch (error) {
      return this.toAck(error, "read");
    }
  }

  @SubscribeMessage(ChatClientEvent.CURSOR_DELIVERED)
  async onDelivered(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: unknown,
  ): Promise<ChatSocketAck<ChatCursorState>> {
    const gate = this.admit(socket, body, chatSocketDeliveredSchema);
    if (!gate.ok) return gate.ack;
    try {
      const state = await this.cursors.markDelivered(
        { user: gate.session.user, requestId: null },
        gate.payload.conversationId,
        gate.payload.lastDeliveredSequence,
      );
      return { ok: true, data: state };
    } catch (error) {
      return this.toAck(error, "delivered");
    }
  }

  /** Presence of a joined conversation's eligible participants only. */
  @SubscribeMessage(ChatClientEvent.PRESENCE_QUERY)
  async onPresence(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: unknown,
  ): Promise<ChatSocketAck<ChatPresenceEntry[]>> {
    const gate = this.admit(socket, body, chatSocketPresenceQuerySchema);
    if (!gate.ok) return gate.ack;
    if (!socket.rooms.has(conversationRoom(gate.payload.conversationId))) {
      return fail(ChatSocketErrorCode.NOT_JOINED, "Join the conversation first");
    }
    const recipients = await this.authz.eligibleRecipientIds(gate.payload.conversationId);
    return { ok: true, data: await this.presence.getPresence(recipients) };
  }

  /* ---------------------------------------------------------------- */
  /* Helpers                                                           */
  /* ---------------------------------------------------------------- */

  /** Session lookup + rate limit + strict schema validation for one inbound event. */
  private admit<T>(
    socket: Socket,
    body: unknown,
    schema: ZodType<T, ZodTypeDef, unknown>,
  ): { ok: true; session: ChatSession; payload: T } | { ok: false; ack: ChatSocketAck<never> } {
    const session = this.sessions.get(socket.id);
    if (!session)
      return { ok: false, ack: fail(ChatSocketErrorCode.UNAUTHENTICATED, "No active session") };
    this.metrics.eventReceived();
    if (!session.events.tryRemove()) return { ok: false, ack: this.rateLimited(socket, session) };
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      this.metrics.eventInvalid();
      return { ok: false, ack: fail(ChatSocketErrorCode.INVALID_PAYLOAD, "Invalid payload") };
    }
    return { ok: true, session, payload: parsed.data };
  }

  private rateLimited(socket: Socket, session: ChatSession): ChatSocketAck<never> {
    this.metrics.eventRateLimited();
    session.strikes += 1;
    if (session.strikes > this.config.maxStrikes) {
      this.logger.warn(`SOCKET_FLOOD_DISCONNECT socket=${socket.id} user=${session.user.id}`);
      socket.emit(ChatServerEvent.SESSION_ERROR, {
        code: ChatSocketErrorCode.RATE_LIMITED,
        message: "Too many events; disconnected",
      });
      // Deferred so already-queued acks/notices flush before the transport closes.
      const timer = setTimeout(() => socket.disconnect(true), 100);
      timer.unref?.();
    }
    return fail(ChatSocketErrorCode.RATE_LIMITED, "Too many events");
  }

  /** Maps service exceptions to safe socket errors (never leaks internals). */
  private toAck(error: unknown, op: string): ChatSocketAck<never> {
    if (error instanceof HttpException) {
      const status = error.getStatus();
      const response = error.getResponse();
      const code =
        typeof response === "object" && response !== null && "error" in response
          ? response.error
          : null;
      if (status === HttpStatus.NOT_FOUND)
        return fail(ChatSocketErrorCode.NOT_FOUND, "Conversation not found");
      if (status === HttpStatus.FORBIDDEN || status === HttpStatus.CONFLICT) {
        return fail(ChatSocketErrorCode.FORBIDDEN, "Not allowed");
      }
      if (code === ApiErrorCode.CHAT_INVALID_SEQUENCE) {
        return fail(ChatSocketErrorCode.INVALID_SEQUENCE, "Sequence is beyond the latest message");
      }
      if (status === HttpStatus.TOO_MANY_REQUESTS)
        return fail(ChatSocketErrorCode.RATE_LIMITED, "Too many requests");
      return fail(ChatSocketErrorCode.INVALID_PAYLOAD, "Request rejected");
    }
    this.logger.error(
      `SOCKET_EVENT_FAILED op=${op}`,
      error instanceof Error ? error.stack : undefined,
    );
    return fail(ChatSocketErrorCode.INTERNAL, "Internal error");
  }

  private broadcastTyping(
    socket: Socket,
    userId: string,
    conversationId: string,
    isTyping: boolean,
  ): void {
    const event: ChatTypingEvent = {
      conversationId,
      userId,
      isTyping,
      expiresInMs: isTyping ? CHAT_TYPING_TTL_MS : 0,
    };
    socket.to(conversationRoom(conversationId)).emit(ChatServerEvent.TYPING, event);
  }

  /**
   * Presence goes only to sockets focused on conversations shared with the
   * user (rooms are membership-checked), limited to conversations the user
   * can currently access. Called on online/offline transitions only.
   */
  private async broadcastPresence(
    userId: string,
    status: "online" | "offline",
    lastSeenAt: string | null,
  ): Promise<void> {
    try {
      const memberships = await this.dataSource.getRepository(ChatParticipant).find({
        where: { userId, status: ChatParticipantStatus.ACTIVE },
        select: ["conversationId"],
        order: { updatedAt: "DESC" },
        take: PRESENCE_FANOUT_CONVERSATIONS,
      });
      const accessible = await this.authz.accessibleConversationIds(
        userId,
        memberships.map((m) => m.conversationId),
      );
      for (const conversationId of accessible) {
        const event: ChatPresenceEvent = { conversationId, userId, status, lastSeenAt };
        this.nsp.to(conversationRoom(conversationId)).emit(ChatServerEvent.PRESENCE, event);
      }
    } catch (error) {
      this.logger.warn(
        `PRESENCE_BROADCAST_FAILED user=${userId} error=${error instanceof Error ? error.message : "unknown"}`,
      );
    }
  }

  private async heartbeat(): Promise<void> {
    const connections = [...this.sessions.entries()].map(([connectionId, session]) => ({
      userId: session.user.id,
      connectionId,
    }));
    await this.presence.heartbeat(connections);
  }

  /**
   * Re-authorizes every joined conversation room of this instance's sockets
   * (batched per user). Catches eligibility changes that produce no chat event
   * (e.g. rider reassignment, hub unassignment) for ephemeral traffic; durable
   * events are already filtered per event by the fan-out.
   */
  async revalidateRooms(): Promise<number> {
    if (this.revalidating) return 0;
    this.revalidating = true;
    let revoked = 0;
    try {
      const byUser = new Map<string, Array<{ socket: Socket; conversationIds: string[] }>>();
      for (const [socketId, session] of this.sessions) {
        const socket = this.nsp.sockets.get(socketId);
        if (!socket) continue;
        const conversationIds = [...socket.rooms]
          .map(conversationIdFromRoom)
          .filter((id): id is string => id !== null);
        if (conversationIds.length === 0) continue;
        const list = byUser.get(session.user.id) ?? [];
        list.push({ socket, conversationIds });
        byUser.set(session.user.id, list);
      }
      for (const [userId, entries] of byUser) {
        const allIds = entries.flatMap((entry) => entry.conversationIds);
        const accessible = await this.authz.accessibleConversationIds(userId, allIds);
        for (const { socket, conversationIds } of entries) {
          for (const conversationId of conversationIds) {
            if (accessible.has(conversationId)) continue;
            this.sessions.get(socket.id)?.typing.stop(conversationId);
            await socket.leave(conversationRoom(conversationId));
            const notice: ChatMembershipRevokedEvent = { conversationId, reason: "ineligible" };
            socket.emit(ChatServerEvent.MEMBERSHIP_REVOKED, notice);
            revoked += 1;
          }
        }
      }
      if (revoked > 0) this.metrics.revoked(revoked);
    } catch (error) {
      this.logger.warn(
        `ROOM_REVALIDATION_FAILED error=${error instanceof Error ? error.message : "unknown"}`,
      );
    } finally {
      this.revalidating = false;
    }
    return revoked;
  }
}
