import { z } from "zod";
import {
  ChatAttachmentStatus,
  ChatConversationStatus,
  ChatConversationType,
  ChatMessageType,
  ChatNotificationLevel,
  ChatParticipantRole,
  ChatParticipantStatus,
  ChatReportReason,
} from "./chat.enums.js";
import { type ChatParticipantCapability } from "./chat.policy.js";

/**
 * Communication API boundary contracts (Phase 1 foundation).
 *
 * These describe request/response shapes, NOT database rows. Storage-only
 * fields (attachment storage keys, internal notes on participant payloads,
 * audit data, moderator identities) are deliberately absent from
 * participant-facing types.
 */

/* ------------------------------------------------------------------ */
/* Limits                                                              */
/* ------------------------------------------------------------------ */

/** Maximum message body length (characters). Mirrored by a DB CHECK constraint. */
export const CHAT_MESSAGE_MAX_LENGTH = 4000;
/** Maximum conversation title length. Mirrored by the column length. */
export const CHAT_CONVERSATION_TITLE_MAX_LENGTH = 200;
/** Maximum stored preview length on a conversation. Mirrored by the column length. */
export const CHAT_MESSAGE_PREVIEW_MAX_LENGTH = 280;
export const CHAT_HISTORY_DEFAULT_LIMIT = 50;
export const CHAT_HISTORY_MAX_LIMIT = 100;
export const CHAT_CONVERSATION_LIST_DEFAULT_LIMIT = 20;
export const CHAT_CONVERSATION_LIST_MAX_LIMIT = 50;
export const CHAT_MAX_ATTACHMENTS_PER_MESSAGE = 10;
/** 25 MiB per attachment. Enforced again by the upload pipeline (later phase). */
export const CHAT_ATTACHMENT_MAX_SIZE_BYTES = 25 * 1024 * 1024;
export const CHAT_REACTION_MAX_LENGTH = 32;

/** MIME allow-list; anything else is rejected before an upload slot is issued. */
export const CHAT_ALLOWED_ATTACHMENT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "audio/webm",
  "audio/ogg",
  "audio/mpeg",
  "audio/mp4",
] as const;

export type ChatAttachmentMimeType = (typeof CHAT_ALLOWED_ATTACHMENT_MIME_TYPES)[number];

/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */

/**
 * Per-conversation sequence number. Stored as PostgreSQL BIGINT and carried
 * as a decimal string so values beyond 2^53 never lose precision in JSON.
 */
export const chatSequenceSchema = z
  .string()
  .regex(/^(0|[1-9]\d{0,18})$/, "Sequence must be a non-negative integer string");

export type ChatSequence = z.infer<typeof chatSequenceSchema>;

/** Client-generated message id (UUID) — the idempotency key for sends. */
export const chatClientMessageIdSchema = z.string().uuid();

const messageContentSchema = z
  .string()
  .trim()
  .min(1, "Message content cannot be empty")
  .max(
    CHAT_MESSAGE_MAX_LENGTH,
    `Message content cannot exceed ${CHAT_MESSAGE_MAX_LENGTH} characters`,
  );

/* ------------------------------------------------------------------ */
/* Message metadata (typed per message type; no free-form payloads)    */
/* ------------------------------------------------------------------ */

export const chatLocationMetadataSchema = z
  .object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    accuracyMeters: z.number().nonnegative().max(100_000).optional(),
    label: z.string().trim().max(120).optional(),
  })
  .strict();

export type ChatLocationMetadata = z.infer<typeof chatLocationMetadataSchema>;

/** Machine key of a predefined quick action (e.g. `rider.arriving`). */
export const chatActionKeySchema = z
  .string()
  .regex(/^[a-z][a-z0-9_]*(\.[a-z0-9_]+)*$/, "Invalid action key")
  .max(64);

export const chatQuickActionMetadataSchema = z.object({ actionKey: chatActionKeySchema }).strict();

export type ChatQuickActionMetadata = z.infer<typeof chatQuickActionMetadataSchema>;

export const chatVoiceMetadataSchema = z
  .object({
    durationMs: z
      .number()
      .int()
      .positive()
      .max(10 * 60 * 1000),
  })
  .strict();

export type ChatVoiceMetadata = z.infer<typeof chatVoiceMetadataSchema>;

/**
 * Server-generated system event. Params are scalar only so a system message
 * can never smuggle nested objects, HTML, or secrets into clients.
 */
export const chatSystemEventMetadataSchema = z
  .object({
    eventKey: chatActionKeySchema,
    params: z
      .record(z.union([z.string().max(200), z.number(), z.boolean()]))
      .refine((value) => Object.keys(value).length <= 20, "Too many system event params")
      .optional(),
  })
  .strict();

export type ChatSystemEventMetadata = z.infer<typeof chatSystemEventMetadataSchema>;

export type ChatMessageMetadata =
  ChatLocationMetadata | ChatQuickActionMetadata | ChatVoiceMetadata | ChatSystemEventMetadata;

/* ------------------------------------------------------------------ */
/* Requests                                                            */
/* ------------------------------------------------------------------ */

const sendMessageBase = {
  clientMessageId: chatClientMessageIdSchema,
  replyToMessageId: z.string().uuid().optional(),
};

const attachmentIdsSchema = z
  .array(z.string().uuid())
  .min(1, "At least one attachment is required")
  .max(CHAT_MAX_ATTACHMENTS_PER_MESSAGE)
  .refine((ids) => new Set(ids).size === ids.length, "Duplicate attachment ids");

/**
 * Send-message request. SYSTEM_EVENT is intentionally not a member: system
 * messages are produced only by the server, so a client attempting one fails
 * validation.
 */
export const sendChatMessageSchema = z.discriminatedUnion("type", [
  z
    .object({
      ...sendMessageBase,
      type: z.literal(ChatMessageType.TEXT),
      content: messageContentSchema,
    })
    .strict(),
  z
    .object({
      ...sendMessageBase,
      type: z.literal(ChatMessageType.IMAGE),
      content: messageContentSchema.optional(),
      attachmentIds: attachmentIdsSchema,
    })
    .strict(),
  z
    .object({
      ...sendMessageBase,
      type: z.literal(ChatMessageType.FILE),
      content: messageContentSchema.optional(),
      attachmentIds: attachmentIdsSchema,
    })
    .strict(),
  z
    .object({
      ...sendMessageBase,
      type: z.literal(ChatMessageType.VOICE),
      attachmentIds: attachmentIdsSchema.refine(
        (ids) => ids.length === 1,
        "Voice messages carry exactly one attachment",
      ),
      metadata: chatVoiceMetadataSchema,
    })
    .strict(),
  z
    .object({
      ...sendMessageBase,
      type: z.literal(ChatMessageType.LOCATION),
      content: messageContentSchema.optional(),
      metadata: chatLocationMetadataSchema,
    })
    .strict(),
  z
    .object({
      ...sendMessageBase,
      type: z.literal(ChatMessageType.QUICK_ACTION),
      content: messageContentSchema.optional(),
      metadata: chatQuickActionMetadataSchema,
    })
    .strict(),
]);

export type SendChatMessageRequest = z.infer<typeof sendChatMessageSchema>;

/**
 * Keyset history query: `GET /chat/conversations/:id/messages`.
 * `beforeSequence` pages backwards (scroll up); `afterSequence` pages forward
 * (gap fill after reconnect). They are mutually exclusive; neither = latest page.
 */
export const listChatMessagesQuerySchema = z
  .object({
    beforeSequence: chatSequenceSchema.optional(),
    afterSequence: chatSequenceSchema.optional(),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(CHAT_HISTORY_MAX_LIMIT)
      .default(CHAT_HISTORY_DEFAULT_LIMIT),
  })
  .strict()
  .refine(
    (q) => !(q.beforeSequence !== undefined && q.afterSequence !== undefined),
    "beforeSequence and afterSequence are mutually exclusive",
  );

export type ListChatMessagesQuery = z.infer<typeof listChatMessagesQuerySchema>;

/** `GET /chat/conversations` — the caller's own conversations only. */
export const listChatConversationsQuerySchema = z
  .object({
    type: z.nativeEnum(ChatConversationType).optional(),
    status: z.nativeEnum(ChatConversationStatus).optional(),
    unreadOnly: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .optional(),
    /** Opaque keyset cursor issued by the previous page. */
    cursor: z.string().trim().min(1).max(256).optional(),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(CHAT_CONVERSATION_LIST_MAX_LIMIT)
      .default(CHAT_CONVERSATION_LIST_DEFAULT_LIMIT),
  })
  .strict();

export type ListChatConversationsQuery = z.infer<typeof listChatConversationsQuerySchema>;

/** Advances the caller's read cursor. The server never moves a cursor backwards. */
export const markChatReadSchema = z.object({ lastReadSequence: chatSequenceSchema }).strict();

export type MarkChatReadRequest = z.infer<typeof markChatReadSchema>;

export const updateChatParticipantPreferencesSchema = z
  .object({
    isMuted: z.boolean().optional(),
    mutedUntil: z.string().datetime({ offset: true }).nullable().optional(),
    notificationLevel: z.nativeEnum(ChatNotificationLevel).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "At least one preference is required");

export type UpdateChatParticipantPreferencesRequest = z.infer<
  typeof updateChatParticipantPreferencesSchema
>;

/** Rejects path separators and ASCII control characters (incl. NUL, DEL). */
function isSafeFilename(name: string): boolean {
  for (const char of name) {
    const code = char.charCodeAt(0);
    if (char === "/" || char === "\\" || code < 0x20 || code === 0x7f) return false;
  }
  return true;
}

/** Reserves attachment metadata before upload (upload itself is a later phase). */
export const createChatAttachmentSchema = z
  .object({
    originalFilename: z
      .string()
      .trim()
      .min(1)
      .max(255)
      .refine(isSafeFilename, "Filename contains invalid characters"),
    mimeType: z.enum(CHAT_ALLOWED_ATTACHMENT_MIME_TYPES),
    sizeBytes: z.number().int().positive().max(CHAT_ATTACHMENT_MAX_SIZE_BYTES),
    checksumSha256: z
      .string()
      .regex(/^[a-f0-9]{64}$/, "checksumSha256 must be lowercase hex SHA-256"),
  })
  .strict();

export type CreateChatAttachmentRequest = z.infer<typeof createChatAttachmentSchema>;

export const reportChatMessageSchema = z
  .object({
    reason: z.nativeEnum(ChatReportReason),
    details: z.string().trim().max(1000).optional(),
  })
  .strict();

export type ReportChatMessageRequest = z.infer<typeof reportChatMessageSchema>;

export const chatReactionSchema = z
  .object({ reaction: z.string().trim().min(1).max(CHAT_REACTION_MAX_LENGTH) })
  .strict();

export type ChatReactionRequest = z.infer<typeof chatReactionSchema>;

/* ------------------------------------------------------------------ */
/* Responses                                                           */
/* ------------------------------------------------------------------ */

/** Attachment as seen by participants. Storage keys are never exposed. */
export interface ChatAttachmentItem {
  id: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  status: ChatAttachmentStatus;
  uploadedAt: string | null;
}

export interface ChatReactionSummary {
  reaction: string;
  count: number;
  reactedByMe: boolean;
}

export interface ChatMessageItem {
  id: string;
  conversationId: string;
  sequence: ChatSequence;
  clientMessageId: string | null;
  /** Null for SYSTEM_EVENT messages. */
  senderId: string | null;
  type: ChatMessageType;
  /** Null when the message is deleted or carries no text. */
  content: string | null;
  replyToMessageId: string | null;
  metadata: ChatMessageMetadata | null;
  attachments: ChatAttachmentItem[];
  reactions: ChatReactionSummary[];
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
}

/** Keyset page of history. Sequences let clients detect gaps after reconnects. */
export interface ChatMessagePage {
  items: ChatMessageItem[];
  hasMore: boolean;
  /** Pass as `beforeSequence` to load older messages; null at the beginning. */
  nextBeforeSequence: ChatSequence | null;
  /** Highest sequence on this page; pass as `afterSequence` to gap-fill forward. */
  nextAfterSequence: ChatSequence | null;
  /** Display info for every distinct sender on the page (no N+1 lookups). */
  senders: ChatPageSender[];
}

/** Sender display info carried by history pages. */
export interface ChatPageSender {
  userId: string;
  displayName: string;
  platformRole: string;
}

/** Another participant as seen by conversation members. No phone/email. */
export interface ChatParticipantItem {
  userId: string;
  displayName: string;
  /** Platform role name (the authoritative enum lives in the API). */
  platformRole: string;
  role: ChatParticipantRole;
  status: ChatParticipantStatus;
  joinedAt: string;
  leftAt: string | null;
  lastReadSequence: ChatSequence;
  lastDeliveredSequence: ChatSequence;
}

/** The caller's own membership state, including private preferences. */
export interface ChatMyParticipation {
  role: ChatParticipantRole;
  status: ChatParticipantStatus;
  isMuted: boolean;
  mutedUntil: string | null;
  notificationLevel: ChatNotificationLevel;
  lastReadSequence: ChatSequence;
  lastDeliveredSequence: ChatSequence;
  capabilities: ChatParticipantCapability[];
}

export interface ChatLastMessagePreview {
  id: string;
  sequence: ChatSequence;
  senderId: string | null;
  preview: string | null;
  createdAt: string;
}

export interface ChatConversationSummary {
  id: string;
  type: ChatConversationType;
  title: string | null;
  status: ChatConversationStatus;
  parcelId: string | null;
  hubId: string | null;
  merchantId: string | null;
  lastMessageSequence: ChatSequence;
  lastMessage: ChatLastMessagePreview | null;
  /** `lastMessageSequence - myParticipation.lastReadSequence`, floored at 0. */
  unreadCount: number;
  myParticipation: ChatMyParticipation;
  createdAt: string;
  updatedAt: string;
}

export interface ChatConversationDetail extends ChatConversationSummary {
  participants: ChatParticipantItem[];
  archivedAt: string | null;
  closedAt: string | null;
  lockedAt: string | null;
}

export interface ChatConversationPage {
  items: ChatConversationSummary[];
  nextCursor: string | null;
  hasMore: boolean;
}

/** Staff-only. Never returned by participant-facing endpoints. */
export interface ChatInternalNoteItem {
  id: string;
  conversationId: string;
  authorId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/**
 * Unread count from cursors: O(1) per conversation, no per-message receipts.
 * Inputs are BIGINT strings; BigInt keeps precision beyond 2^53.
 */
export function computeChatUnreadCount(
  lastMessageSequence: ChatSequence,
  lastReadSequence: ChatSequence,
): number {
  const diff = BigInt(lastMessageSequence) - BigInt(lastReadSequence);
  if (diff <= 0n) return 0;
  return diff > BigInt(Number.MAX_SAFE_INTEGER) ? Number.MAX_SAFE_INTEGER : Number(diff);
}
