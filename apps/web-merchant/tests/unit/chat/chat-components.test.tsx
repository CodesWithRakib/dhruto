import { describe, it, expect, vi } from "vitest";
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { Provider } from "react-redux";
import {
  ChatConversationStatus,
  ChatMessageDeliveryStatus,
  ChatMessageType,
  ChatParticipantCapability,
} from "@dhruto/contracts";
import messages from "../../../messages/en.json";
import { makeStore } from "@/store";
import { ConversationListItem } from "../../../features/chat/components/conversation-sidebar";
import { MessageBubble, type MessageBubbleHandlers } from "../../../features/chat/components/message-bubble";
import { MessageComposer, type MessageComposerProps } from "../../../features/chat/components/message-composer";
import { conversationCaps } from "../../../features/chat/lib/permissions";
import { fromServer, type TimelineMessage } from "../../../features/chat/lib/timeline";
import { ME, OTHER, serverMessage, summary } from "./chat-fixtures";

function renderUi(ui: React.ReactElement) {
  return render(
    <Provider store={makeStore()}>
      <NextIntlClientProvider locale="en" messages={messages} timeZone="Asia/Dhaka">
        {ui}
      </NextIntlClientProvider>
    </Provider>,
  );
}

describe("ConversationListItem", () => {
  it("shows unread count, 'You:' prefix for my last message and marks the active item", () => {
    renderUi(
      <ConversationListItem
        conversation={summary({ unreadCount: 3, lastMessage: { id: "m", sequence: "3", senderId: ME, preview: "Parcel handed over", createdAt: new Date().toISOString() } })}
        href="/merchant/messages/c1"
        active
        myUserId={ME}
      />,
    );
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/merchant/messages/c1");
    expect(link.getAttribute("aria-current")).toBe("page");
    expect(screen.getByText("You: Parcel handed over")).toBeTruthy();
    expect(screen.getByLabelText("3 unread").textContent).toContain("3");
  });

  it("caps the badge at 99+, shows deleted previews and a lock for read-only conversations", () => {
    renderUi(
      <ConversationListItem
        conversation={summary({
          unreadCount: 250,
          status: ChatConversationStatus.CLOSED,
          lastMessage: { id: "m", sequence: "3", senderId: OTHER, preview: null, createdAt: new Date().toISOString() },
        })}
        href="/x"
        active={false}
        myUserId={ME}
      />,
    );
    expect(screen.getByText("99+")).toBeTruthy();
    expect(screen.getByText(messages.Chat.deletedMessage)).toBeTruthy();
    expect(screen.getByLabelText(messages.Chat.statuses.CLOSED)).toBeTruthy();
    expect(screen.getByRole("link").hasAttribute("aria-current")).toBe(false);
  });

  it("renders an empty conversation without a timestamp", () => {
    renderUi(<ConversationListItem conversation={summary({ lastMessage: null, unreadCount: 0 })} href="/x" active={false} myUserId={ME} />);
    expect(screen.getByText(messages.Chat.noMessages)).toBeTruthy();
    expect(screen.queryByRole("time")).toBeNull();
  });
});

describe("MessageBubble", () => {
  const handlers: MessageBubbleHandlers = {
    onReply: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onRemove: vi.fn(),
    onReport: vi.fn(),
    onTogglePin: vi.fn(),
    onToggleReaction: vi.fn(),
    onRetry: vi.fn(),
    onDiscard: vi.fn(),
    onJumpTo: vi.fn(),
  };
  const caps = conversationCaps(ChatConversationStatus.ACTIVE, [
    ChatParticipantCapability.SEND_MESSAGE,
    ChatParticipantCapability.REACT,
  ]);

  function bubble(message: TimelineMessage, extra: Partial<React.ComponentProps<typeof MessageBubble>> = {}) {
    return renderUi(
      <MessageBubble
        message={message}
        mine={message.senderId === ME}
        senderLabel="Rahim Rider"
        showSender
        firstInGroup
        lastInGroup
        pinned={false}
        delivery={null}
        highlighted={false}
        locale="en"
        caps={caps}
        handlers={handlers}
        {...extra}
      />,
    );
  }

  it("renders content as text (no HTML injection) with sender and edited marker", () => {
    const { container } = bubble(fromServer(serverMessage({ sequence: "1", content: "<img src=x onerror=alert(1)>", editedAt: "2026-11-15T10:05:00Z" })));
    expect(screen.getByText("<img src=x onerror=alert(1)>")).toBeTruthy();
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("Rahim Rider")).toBeTruthy();
    expect(screen.getByText(messages.Chat.edited)).toBeTruthy();
  });

  it("shows the deleted placeholder instead of content", () => {
    bubble(fromServer(serverMessage({ sequence: "1", content: null, deletedAt: "2026-11-15T10:05:00Z" })));
    expect(screen.getByText(messages.Chat.deletedMessage)).toBeTruthy();
  });

  it("failed own message exposes retry and discard with the localized error", () => {
    const failed: TimelineMessage = { ...fromServer(serverMessage({ sequence: "1", senderId: ME })), localState: "failed", error: "network" };
    bubble(failed, { delivery: ChatMessageDeliveryStatus.FAILED });
    expect(screen.getByText(messages.Chat.errors.network)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: messages.Chat.retrySend }));
    expect(handlers.onRetry).toHaveBeenCalledWith(failed);
    fireEvent.click(screen.getByRole("button", { name: messages.Chat.discard }));
    expect(handlers.onDiscard).toHaveBeenCalledWith(failed);
  });

  it("reaction chips are toggle buttons with accessible labels", () => {
    const message = fromServer(serverMessage({ sequence: "1", reactions: [{ reaction: "👍", count: 2, reactedByMe: true }] }));
    bubble(message);
    const chip = screen.getByRole("button", { name: "👍, 2 reactions" });
    expect(chip.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(chip);
    expect(handlers.onToggleReaction).toHaveBeenCalledWith(message, "👍");
  });

  it("system events render as a centered notice without actions", () => {
    bubble(fromServer(serverMessage({ sequence: "1", senderId: null, clientMessageId: null, type: ChatMessageType.SYSTEM_EVENT, content: null })));
    expect(screen.getByText(messages.Chat.systemEvent)).toBeTruthy();
    expect(screen.queryByRole("button", { name: messages.Chat.actions.menu })).toBeNull();
  });
});

describe("MessageComposer", () => {
  function composer(overrides: Partial<MessageComposerProps> = {}) {
    const props: MessageComposerProps = {
      disabledReason: null,
      reply: null,
      onCancelReply: vi.fn(),
      onSend: vi.fn(),
      onTyping: vi.fn(),
      onStopTyping: vi.fn(),
      resetKey: "c1",
      ...overrides,
    };
    renderUi(<MessageComposer {...props} />);
    return props;
  }

  it("Enter sends trimmed content and clears; Shift+Enter does not send", async () => {
    const props = composer();
    const input = screen.getByLabelText(messages.Chat.composerLabel);
    fireEvent.change(input, { target: { value: "  Hello rider  " } });
    expect(props.onTyping).toHaveBeenCalled();
    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });
    expect(props.onSend).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(props.onSend).toHaveBeenCalledWith("Hello rider", null));
    await waitFor(() => expect((input as HTMLTextAreaElement).value).toBe(""));
  });

  it("whitespace-only drafts cannot be sent", () => {
    const props = composer();
    const input = screen.getByLabelText(messages.Chat.composerLabel);
    fireEvent.change(input, { target: { value: "   " } });
    expect((screen.getByRole("button", { name: messages.Chat.send }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.keyDown(input, { key: "Enter" });
    expect(props.onSend).not.toHaveBeenCalled();
  });

  it("sends with the reply reference and Escape cancels the reply", async () => {
    const props = composer({ reply: { messageId: "m-9", name: "Rahim", preview: "Where are you?" } });
    expect(screen.getByText("Replying to Rahim")).toBeTruthy();
    const input = screen.getByLabelText(messages.Chat.composerLabel);
    fireEvent.keyDown(input, { key: "Escape" });
    expect(props.onCancelReply).toHaveBeenCalled();
    fireEvent.change(input, { target: { value: "At the gate" } });
    fireEvent.click(screen.getByRole("button", { name: messages.Chat.send }));
    await waitFor(() => expect(props.onSend).toHaveBeenCalledWith("At the gate", "m-9"));
  });

  it("shows the read-only reason instead of an input when writing is not allowed", () => {
    composer({ disabledReason: "This conversation is closed." });
    expect(screen.getByText("This conversation is closed.")).toBeTruthy();
    expect(screen.queryByLabelText(messages.Chat.composerLabel)).toBeNull();
  });

  it("has no attachment controls (uploads are out of scope until Phase 6)", () => {
    composer();
    expect(screen.queryByRole("button", { name: /attach|upload|file/i })).toBeNull();
    expect(document.querySelector('input[type="file"]')).toBeNull();
  });
});
