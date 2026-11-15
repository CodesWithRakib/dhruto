import {
  CHAT_PARTICIPANT_ROLE_CAPABILITIES,
  ChatParticipantStatus,
  computeChatUnreadCount,
  type ChatAttachmentItem,
  type ChatConversationSummary,
  type ChatMessageItem,
  type ChatMessageMetadata,
  type ChatMyParticipation,
  type ChatReactionSummary,
} from "@dhruto/contracts";
import {
  type ChatAttachment,
  type ChatConversation,
  type ChatMessage,
  type ChatParticipant,
} from "../database/entities/index.js";

/**
 * Entity -> API contract mapping. The only place chat rows become response
 * objects, so storage-only fields (storage keys, moderator ids, edit history,
 * deleted content) cannot leak by accident.
 */

const iso = (value: Date | null | undefined): string | null => (value ? value.toISOString() : null);

export function toAttachmentItem(a: ChatAttachment): ChatAttachmentItem {
  return {
    id: a.id,
    originalFilename: a.originalFilename,
    mimeType: a.mimeType,
    sizeBytes: a.sizeBytes,
    status: a.status,
    uploadedAt: iso(a.uploadedAt),
  };
}

export function toMessageItem(
  m: ChatMessage,
  attachments: readonly ChatAttachment[] = [],
  reactions: readonly ChatReactionSummary[] = [],
): ChatMessageItem {
  const deleted = m.deletedAt !== null;
  return {
    id: m.id,
    conversationId: m.conversationId,
    sequence: m.sequence,
    clientMessageId: m.clientMessageId,
    senderId: m.senderUserId,
    type: m.type,
    content: deleted ? null : m.content,
    replyToMessageId: m.replyToMessageId,
    metadata: deleted ? null : (m.metadata as ChatMessageMetadata | null),
    attachments: deleted ? [] : attachments.map(toAttachmentItem),
    reactions: deleted ? [] : [...reactions],
    createdAt: m.createdAt.toISOString(),
    editedAt: iso(m.editedAt),
    deletedAt: iso(m.deletedAt),
  };
}

export function toMyParticipation(p: ChatParticipant): ChatMyParticipation {
  return {
    role: p.role,
    status: p.status,
    isMuted: p.isMuted,
    mutedUntil: iso(p.mutedUntil),
    notificationLevel: p.notificationLevel,
    lastReadSequence: p.lastReadSequence,
    lastDeliveredSequence: p.lastDeliveredSequence,
    capabilities:
      p.status === ChatParticipantStatus.ACTIVE
        ? [...CHAT_PARTICIPANT_ROLE_CAPABILITIES[p.role]]
        : [],
  };
}

export function toConversationSummary(
  c: ChatConversation,
  me: ChatParticipant,
  lastMessageSenderId: string | null,
): ChatConversationSummary {
  return {
    id: c.id,
    type: c.type,
    title: c.title,
    status: c.status,
    parcelId: c.parcelId,
    hubId: c.hubId,
    merchantId: c.merchantId,
    lastMessageSequence: c.lastMessageSequence,
    lastMessage:
      c.lastMessageId && c.lastMessageAt
        ? {
            id: c.lastMessageId,
            sequence: c.lastMessageSequence,
            senderId: lastMessageSenderId,
            preview: c.lastMessagePreview,
            createdAt: c.lastMessageAt.toISOString(),
          }
        : null,
    unreadCount: computeChatUnreadCount(c.lastMessageSequence, me.lastReadSequence),
    myParticipation: toMyParticipation(me),
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}
