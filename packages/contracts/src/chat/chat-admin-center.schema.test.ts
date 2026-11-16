import { describe, expect, it } from "vitest";
import {
  CHAT_GRANT_REQUIRED_PERMISSIONS,
  ChatAttachmentScanStatus,
  ChatAttachmentStatus,
  ChatEscalationStatus,
  ChatPermission,
  ChatReportStatus,
} from "./chat.enums.js";
import {
  CHAT_ESCALATION_TRANSITIONS,
  canTransitionEscalation,
  chatAttachmentServeDecision,
  escalationNoteRequired,
} from "./chat.policy.js";
import {
  adminChatAttachmentDecisionSchema,
  adminChatInboxQuerySchema,
  updateChatEscalationSchema,
} from "./chat-admin-center.schema.js";
import { reviewChatReportSchema } from "./chat-admin.schema.js";

describe("Phase 7 escalation policy", () => {
  it("allows only listed transitions; never an identity change", () => {
    for (const from of [null, ...Object.values(ChatEscalationStatus)]) {
      for (const to of Object.values(ChatEscalationStatus)) {
        const allowed = CHAT_ESCALATION_TRANSITIONS[from ?? "NONE"].includes(to);
        expect(canTransitionEscalation(from, to)).toBe(allowed);
        if (from === to) expect(allowed).toBe(false);
      }
    }
  });

  it("starts only as OPEN or ESCALATED; resolution precedes closing", () => {
    expect(canTransitionEscalation(null, ChatEscalationStatus.OPEN)).toBe(true);
    expect(canTransitionEscalation(null, ChatEscalationStatus.ESCALATED)).toBe(true);
    expect(canTransitionEscalation(null, ChatEscalationStatus.RESOLVED)).toBe(false);
    expect(canTransitionEscalation(null, ChatEscalationStatus.CLOSED)).toBe(false);
    expect(
      canTransitionEscalation(ChatEscalationStatus.ESCALATED, ChatEscalationStatus.CLOSED),
    ).toBe(false);
    expect(
      canTransitionEscalation(ChatEscalationStatus.RESOLVED, ChatEscalationStatus.CLOSED),
    ).toBe(true);
    expect(canTransitionEscalation(ChatEscalationStatus.CLOSED, ChatEscalationStatus.OPEN)).toBe(
      true,
    );
  });

  it("requires a note for everything except taking a case into review", () => {
    for (const to of Object.values(ChatEscalationStatus)) {
      expect(escalationNoteRequired(to)).toBe(to !== ChatEscalationStatus.IN_REVIEW);
    }
  });

  it("validates the update request strictly", () => {
    expect(
      updateChatEscalationSchema.safeParse({
        status: "ESCALATED",
        note: "Customer threatened rider",
      }).success,
    ).toBe(true);
    expect(
      updateChatEscalationSchema.safeParse({ status: "ESCALATED", note: "short" }).success,
    ).toBe(false);
    expect(updateChatEscalationSchema.safeParse({ status: "NOPE" }).success).toBe(false);
    expect(
      updateChatEscalationSchema.safeParse({ status: "OPEN", note: "x".repeat(20), extra: 1 })
        .success,
    ).toBe(false);
    expect(
      updateChatEscalationSchema.safeParse({ status: "IN_REVIEW", assigneeUserId: null }).success,
    ).toBe(true);
  });
});

describe("Phase 7 attachment serve gate (fail closed)", () => {
  const base = { status: ChatAttachmentStatus.UPLOADED, objectPurged: false };
  it("serves only verified, clean, present objects", () => {
    expect(
      chatAttachmentServeDecision({ ...base, scanStatus: ChatAttachmentScanStatus.CLEAN }),
    ).toBe("serve");
    expect(
      chatAttachmentServeDecision({ ...base, scanStatus: ChatAttachmentScanStatus.PENDING }),
    ).toBe("scan_pending");
    expect(
      chatAttachmentServeDecision({ ...base, scanStatus: ChatAttachmentScanStatus.INFECTED }),
    ).toBe("blocked");
    expect(
      chatAttachmentServeDecision({ ...base, scanStatus: ChatAttachmentScanStatus.FAILED }),
    ).toBe("blocked");
    expect(
      chatAttachmentServeDecision({
        ...base,
        objectPurged: true,
        scanStatus: ChatAttachmentScanStatus.CLEAN,
      }),
    ).toBe("purged");
    for (const status of [ChatAttachmentStatus.PENDING, ChatAttachmentStatus.REJECTED]) {
      expect(
        chatAttachmentServeDecision({
          status,
          objectPurged: false,
          scanStatus: ChatAttachmentScanStatus.CLEAN,
        }),
      ).toBe("not_ready");
    }
  });
});

describe("Phase 7 staff contracts", () => {
  it("grant-required permissions are a strict subset of ChatPermission", () => {
    expect(CHAT_GRANT_REQUIRED_PERMISSIONS.length).toBe(3);
    for (const p of CHAT_GRANT_REQUIRED_PERMISSIONS)
      expect(Object.values(ChatPermission)).toContain(p);
    expect(CHAT_GRANT_REQUIRED_PERMISSIONS).not.toContain(ChatPermission.CONVERSATION_VIEW_ANY);
  });

  it("inbox query: bounded, strict, exact-identifier search only", () => {
    const ok = adminChatInboxQuerySchema.safeParse({
      escalation: "ACTIVE",
      hasOpenReports: "true",
      q: "DHK-123",
    });
    expect(ok.success && ok.data.hasOpenReports).toBe(true);
    expect(adminChatInboxQuerySchema.safeParse({ limit: "51" }).success).toBe(false);
    expect(adminChatInboxQuerySchema.safeParse({ q: "x".repeat(65) }).success).toBe(false);
    expect(adminChatInboxQuerySchema.safeParse({ sql: "1" }).success).toBe(false);
    expect(
      adminChatInboxQuerySchema.safeParse({
        from: "2026-11-10T00:00:00Z",
        to: "2026-11-01T00:00:00Z",
      }).success,
    ).toBe(false);
  });

  it("report resolve/dismiss require a note; taking into review does not", () => {
    expect(
      reviewChatReportSchema.safeParse({ status: ChatReportStatus.UNDER_REVIEW }).success,
    ).toBe(true);
    expect(reviewChatReportSchema.safeParse({ status: ChatReportStatus.DISMISSED }).success).toBe(
      false,
    );
    expect(reviewChatReportSchema.safeParse({ status: ChatReportStatus.RESOLVED }).success).toBe(
      false,
    );
    expect(
      reviewChatReportSchema.safeParse({
        status: ChatReportStatus.DISMISSED,
        resolutionNote: "Not abusive",
      }).success,
    ).toBe(true);
  });

  it("attachment decisions need a reason", () => {
    expect(adminChatAttachmentDecisionSchema.safeParse({ action: "RELEASE" }).success).toBe(false);
    expect(
      adminChatAttachmentDecisionSchema.safeParse({
        action: "RESCAN",
        reason: "Scanner was offline",
      }).success,
    ).toBe(true);
  });
});
