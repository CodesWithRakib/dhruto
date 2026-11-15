import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { renderHook } from "@testing-library/react";
import { Provider } from "react-redux";
import { ChatServerEvent } from "@dhruto/contracts";
import { makeStore, type AppStore } from "@/store";
import type { ChatServerEventMap, ChatSocketClient } from "../../../features/chat/realtime/chat-socket-client";
import { historyLoaded } from "../../../features/chat/state/chat-timeline.slice";
import { connectionChanged } from "../../../features/chat/state/chat-ephemeral.slice";
import { CONV, ME, OTHER, page, serverMessage } from "./chat-fixtures";

const syncCalls: Array<[string, string]> = [];

// Recovery fetching is covered in chat-thunks.test.ts; here we only assert it is triggered.
vi.mock("../../../features/chat/state/chat-thunks", async (importActual) => {
  const actual = await importActual<typeof import("../../../features/chat/state/chat-thunks")>();
  return {
    ...actual,
    syncToHead: (conversationId: string, head: string) => async () => {
      syncCalls.push([conversationId, head]);
    },
  };
});

import { useChatEventHandlers } from "../../../features/chat/realtime/use-chat-event-handlers";

/** Fake socket client exposing only the listener API used by the handlers. */
class FakeClient {
  handlers = new Map<string, Set<(payload: unknown) => void>>();
  on<E extends keyof ChatServerEventMap>(event: E, handler: (payload: ChatServerEventMap[E]) => void) {
    const set = this.handlers.get(event) ?? new Set();
    const wrapped = handler as (payload: unknown) => void;
    set.add(wrapped);
    this.handlers.set(event, set);
    return () => set.delete(wrapped);
  }
  emit<E extends keyof ChatServerEventMap>(event: E, payload: ChatServerEventMap[E]) {
    for (const handler of this.handlers.get(event) ?? []) handler(payload);
  }
  get listenerCount() {
    return [...this.handlers.values()].reduce((total, set) => total + set.size, 0);
  }
}

function mount(store: AppStore, client: FakeClient) {
  const wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;
  return renderHook(() => useChatEventHandlers(client as unknown as ChatSocketClient, ME), { wrapper });
}

const timeline = (store: AppStore) => store.getState().chatTimeline.conversations[CONV]!;
const messageEvent = (sequence: string, eventId: string) => {
  const message = serverMessage({ sequence });
  return { eventId, conversationId: CONV, occurredAt: message.createdAt, sequence, message };
};

describe("realtime event handlers", () => {
  let store: AppStore;
  let client: FakeClient;

  beforeEach(() => {
    syncCalls.length = 0;
    store = makeStore();
    store.dispatch(connectionChanged("connected"));
    store.dispatch(
      historyLoaded({ conversationId: CONV, page: page(["1", "2"].map((sequence) => serverMessage({ sequence }))), direction: "latest" }),
    );
    client = new FakeClient();
  });

  it("appends message:new once even when delivered twice (at-least-once)", () => {
    mount(store, client);
    const event = messageEvent("3", "evt-3");
    client.emit(ChatServerEvent.MESSAGE_NEW, event);
    client.emit(ChatServerEvent.MESSAGE_NEW, event);
    expect(timeline(store).order).toHaveLength(3);
    expect(syncCalls).toEqual([]);
  });

  it("detects a sequence gap and triggers bounded recovery", () => {
    mount(store, client);
    client.emit(ChatServerEvent.MESSAGE_NEW, messageEvent("7", "evt-7"));
    expect(syncCalls).toEqual([[CONV, "7"]]);
  });

  it("applies deletes, cursors and typing; ignores my own typing echo", () => {
    mount(store, client);
    const target = timeline(store).order[0]!;
    const messageId = timeline(store).messages[target]!.id!;
    client.emit(ChatServerEvent.MESSAGE_DELETED, { eventId: "d1", conversationId: CONV, occurredAt: "2026-11-15T00:00:00Z", messageId, sequence: "1", moderated: false });
    expect(timeline(store).messages[target]).toMatchObject({ content: null });

    client.emit(ChatServerEvent.CURSOR_UPDATED, {
      eventId: "c1",
      conversationId: CONV,
      occurredAt: "2026-11-15T00:00:00Z",
      userId: OTHER,
      lastReadSequence: "2",
      lastDeliveredSequence: "2",
    });
    expect(timeline(store).cursors[OTHER]).toEqual({ read: "2", delivered: "2" });

    client.emit(ChatServerEvent.TYPING, { conversationId: CONV, userId: ME, isTyping: true, expiresInMs: 6000 });
    client.emit(ChatServerEvent.TYPING, { conversationId: CONV, userId: OTHER, isTyping: true, expiresInMs: 6000 });
    expect(Object.keys(store.getState().chatEphemeral.typing[CONV] ?? {})).toEqual([OTHER]);

    client.emit(ChatServerEvent.PRESENCE, { conversationId: CONV, userId: OTHER, status: "online", lastSeenAt: null });
    expect(store.getState().chatEphemeral.presence[OTHER]?.status).toBe("online");
  });

  it("typing and presence are cleared when the connection drops (no stale indicators)", () => {
    mount(store, client);
    client.emit(ChatServerEvent.TYPING, { conversationId: CONV, userId: OTHER, isTyping: true, expiresInMs: 6000 });
    store.dispatch(connectionChanged("reconnecting"));
    expect(store.getState().chatEphemeral.typing).toEqual({});
    expect(store.getState().chatEphemeral.presence).toEqual({});
  });

  it("removes every listener on unmount (no duplicate handlers after remount)", () => {
    const first = mount(store, client);
    const registered = client.listenerCount;
    expect(registered).toBeGreaterThan(10);
    first.unmount();
    expect(client.listenerCount).toBe(0);
    mount(store, client);
    expect(client.listenerCount).toBe(registered);
  });
});
