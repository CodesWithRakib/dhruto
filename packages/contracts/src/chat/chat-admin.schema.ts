import { z } from "zod";
import {
  ChatAuditAction,
  ChatConversationStatus,
  ChatConversationType,
  ChatReportReason,
  ChatReportStatus,
} from "./chat.enums.js";
import {
  CHAT_HISTORY_DEFAULT_LIMIT,
  CHAT_HISTORY_MAX_LIMIT,
  chatSequenceSchema,
  type ChatParticipantItem,
  type ChatSequence,
} from "./chat.schema.js";
import { chatReasonSchema } from "./chat-management.schema.js";

/**
 * Communication Phase 2 — staff-only contracts (`/chat/admin/*`).
 *
 * Every content-bearing staff read takes a mandatory `reason` and is written
 * to `chat_audit_logs`. Platform-wide listings return metadata only (no
 * message previews).
 */

export const CHAT_ADMIN_LIST_DEFAULT_LIMIT = 25;
export const CHAT_ADMIN_LIST_MAX_LIMIT = 100;
export const CHAT_EXPORT_DEFAULT_LIMIT = 500;
export const CHAT_EXPORT_MAX_LIMIT = 1000;

const adminLimit = z.coerce
  .number()
  .int()
  .min(1)
  .max(CHAT_ADMIN_LIST_MAX_LIMIT)
  .default(CHAT_ADMIN_LIST_DEFAULT_LIMIT);

const cursorSchema = z.string().trim().min(1).max(256);

export const adminListChatConversationsQuerySchema = z
  .object({
    type: z.nativeEnum(ChatConversationType).optional(),
    status: z.nativeEnum(ChatConversationStatus).optional(),
    merchantId: z.string().guid().optional(),
    hubId: z.string().guid().optional(),
    parcelId: z.string().guid().optional(),
    cursor: cursorSchema.optional(),
    limit: adminLimit,
  })
  .strict();

export type AdminListChatConversationsQuery = z.infer<typeof adminListChatConversationsQuerySchema>;

export const adminChatReasonQuerySchema = z.object({ reason: chatReasonSchema }).strict();

export type AdminChatReasonQuery = z.infer<typeof adminChatReasonQuerySchema>;

export const adminChatMessagesQuerySchema = z
  .object({
    reason: chatReasonSchema,
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

export type AdminChatMessagesQuery = z.infer<typeof adminChatMessagesQuerySchema>;

/** Paged export in ascending sequence order (each page is audited). */
export const adminChatExportQuerySchema = z
  .object({
    reason: chatReasonSchema,
    afterSequence: chatSequenceSchema.optional(),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(CHAT_EXPORT_MAX_LIMIT)
      .default(CHAT_EXPORT_DEFAULT_LIMIT),
  })
  .strict();

export type AdminChatExportQuery = z.infer<typeof adminChatExportQuerySchema>;

export const adminChatInterveneSchema = z.object({ reason: chatReasonSchema }).strict();

export type AdminChatInterveneRequest = z.infer<typeof adminChatInterveneSchema>;

export const createChatInternalNoteSchema = z
  .object({ body: z.string().trim().min(1).max(4000) })
  .strict();

export type CreateChatInternalNoteRequest = z.infer<typeof createChatInternalNoteSchema>;

export const adminListChatReportsQuerySchema = z
  .object({
    status: z.nativeEnum(ChatReportStatus).optional(),
    /** Phase 7: reports of one conversation (workspace panel). */
    conversationId: z.string().guid().optional(),
    cursor: cursorSchema.optional(),
    limit: adminLimit,
  })
  .strict();

export type AdminListChatReportsQuery = z.infer<typeof adminListChatReportsQuerySchema>;

export const reviewChatReportSchema = z
  .object({
    status: z.enum([
      ChatReportStatus.UNDER_REVIEW,
      ChatReportStatus.RESOLVED,
      ChatReportStatus.DISMISSED,
    ]),
    resolutionNote: z.string().trim().min(1).max(1000).optional(),
  })
  .strict()
  // Phase 7: a terminal decision (resolve / dismiss) must be justified.
  .refine((r) => r.status === ChatReportStatus.UNDER_REVIEW || !!r.resolutionNote, {
    message: "A resolution note is required to resolve or dismiss a report",
    path: ["resolutionNote"],
  });

export type ReviewChatReportRequest = z.infer<typeof reviewChatReportSchema>;

export const adminChatAuditQuerySchema = z
  .object({
    conversationId: z.string().guid().optional(),
    actorUserId: z.string().guid().optional(),
    /** Phase 7: filter by audit action. */
    action: z.nativeEnum(ChatAuditAction).optional(),
    cursor: cursorSchema.optional(),
    limit: adminLimit,
  })
  .strict();

export type AdminChatAuditQuery = z.infer<typeof adminChatAuditQuerySchema>;

/* ------------------------------------------------------------------ */
/* Responses                                                           */
/* ------------------------------------------------------------------ */

/** Platform-wide listing row: metadata only, no previews or content. */
export interface ChatAdminConversationItem {
  id: string;
  type: ChatConversationType;
  title: string | null;
  status: ChatConversationStatus;
  parcelId: string | null;
  hubId: string | null;
  merchantId: string | null;
  lastMessageSequence: ChatSequence;
  lastMessageAt: string | null;
  activeParticipantCount: number;
  createdAt: string;
}

export interface ChatAdminConversationPage {
  items: ChatAdminConversationItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface ChatReportItem {
  id: string;
  conversationId: string;
  messageId: string | null;
  reporterId: string;
  reason: ChatReportReason;
  details: string | null;
  status: ChatReportStatus;
  reviewedById: string | null;
  reviewedAt: string | null;
  resolutionNote: string | null;
  createdAt: string;
}

export interface ChatReportPage {
  items: ChatReportItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface ChatAuditLogItem {
  id: string;
  createdAt: string;
  actorUserId: string | null;
  actorRole: string | null;
  action: ChatAuditAction;
  conversationId: string | null;
  targetType: string | null;
  targetId: string | null;
  reason: string | null;
  requestId: string | null;
  metadata: Record<string, unknown> | null;
}

export interface ChatAuditLogPage {
  items: ChatAuditLogItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

/** Staff view of one conversation (no caller membership implied). */
export interface ChatAdminConversationDetail extends ChatAdminConversationItem {
  archivedAt: string | null;
  closedAt: string | null;
  lockedAt: string | null;
  participants: ChatParticipantItem[];
}
