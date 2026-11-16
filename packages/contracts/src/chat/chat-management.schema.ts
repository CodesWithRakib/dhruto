import { z } from "zod";
import { ChatConversationType, ChatMessageType, ChatParticipantRole } from "./chat.enums.js";
import {
  CHAT_CONVERSATION_TITLE_MAX_LENGTH,
  CHAT_MESSAGE_MAX_LENGTH,
  chatSequenceSchema,
  type ChatSequence,
} from "./chat.schema.js";

/**
 * Communication Phase 2 — conversation, participant, message-management and
 * search request contracts. Bodies are `.strict()`: unknown keys (e.g. a
 * client-supplied `senderId`, `role` on create, or `merchantId` where the
 * server derives it) are rejected rather than silently ignored.
 */

/** Maximum participants in GROUP / HUB_OPERATIONS / INTERNAL_SUPERVISOR conversations. */
export const CHAT_GROUP_MAX_PARTICIPANTS = 50;
/** Maximum pinned messages per conversation. */
export const CHAT_MAX_PINS_PER_CONVERSATION = 50;
/** Maximum distinct reactions a user may place on a single message. */
export const CHAT_MAX_REACTIONS_PER_USER_PER_MESSAGE = 10;
export const CHAT_SEARCH_DEFAULT_LIMIT = 20;
export const CHAT_SEARCH_MAX_LIMIT = 50;
/** Minimum length of a staff justification (admin access, moderation). */
export const CHAT_REASON_MIN_LENGTH = 10;
export const CHAT_REASON_MAX_LENGTH = 500;

const titleSchema = z.string().trim().min(1).max(CHAT_CONVERSATION_TITLE_MAX_LENGTH);

const participantIdsSchema = (min: number) =>
  z
    .array(z.string().guid())
    .min(min)
    .max(CHAT_GROUP_MAX_PARTICIPANTS - 1)
    .refine((ids) => new Set(ids).size === ids.length, "Duplicate participant ids");

export const chatReasonSchema = z
  .string()
  .trim()
  .min(CHAT_REASON_MIN_LENGTH, `Reason must be at least ${CHAT_REASON_MIN_LENGTH} characters`)
  .max(CHAT_REASON_MAX_LENGTH);

/* ------------------------------------------------------------------ */
/* Conversations                                                       */
/* ------------------------------------------------------------------ */

/**
 * Create (or get) a conversation. Scope ownership is never taken on trust:
 * the server validates `parcelId` / `hubId` / `merchantId` against the
 * authenticated user, and derives a merchant's own `merchantId` itself.
 *
 * Idempotent (get-or-create): PARCEL_DELIVERY (per parcel), MERCHANT_DESK
 * (per merchant), DIRECT (per user pair). Other types always create.
 */
export const createChatConversationSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal(ChatConversationType.PARCEL_DELIVERY),
      parcelId: z.string().guid(),
      /**
       * Staff only (Phase 5): required when a staff member who is not a
       * participant joins an EXISTING thread; recorded as ADMIN_INTERVENTION.
       */
      reason: chatReasonSchema.optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal(ChatConversationType.SUPPORT_TICKET),
      title: titleSchema,
      parcelId: z.string().guid().optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal(ChatConversationType.HUB_OPERATIONS),
      hubId: z.string().guid(),
      title: titleSchema,
      participantUserIds: participantIdsSchema(0).optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal(ChatConversationType.MERCHANT_DESK),
      /** Required for staff; forbidden-by-validation for merchants (server derives it). */
      merchantId: z.string().guid().optional(),
      /** Staff joining an existing desk they are not a participant of (Phase 5). */
      reason: chatReasonSchema.optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal(ChatConversationType.INTERNAL_SUPERVISOR),
      title: titleSchema,
      participantUserIds: participantIdsSchema(1),
    })
    .strict(),
  z
    .object({ type: z.literal(ChatConversationType.DIRECT), participantUserId: z.string().guid() })
    .strict(),
  z
    .object({
      type: z.literal(ChatConversationType.GROUP),
      title: titleSchema,
      participantUserIds: participantIdsSchema(1),
    })
    .strict(),
]);

export type CreateChatConversationRequest = z.infer<typeof createChatConversationSchema>;

export const updateChatConversationSchema = z.object({ title: titleSchema }).strict();

export type UpdateChatConversationRequest = z.infer<typeof updateChatConversationSchema>;

/**
 * Body of lifecycle actions (archive / close / reopen / lock / unlock).
 * `reason` is mandatory on the staff path and for lock/unlock.
 */
export const chatStatusActionSchema = z.object({ reason: chatReasonSchema.optional() }).strict();

export type ChatStatusActionRequest = z.infer<typeof chatStatusActionSchema>;

/* ------------------------------------------------------------------ */
/* Participants                                                        */
/* ------------------------------------------------------------------ */

export const addChatParticipantSchema = z
  .object({
    userId: z.string().guid(),
    /** OWNER cannot be granted; MODERATOR only by an OWNER or staff. */
    role: z
      .enum([
        ChatParticipantRole.MEMBER,
        ChatParticipantRole.OBSERVER,
        ChatParticipantRole.MODERATOR,
      ])
      .default(ChatParticipantRole.MEMBER),
    /** Required when the actor uses the staff permission path. */
    reason: chatReasonSchema.optional(),
  })
  .strict();

export type AddChatParticipantRequest = z.infer<typeof addChatParticipantSchema>;

export const removeChatParticipantSchema = z
  .object({ reason: chatReasonSchema.optional() })
  .strict();

export type RemoveChatParticipantRequest = z.infer<typeof removeChatParticipantSchema>;

/* ------------------------------------------------------------------ */
/* Messages                                                            */
/* ------------------------------------------------------------------ */

export const editChatMessageSchema = z
  .object({
    content: z.string().trim().min(1).max(CHAT_MESSAGE_MAX_LENGTH),
  })
  .strict();

export type EditChatMessageRequest = z.infer<typeof editChatMessageSchema>;

/** Moderator removal of someone else's message — always justified and audited. */
export const removeChatMessageSchema = z.object({ reason: chatReasonSchema }).strict();

export type RemoveChatMessageRequest = z.infer<typeof removeChatMessageSchema>;

export const markChatDeliveredSchema = z
  .object({ lastDeliveredSequence: chatSequenceSchema })
  .strict();

export type MarkChatDeliveredRequest = z.infer<typeof markChatDeliveredSchema>;

export const chatPinSchema = z.object({ messageId: z.string().guid() }).strict();

export type ChatPinRequest = z.infer<typeof chatPinSchema>;

/* ------------------------------------------------------------------ */
/* Search                                                              */
/* ------------------------------------------------------------------ */

/**
 * `GET /chat/search` — searches ONLY conversations where the caller is an
 * active, eligible participant. Internal notes are never searched.
 */
export const chatSearchQuerySchema = z
  .object({
    q: z.string().trim().min(2).max(100),
    conversationId: z.string().guid().optional(),
    from: z.string().datetime({ offset: true }).optional(),
    to: z.string().datetime({ offset: true }).optional(),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(CHAT_SEARCH_MAX_LIMIT)
      .default(CHAT_SEARCH_DEFAULT_LIMIT),
  })
  .strict()
  .refine(
    (q) => !(q.from && q.to && new Date(q.from).getTime() > new Date(q.to).getTime()),
    "`from` must not be after `to`",
  );

export type ChatSearchQuery = z.infer<typeof chatSearchQuerySchema>;

/* ------------------------------------------------------------------ */
/* Responses                                                           */
/* ------------------------------------------------------------------ */

export interface ChatPinItem {
  messageId: string;
  conversationId: string;
  pinnedById: string;
  pinnedAt: string;
}

export interface ChatSearchResultItem {
  messageId: string;
  conversationId: string;
  sequence: ChatSequence;
  senderId: string | null;
  type: ChatMessageType;
  /** Bounded excerpt of the matching message. */
  snippet: string;
  createdAt: string;
}

export interface ChatSearchResponse {
  items: ChatSearchResultItem[];
}

/** Result of read/delivered cursor updates. */
export interface ChatCursorState {
  conversationId: string;
  lastReadSequence: ChatSequence;
  lastDeliveredSequence: ChatSequence;
  unreadCount: number;
}
