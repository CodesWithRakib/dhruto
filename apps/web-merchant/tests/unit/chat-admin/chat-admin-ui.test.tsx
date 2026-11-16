import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { Provider } from "react-redux";
import {
  ApiErrorCode,
  ChatAttachmentScanStatus,
  ChatAttachmentStatus,
  ChatConversationStatus,
  ChatConversationType,
  ChatEscalationStatus,
  ChatPermission,
  type ChatAttachmentItem,
  type ChatEscalationDetail,
  type ChatInboxItem,
  type ChatStaffProfile,
} from "@dhruto/contracts";
import messages from "../../../messages/en.json";
import bn from "../../../messages/bn.json";
import { makeStore } from "@/store";

/* ------------------------------------------------------------------ */
/* Network boundary mocks (RTK hooks + routing); components are real.  */
/* ------------------------------------------------------------------ */

let profile: ChatStaffProfile;
let inboxItems: ChatInboxItem[] = [];
let escalation: ChatEscalationDetail;
const updateEscalation = vi.fn();
let downloadState: { data?: { url: string }; error?: unknown } = {};

vi.mock("@/lib/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/admin/communications",
}));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams("tab=inbox") }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

vi.mock("../../../features/chat-admin/api/chat-admin.api", () => ({
  useGetStaffProfileQuery: () => ({
    data: profile,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useGetAdminMetricsQuery: () => ({ data: undefined, isLoading: true }),
  useGetInboxInfiniteQuery: () => ({
    data: { pages: [{ items: inboxItems, hasMore: false, nextCursor: null }] },
    isLoading: false,
    isError: false,
    hasNextPage: false,
  }),
  useGetReportsInfiniteQuery: () => ({ data: { pages: [] }, isLoading: false, isError: false }),
  useReviewReportMutation: () => [vi.fn(), { isLoading: false }],
  useGetAttachmentQueueInfiniteQuery: () => ({
    data: { pages: [] },
    isLoading: false,
    isError: false,
  }),
  useGetRetentionQuery: () => ({ data: undefined, isLoading: true }),
  useGetAuditLogsInfiniteQuery: () => ({ data: { pages: [] }, isLoading: false, isError: false }),
  useLazyRestrictedDownloadQuery: () => [vi.fn()],
  useDecideAttachmentMutation: () => [vi.fn()],
  useGetEscalationQuery: () => ({
    data: escalation,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useUpdateEscalationMutation: () => [updateEscalation],
}));

vi.mock("../../../features/chat/api/chat.api", async (importActual) => ({
  ...(await importActual<typeof import("../../../features/chat/api/chat.api")>()),
  useGetAttachmentDownloadQuery: (_id: string, options?: { skip?: boolean }) =>
    options?.skip ? {} : downloadState,
}));

import { CommunicationCenter } from "../../../features/chat-admin/components/communication-center";
import { EscalationCard } from "../../../features/chat-admin/components/workspace/escalation-card";
import { ReasonDialog } from "../../../features/chat-admin/components/reason-dialog";
import { AttachmentSecurityGate } from "../../../features/chat/components/attachment-security-gate";
import { AttachmentsPanel } from "../../../features/chat-admin/components/attachments-panel";

function renderUi(ui: React.ReactElement) {
  return render(
    <Provider store={makeStore()}>
      <NextIntlClientProvider locale="en" messages={messages} timeZone="Asia/Dhaka">
        {ui}
      </NextIntlClientProvider>
    </Provider>,
  );
}

const ADMIN_PERMS = [
  ChatPermission.CONVERSATION_VIEW_ANY,
  ChatPermission.ESCALATION_MANAGE,
  ChatPermission.REPORT_REVIEW,
  ChatPermission.AUDIT_VIEW,
];

const inboxItem = (overrides: Partial<ChatInboxItem> = {}): ChatInboxItem => ({
  id: "c-1",
  type: ChatConversationType.PARCEL_DELIVERY,
  title: null,
  status: ChatConversationStatus.ACTIVE,
  parcel: { id: "p-1", trackingCode: "DX-1001", status: "IN_TRANSIT" as never },
  hubId: "h-1",
  hubName: "Dhaka Hub",
  merchantId: "m-1",
  merchantName: "Shop A",
  lastActivityAt: "2026-11-16T10:00:00.000Z",
  lastMessageSequence: "4",
  activeParticipantCount: 3,
  isParticipant: false,
  lastMessagePreview: null,
  unreadCount: null,
  openReportCount: 2,
  escalation: {
    status: ChatEscalationStatus.ESCALATED,
    assigneeUserId: "me",
    assigneeName: "Me",
    updatedAt: "2026-11-16T10:00:00.000Z",
  },
  createdAt: "2026-11-15T10:00:00.000Z",
  ...overrides,
});

beforeEach(() => {
  profile = { userId: "me", role: "ADMIN", permissions: ADMIN_PERMS, hubIds: [] };
  inboxItems = [inboxItem()];
  updateEscalation.mockReset();
  downloadState = {};
});

describe("Communication Center shell", () => {
  it("shows permission-aware tabs and the unauthorized state", () => {
    const { unmount } = renderUi(<CommunicationCenter />);
    for (const name of [
      "Overview",
      "Inbox",
      "Escalations",
      "Reports",
      "Attachment security",
      "Audit",
    ]) {
      expect(screen.getByRole("tab", { name })).toBeTruthy();
    }
    unmount();
    profile = { ...profile, permissions: [ChatPermission.CONVERSATION_VIEW_ANY] };
    const second = renderUi(<CommunicationCenter />);
    expect(screen.queryByRole("tab", { name: "Escalations" })).toBeNull();
    expect(screen.queryByRole("tab", { name: "Audit" })).toBeNull();
    second.unmount();
    profile = { ...profile, permissions: [] };
    renderUi(<CommunicationCenter />);
    expect(screen.getByText("You don't have access")).toBeTruthy();
  });

  it("inbox rows show metadata, escalation, report count and link to the workspace — no content preview", () => {
    renderUi(<CommunicationCenter />);
    const link = screen.getByRole("link", { name: /Parcel DX-1001/ });
    expect(link.getAttribute("href")).toBe("/admin/communications/c-1");
    expect(screen.getByText(/Escalated · mine/)).toBeTruthy();
    expect(screen.getByText("2 reports")).toBeTruthy();
    expect(screen.getByText(/Shop A · Dhaka Hub/)).toBeTruthy();
  });
});

describe("Attachment security", () => {
  it("shows a restricted state and makes no request without the grant", () => {
    renderUi(<AttachmentsPanel profile={profile} />);
    expect(screen.getByText("Restricted area")).toBeTruthy();
  });
});

describe("EscalationCard", () => {
  it("offers only transitions allowed by the shared policy and requires a note to escalate", async () => {
    escalation = {
      current: {
        conversationId: "c-1",
        status: null,
        note: null,
        assigneeUserId: null,
        assigneeName: null,
        updatedAt: null,
        updatedByUserId: null,
      },
      history: [],
    };
    renderUi(<EscalationCard conversationId="c-1" profile={profile} />);
    expect(screen.getByRole("button", { name: "Flag for attention" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Escalate" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Resolve" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Close" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Escalate" }));
    const save = screen.getByRole("button", { name: "Save" }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Reason"), {
      target: { value: "Rider threatened by recipient" },
    });
    expect(save.disabled).toBe(false);
    updateEscalation.mockReturnValue({ unwrap: () => Promise.resolve(escalation) });
    fireEvent.click(save);
    await waitFor(() =>
      expect(updateEscalation).toHaveBeenCalledWith({
        id: "c-1",
        body: { status: ChatEscalationStatus.ESCALATED, note: "Rider threatened by recipient" },
      }),
    );
  });

  it("hides actions without escalation.manage", () => {
    escalation = {
      current: {
        conversationId: "c-1",
        status: ChatEscalationStatus.OPEN,
        note: "Flagged",
        assigneeUserId: null,
        assigneeName: null,
        updatedAt: "2026-11-16T10:00:00.000Z",
        updatedByUserId: "x",
      },
      history: [],
    };
    renderUi(
      <EscalationCard
        conversationId="c-1"
        profile={{ ...profile, permissions: [ChatPermission.CONVERSATION_VIEW_ANY] }}
      />,
    );
    expect(screen.getByText("Flagged")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Take into review" })).toBeNull();
  });
});

describe("ReasonDialog", () => {
  it("enforces the minimum length before submitting", () => {
    const submit = vi.fn(() => Promise.resolve(true));
    renderUi(
      <ReasonDialog
        open
        onOpenChange={() => undefined}
        title="Why?"
        confirmLabel="Go"
        onSubmit={submit}
      />,
    );
    const go = screen.getByRole("button", { name: "Go" }) as HTMLButtonElement;
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "too short" } });
    expect(go.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "long enough reason" } });
    expect(go.disabled).toBe(false);
  });
});

describe("AttachmentSecurityGate (participant messenger)", () => {
  const file = (scanStatus: ChatAttachmentScanStatus): ChatAttachmentItem => ({
    id: "a-1",
    originalFilename: "invoice.pdf",
    mimeType: "application/pdf",
    kind: "document",
    sizeBytes: 10,
    status: ChatAttachmentStatus.UPLOADED,
    uploadedAt: null,
    scanStatus,
  });

  it("renders clean files directly", () => {
    renderUi(
      <AttachmentSecurityGate attachment={file(ChatAttachmentScanStatus.CLEAN)}>
        <span>content</span>
      </AttachmentSecurityGate>,
    );
    expect(screen.getByText("content")).toBeTruthy();
  });

  it("shows a security-check state while pending and never the content", () => {
    downloadState = {
      error: { status: 409, data: { errorCode: ApiErrorCode.CHAT_ATTACHMENT_SCAN_PENDING } },
    };
    renderUi(
      <AttachmentSecurityGate attachment={file(ChatAttachmentScanStatus.PENDING)}>
        <span>content</span>
      </AttachmentSecurityGate>,
    );
    expect(screen.getByText("Security check in progress…")).toBeTruthy();
    expect(screen.queryByText("content")).toBeNull();
  });

  it("switches to content once the server returns a URL, and to blocked when the server blocks it", () => {
    downloadState = { data: { url: "https://x" } };
    const { unmount } = renderUi(
      <AttachmentSecurityGate attachment={file(ChatAttachmentScanStatus.PENDING)}>
        <span>content</span>
      </AttachmentSecurityGate>,
    );
    expect(screen.getByText("content")).toBeTruthy();
    unmount();
    downloadState = {
      error: { status: 409, data: { errorCode: ApiErrorCode.CHAT_ATTACHMENT_BLOCKED } },
    };
    renderUi(
      <AttachmentSecurityGate attachment={file(ChatAttachmentScanStatus.PENDING)}>
        <span>content</span>
      </AttachmentSecurityGate>,
    );
    expect(screen.getByText("Blocked for security reasons")).toBeTruthy();
  });

  it("never requests infected files", () => {
    downloadState = { data: { url: "https://should-not-be-used" } };
    renderUi(
      <AttachmentSecurityGate attachment={file(ChatAttachmentScanStatus.INFECTED)}>
        <span>content</span>
      </AttachmentSecurityGate>,
    );
    expect(screen.getByText("Blocked for security reasons")).toBeTruthy();
    expect(screen.queryByText("content")).toBeNull();
  });
});

describe("translations", () => {
  function keys(value: unknown, prefix = ""): string[] {
    if (typeof value !== "object" || value === null) return [prefix];
    return Object.entries(value).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
  }
  it("ChatAdmin has identical keys in English and Bangla", () => {
    expect(keys((bn as Record<string, unknown>).ChatAdmin).sort()).toEqual(
      keys(messages.ChatAdmin).sort(),
    );
    expect(bn.Nav.communications).toBeTruthy();
    expect(bn.Chat.attachments.scanPending).toBeTruthy();
  });
});
