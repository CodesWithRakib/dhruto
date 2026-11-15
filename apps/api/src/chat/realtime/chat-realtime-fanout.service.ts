import { Injectable, Logger } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import {
  ChatConversationStatus,
  ChatParticipantRole,
  ChatParticipantStatus,
  ChatServerEvent,
  DomainEventType,
  type ChatConversationCreatedEvent,
  type ChatConversationUpdatedEvent,
  type ChatCursorUpdatedEvent,
  type ChatMembershipRevokedEvent,
  type ChatMessageDeletedEvent,
  type ChatMessageEvent,
  type ChatParticipantUpdatedEvent,
  type ChatPinUpdatedEvent,
  type ChatReactionUpdatedEvent,
} from "@dhruto/contracts";
import { ChatMessage } from "../../database/entities/index.js";
import {
  type RealtimeFanoutHandler,
  type RealtimeOutboxEvent,
} from "../../integrations/realtime-fanout.port.js";
import { ChatAuthorizationService } from "../services/chat-authorization.service.js";
import { ChatMessageReaderService } from "../services/chat-message-reader.service.js";
import { conversationRoom, userRoom } from "./chat-rooms.js";
import { ChatRealtimeMetricsService } from "./chat-realtime-metrics.service.js";
import { ChatRedisService } from "./chat-redis.service.js";
import { ChatSocketServer } from "./chat-socket-server.js";

type Payload = Record<string, unknown>;

const str = (payload: Payload, key: string): string | null => {
  const value = payload[key];
  return typeof value === "string" ? value : null;
};

/** Narrows an untrusted string to a member of `values` without type assertions. */
function oneOf<T extends string>(values: readonly T[], value: string | null): T | null {
  return values.find((candidate) => candidate === value) ?? null;
}

const asStatus = (value: string | null) => oneOf(Object.values(ChatConversationStatus), value);
const asRole = (value: string | null) => oneOf(Object.values(ChatParticipantRole), value);
const asParticipantStatus = (value: string | null) =>
  oneOf(Object.values(ChatParticipantStatus), value);

export class RealtimeUnavailableError extends Error {}

/**
 * Durable chat events -> sockets (registered as the relay's
 * REALTIME_FANOUT_HANDLER).
 *
 * Flow: business transaction commits message + outbox row -> relay claims the
 * row -> this handler resolves the CURRENTLY eligible recipients, loads any
 * client-facing data from PostgreSQL (outbox payloads are content-free), and
 * emits to each recipient's per-user room `u:<id>` (all their devices, on any
 * instance via the Redis adapter).
 *
 * Semantics: at-least-once, best-effort. The handler is idempotent (re-emits
 * carry the same `eventId`, clients dedupe). It throws — so the relay retries
 * with backoff — when this process has no gateway or when Redis distribution
 * is known to be broken. Lost/late events are recovered by clients through
 * `GET /chat/conversations/:id/messages?afterSequence=` (sequence gaps).
 */
@Injectable()
export class ChatRealtimeFanoutService implements RealtimeFanoutHandler {
  private readonly logger = new Logger(ChatRealtimeFanoutService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly authz: ChatAuthorizationService,
    private readonly reader: ChatMessageReaderService,
    private readonly sockets: ChatSocketServer,
    private readonly redis: ChatRedisService,
    private readonly metrics: ChatRealtimeMetricsService,
  ) {}

  async handle(event: RealtimeOutboxEvent): Promise<void> {
    const nsp = this.sockets.namespace();
    if (!nsp) {
      this.metrics.fanoutFailure();
      throw new RealtimeUnavailableError("Realtime gateway not initialised in this process");
    }
    if (!this.redis.isDistributionHealthy() && !(await this.redis.probe())) {
      this.metrics.fanoutFailure();
      throw new RealtimeUnavailableError("Realtime Redis distribution unavailable; will retry");
    }

    const conversationId = str(event.payload, "conversationId") ?? event.aggregateId;
    const recipients = await this.authz.eligibleRecipientIds(conversationId);
    const base = {
      eventId: event.eventId,
      conversationId,
      occurredAt: event.createdAt.toISOString(),
    };
    const toRecipients = (userIds: readonly string[]) => nsp.to(userIds.map(userRoom));

    switch (event.eventType) {
      case DomainEventType.CHAT_MESSAGE_CREATED:
      case DomainEventType.CHAT_MESSAGE_EDITED: {
        const messageId = str(event.payload, "messageId");
        const message = messageId
          ? await this.dataSource.getRepository(ChatMessage).findOne({ where: { id: messageId } })
          : null;
        if (!message || message.conversationId !== conversationId)
          return this.skip(event, "message missing");
        const payload: ChatMessageEvent = {
          ...base,
          sequence: message.sequence,
          message: await this.reader.getMessageItem(message, null),
        };
        toRecipients(recipients).emit(
          event.eventType === DomainEventType.CHAT_MESSAGE_CREATED
            ? ChatServerEvent.MESSAGE_NEW
            : ChatServerEvent.MESSAGE_UPDATED,
          payload,
        );
        break;
      }
      case DomainEventType.CHAT_MESSAGE_DELETED: {
        const payload: ChatMessageDeletedEvent = {
          ...base,
          messageId: str(event.payload, "messageId") ?? "",
          sequence: str(event.payload, "sequence") ?? "0",
          moderated: event.payload.moderated === true,
        };
        toRecipients(recipients).emit(ChatServerEvent.MESSAGE_DELETED, payload);
        break;
      }
      case DomainEventType.CHAT_MESSAGE_REACTED: {
        const payload: ChatReactionUpdatedEvent = {
          ...base,
          messageId: str(event.payload, "messageId") ?? "",
          userId: str(event.payload, "userId") ?? "",
          reaction: str(event.payload, "reaction") ?? "",
          action: event.payload.action === "removed" ? "removed" : "added",
        };
        toRecipients(recipients).emit(ChatServerEvent.REACTION_UPDATED, payload);
        break;
      }
      case DomainEventType.CHAT_MESSAGE_PINNED:
      case DomainEventType.CHAT_MESSAGE_UNPINNED: {
        const payload: ChatPinUpdatedEvent = {
          ...base,
          messageId: str(event.payload, "messageId") ?? "",
          action: event.eventType === DomainEventType.CHAT_MESSAGE_PINNED ? "pinned" : "unpinned",
          byUserId: str(event.payload, "byUserId"),
        };
        toRecipients(recipients).emit(ChatServerEvent.PIN_UPDATED, payload);
        break;
      }
      case DomainEventType.CHAT_MESSAGE_READ:
      case DomainEventType.CHAT_MESSAGE_DELIVERED: {
        const payload: ChatCursorUpdatedEvent = {
          ...base,
          userId: str(event.payload, "userId") ?? "",
          lastReadSequence: str(event.payload, "lastReadSequence") ?? "0",
          lastDeliveredSequence: str(event.payload, "lastDeliveredSequence") ?? "0",
        };
        // Includes the reader's own other devices (multi-device sync).
        toRecipients(recipients).emit(ChatServerEvent.CURSOR_UPDATED, payload);
        break;
      }
      case DomainEventType.CHAT_CONVERSATION_ARCHIVED:
      case DomainEventType.CHAT_CONVERSATION_CLOSED:
      case DomainEventType.CHAT_CONVERSATION_STATUS_CHANGED: {
        const status = asStatus(str(event.payload, "to"));
        if (!status) return this.skip(event, "invalid status");
        const payload: ChatConversationUpdatedEvent = {
          ...base,
          from: asStatus(str(event.payload, "from")),
          status,
        };
        toRecipients(recipients).emit(ChatServerEvent.CONVERSATION_UPDATED, payload);
        break;
      }
      case DomainEventType.CHAT_CONVERSATION_CREATED: {
        const payload: ChatConversationCreatedEvent = {
          ...base,
          type: str(event.payload, "type") ?? "",
        };
        toRecipients(recipients).emit(ChatServerEvent.CONVERSATION_CREATED, payload);
        break;
      }
      case DomainEventType.CHAT_PARTICIPANT_ADDED:
      case DomainEventType.CHAT_PARTICIPANT_REMOVED: {
        const userId = str(event.payload, "userId");
        if (!userId) return this.skip(event, "missing userId");
        const removed = event.eventType === DomainEventType.CHAT_PARTICIPANT_REMOVED;
        const payload: ChatParticipantUpdatedEvent = {
          ...base,
          userId,
          change: removed ? "removed" : "added",
          role: asRole(str(event.payload, "role")),
          status: asParticipantStatus(str(event.payload, "status")),
        };
        toRecipients(recipients).emit(ChatServerEvent.PARTICIPANT_UPDATED, payload);
        if (removed && !recipients.includes(userId)) {
          await this.revoke(
            userId,
            conversationId,
            payload.status === ChatParticipantStatus.LEFT ? "left" : "removed",
          );
        }
        break;
      }
      default:
        return this.skip(event, "not a chat realtime event");
    }
    this.metrics.fanoutDone(Date.now() - event.createdAt.getTime());
  }

  /** Evicts a user's sockets (every instance) from a conversation room and notifies them. */
  async revoke(
    userId: string,
    conversationId: string,
    reason: ChatMembershipRevokedEvent["reason"],
  ): Promise<void> {
    const nsp = this.sockets.namespace();
    if (!nsp) return;
    nsp.in(userRoom(userId)).socketsLeave(conversationRoom(conversationId));
    const notice: ChatMembershipRevokedEvent = { conversationId, reason };
    nsp.to(userRoom(userId)).emit(ChatServerEvent.MEMBERSHIP_REVOKED, notice);
    this.metrics.revoked();
  }

  private skip(event: RealtimeOutboxEvent, why: string): void {
    this.metrics.fanoutSkip();
    this.logger.debug(
      `REALTIME_FANOUT_SKIPPED event=${event.eventType} id=${event.eventId} reason=${why}`,
    );
  }
}
