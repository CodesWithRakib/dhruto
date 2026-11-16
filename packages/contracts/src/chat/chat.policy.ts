import {
  ChatAttachmentScanStatus,
  ChatAttachmentStatus,
  ChatConversationStatus,
  ChatConversationType,
  ChatEscalationStatus,
  ChatParticipantRole,
  ChatParticipantStatus,
} from "./chat.enums.js";

/**
 * Pure, framework-free chat policy shared by the API (enforcement) and the
 * web app (UI affordances). The UI may use these to hide controls, but the
 * backend is the only authority: every rule here is re-checked server-side.
 */

/* ------------------------------------------------------------------ */
/* Conversation lifecycle                                              */
/* ------------------------------------------------------------------ */

/**
 * Allowed lifecycle transitions. Identity transitions are not listed and are
 * rejected (a no-op status change is a client bug, not a state change).
 *
 * - ACTIVE   -> ARCHIVED | CLOSED | LOCKED
 * - ARCHIVED -> ACTIVE | CLOSED | LOCKED
 * - CLOSED   -> ACTIVE (reopen) | ARCHIVED | LOCKED
 * - LOCKED   -> ACTIVE | CLOSED   (unlock; moderators only)
 *
 * Entering or leaving LOCKED additionally requires the platform permission
 * `ChatPermission.CONVERSATION_MODERATE` (see `transitionRequiresModeration`).
 */
export const CHAT_CONVERSATION_TRANSITIONS: Readonly<
  Record<ChatConversationStatus, readonly ChatConversationStatus[]>
> = {
  [ChatConversationStatus.ACTIVE]: [
    ChatConversationStatus.ARCHIVED,
    ChatConversationStatus.CLOSED,
    ChatConversationStatus.LOCKED,
  ],
  [ChatConversationStatus.ARCHIVED]: [
    ChatConversationStatus.ACTIVE,
    ChatConversationStatus.CLOSED,
    ChatConversationStatus.LOCKED,
  ],
  [ChatConversationStatus.CLOSED]: [
    ChatConversationStatus.ACTIVE,
    ChatConversationStatus.ARCHIVED,
    ChatConversationStatus.LOCKED,
  ],
  [ChatConversationStatus.LOCKED]: [ChatConversationStatus.ACTIVE, ChatConversationStatus.CLOSED],
};

export function canTransitionConversation(
  from: ChatConversationStatus,
  to: ChatConversationStatus,
): boolean {
  return CHAT_CONVERSATION_TRANSITIONS[from].includes(to);
}

/** True when the transition enters or leaves LOCKED (moderator-only). */
export function transitionRequiresModeration(
  from: ChatConversationStatus,
  to: ChatConversationStatus,
): boolean {
  return from === ChatConversationStatus.LOCKED || to === ChatConversationStatus.LOCKED;
}

/** Only ACTIVE conversations accept new messages, reactions, or edits. */
export function isConversationWritable(status: ChatConversationStatus): boolean {
  return status === ChatConversationStatus.ACTIVE;
}

/* ------------------------------------------------------------------ */
/* Conversation scope requirements                                     */
/* ------------------------------------------------------------------ */

export interface ChatConversationScopeRequirement {
  parcel: boolean;
  hub: boolean;
  merchant: boolean;
}

/**
 * Which scope references a conversation type requires. Mirrored by CHECK
 * constraints on `chat_conversations`, so an invalid combination cannot be
 * persisted even if a service forgets to validate it.
 */
export const CHAT_CONVERSATION_SCOPE_REQUIREMENTS: Readonly<
  Record<ChatConversationType, ChatConversationScopeRequirement>
> = {
  [ChatConversationType.PARCEL_DELIVERY]: { parcel: true, hub: false, merchant: true },
  [ChatConversationType.SUPPORT_TICKET]: { parcel: false, hub: false, merchant: false },
  [ChatConversationType.HUB_OPERATIONS]: { parcel: false, hub: true, merchant: false },
  [ChatConversationType.MERCHANT_DESK]: { parcel: false, hub: false, merchant: true },
  [ChatConversationType.INTERNAL_SUPERVISOR]: { parcel: false, hub: false, merchant: false },
  [ChatConversationType.DIRECT]: { parcel: false, hub: false, merchant: false },
  [ChatConversationType.GROUP]: { parcel: false, hub: false, merchant: false },
};

/* ------------------------------------------------------------------ */
/* Participant capabilities                                            */
/* ------------------------------------------------------------------ */

/** What a participant may do inside one conversation, derived from their role. */
export enum ChatParticipantCapability {
  READ = "READ",
  SEND_MESSAGE = "SEND_MESSAGE",
  REACT = "REACT",
  EDIT_OWN_MESSAGE = "EDIT_OWN_MESSAGE",
  DELETE_OWN_MESSAGE = "DELETE_OWN_MESSAGE",
  REPORT_MESSAGE = "REPORT_MESSAGE",
  PIN_MESSAGE = "PIN_MESSAGE",
  MANAGE_PARTICIPANTS = "MANAGE_PARTICIPANTS",
  CHANGE_STATUS = "CHANGE_STATUS",
  REMOVE_ANY_MESSAGE = "REMOVE_ANY_MESSAGE",
}

const MEMBER_CAPABILITIES: readonly ChatParticipantCapability[] = [
  ChatParticipantCapability.READ,
  ChatParticipantCapability.SEND_MESSAGE,
  ChatParticipantCapability.REACT,
  ChatParticipantCapability.EDIT_OWN_MESSAGE,
  ChatParticipantCapability.DELETE_OWN_MESSAGE,
  ChatParticipantCapability.REPORT_MESSAGE,
];

const MODERATOR_CAPABILITIES: readonly ChatParticipantCapability[] = [
  ...MEMBER_CAPABILITIES,
  ChatParticipantCapability.PIN_MESSAGE,
  ChatParticipantCapability.MANAGE_PARTICIPANTS,
  ChatParticipantCapability.CHANGE_STATUS,
  ChatParticipantCapability.REMOVE_ANY_MESSAGE,
];

export const CHAT_PARTICIPANT_ROLE_CAPABILITIES: Readonly<
  Record<ChatParticipantRole, readonly ChatParticipantCapability[]>
> = {
  [ChatParticipantRole.OWNER]: MODERATOR_CAPABILITIES,
  [ChatParticipantRole.MODERATOR]: MODERATOR_CAPABILITIES,
  [ChatParticipantRole.MEMBER]: MEMBER_CAPABILITIES,
  [ChatParticipantRole.OBSERVER]: [
    ChatParticipantCapability.READ,
    ChatParticipantCapability.REPORT_MESSAGE,
  ],
};

/**
 * Effective participant capability check. Non-ACTIVE memberships have no
 * capabilities. Callers must separately check `isConversationWritable` for
 * write capabilities — membership alone never authorizes writing into a
 * CLOSED, ARCHIVED or LOCKED conversation.
 */
export function participantHasCapability(
  role: ChatParticipantRole,
  membership: ChatParticipantStatus,
  capability: ChatParticipantCapability,
): boolean {
  if (membership !== ChatParticipantStatus.ACTIVE) return false;
  return CHAT_PARTICIPANT_ROLE_CAPABILITIES[role].includes(capability);
}

/* ------------------------------------------------------------------ */
/* Escalation (Phase 7)                                                */
/* ------------------------------------------------------------------ */

/**
 * Allowed escalation transitions. `null` is "never escalated". Escalation is
 * an operational overlay: it never changes the conversation lifecycle status
 * (ACTIVE/CLOSED/…) and never touches parcels.
 *
 * - none     -> OPEN | ESCALATED                 (flag / escalate directly)
 * - OPEN     -> IN_REVIEW | ESCALATED | RESOLVED | CLOSED
 * - IN_REVIEW-> OPEN | ESCALATED | RESOLVED      (OPEN = hand back to the queue)
 * - ESCALATED-> IN_REVIEW | RESOLVED
 * - RESOLVED -> OPEN | ESCALATED | CLOSED        (reopen / close)
 * - CLOSED   -> OPEN | ESCALATED                 (new cycle)
 */
export const CHAT_ESCALATION_TRANSITIONS: Readonly<
  Record<ChatEscalationStatus | "NONE", readonly ChatEscalationStatus[]>
> = {
  NONE: [ChatEscalationStatus.OPEN, ChatEscalationStatus.ESCALATED],
  [ChatEscalationStatus.OPEN]: [
    ChatEscalationStatus.IN_REVIEW,
    ChatEscalationStatus.ESCALATED,
    ChatEscalationStatus.RESOLVED,
    ChatEscalationStatus.CLOSED,
  ],
  [ChatEscalationStatus.IN_REVIEW]: [
    ChatEscalationStatus.OPEN,
    ChatEscalationStatus.ESCALATED,
    ChatEscalationStatus.RESOLVED,
  ],
  [ChatEscalationStatus.ESCALATED]: [ChatEscalationStatus.IN_REVIEW, ChatEscalationStatus.RESOLVED],
  [ChatEscalationStatus.RESOLVED]: [
    ChatEscalationStatus.OPEN,
    ChatEscalationStatus.ESCALATED,
    ChatEscalationStatus.CLOSED,
  ],
  [ChatEscalationStatus.CLOSED]: [ChatEscalationStatus.OPEN, ChatEscalationStatus.ESCALATED],
};

export function canTransitionEscalation(
  from: ChatEscalationStatus | null,
  to: ChatEscalationStatus,
): boolean {
  return CHAT_ESCALATION_TRANSITIONS[from ?? "NONE"].includes(to);
}

/**
 * A note is mandatory for every escalation change except taking a case into
 * review: flagging/escalating needs a reason, resolving/closing a resolution.
 */
export function escalationNoteRequired(to: ChatEscalationStatus): boolean {
  return to !== ChatEscalationStatus.IN_REVIEW;
}

/** Escalation states that count as "needs staff attention". */
export const CHAT_ESCALATION_ACTIVE_STATUSES: readonly ChatEscalationStatus[] = [
  ChatEscalationStatus.OPEN,
  ChatEscalationStatus.IN_REVIEW,
  ChatEscalationStatus.ESCALATED,
];

/* ------------------------------------------------------------------ */
/* Attachment access gate (Phase 7)                                    */
/* ------------------------------------------------------------------ */

export type ChatAttachmentServeDecision = "serve" | "not_ready" | "scan_pending" | "blocked" | "purged";

/**
 * Whether stored bytes may be served through ORDINARY (participant) routes.
 * Only verified (`UPLOADED`) objects whose malware scan is `CLEAN` and whose
 * object still exists are served. Everything else fails closed.
 */
export function chatAttachmentServeDecision(input: {
  status: ChatAttachmentStatus;
  scanStatus: ChatAttachmentScanStatus;
  objectPurged: boolean;
}): ChatAttachmentServeDecision {
  if (input.status !== ChatAttachmentStatus.UPLOADED) return "not_ready";
  if (input.objectPurged) return "purged";
  switch (input.scanStatus) {
    case ChatAttachmentScanStatus.CLEAN:
      return "serve";
    case ChatAttachmentScanStatus.PENDING:
      return "scan_pending";
    default:
      return "blocked";
  }
}
