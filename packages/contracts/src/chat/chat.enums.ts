/**
 * Communication platform enums (Phase 1 foundation).
 *
 * Values are persisted as PostgreSQL enum types by the
 * `CommunicationPhase1Foundation` migration. Adding a value requires a
 * migration (`ALTER TYPE ... ADD VALUE`); removing or renaming one is a
 * breaking change for both the database and API clients.
 *
 * Platform roles are intentionally NOT redefined here: the authoritative
 * `UserRole` lives in the API (`users_role_enum`). Chat-specific roles below
 * describe a user's position inside one conversation, not their platform role.
 */

/** Business purpose of a conversation; drives participant and visibility policy. */
export enum ChatConversationType {
  /** Parcel-scoped thread (merchant, assigned rider, recipient customer, ops). */
  PARCEL_DELIVERY = "PARCEL_DELIVERY",
  /** Customer or merchant support case handled by operations staff. */
  SUPPORT_TICKET = "SUPPORT_TICKET",
  /** Hub-scoped operational channel (hub staff, riders of that hub). */
  HUB_OPERATIONS = "HUB_OPERATIONS",
  /** Merchant account desk (merchant users and their account managers). */
  MERCHANT_DESK = "MERCHANT_DESK",
  /** Staff-only supervision channel; never visible to merchants or customers. */
  INTERNAL_SUPERVISOR = "INTERNAL_SUPERVISOR",
  /** One-to-one conversation between two users. */
  DIRECT = "DIRECT",
  /** Ad-hoc multi-user conversation. */
  GROUP = "GROUP",
}

/** Conversation lifecycle. See `CHAT_CONVERSATION_TRANSITIONS`. */
export enum ChatConversationStatus {
  /** Open for messages. */
  ACTIVE = "ACTIVE",
  /** Hidden from default lists; reactivates on demand. Read-only while archived. */
  ARCHIVED = "ARCHIVED",
  /** Resolved / finished. Read-only; may be reopened by an authorized actor. */
  CLOSED = "CLOSED",
  /** Frozen by moderation or compliance. Only moderators may unlock. */
  LOCKED = "LOCKED",
}

export enum ChatMessageType {
  TEXT = "TEXT",
  IMAGE = "IMAGE",
  FILE = "FILE",
  LOCATION = "LOCATION",
  VOICE = "VOICE",
  /** Server-generated lifecycle event (no human sender). */
  SYSTEM_EVENT = "SYSTEM_EVENT",
  /** Structured operational action (e.g. "rider arriving"). */
  QUICK_ACTION = "QUICK_ACTION",
}

/** A user's role inside a single conversation. */
export enum ChatParticipantRole {
  /** Created / owns the conversation. */
  OWNER = "OWNER",
  /** May moderate (pin, remove messages, manage members). */
  MODERATOR = "MODERATOR",
  /** Regular read/write participant. */
  MEMBER = "MEMBER",
  /** Read-only participant (e.g. supervisor shadowing a thread). */
  OBSERVER = "OBSERVER",
}

export enum ChatParticipantStatus {
  ACTIVE = "ACTIVE",
  /** Left voluntarily; keeps history up to `leftAt`. */
  LEFT = "LEFT",
  /** Removed by a moderator or a workflow (e.g. rider reassigned). */
  REMOVED = "REMOVED",
}

export enum ChatNotificationLevel {
  ALL = "ALL",
  MENTIONS = "MENTIONS",
  NONE = "NONE",
}

/**
 * Client-facing delivery state of a message. Derived from participant
 * read/delivered cursors — never persisted per recipient.
 */
export enum ChatMessageDeliveryStatus {
  /** Client-only: queued locally, not yet acknowledged by the server. */
  PENDING = "PENDING",
  /** Persisted by the server (has a sequence number). */
  SENT = "SENT",
  /** At least one other participant's delivered cursor has passed it. */
  DELIVERED = "DELIVERED",
  /** At least one other participant's read cursor has passed it. */
  READ = "READ",
  /** Client-only: the send failed and may be retried with the same clientMessageId. */
  FAILED = "FAILED",
}

export enum ChatAttachmentStatus {
  /** Metadata reserved; object upload not yet confirmed. */
  PENDING = "PENDING",
  /** Object stored and verified (size + checksum). */
  UPLOADED = "UPLOADED",
  /** Failed validation or scanning; never served to clients. */
  REJECTED = "REJECTED",
}

export enum ChatReportReason {
  SPAM = "SPAM",
  ABUSE = "ABUSE",
  FRAUD = "FRAUD",
  PRIVACY_VIOLATION = "PRIVACY_VIOLATION",
  INAPPROPRIATE_CONTENT = "INAPPROPRIATE_CONTENT",
  OTHER = "OTHER",
}

export enum ChatReportStatus {
  OPEN = "OPEN",
  UNDER_REVIEW = "UNDER_REVIEW",
  RESOLVED = "RESOLVED",
  DISMISSED = "DISMISSED",
}

/** Actions recorded in the append-only chat audit log. */
export enum ChatAuditAction {
  CONVERSATION_CREATED = "CONVERSATION_CREATED",
  CONVERSATION_STATUS_CHANGED = "CONVERSATION_STATUS_CHANGED",
  PARTICIPANT_ADDED = "PARTICIPANT_ADDED",
  PARTICIPANT_REMOVED = "PARTICIPANT_REMOVED",
  PARTICIPANT_ROLE_CHANGED = "PARTICIPANT_ROLE_CHANGED",
  /** A staff member read a conversation they do not participate in. */
  ADMIN_CONVERSATION_VIEWED = "ADMIN_CONVERSATION_VIEWED",
  /** A staff member joined/posted into a conversation to intervene. */
  ADMIN_INTERVENTION = "ADMIN_INTERVENTION",
  MESSAGE_REMOVED_BY_MODERATOR = "MESSAGE_REMOVED_BY_MODERATOR",
  MESSAGE_PINNED = "MESSAGE_PINNED",
  MESSAGE_UNPINNED = "MESSAGE_UNPINNED",
  REPORT_RESOLVED = "REPORT_RESOLVED",
  INTERNAL_NOTE_CREATED = "INTERNAL_NOTE_CREATED",
  INTERNAL_NOTE_DELETED = "INTERNAL_NOTE_DELETED",
  ATTACHMENT_REJECTED = "ATTACHMENT_REJECTED",
  /** Staff listed conversations platform-wide (metadata only). Phase 2. */
  ADMIN_CONVERSATIONS_LISTED = "ADMIN_CONVERSATIONS_LISTED",
  /** Staff exported a page of conversation history. Phase 2. */
  ADMIN_CONVERSATION_EXPORTED = "ADMIN_CONVERSATION_EXPORTED",
  /** Staff read the chat audit log. Phase 2. */
  AUDIT_LOG_VIEWED = "AUDIT_LOG_VIEWED",
  /** Staff read the internal notes of a conversation. Phase 7. */
  INTERNAL_NOTE_VIEWED = "INTERNAL_NOTE_VIEWED",
  /** A report was taken into review. Phase 7. */
  REPORT_REVIEW_STARTED = "REPORT_REVIEW_STARTED",
  /** Escalation state, assignee or note changed. Phase 7. */
  ESCALATION_CHANGED = "ESCALATION_CHANGED",
  /** Malware scan flagged or could not clear an attachment (system actor). Phase 7. */
  ATTACHMENT_QUARANTINED = "ATTACHMENT_QUARANTINED",
  /** Staff released a blocked attachment after review. Phase 7. */
  ATTACHMENT_RELEASED = "ATTACHMENT_RELEASED",
  /** Staff requested a new malware scan. Phase 7. */
  ATTACHMENT_RESCAN_REQUESTED = "ATTACHMENT_RESCAN_REQUESTED",
  /** Staff accessed restricted attachment metadata or content. Phase 7. */
  ATTACHMENT_RESTRICTED_ACCESSED = "ATTACHMENT_RESTRICTED_ACCESSED",
  /** Retention removed a stored object (row and audit kept). Phase 7. */
  ATTACHMENT_OBJECT_PURGED = "ATTACHMENT_OBJECT_PURGED",
  /** An operator granted or revoked a staff permission. Phase 7. */
  STAFF_GRANT_CHANGED = "STAFF_GRANT_CHANGED",
}

/**
 * Platform-level chat capabilities (staff only). Role ceilings live in
 * `apps/api/src/common/permissions/chat-permissions.ts`; the backend derives
 * them from the authenticated user, never from the request.
 */
export enum ChatPermission {
  /** Read conversations the actor does not participate in (always audited). */
  CONVERSATION_VIEW_ANY = "chat.conversation.view_any",
  /** Join / post into a conversation to intervene (always audited). */
  CONVERSATION_INTERVENE = "chat.conversation.intervene",
  /** Change lifecycle state including LOCK / UNLOCK. */
  CONVERSATION_MODERATE = "chat.conversation.moderate",
  /** Remove any message (content redacted, audit retained). */
  MESSAGE_MODERATE = "chat.message.moderate",
  /** Read and write private internal notes. */
  INTERNAL_NOTE_MANAGE = "chat.internal_note.manage",
  /** Review and resolve abuse reports. */
  REPORT_REVIEW = "chat.report.review",
  /** Read the chat audit log. */
  AUDIT_VIEW = "chat.audit.view",
  /** Read restricted (INTERNAL_SUPERVISOR) conversations via the staff path. */
  CONVERSATION_VIEW_RESTRICTED = "chat.conversation.view_restricted",
  /** Add/remove participants in conversations the actor does not moderate. */
  PARTICIPANT_MANAGE = "chat.participant.manage",
  /** Export conversation history (paged, always audited). */
  CONVERSATION_EXPORT = "chat.conversation.export",
  /** Escalate, assign and resolve conversation escalations (Phase 7). */
  ESCALATION_MANAGE = "chat.escalation.manage",
  /**
   * Inspect blocked/unscanned attachment metadata and download restricted
   * attachment content as staff (Phase 7). Grant-required: see
   * `CHAT_GRANT_REQUIRED_PERMISSIONS`.
   */
  ATTACHMENT_RESTRICTED_ACCESS = "chat.attachment.restricted_access",
  /** Release or rescan quarantined attachments (Phase 7). Grant-required. */
  ATTACHMENT_QUARANTINE_MANAGE = "chat.attachment.quarantine_manage",
  /** View and operate attachment retention (Phase 7). Grant-required. */
  RETENTION_MANAGE = "chat.retention.manage",
}

/**
 * Permissions that the role ceiling alone does not confer (Phase 7): the
 * user additionally needs an active, explicit row in `chat_staff_grants`.
 * Grants are created and revoked only by the operator CLI (audited), so an
 * admin can never grant these to themselves through the application.
 */
export const CHAT_GRANT_REQUIRED_PERMISSIONS: readonly ChatPermission[] = [
  ChatPermission.ATTACHMENT_RESTRICTED_ACCESS,
  ChatPermission.ATTACHMENT_QUARANTINE_MANAGE,
  ChatPermission.RETENTION_MANAGE,
];

/** Operational escalation state of a conversation (Phase 7); independent of lifecycle status. */
export enum ChatEscalationStatus {
  /** Flagged as needing staff attention; nobody has taken it yet. */
  OPEN = "OPEN",
  /** A staff member is actively working on it. */
  IN_REVIEW = "IN_REVIEW",
  /** Raised to senior staff / higher priority. */
  ESCALATED = "ESCALATED",
  /** Handled; a resolution note is recorded. May be reopened. */
  RESOLVED = "RESOLVED",
  /** Final; no further escalation work on this cycle. Re-flagging starts a new cycle. */
  CLOSED = "CLOSED",
}

/** Malware-scan state of a stored attachment object (Phase 7). */
export enum ChatAttachmentScanStatus {
  /** Not yet scanned (or rescan requested). Never downloadable through ordinary routes. */
  PENDING = "PENDING",
  /** Scanner reported the exact verified object clean. */
  CLEAN = "CLEAN",
  /** Scanner detected malware: quarantined, never served to participants. */
  INFECTED = "INFECTED",
  /** Scan could not complete after the retry budget (or object changed): blocked (fail closed). */
  FAILED = "FAILED",
}
