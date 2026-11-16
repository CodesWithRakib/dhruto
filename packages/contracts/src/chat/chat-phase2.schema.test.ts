import { describe, it, expect } from "vitest";
import * as contracts from "../index.js";
import {
  ApiErrorCode,
  CHAT_GROUP_MAX_PARTICIPANTS,
  ChatAuditAction,
  ChatPermission,
  DomainEventType,
  addChatParticipantSchema,
  adminChatExportQuerySchema,
  adminChatMessagesQuerySchema,
  adminChatReasonQuerySchema,
  chatSearchQuerySchema,
  chatStatusActionSchema,
  createChatConversationSchema,
  editChatMessageSchema,
  removeChatMessageSchema,
  reviewChatReportSchema,
} from "../index.js";

const UUID_A = "5f0c1a0e-8c2b-4a57-9c6e-2a7b1f3d4e5a";
const UUID_B = "9a1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d";

describe("phase 2 exports", () => {
  it("exports management and admin schemas from the package root", () => {
    expect(contracts.createChatConversationSchema).toBe(createChatConversationSchema);
    expect(contracts.adminChatMessagesQuerySchema).toBe(adminChatMessagesQuerySchema);
  });

  it("chat domain events follow the versioned naming convention", () => {
    const chatEvents = Object.values(DomainEventType).filter((e) => e.startsWith("chat."));
    expect(chatEvents.length).toBe(14); // 12 (Phase 2) + pinned/unpinned (Phase 3)
    for (const e of chatEvents) expect(e).toMatch(/^chat\.[a-z_]+\.v1$/);
  });

  it("new permissions, audit actions and error codes are present", () => {
    expect(ChatPermission.CONVERSATION_EXPORT).toBe("chat.conversation.export");
    expect(ChatAuditAction.AUDIT_LOG_VIEWED).toBe("AUDIT_LOG_VIEWED");
    expect(ApiErrorCode.CHAT_CONVERSATION_NOT_FOUND).toBe("CHAT_CONVERSATION_NOT_FOUND");
  });
});

describe("createChatConversationSchema", () => {
  it("accepts each conversation type with its own shape", () => {
    const valid = [
      { type: "PARCEL_DELIVERY", parcelId: UUID_A },
      { type: "SUPPORT_TICKET", title: "Late delivery" },
      { type: "HUB_OPERATIONS", hubId: UUID_A, title: "Night shift" },
      { type: "MERCHANT_DESK" },
      { type: "INTERNAL_SUPERVISOR", title: "Escalations", participantUserIds: [UUID_A] },
      { type: "DIRECT", participantUserId: UUID_A },
      { type: "GROUP", title: "Riders", participantUserIds: [UUID_A, UUID_B] },
    ];
    for (const body of valid)
      expect(createChatConversationSchema.safeParse(body).success).toBe(true);
  });

  it("rejects server-derived or foreign fields (strict)", () => {
    expect(
      createChatConversationSchema.safeParse({
        type: "PARCEL_DELIVERY",
        parcelId: UUID_A,
        merchantId: UUID_B,
      }).success,
    ).toBe(false);
    expect(
      createChatConversationSchema.safeParse({
        type: "DIRECT",
        participantUserId: UUID_A,
        role: "OWNER",
      }).success,
    ).toBe(false);
  });

  it("bounds group size and rejects duplicate participants", () => {
    const tooMany = Array.from(
      { length: CHAT_GROUP_MAX_PARTICIPANTS },
      (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
    );
    expect(
      createChatConversationSchema.safeParse({
        type: "GROUP",
        title: "x",
        participantUserIds: tooMany,
      }).success,
    ).toBe(false);
    expect(
      createChatConversationSchema.safeParse({
        type: "GROUP",
        title: "x",
        participantUserIds: [UUID_A, UUID_A],
      }).success,
    ).toBe(false);
  });
});

describe("participant, message and moderation schemas", () => {
  it("participant role cannot be OWNER and defaults to MEMBER", () => {
    expect(addChatParticipantSchema.safeParse({ userId: UUID_A, role: "OWNER" }).success).toBe(
      false,
    );
    expect(addChatParticipantSchema.parse({ userId: UUID_A }).role).toBe("MEMBER");
  });

  it("staff reasons must be meaningful", () => {
    expect(removeChatMessageSchema.safeParse({ reason: "bad" }).success).toBe(false);
    expect(removeChatMessageSchema.safeParse({ reason: "Harassment of rider" }).success).toBe(true);
    expect(adminChatReasonQuerySchema.safeParse({}).success).toBe(false);
    expect(chatStatusActionSchema.safeParse({}).success).toBe(true);
  });

  it("edit requires non-empty bounded content", () => {
    expect(editChatMessageSchema.safeParse({ content: " " }).success).toBe(false);
    expect(editChatMessageSchema.safeParse({ content: "x".repeat(4001) }).success).toBe(false);
  });

  it("report review cannot reopen to OPEN", () => {
    expect(reviewChatReportSchema.safeParse({ status: "OPEN" }).success).toBe(false);
    // Phase 7: dismissing/resolving now requires a justification.
    expect(reviewChatReportSchema.safeParse({ status: "DISMISSED" }).success).toBe(false);
    expect(
      reviewChatReportSchema.safeParse({ status: "DISMISSED", resolutionNote: "Not abusive" }).success,
    ).toBe(true);
  });
});

describe("search and admin query bounds", () => {
  it("search requires 2+ chars, bounded limit, ordered dates", () => {
    expect(chatSearchQuerySchema.safeParse({ q: "a" }).success).toBe(false);
    expect(chatSearchQuerySchema.safeParse({ q: "ab", limit: "51" }).success).toBe(false);
    expect(
      chatSearchQuerySchema.safeParse({
        q: "ab",
        from: "2026-02-01T00:00:00Z",
        to: "2026-01-01T00:00:00Z",
      }).success,
    ).toBe(false);
    expect(chatSearchQuerySchema.parse({ q: "parcel" }).limit).toBe(20);
  });

  it("admin history/export are bounded and require a reason", () => {
    expect(adminChatMessagesQuerySchema.safeParse({ limit: "50" }).success).toBe(false);
    expect(
      adminChatExportQuerySchema.safeParse({ reason: "Legal hold request", limit: "1001" }).success,
    ).toBe(false);
    expect(adminChatExportQuerySchema.parse({ reason: "Legal hold request" }).limit).toBe(500);
  });
});
