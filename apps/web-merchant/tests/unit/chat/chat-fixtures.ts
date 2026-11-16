import {
  ChatConversationStatus,
  ChatConversationType,
  ChatMessageType,
  ChatNotificationLevel,
  ChatParticipantRole,
  ChatParticipantStatus,
  type ChatConversationSummary,
  type ChatMessageItem,
  type ChatMessagePage,
} from "@dhruto/contracts";

export const ME = "00000000-0000-4000-8000-000000000001";
export const OTHER = "00000000-0000-4000-8000-000000000002";
export const CONV = "00000000-0000-4000-8000-0000000000c1";

let counter = 0;

/** Canonical server message (mirrors the backend `ChatMessageItem` contract). */
export function serverMessage(overrides: Partial<ChatMessageItem> & { sequence: string }): ChatMessageItem {
  counter += 1;
  const id = overrides.id ?? `00000000-0000-4000-9000-${String(counter).padStart(12, "0")}`;
  return {
    id,
    conversationId: CONV,
    clientMessageId: `client-${id}`,
    senderId: OTHER,
    type: ChatMessageType.TEXT,
    content: `message ${overrides.sequence}`,
    replyToMessageId: null,
    metadata: null,
    attachments: [],
    reactions: [],
    createdAt: new Date(Date.UTC(2026, 10, 15, 10, 0, Number(overrides.sequence))).toISOString(),
    editedAt: null,
    deletedAt: null,
    ...overrides,
  };
}

export function page(items: ChatMessageItem[], hasMore = false): ChatMessagePage {
  return {
    items,
    hasMore,
    nextBeforeSequence: hasMore ? (items[0]?.sequence ?? null) : null,
    nextAfterSequence: items[items.length - 1]?.sequence ?? null,
    senders: [{ userId: OTHER, displayName: "Rahim Rider", platformRole: "RIDER" }],
  };
}

export function summary(overrides: Partial<ChatConversationSummary> = {}): ChatConversationSummary {
  return {
    id: CONV,
    type: ChatConversationType.PARCEL_DELIVERY,
    title: null,
    status: ChatConversationStatus.ACTIVE,
    parcelId: null,
    parcel: null,
    hubId: null,
    merchantId: null,
    lastMessageSequence: "3",
    lastMessage: {
      id: "m3",
      sequence: "3",
      senderId: OTHER,
      preview: "On my way",
      createdAt: new Date().toISOString(),
    },
    unreadCount: 2,
    myParticipation: {
      role: ChatParticipantRole.MEMBER,
      status: ChatParticipantStatus.ACTIVE,
      isMuted: false,
      mutedUntil: null,
      notificationLevel: ChatNotificationLevel.ALL,
      lastReadSequence: "1",
      lastDeliveredSequence: "1",
      capabilities: [],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

/** Wraps a payload in the platform response envelope. */
export function envelope<T>(data: T): Response {
  return new Response(JSON.stringify({ success: true, statusCode: 200, message: "OK", data }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
