import { describe, it, expect } from "vitest";
import * as contracts from "../index.js";
import {
  CHAT_ATTACHMENT_MAX_SIZE_BYTES,
  CHAT_CONVERSATION_SCOPE_REQUIREMENTS,
  CHAT_CONVERSATION_TRANSITIONS,
  CHAT_HISTORY_DEFAULT_LIMIT,
  CHAT_MESSAGE_MAX_LENGTH,
  CHAT_PARTICIPANT_ROLE_CAPABILITIES,
  ChatConversationStatus,
  ChatConversationType,
  ChatMessageType,
  ChatParticipantCapability,
  ChatParticipantRole,
  ChatParticipantStatus,
  ChatPermission,
  canTransitionConversation,
  chatSequenceSchema,
  computeChatUnreadCount,
  createChatAttachmentSchema,
  isConversationWritable,
  listChatMessagesQuerySchema,
  markChatReadSchema,
  participantHasCapability,
  sendChatMessageSchema,
  transitionRequiresModeration,
  updateChatParticipantPreferencesSchema,
} from "./index.js";

const CLIENT_ID = "5f0c1a0e-8c2b-4a57-9c6e-2a7b1f3d4e5a";
const OTHER_ID = "9a1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d";

describe("chat contracts: package exports", () => {
  it("re-exports chat enums, schemas and helpers from the package root", () => {
    expect(contracts.ChatConversationType).toBe(ChatConversationType);
    expect(contracts.sendChatMessageSchema).toBe(sendChatMessageSchema);
    expect(typeof contracts.computeChatUnreadCount).toBe("function");
    expect(typeof contracts.canTransitionConversation).toBe("function");
  });
});

describe("chat contracts: enum values match persisted database values", () => {
  // These string values are stored in PostgreSQL enum types; a change here
  // without a migration would break reads of existing rows.
  it("conversation types", () => {
    expect(Object.values(ChatConversationType)).toEqual([
      "PARCEL_DELIVERY",
      "SUPPORT_TICKET",
      "HUB_OPERATIONS",
      "MERCHANT_DESK",
      "INTERNAL_SUPERVISOR",
      "DIRECT",
      "GROUP",
    ]);
  });

  it("message types", () => {
    expect(Object.values(ChatMessageType)).toEqual([
      "TEXT",
      "IMAGE",
      "FILE",
      "LOCATION",
      "VOICE",
      "SYSTEM_EVENT",
      "QUICK_ACTION",
    ]);
  });

  it("conversation statuses", () => {
    expect(Object.values(ChatConversationStatus)).toEqual([
      "ACTIVE",
      "ARCHIVED",
      "CLOSED",
      "LOCKED",
    ]);
  });

  it("enum keys equal their values (no aliasing)", () => {
    for (const e of [
      ChatConversationType,
      ChatMessageType,
      ChatConversationStatus,
      ChatParticipantRole,
      ChatParticipantStatus,
    ]) {
      for (const [key, value] of Object.entries(e)) expect(key).toBe(value);
    }
  });

  it("chat permissions are namespaced and unique", () => {
    const values = Object.values(ChatPermission);
    expect(new Set(values).size).toBe(values.length);
    for (const value of values) expect(value.startsWith("chat.")).toBe(true);
  });
});

describe("chatSequenceSchema", () => {
  it("accepts BIGINT-range decimal strings", () => {
    for (const ok of ["0", "1", "5000", "9223372036854775807"]) {
      expect(chatSequenceSchema.safeParse(ok).success).toBe(true);
    }
  });

  it("rejects negatives, leading zeros, decimals, numbers and overflow length", () => {
    for (const bad of ["-1", "01", "1.5", "", "abc", "12345678901234567890"]) {
      expect(chatSequenceSchema.safeParse(bad).success).toBe(false);
    }
    expect(chatSequenceSchema.safeParse(5).success).toBe(false);
  });
});

describe("sendChatMessageSchema", () => {
  it("accepts a valid TEXT message and trims content", () => {
    const parsed = sendChatMessageSchema.safeParse({
      type: ChatMessageType.TEXT,
      clientMessageId: CLIENT_ID,
      content: "  Arriving in 5 minutes  ",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success && parsed.data.type === ChatMessageType.TEXT) {
      expect(parsed.data.content).toBe("Arriving in 5 minutes");
    }
  });

  it("requires a UUID clientMessageId (idempotency key)", () => {
    expect(
      sendChatMessageSchema.safeParse({ type: ChatMessageType.TEXT, content: "hi" }).success,
    ).toBe(false);
    expect(
      sendChatMessageSchema.safeParse({
        type: ChatMessageType.TEXT,
        clientMessageId: "msg_123",
        content: "hi",
      }).success,
    ).toBe(false);
  });

  it("rejects empty/whitespace and oversized text", () => {
    const base = { type: ChatMessageType.TEXT, clientMessageId: CLIENT_ID };
    expect(sendChatMessageSchema.safeParse({ ...base, content: "   " }).success).toBe(false);
    expect(
      sendChatMessageSchema.safeParse({ ...base, content: "x".repeat(CHAT_MESSAGE_MAX_LENGTH + 1) })
        .success,
    ).toBe(false);
    expect(
      sendChatMessageSchema.safeParse({ ...base, content: "x".repeat(CHAT_MESSAGE_MAX_LENGTH) })
        .success,
    ).toBe(true);
  });

  it("rejects client-sent SYSTEM_EVENT messages", () => {
    expect(
      sendChatMessageSchema.safeParse({
        type: ChatMessageType.SYSTEM_EVENT,
        clientMessageId: CLIENT_ID,
        metadata: { eventKey: "parcel.delivered" },
      }).success,
    ).toBe(false);
  });

  it("rejects unknown fields (no smuggled senderId or sequence)", () => {
    expect(
      sendChatMessageSchema.safeParse({
        type: ChatMessageType.TEXT,
        clientMessageId: CLIENT_ID,
        content: "hi",
        senderId: OTHER_ID,
      }).success,
    ).toBe(false);
    expect(
      sendChatMessageSchema.safeParse({
        type: ChatMessageType.TEXT,
        clientMessageId: CLIENT_ID,
        content: "hi",
        sequence: "10",
      }).success,
    ).toBe(false);
  });

  it("requires attachments for IMAGE and rejects duplicates", () => {
    const base = { type: ChatMessageType.IMAGE, clientMessageId: CLIENT_ID };
    expect(sendChatMessageSchema.safeParse({ ...base, attachmentIds: [] }).success).toBe(false);
    expect(
      sendChatMessageSchema.safeParse({ ...base, attachmentIds: [OTHER_ID, OTHER_ID] }).success,
    ).toBe(false);
    expect(sendChatMessageSchema.safeParse({ ...base, attachmentIds: [OTHER_ID] }).success).toBe(
      true,
    );
  });

  it("validates LOCATION coordinates and forbids extra metadata keys", () => {
    const base = { type: ChatMessageType.LOCATION, clientMessageId: CLIENT_ID };
    expect(
      sendChatMessageSchema.safeParse({ ...base, metadata: { latitude: 23.81, longitude: 90.41 } })
        .success,
    ).toBe(true);
    expect(
      sendChatMessageSchema.safeParse({ ...base, metadata: { latitude: 91, longitude: 90 } })
        .success,
    ).toBe(false);
    expect(
      sendChatMessageSchema.safeParse({
        ...base,
        metadata: { latitude: 23.81, longitude: 90.41, html: "<script>" },
      }).success,
    ).toBe(false);
  });

  it("requires exactly one attachment and a duration for VOICE", () => {
    const base = { type: ChatMessageType.VOICE, clientMessageId: CLIENT_ID };
    expect(
      sendChatMessageSchema.safeParse({
        ...base,
        attachmentIds: [OTHER_ID],
        metadata: { durationMs: 4000 },
      }).success,
    ).toBe(true);
    expect(
      sendChatMessageSchema.safeParse({
        ...base,
        attachmentIds: [OTHER_ID, CLIENT_ID],
        metadata: { durationMs: 4000 },
      }).success,
    ).toBe(false);
    expect(sendChatMessageSchema.safeParse({ ...base, attachmentIds: [OTHER_ID] }).success).toBe(
      false,
    );
  });

  it("validates QUICK_ACTION action keys", () => {
    const base = { type: ChatMessageType.QUICK_ACTION, clientMessageId: CLIENT_ID };
    expect(
      sendChatMessageSchema.safeParse({ ...base, metadata: { actionKey: "rider.arriving" } })
        .success,
    ).toBe(true);
    expect(
      sendChatMessageSchema.safeParse({ ...base, metadata: { actionKey: "Rider Arriving!" } })
        .success,
    ).toBe(false);
  });
});

describe("listChatMessagesQuerySchema", () => {
  it("defaults the limit and coerces query strings", () => {
    const parsed = listChatMessagesQuerySchema.parse({ beforeSequence: "5000" });
    expect(parsed.limit).toBe(CHAT_HISTORY_DEFAULT_LIMIT);
    expect(listChatMessagesQuerySchema.parse({ limit: "25" }).limit).toBe(25);
  });

  it("bounds the page size (never the full history)", () => {
    expect(listChatMessagesQuerySchema.safeParse({ limit: "101" }).success).toBe(false);
    expect(listChatMessagesQuerySchema.safeParse({ limit: "0" }).success).toBe(false);
  });

  it("rejects both cursors at once", () => {
    expect(
      listChatMessagesQuerySchema.safeParse({ beforeSequence: "10", afterSequence: "5" }).success,
    ).toBe(false);
  });
});

describe("other request schemas", () => {
  it("markChatReadSchema requires a sequence string", () => {
    expect(markChatReadSchema.safeParse({ lastReadSequence: "42" }).success).toBe(true);
    expect(markChatReadSchema.safeParse({ lastReadSequence: 42 }).success).toBe(false);
  });

  it("preferences update requires at least one field", () => {
    expect(updateChatParticipantPreferencesSchema.safeParse({}).success).toBe(false);
    expect(updateChatParticipantPreferencesSchema.safeParse({ isMuted: true }).success).toBe(true);
  });

  it("attachment metadata enforces MIME allow-list, size, checksum and filename safety", () => {
    const valid = {
      originalFilename: "invoice.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1024,
      checksumSha256: "a".repeat(64),
    };
    expect(createChatAttachmentSchema.safeParse(valid).success).toBe(true);
    expect(createChatAttachmentSchema.safeParse({ ...valid, mimeType: "text/html" }).success).toBe(
      false,
    );
    expect(
      createChatAttachmentSchema.safeParse({
        ...valid,
        sizeBytes: CHAT_ATTACHMENT_MAX_SIZE_BYTES + 1,
      }).success,
    ).toBe(false);
    expect(createChatAttachmentSchema.safeParse({ ...valid, checksumSha256: "XYZ" }).success).toBe(
      false,
    );
    expect(
      createChatAttachmentSchema.safeParse({ ...valid, originalFilename: "../../etc/passwd" })
        .success,
    ).toBe(false);
  });
});

describe("chat policy", () => {
  it("defines transitions for every status and never allows identity transitions", () => {
    for (const status of Object.values(ChatConversationStatus)) {
      expect(CHAT_CONVERSATION_TRANSITIONS[status]).toBeDefined();
      expect(canTransitionConversation(status, status)).toBe(false);
    }
  });

  it("LOCKED cannot go straight to ARCHIVED and lock changes need moderation", () => {
    expect(
      canTransitionConversation(ChatConversationStatus.LOCKED, ChatConversationStatus.ARCHIVED),
    ).toBe(false);
    expect(
      canTransitionConversation(ChatConversationStatus.CLOSED, ChatConversationStatus.ACTIVE),
    ).toBe(true);
    expect(
      transitionRequiresModeration(ChatConversationStatus.ACTIVE, ChatConversationStatus.LOCKED),
    ).toBe(true);
    expect(
      transitionRequiresModeration(ChatConversationStatus.LOCKED, ChatConversationStatus.ACTIVE),
    ).toBe(true);
    expect(
      transitionRequiresModeration(ChatConversationStatus.ACTIVE, ChatConversationStatus.CLOSED),
    ).toBe(false);
  });

  it("only ACTIVE conversations are writable", () => {
    expect(isConversationWritable(ChatConversationStatus.ACTIVE)).toBe(true);
    expect(isConversationWritable(ChatConversationStatus.CLOSED)).toBe(false);
    expect(isConversationWritable(ChatConversationStatus.LOCKED)).toBe(false);
    expect(isConversationWritable(ChatConversationStatus.ARCHIVED)).toBe(false);
  });

  it("covers every conversation type with scope requirements", () => {
    for (const type of Object.values(ChatConversationType)) {
      expect(CHAT_CONVERSATION_SCOPE_REQUIREMENTS[type]).toBeDefined();
    }
    expect(CHAT_CONVERSATION_SCOPE_REQUIREMENTS.PARCEL_DELIVERY.parcel).toBe(true);
    expect(CHAT_CONVERSATION_SCOPE_REQUIREMENTS.HUB_OPERATIONS.hub).toBe(true);
  });

  it("observers are read-only and inactive members have no capabilities", () => {
    for (const role of Object.values(ChatParticipantRole)) {
      expect(CHAT_PARTICIPANT_ROLE_CAPABILITIES[role]).toContain(ChatParticipantCapability.READ);
    }
    expect(
      participantHasCapability(
        ChatParticipantRole.OBSERVER,
        ChatParticipantStatus.ACTIVE,
        ChatParticipantCapability.SEND_MESSAGE,
      ),
    ).toBe(false);
    expect(
      participantHasCapability(
        ChatParticipantRole.OWNER,
        ChatParticipantStatus.REMOVED,
        ChatParticipantCapability.READ,
      ),
    ).toBe(false);
    expect(
      participantHasCapability(
        ChatParticipantRole.MEMBER,
        ChatParticipantStatus.ACTIVE,
        ChatParticipantCapability.REMOVE_ANY_MESSAGE,
      ),
    ).toBe(false);
  });
});

describe("computeChatUnreadCount", () => {
  it("is the cursor difference, floored at zero", () => {
    expect(computeChatUnreadCount("50", "45")).toBe(5);
    expect(computeChatUnreadCount("50", "50")).toBe(0);
    expect(computeChatUnreadCount("10", "12")).toBe(0);
  });

  it("keeps precision beyond 2^53", () => {
    expect(computeChatUnreadCount("9223372036854775807", "9223372036854775806")).toBe(1);
  });
});
