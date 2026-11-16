import { z } from "zod";
import {
  ChatAttachmentScanStatus,
  ChatConversationStatus,
  ChatConversationType,
  ChatEscalationStatus,
  type ChatAttachmentStatus,
  type ChatPermission,
} from "./chat.enums.js";
import { type ChatAttachmentKind, type ChatSequence } from "./chat.schema.js";
import { chatReasonSchema } from "./chat-management.schema.js";
import { ParcelStatus } from "../parcel/parcel.schema.js";

/**
 * Communication Phase 7 — Admin Communication Center contracts
 * (`/chat/admin/*` additions). Phase 2 admin contracts stay unchanged in
 * `chat-admin.schema.ts`.
 */

export const CHAT_INBOX_DEFAULT_LIMIT = 25;
export const CHAT_INBOX_MAX_LIMIT = 50;
/** Free-text inbox search is an exact identifier lookup; bounded length. */
export const CHAT_INBOX_SEARCH_MAX_LENGTH = 64;

const booleanQuery = z
  .enum(["true", "false"])
  .transform((value) => value === "true")
  .optional();

const cursorSchema = z.string().trim().min(1).max(256);

/** Escalation filter: a concrete state, any active state, or never/not escalated. */
export const CHAT_INBOX_ESCALATION_FILTERS = ["ACTIVE", "NONE"] as const;

export const adminChatInboxQuerySchema = z
  .object({
    type: z.nativeEnum(ChatConversationType).optional(),
    status: z.nativeEnum(ChatConversationStatus).optional(),
    merchantId: z.string().guid().optional(),
    hubId: z.string().guid().optional(),
    parcelId: z.string().guid().optional(),
    /** Parcel's current rider (riders table id). */
    riderId: z.string().guid().optional(),
    parcelStatus: z.nativeEnum(ParcelStatus).optional(),
    /** Conversations where this user is an ACTIVE participant (e.g. a customer account). */
    participantUserId: z.string().guid().optional(),
    escalation: z
      .union([z.nativeEnum(ChatEscalationStatus), z.enum(CHAT_INBOX_ESCALATION_FILTERS)])
      .optional(),
    hasOpenReports: booleanQuery,
    assignedToMe: booleanQuery,
    /** Last activity window (ISO timestamps). */
    from: z.string().datetime({ offset: true }).optional(),
    to: z.string().datetime({ offset: true }).optional(),
    /**
     * Exact identifier search: conversation id, parcel tracking code or
     * report id. Never a content search (no platform-wide message reads).
     */
    q: z.string().trim().min(1).max(CHAT_INBOX_SEARCH_MAX_LENGTH).optional(),
    cursor: cursorSchema.optional(),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(CHAT_INBOX_MAX_LIMIT)
      .default(CHAT_INBOX_DEFAULT_LIMIT),
  })
  .strict()
  .refine((q) => !(q.from && q.to && Date.parse(q.from) > Date.parse(q.to)), {
    message: "`from` must not be after `to`",
    path: ["from"],
  });

export type AdminChatInboxQuery = z.infer<typeof adminChatInboxQuerySchema>;

export interface ChatInboxParcel {
  id: string;
  trackingCode: string;
  status: ParcelStatus;
}

export interface ChatInboxEscalation {
  status: ChatEscalationStatus;
  assigneeUserId: string | null;
  assigneeName: string | null;
  updatedAt: string;
}

/** One inbox row. Content preview only where the caller is an ACTIVE participant. */
export interface ChatInboxItem {
  id: string;
  type: ChatConversationType;
  title: string | null;
  status: ChatConversationStatus;
  parcel: ChatInboxParcel | null;
  /** Conversation hub, or the parcel's current hub for parcel threads. */
  hubId: string | null;
  hubName: string | null;
  merchantId: string | null;
  merchantName: string | null;
  lastActivityAt: string;
  lastMessageSequence: ChatSequence;
  activeParticipantCount: number;
  /** True when the caller is an ACTIVE participant (then preview/unread are populated). */
  isParticipant: boolean;
  lastMessagePreview: string | null;
  unreadCount: number | null;
  openReportCount: number;
  escalation: ChatInboxEscalation | null;
  createdAt: string;
}

export interface ChatInboxPage {
  items: ChatInboxItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

/* ------------------------------------------------------------------ */
/* Metrics                                                             */
/* ------------------------------------------------------------------ */

export const CHAT_METRICS_VOLUME_DAYS = 14;

export interface ChatAdminMetrics {
  generatedAt: string;
  conversations: { total: number; active: number; byType: Record<string, number> };
  /** Conversations where the caller participates and has unread messages. */
  myUnreadConversations: number;
  escalations: { open: number; inReview: number; escalated: number; assignedToMe: number };
  reports: { open: number; underReview: number };
  /** Distinct conversations with an active escalation or an open/under-review report. */
  needsAttention: number;
  interventionsLast7Days: number;
  attachments: { scanPending: number; blocked: number };
  /** New conversations per UTC day, oldest first (`CHAT_METRICS_VOLUME_DAYS` entries). */
  conversationVolume: Array<{ day: string; count: number }>;
}

/* ------------------------------------------------------------------ */
/* Effective staff permissions                                         */
/* ------------------------------------------------------------------ */

export interface ChatStaffProfile {
  userId: string;
  role: string;
  /** Effective platform-scope permissions (role ceiling ∩ grants where required). */
  permissions: ChatPermission[];
  /** Hubs bounding hub-manager permissions (empty for admins = platform scope). */
  hubIds: string[];
}

/* ------------------------------------------------------------------ */
/* Escalation                                                          */
/* ------------------------------------------------------------------ */

export const CHAT_ESCALATION_NOTE_MAX_LENGTH = 1000;

export const updateChatEscalationSchema = z
  .object({
    status: z.nativeEnum(ChatEscalationStatus),
    /** Reason / resolution note; required except when taking a case into review. */
    note: z.string().trim().min(10).max(CHAT_ESCALATION_NOTE_MAX_LENGTH).optional(),
    /** Staff user to assign (ADMIN), `null` to unassign, omitted to keep. */
    assigneeUserId: z.string().guid().nullable().optional(),
  })
  .strict();

export type UpdateChatEscalationRequest = z.infer<typeof updateChatEscalationSchema>;

export interface ChatEscalationState {
  conversationId: string;
  status: ChatEscalationStatus | null;
  note: string | null;
  assigneeUserId: string | null;
  assigneeName: string | null;
  updatedAt: string | null;
  updatedByUserId: string | null;
}

export interface ChatEscalationHistoryItem {
  id: string;
  createdAt: string;
  actorUserId: string | null;
  actorName: string | null;
  from: ChatEscalationStatus | null;
  to: ChatEscalationStatus | null;
  assigneeUserId: string | null;
  note: string | null;
}

export interface ChatEscalationDetail {
  current: ChatEscalationState;
  history: ChatEscalationHistoryItem[];
}

/* ------------------------------------------------------------------ */
/* Attachments (staff)                                                 */
/* ------------------------------------------------------------------ */

export const adminChatAttachmentQueueSchema = z
  .object({
    scanStatus: z.nativeEnum(ChatAttachmentScanStatus).optional(),
    cursor: cursorSchema.optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
  })
  .strict();

export type AdminChatAttachmentQueueQuery = z.infer<typeof adminChatAttachmentQueueSchema>;

export const adminChatAttachmentDecisionSchema = z
  .object({ action: z.enum(["RELEASE", "RESCAN"]), reason: chatReasonSchema })
  .strict();

export type AdminChatAttachmentDecisionRequest = z.infer<typeof adminChatAttachmentDecisionSchema>;

/** Staff metadata view of an attachment (never a storage key or URL). */
export interface ChatAdminAttachmentItem {
  id: string;
  conversationId: string;
  messageId: string | null;
  uploaderUserId: string;
  originalFilename: string;
  mimeType: string;
  kind: ChatAttachmentKind;
  sizeBytes: number;
  status: ChatAttachmentStatus;
  scanStatus: ChatAttachmentScanStatus;
  scanAttempts: number;
  scannedAt: string | null;
  scanEngine: string | null;
  /** Threat name reported by the scanner (INFECTED only). */
  scanThreat: string | null;
  scanError: string | null;
  quarantinedAt: string | null;
  objectPurgedAt: string | null;
  messageDeleted: boolean;
  createdAt: string;
}

export interface ChatAdminAttachmentPage {
  items: ChatAdminAttachmentItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

/* ------------------------------------------------------------------ */
/* Retention                                                           */
/* ------------------------------------------------------------------ */

export interface ChatRetentionPolicyItem {
  category:
    | "expired_pending"
    | "unsent"
    | "rejected"
    | "orphan_objects"
    | "deleted_message_objects"
    | "quarantined_objects";
  /** `null` = retained indefinitely (no product decision configured). */
  retentionSeconds: number | null;
  /** Rows currently eligible under this rule (bounded counts). */
  eligibleCount: number | null;
}

export interface ChatRetentionStatus {
  scannerConfigured: boolean;
  scannerEngine: string | null;
  policies: ChatRetentionPolicyItem[];
  evidenceHold: string;
}
