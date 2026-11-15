import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { act, renderHook } from "@testing-library/react";
import { Provider } from "react-redux";
import type { ChatMessageItem, SendChatMessageRequest } from "@dhruto/contracts";
import { makeStore, type AppStore } from "@/store";
import { historyLoaded } from "../../../features/chat/state/chat-timeline.slice";
import { CONV, ME, page, serverMessage } from "./chat-fixtures";

type SendArgs = { conversationId: string; body: SendChatMessageRequest };
const sendCalls: SendArgs[] = [];
let nextResult: () => Promise<ChatMessageItem>;

// Mock only the network-facing mutation hook; reducers, thunks and the store are real.
vi.mock("../../../features/chat/api/chat.api", async (importActual) => {
  const actual = await importActual<typeof import("../../../features/chat/api/chat.api")>();
  return {
    ...actual,
    useSendMessageMutation: () => [
      (args: SendArgs) => {
        sendCalls.push(args);
        return { unwrap: () => nextResult() };
      },
    ],
  };
});

import { useSendMessage } from "../../../features/chat/hooks/use-send-message";

function renderSend(store: AppStore) {
  const wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;
  return renderHook(() => useSendMessage(CONV, ME), { wrapper });
}

const timeline = (store: AppStore) => store.getState().chatTimeline.conversations[CONV]!;
const rtkError = (status: number, errorCode: string) => Promise.reject({ status, data: { errorCode } });

describe("useSendMessage", () => {
  let store: AppStore;

  beforeEach(() => {
    sendCalls.length = 0;
    store = makeStore();
    store.dispatch(historyLoaded({ conversationId: CONV, page: page([serverMessage({ sequence: "1" })]), direction: "latest" }));
  });

  it("shows a pending bubble, then replaces it in place with the canonical message", async () => {
    let resolve!: (message: ChatMessageItem) => void;
    nextResult = () => new Promise((r) => (resolve = r));
    const { result } = renderSend(store);

    let sending!: Promise<boolean>;
    act(() => {
      sending = result.current.send("Hello", null);
    });
    const clientMessageId = sendCalls[0]!.body.clientMessageId;
    expect(timeline(store).messages[clientMessageId]).toMatchObject({ localState: "pending", content: "Hello" });

    await act(async () => {
      resolve(serverMessage({ sequence: "2", clientMessageId, senderId: ME, content: "Hello" }));
      await sending;
    });
    expect(timeline(store).order).toHaveLength(2);
    expect(timeline(store).messages[clientMessageId]).toMatchObject({ localState: "sent", sequence: "2" });
  });

  it("marks a rejected send as failed with a localized error key, never as sent", async () => {
    nextResult = () => rtkError(409, "CHAT_CONVERSATION_NOT_WRITABLE");
    const { result } = renderSend(store);
    let ok = true;
    await act(async () => {
      ok = await result.current.send("Hi", null);
    });
    expect(ok).toBe(false);
    const clientMessageId = sendCalls[0]!.body.clientMessageId;
    expect(timeline(store).messages[clientMessageId]).toMatchObject({ localState: "failed", error: "notWritable" });
  });

  it("retries with the SAME clientMessageId and does not duplicate the message", async () => {
    nextResult = () => Promise.reject({ status: "FETCH_ERROR", error: "offline" });
    const { result } = renderSend(store);
    await act(async () => {
      await result.current.send("Retry me", null);
    });
    const clientMessageId = sendCalls[0]!.body.clientMessageId;

    nextResult = () => Promise.resolve(serverMessage({ sequence: "2", clientMessageId, senderId: ME, content: "Retry me" }));
    await act(async () => {
      await result.current.retry(clientMessageId);
    });

    expect(sendCalls).toHaveLength(2);
    expect(sendCalls[1]!.body.clientMessageId).toBe(clientMessageId);
    expect(sendCalls[1]!.body).toMatchObject({ type: "TEXT", content: "Retry me" });
    expect(timeline(store).order.filter((key) => key === clientMessageId)).toHaveLength(1);
    expect(timeline(store).messages[clientMessageId]?.localState).toBe("sent");
  });

  it("uses a new clientMessageId for each logical message", async () => {
    nextResult = () => Promise.reject({ status: "FETCH_ERROR" });
    const { result } = renderSend(store);
    await act(async () => {
      await result.current.send("one", null);
      await result.current.send("two", null);
    });
    expect(sendCalls[0]!.body.clientMessageId).not.toBe(sendCalls[1]!.body.clientMessageId);
  });

  it("passes the reply reference and lets a failed message be discarded", async () => {
    nextResult = () => Promise.reject({ status: "FETCH_ERROR" });
    const { result } = renderSend(store);
    await act(async () => {
      await result.current.send("re", "00000000-0000-4000-9000-000000000099");
    });
    expect(sendCalls[0]!.body.replyToMessageId).toBe("00000000-0000-4000-9000-000000000099");
    const clientMessageId = sendCalls[0]!.body.clientMessageId;
    act(() => {
      result.current.discard(clientMessageId);
    });
    expect(timeline(store).messages[clientMessageId]).toBeUndefined();
    expect(timeline(store).outbox[clientMessageId]).toBeUndefined();
  });
});
