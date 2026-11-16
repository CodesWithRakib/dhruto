import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider, useTranslations } from "next-intl";
import { Provider } from "react-redux";
import {
  CHAT_LOGISTICS_EVENT_KEYS,
  ChatConversationType,
  DeliveryFailureReason,
  ParcelStatus,
  type ChatUnreadSummary,
  type CreateChatConversationRequest,
} from "@dhruto/contracts";
import messages from "../../../messages/en.json";
import { makeStore, type AppStore } from "@/store";
import { setCredentials } from "@/store/auth.slice";
import { installLocalStorageMock } from "../storage-mock";
import { CONV, ME, summary } from "./chat-fixtures";

installLocalStorageMock();

const push = vi.fn();
vi.mock("@/lib/navigation", () => ({
  Link: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) =>
    React.createElement("a", { href, ...props }, children),
  useRouter: () => ({ push, replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/en",
  redirect: vi.fn(),
}));

const toastError = vi.fn();
vi.mock("sonner", () => ({ toast: { error: (message: string) => toastError(message) } }));

type OpenResult = () => Promise<{ id: string }>;
const openCalls: CreateChatConversationRequest[] = [];
let openResult: OpenResult = async () => ({ id: CONV });
let unreadData: ChatUnreadSummary | undefined;

vi.mock("../../../features/chat/api/chat.api", async (importActual) => {
  const actual = await importActual<typeof import("../../../features/chat/api/chat.api")>();
  return {
    ...actual,
    useOpenConversationMutation: () => [
      (body: CreateChatConversationRequest) => {
        openCalls.push(body);
        return { unwrap: () => openResult() };
      },
    ],
    useGetUnreadSummaryQuery: () => ({ data: unreadData }),
  };
});

import { OpenConversationButton } from "../../../features/chat/components/open-conversation-button";
import { ParcelContextBar } from "../../../features/chat/components/parcel-context-bar";
import { ChatUnreadBadge } from "../../../features/chat/components/chat-unread-badge";
import { ConversationListItem } from "../../../features/chat/components/conversation-sidebar";
import { systemEventText } from "../../../features/chat/lib/system-events";
import { conversationTitle } from "../../../features/chat/lib/display";
import { parcelHref, sectionForRole } from "../../../features/chat/lib/routes";
import { chatErrorKey } from "../../../features/chat/lib/errors";

/** The real `useTranslations("Chat")` translator — exactly what components pass to the helpers. */
function chatT() {
  const { result } = renderHook(() => useTranslations("Chat"), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <NextIntlClientProvider locale="en" messages={messages} timeZone="Asia/Dhaka">
        {children}
      </NextIntlClientProvider>
    ),
  });
  return result.current;
}
const PARCEL = "00000000-0000-4000-8000-0000000000a1";
const parcel = { id: PARCEL, trackingCode: "DX-7781", status: ParcelStatus.OUT_FOR_DELIVERY };

function storeAs(role: string): AppStore {
  const store = makeStore();
  store.dispatch(
    setCredentials({
      user: { id: ME, email: "user@example.test", name: "User", phone: "01700000000", role },
      accessToken: "access",
      refreshToken: "refresh",
    }),
  );
  return store;
}

function renderUi(ui: React.ReactElement, store: AppStore = storeAs("RIDER")) {
  return render(
    <Provider store={store}>
      <NextIntlClientProvider locale="en" messages={messages} timeZone="Asia/Dhaka">
        {ui}
      </NextIntlClientProvider>
    </Provider>,
  );
}

const rtkError = (status: number, errorCode: string) => ({ status, data: { errorCode } });

describe("logistics system messages", () => {
  it("renders each lifecycle event with the server-provided tracking code", () => {
    const t = chatT();
    const text =(eventKey: string) => systemEventText({ eventKey, params: { trackingCode: "DX-1" } }, t);
    expect(text(CHAT_LOGISTICS_EVENT_KEYS.RIDER_ASSIGNED)).toBe("A rider was assigned to parcel DX-1.");
    expect(text(CHAT_LOGISTICS_EVENT_KEYS.RIDER_REASSIGNED)).toBe("Parcel DX-1 was reassigned to another rider.");
    expect(text(CHAT_LOGISTICS_EVENT_KEYS.OUT_FOR_DELIVERY)).toBe("Parcel DX-1 is out for delivery.");
    expect(text(CHAT_LOGISTICS_EVENT_KEYS.DELIVERED)).toBe("Parcel DX-1 was delivered.");
    expect(text(CHAT_LOGISTICS_EVENT_KEYS.RETURNED)).toBe("Parcel DX-1 was returned to the merchant.");
  });

  it("translates allow-listed failure reasons and ignores anything else", () => {
    const t = chatT();
    expect(
      systemEventText(
        {
          eventKey: CHAT_LOGISTICS_EVENT_KEYS.DELIVERY_FAILED,
          params: { trackingCode: "DX-1", reason: DeliveryFailureReason.ADDRESS_INCORRECT },
        },
        t,
      ),
    ).toBe("Delivery attempt for parcel DX-1 failed. Reason: incorrect address.");
    expect(
      systemEventText(
        { eventKey: CHAT_LOGISTICS_EVENT_KEYS.DELIVERY_FAILED, params: { trackingCode: "DX-1", reason: "<b>call me</b>" } },
        t,
      ),
    ).toBe("Delivery attempt for parcel DX-1 failed.");
  });

  it("falls back safely for unknown keys, missing params and staff joins", () => {
    const t = chatT();
    expect(systemEventText({ eventKey: "parcel.unknown_thing" }, t)).toBe(messages.Chat.systemEvent);
    expect(systemEventText({ eventKey: CHAT_LOGISTICS_EVENT_KEYS.DELIVERED }, t)).toBe(messages.Chat.parcelUpdated);
    expect(systemEventText({ eventKey: "chat.staff_joined", params: { role: "ADMIN" } }, t)).toBe(
      messages.Chat.systemStaffJoined,
    );
    expect(systemEventText(null, t)).toBe(messages.Chat.systemEvent);
  });
});

describe("parcel context and routing helpers", () => {
  it("parcel threads are titled by tracking code; explicit titles win", () => {
    const t = chatT();
    expect(conversationTitle({ title: null, type: ChatConversationType.PARCEL_DELIVERY, parcel }, t)).toBe("Parcel DX-7781");
    expect(conversationTitle({ title: "VIP", type: ChatConversationType.PARCEL_DELIVERY, parcel }, t)).toBe("VIP");
    expect(conversationTitle({ title: null, type: ChatConversationType.MERCHANT_DESK, parcel: null }, t)).toBe(
      messages.Chat.types.MERCHANT_DESK,
    );
  });

  it("maps roles to messenger sections and parcels to role-specific routes", () => {
    expect(sectionForRole("HUB_MANAGER")).toBe("hub");
    expect(sectionForRole("SUPERADMIN")).toBeNull();
    expect(sectionForRole(null)).toBeNull();
    expect(parcelHref("merchant", parcel)).toBe(`/merchant/parcels/${PARCEL}`);
    expect(parcelHref("admin", parcel)).toBe(`/admin/parcels/${PARCEL}`);
    expect(parcelHref("rider", parcel)).toBe(`/rider/tasks/${PARCEL}`);
    expect(parcelHref("customer", parcel)).toBe("/customer/track/DX-7781");
    expect(parcelHref("hub", parcel)).toBe("/hub/parcels");
  });

  it("maps get-or-create errors to neutral keys", () => {
    expect(chatErrorKey(rtkError(422, "CHAT_SCOPE_INVALID"))).toBe("unavailable");
    expect(chatErrorKey(rtkError(422, "CHAT_REASON_REQUIRED"))).toBe("reasonRequired");
  });

  it("context bar shows code, status and the role's way back to the parcel", () => {
    renderUi(<ParcelContextBar parcel={parcel} section="customer" />);
    expect(screen.getByText("DX-7781")).toBeTruthy();
    expect(screen.getByText(messages.ParcelStatus.outForDelivery)).toBeTruthy();
    expect(screen.getByRole("link", { name: /View parcel/ }).getAttribute("href")).toBe("/customer/track/DX-7781");
  });

  it("list item uses the parcel title", () => {
    renderUi(<ConversationListItem conversation={summary({ parcelId: PARCEL, parcel })} href="/x" active={false} myUserId={ME} />);
    expect(screen.getByText("Parcel DX-7781")).toBeTruthy();
  });
});

describe("OpenConversationButton (contextual entry point)", () => {
  beforeEach(() => {
    openCalls.length = 0;
    push.mockReset();
    toastError.mockReset();
    openResult = async () => ({ id: CONV });
  });

  it("asks the backend for the parcel thread once and navigates to the role's messenger", async () => {
    renderUi(<OpenConversationButton target={{ kind: "parcel", parcelId: PARCEL }} />, storeAs("RIDER"));
    const button = screen.getByRole("button", { name: messages.Chat.openParcelChat });
    fireEvent.click(button);
    fireEvent.click(button); // double click while pending: still one request
    await waitFor(() => expect(push).toHaveBeenCalledWith(`/rider/messages/${CONV}`));
    expect(openCalls).toEqual([{ type: ChatConversationType.PARCEL_DELIVERY, parcelId: PARCEL }]);
  });

  it("does not request anything on render", () => {
    renderUi(<OpenConversationButton target={{ kind: "parcel", parcelId: PARCEL }} />);
    expect(openCalls).toHaveLength(0);
  });

  it("shows a neutral message when the parcel is not accessible", async () => {
    openResult = () => Promise.reject(rtkError(422, "CHAT_SCOPE_INVALID"));
    renderUi(<OpenConversationButton target={{ kind: "parcel", parcelId: PARCEL }} />, storeAs("CUSTOMER"));
    fireEvent.click(screen.getByRole("button", { name: messages.Chat.openParcelChat }));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith(messages.Chat.errors.unavailable));
    expect(push).not.toHaveBeenCalled();
  });

  it("staff joining an existing thread must give a reason, which is sent with the retry", async () => {
    let attempt = 0;
    openResult = () => {
      attempt += 1;
      return attempt === 1 ? Promise.reject(rtkError(422, "CHAT_REASON_REQUIRED")) : Promise.resolve({ id: CONV });
    };
    renderUi(<OpenConversationButton target={{ kind: "parcel", parcelId: PARCEL }} />, storeAs("ADMIN"));
    fireEvent.click(screen.getByRole("button", { name: messages.Chat.openParcelChat }));
    const reason = await screen.findByLabelText(messages.Chat.staffJoinReason);
    expect(toastError).not.toHaveBeenCalled();

    fireEvent.change(reason, { target: { value: "short" } });
    fireEvent.click(screen.getByRole("button", { name: messages.Chat.staffJoinConfirm }));
    expect(await screen.findByText(messages.Chat.staffJoinReasonHint)).toBeTruthy();
    expect(openCalls).toHaveLength(1);

    fireEvent.change(reason, { target: { value: "Customer escalation about a late delivery" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: messages.Chat.staffJoinConfirm }));
    });
    await waitFor(() => expect(push).toHaveBeenCalledWith(`/admin/messages/${CONV}`));
    expect(openCalls[1]).toEqual({
      type: ChatConversationType.PARCEL_DELIVERY,
      parcelId: PARCEL,
      reason: "Customer escalation about a late delivery",
    });
  });

  it("merchant desk: the merchant id is derived by the server, not sent by the client", async () => {
    renderUi(<OpenConversationButton target={{ kind: "merchantDesk" }} />, storeAs("MERCHANT"));
    fireEvent.click(screen.getByRole("button", { name: messages.Chat.contactOperations }));
    await waitFor(() => expect(push).toHaveBeenCalledWith(`/merchant/messages/${CONV}`));
    expect(openCalls).toEqual([{ type: ChatConversationType.MERCHANT_DESK }]);
  });
});

describe("ChatUnreadBadge", () => {
  it("shows the count, caps at 99+, and hides when nothing is unread", () => {
    unreadData = { unreadConversations: 3, capped: false };
    const { rerender } = renderUi(<ChatUnreadBadge />);
    expect(screen.getByLabelText("3 unread conversations").textContent).toBe("3");

    unreadData = { unreadConversations: 99, capped: true };
    rerender(
      <Provider store={storeAs("RIDER")}>
        <NextIntlClientProvider locale="en" messages={messages} timeZone="Asia/Dhaka">
          <ChatUnreadBadge />
        </NextIntlClientProvider>
      </Provider>,
    );
    expect(screen.getByText("99+")).toBeTruthy();

    unreadData = { unreadConversations: 0, capped: false };
    rerender(
      <Provider store={storeAs("RIDER")}>
        <NextIntlClientProvider locale="en" messages={messages} timeZone="Asia/Dhaka">
          <ChatUnreadBadge />
        </NextIntlClientProvider>
      </Provider>,
    );
    expect(screen.queryByText("99+")).toBeNull();
    expect(screen.queryByLabelText(/unread conversation/)).toBeNull();
  });
});
