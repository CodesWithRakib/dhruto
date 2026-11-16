import { z } from "zod";
import {
  type ChatConversationStatus,
  type ChatParticipantRole,
  type ChatParticipantStatus,
} from "./chat.enums.js";
import { chatSequenceSchema, type ChatMessageItem, type ChatSequence } from "./chat.schema.js";

/**
 * Communication Phase 3 — realtime (Socket.IO) protocol contracts.
 *
 * Namespace `/chat` only. Event names deliberately avoid the reserved legacy
 * `chat:` prefix, which the default-namespace NotificationsGateway rejects
 * (finding S-1).
 *
 * Delivery semantics: server events are AT-LEAST-ONCE and BEST-EFFORT. Every
 * durable event carries `eventId` (dedupe key) and, where applicable, the
 * conversation `sequence`; PostgreSQL + the REST gap-fill API
 * (`GET /chat/conversations/:id/messages?afterSequence=`) are the source of
 * truth for recovery.
 */

export const CHAT_SOCKET_NAMESPACE = "/chat";

/** Typing indicators expire automatically after this long without a refresh. */
export const CHAT_TYPING_TTL_MS = 6000;
/** Minimum spacing between broadcast typing:start events per socket+conversation. */
export const CHAT_TYPING_THROTTLE_MS = 2500;
/** Conversation rooms a single socket may have joined at once. */
export const CHAT_MAX_JOINED_CONVERSATIONS_PER_SOCKET = 25;
/** User ids per presence query. */
export const CHAT_PRESENCE_QUERY_MAX_USERS = 50;

/** Client -> server events. */
export enum ChatClientEvent {
  CONVERSATION_JOIN = "conversation:join",
  CONVERSATION_LEAVE = "conversation:leave",
  TYPING_START = "typing:start",
  TYPING_STOP = "typing:stop",
  CURSOR_READ = "cursor:read",
  CURSOR_DELIVERED = "cursor:delivered",
  PRESENCE_QUERY = "presence:query",
}

/** Server -> client events. */
export enum ChatServerEvent {
  SESSION_READY = "session:ready",
  SESSION_ERROR = "session:error",
  SESSION_EXPIRED = "session:expired",
  CONVERSATION_CREATED = "conversation:created",
  CONVERSATION_UPDATED = "conversation:updated",
  PARTICIPANT_UPDATED = "participant:updated",
  MEMBERSHIP_REVOKED = "membership:revoked",
  MESSAGE_NEW = "message:new",
  MESSAGE_UPDATED = "message:updated",
  MESSAGE_DELETED = "message:deleted",
  REACTION_UPDATED = "reaction:updated",
  PIN_UPDATED = "pin:updated",
  CURSOR_UPDATED = "cursor:updated",
  TYPING = "typing",
  PRESENCE = "presence",
}

/** Error codes returned in acks and `session:error`. */
export enum ChatSocketErrorCode {
  UNAUTHENTICATED = "UNAUTHENTICATED",
  TOKEN_EXPIRED = "TOKEN_EXPIRED",
  ORIGIN_NOT_ALLOWED = "ORIGIN_NOT_ALLOWED",
  INVALID_PAYLOAD = "INVALID_PAYLOAD",
  NOT_FOUND = "NOT_FOUND",
  FORBIDDEN = "FORBIDDEN",
  NOT_JOINED = "NOT_JOINED",
  RATE_LIMITED = "RATE_LIMITED",
  LIMIT_EXCEEDED = "LIMIT_EXCEEDED",
  INVALID_SEQUENCE = "INVALID_SEQUENCE",
  INTERNAL = "INTERNAL",
}

/* ------------------------------------------------------------------ */
/* Client payloads (validated server-side; strict)                     */
/* ------------------------------------------------------------------ */

export const chatSocketConversationSchema = z
  .object({ conversationId: z.string().guid() })
  .strict();

export type ChatSocketConversationPayload = z.infer<typeof chatSocketConversationSchema>;

export const chatSocketReadSchema = z
  .object({ conversationId: z.string().guid(), lastReadSequence: chatSequenceSchema })
  .strict();

export type ChatSocketReadPayload = z.infer<typeof chatSocketReadSchema>;

export const chatSocketDeliveredSchema = z
  .object({ conversationId: z.string().guid(), lastDeliveredSequence: chatSequenceSchema })
  .strict();

export type ChatSocketDeliveredPayload = z.infer<typeof chatSocketDeliveredSchema>;

/** Presence of the participants of a conversation the socket has joined. */
export const chatSocketPresenceQuerySchema = chatSocketConversationSchema;

export type ChatSocketPresenceQueryPayload = ChatSocketConversationPayload;

/* ------------------------------------------------------------------ */
/* Acknowledgements                                                    */
/* ------------------------------------------------------------------ */

export interface ChatSocketError {
  code: ChatSocketErrorCode;
  message: string;
}

export type ChatSocketAck<T> = { ok: true; data: T } | { ok: false; error: ChatSocketError };

export interface ChatSocketJoinResult {
  conversationId: string;
  /** Authoritative head; compare with the client's last seen sequence to gap-fill. */
  lastMessageSequence: ChatSequence;
  lastReadSequence: ChatSequence;
  lastDeliveredSequence: ChatSequence;
  /** Presence of active participants (visible because the caller is a member). */
  presence: ChatPresenceEntry[];
}

/* ------------------------------------------------------------------ */
/* Server payloads                                                     */
/* ------------------------------------------------------------------ */

export interface ChatSessionReady {
  userId: string;
  /** Server-side socket session id (diagnostics; not an auth credential). */
  sessionId: string;
  /** When the access token expires; the server disconnects at this time. */
  expiresAt: string;
  serverTime: string;
}

/** Fields present on every durable (outbox-sourced) server event. */
export interface ChatDurableEventBase {
  /** Outbox event id — the client-side deduplication key. */
  eventId: string;
  conversationId: string;
  occurredAt: string;
}

export interface ChatConversationCreatedEvent extends ChatDurableEventBase {
  type: string;
}

export interface ChatConversationUpdatedEvent extends ChatDurableEventBase {
  from: ChatConversationStatus | null;
  status: ChatConversationStatus;
}

export interface ChatParticipantUpdatedEvent extends ChatDurableEventBase {
  userId: string;
  change: "added" | "removed";
  role: ChatParticipantRole | null;
  status: ChatParticipantStatus | null;
}

export interface ChatMembershipRevokedEvent {
  conversationId: string;
  reason: "removed" | "left" | "ineligible";
}

export interface ChatMessageEvent extends ChatDurableEventBase {
  sequence: ChatSequence;
  /**
   * Authoritative message as of fan-out time, loaded from PostgreSQL (deleted
   * messages arrive with `content: null`). `reactions[].reactedByMe` is false:
   * it is viewer-specific — use REST for per-viewer state.
   */
  message: ChatMessageItem;
}

export interface ChatMessageDeletedEvent extends ChatDurableEventBase {
  messageId: string;
  sequence: ChatSequence;
  moderated: boolean;
}

export interface ChatReactionUpdatedEvent extends ChatDurableEventBase {
  messageId: string;
  userId: string;
  reaction: string;
  action: "added" | "removed";
}

export interface ChatPinUpdatedEvent extends ChatDurableEventBase {
  messageId: string;
  action: "pinned" | "unpinned";
  byUserId: string | null;
}

export interface ChatCursorUpdatedEvent extends ChatDurableEventBase {
  userId: string;
  lastReadSequence: ChatSequence;
  lastDeliveredSequence: ChatSequence;
}

export interface ChatTypingEvent {
  conversationId: string;
  userId: string;
  isTyping: boolean;
  /** Client should treat the indicator as stopped after this many ms. */
  expiresInMs: number;
}

export type ChatPresenceStatus = "online" | "offline";

export interface ChatPresenceEntry {
  userId: string;
  status: ChatPresenceStatus;
  /** Present when offline and known (bounded retention). */
  lastSeenAt: string | null;
}

export interface ChatPresenceEvent extends ChatPresenceEntry {
  conversationId: string;
}
