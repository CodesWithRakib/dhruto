import { describe, it, expect } from "vitest";
import { ChatMessageDeliveryStatus, ChatMessageType, ChatParticipantCapability, ChatConversationStatus } from "@dhruto/contracts";
import reducer, {
  conversationOpened,
  cursorUpdated,
  historyLoaded,
  lastSeenSequence,
  latestSequence,
  messageDeleted,
  messageReceived,
  optimisticAdded,
  optimisticFailed,
  optimisticRetrying,
  reactionChanged,
  type ChatTimelineState,
} from "../../../features/chat/state/chat-timeline.slice";
import {
  buildRows,
  compareSequence,
  contiguousHead,
  deliveryState,
  fromServer,
  highlightParts,
  mergeMessage,
} from "../../../features/chat/lib/timeline";
import { conversationCaps, messagePermissions } from "../../../features/chat/lib/permissions";
import { chatErrorKey } from "../../../features/chat/lib/errors";
import { CONV, ME, OTHER, page, serverMessage } from "./chat-fixtures";

const initial: ChatTimelineState = { conversations: {}, recent: [] };
const timelineOf = (state: ChatTimelineState) => state.conversations[CONV]!;
const contents = (state: ChatTimelineState) =>
  timelineOf(state).order.map((key) => timelineOf(state).messages[key]?.content);

describe("timeline helpers", () => {
  it("orders by BIGINT sequence, not string or time", () => {
    expect(compareSequence("10", "9")).toBe(1);
    expect(compareSequence("9223372036854775807", "9223372036854775806")).toBe(1);
  });

  it("deletion is terminal and an older edit never overwrites a newer one", () => {
    const deleted = fromServer(serverMessage({ sequence: "1", content: null, deletedAt: "2026-01-02T00:00:00Z" }));
    const stale = fromServer(serverMessage({ id: deleted.id!, clientMessageId: deleted.clientMessageId, sequence: "1" }));
    expect(mergeMessage(deleted, stale).deletedAt).not.toBeNull();

    const edited = { ...stale, content: "new", editedAt: "2026-01-02T00:00:00Z" };
    const snapshot = { ...stale, content: "old", editedAt: null, reactions: [{ reaction: "👍", count: 1, reactedByMe: false }] };
    const merged = mergeMessage(edited, snapshot);
    expect(merged.content).toBe("new");
    expect(merged.reactions).toHaveLength(1); // other fields still taken from the snapshot
  });

  it("contiguousHead finds the last gap-free sequence", () => {
    expect(contiguousHead(["1", "2", "3", "5"], "0")).toBe("3");
    expect(contiguousHead([], "7")).toBe("7");
  });

  it("delivery state derives from other participants' cursors only", () => {
    const mine = { ...fromServer(serverMessage({ sequence: "5", senderId: ME })) };
    expect(deliveryState(mine, ME, { [ME]: { read: "9", delivered: "9" } })).toBe(ChatMessageDeliveryStatus.SENT);
    expect(deliveryState(mine, ME, { [OTHER]: { read: "4", delivered: "5" } })).toBe(ChatMessageDeliveryStatus.DELIVERED);
    expect(deliveryState(mine, ME, { [OTHER]: { read: "5", delivered: "5" } })).toBe(ChatMessageDeliveryStatus.READ);
    expect(deliveryState({ ...mine, localState: "pending" }, ME, {})).toBe(ChatMessageDeliveryStatus.PENDING);
    expect(deliveryState({ ...mine, localState: "failed" }, ME, {})).toBe(ChatMessageDeliveryStatus.FAILED);
  });

  it("groups consecutive messages per sender and inserts day separators", () => {
    const a = fromServer(serverMessage({ sequence: "1", createdAt: "2026-11-14T10:00:00Z" }));
    const b = fromServer(serverMessage({ sequence: "2", createdAt: "2026-11-15T10:00:00Z" }));
    const c = fromServer(serverMessage({ sequence: "3", createdAt: "2026-11-15T10:01:00Z" }));
    const d = fromServer(serverMessage({ sequence: "4", createdAt: "2026-11-15T10:02:00Z", senderId: ME }));
    const rows = buildRows([a, b, c, d]);
    expect(rows.map((row) => row.kind)).toEqual(["date", "message", "date", "message", "message", "message"]);
    const messageRows = rows.filter((row) => row.kind === "message");
    expect(messageRows.map((row) => (row.kind === "message" ? [row.firstInGroup, row.lastInGroup] : null))).toEqual([
      [true, true],
      [true, false],
      [false, true],
      [true, true],
    ]);
  });

  it("highlights query terms without regex injection", () => {
    expect(highlightParts("Arriving at Gate 3", "gate")).toEqual([
      { text: "Arriving at ", match: false },
      { text: "Gate", match: true },
      { text: " 3", match: false },
    ]);
    expect(highlightParts("a (b) c", "(b)")).toEqual([
      { text: "a ", match: false },
      { text: "(b)", match: true },
      { text: " c", match: false },
    ]);
  });
});

describe("chat timeline slice", () => {
  it("loads pages in sequence order without duplicates", () => {
    let state = reducer(initial, historyLoaded({ conversationId: CONV, page: page([serverMessage({ sequence: "3" }), serverMessage({ sequence: "4" })], true), direction: "latest" }));
    state = reducer(state, historyLoaded({ conversationId: CONV, page: page([serverMessage({ sequence: "1" }), serverMessage({ sequence: "2" })]), direction: "older" }));
    expect(contents(state)).toEqual(["message 1", "message 2", "message 3", "message 4"]);
    expect(timelineOf(state).hasMoreOlder).toBe(false);
    expect(timelineOf(state).oldestSequence).toBe("1");
    expect(latestSequence(timelineOf(state))).toBe("4");
  });

  it("replaces the optimistic bubble with the canonical message (same key, no duplicate)", () => {
    let state = reducer(initial, historyLoaded({ conversationId: CONV, page: page([serverMessage({ sequence: "1" })]), direction: "latest" }));
    state = reducer(state, optimisticAdded({ conversationId: CONV, clientMessageId: "cm-1", senderId: ME, content: "hello", replyToMessageId: null, createdAt: new Date().toISOString() }));
    expect(timelineOf(state).messages["cm-1"]?.localState).toBe("pending");
    const canonical = serverMessage({ sequence: "2", clientMessageId: "cm-1", senderId: ME, content: "hello" });
    state = reducer(state, messageReceived({ message: canonical })); // REST response
    state = reducer(state, messageReceived({ message: canonical, eventId: "evt-1" })); // realtime duplicate
    expect(timelineOf(state).order).toHaveLength(2);
    expect(timelineOf(state).messages["cm-1"]?.localState).toBe("sent");
    expect(timelineOf(state).messages["cm-1"]?.sequence).toBe("2");
    expect(timelineOf(state).outbox["cm-1"]).toBeUndefined();
  });

  it("a failure never downgrades a message the server already confirmed", () => {
    let state = reducer(initial, optimisticAdded({ conversationId: CONV, clientMessageId: "cm-2", senderId: ME, content: "x", replyToMessageId: null, createdAt: new Date().toISOString() }));
    state = reducer(state, messageReceived({ message: serverMessage({ sequence: "1", clientMessageId: "cm-2", senderId: ME }) }));
    state = reducer(state, optimisticFailed({ conversationId: CONV, clientMessageId: "cm-2", error: "network" }));
    expect(timelineOf(state).messages["cm-2"]?.localState).toBe("sent");
  });

  it("failed sends keep their payload for retry and return to pending", () => {
    let state = reducer(initial, optimisticAdded({ conversationId: CONV, clientMessageId: "cm-3", senderId: ME, content: "retry me", replyToMessageId: null, createdAt: new Date().toISOString() }));
    state = reducer(state, optimisticFailed({ conversationId: CONV, clientMessageId: "cm-3", error: "network" }));
    expect(timelineOf(state).messages["cm-3"]).toMatchObject({ localState: "failed", error: "network" });
    expect(timelineOf(state).outbox["cm-3"]).toEqual({ content: "retry me", replyToMessageId: null });
    state = reducer(state, optimisticRetrying({ conversationId: CONV, clientMessageId: "cm-3" }));
    expect(timelineOf(state).messages["cm-3"]?.localState).toBe("pending");
  });

  it("reaction deltas are deduplicated by eventId and never double-count my own action", () => {
    const message = serverMessage({ sequence: "1" });
    let state = reducer(initial, historyLoaded({ conversationId: CONV, page: page([message]), direction: "latest" }));
    const delta = { conversationId: CONV, messageId: message.id, userId: OTHER, reaction: "👍", action: "added" as const, myUserId: ME, eventId: "evt-r1" };
    state = reducer(state, reactionChanged(delta));
    state = reducer(state, reactionChanged(delta)); // duplicate delivery
    expect(timelineOf(state).messages[`client-${message.id}`]?.reactions).toEqual([{ reaction: "👍", count: 1, reactedByMe: false }]);
    // My REST response already applied my reaction; the realtime echo must be a no-op.
    state = reducer(state, messageReceived({ message: { ...message, reactions: [{ reaction: "👍", count: 2, reactedByMe: true }] } }));
    state = reducer(state, reactionChanged({ ...delta, userId: ME, eventId: "evt-r2" }));
    expect(timelineOf(state).messages[`client-${message.id}`]?.reactions).toEqual([{ reaction: "👍", count: 2, reactedByMe: true }]);
  });

  it("cursors only move forward and delivered >= read", () => {
    let state = reducer(initial, historyLoaded({ conversationId: CONV, page: page([serverMessage({ sequence: "1" })]), direction: "latest" }));
    state = reducer(state, cursorUpdated({ conversationId: CONV, userId: OTHER, read: "5", delivered: "3", eventId: "c1" }));
    state = reducer(state, cursorUpdated({ conversationId: CONV, userId: OTHER, read: "2", delivered: "2", eventId: "c2" }));
    expect(timelineOf(state).cursors[OTHER]).toEqual({ read: "5", delivered: "5" });
  });

  it("deletions clear content and are idempotent", () => {
    const message = serverMessage({ sequence: "1", content: "secret" });
    let state = reducer(initial, historyLoaded({ conversationId: CONV, page: page([message]), direction: "latest" }));
    state = reducer(state, messageDeleted({ conversationId: CONV, messageId: message.id, deletedAt: "2026-11-15T00:00:00Z", eventId: "d1" }));
    state = reducer(state, messageDeleted({ conversationId: CONV, messageId: message.id, deletedAt: "2026-11-16T00:00:00Z", eventId: "d1" }));
    expect(timelineOf(state).messages[`client-${message.id}`]).toMatchObject({ content: null, deletedAt: "2026-11-15T00:00:00Z" });
  });

  it("lastSeenSequence stops at the first gap", () => {
    let state = reducer(initial, historyLoaded({ conversationId: CONV, page: page(["1", "2", "3"].map((s) => serverMessage({ sequence: s }))), direction: "latest" }));
    state = reducer(state, messageReceived({ message: serverMessage({ sequence: "6" }) }));
    expect(lastSeenSequence(timelineOf(state))).toBe("3");
    expect(latestSequence(timelineOf(state))).toBe("6");
  });

  it("ignores realtime messages for conversations that are not loaded", () => {
    const state = reducer(initial, messageReceived({ message: serverMessage({ sequence: "1" }) }));
    expect(state.conversations[CONV]).toBeUndefined();
  });

  it("evicts least recently opened timelines (bounded memory)", () => {
    let state = initial;
    for (let i = 0; i < 10; i += 1) state = reducer(state, conversationOpened(`c-${i}`));
    expect(Object.keys(state.conversations)).toHaveLength(8);
    expect(state.conversations["c-0"]).toBeUndefined();
    expect(state.recent[0]).toBe("c-9");
  });
});

describe("permission-aware UI", () => {
  const caps = conversationCaps(ChatConversationStatus.ACTIVE, [
    ChatParticipantCapability.SEND_MESSAGE,
    ChatParticipantCapability.REACT,
    ChatParticipantCapability.EDIT_OWN_MESSAGE,
    ChatParticipantCapability.DELETE_OWN_MESSAGE,
    ChatParticipantCapability.REPORT_MESSAGE,
  ]);

  it("members can edit/delete their own messages and report others, but not pin or moderate", () => {
    const mine = fromServer(serverMessage({ sequence: "1", senderId: ME }));
    const theirs = fromServer(serverMessage({ sequence: "2" }));
    expect(messagePermissions(mine, true, caps)).toMatchObject({ edit: true, delete: true, report: false, pin: false, remove: false });
    expect(messagePermissions(theirs, false, caps)).toMatchObject({ edit: false, delete: false, report: true, remove: false });
  });

  it("closed conversations are read-only; pending/deleted/system messages expose no actions", () => {
    const closed = conversationCaps(ChatConversationStatus.CLOSED, [ChatParticipantCapability.SEND_MESSAGE]);
    expect(closed.writable).toBe(false);
    const mine = fromServer(serverMessage({ sequence: "1", senderId: ME }));
    expect(messagePermissions(mine, true, closed).reply).toBe(false);
    const pending = { ...mine, localState: "pending" as const };
    expect(Object.values(messagePermissions(pending, true, caps)).some(Boolean)).toBe(false);
    const system = fromServer(serverMessage({ sequence: "3", senderId: null, type: ChatMessageType.SYSTEM_EVENT, clientMessageId: null }));
    expect(Object.values(messagePermissions(system, false, caps)).some(Boolean)).toBe(false);
  });

  it("maps backend error codes to translatable keys (never raw server text)", () => {
    expect(chatErrorKey({ status: "FETCH_ERROR" })).toBe("network");
    expect(chatErrorKey({ status: 409, data: { errorCode: "CHAT_CONVERSATION_NOT_WRITABLE" } })).toBe("notWritable");
    expect(chatErrorKey({ status: 422, data: { errorCode: "CHAT_EDIT_WINDOW_EXPIRED" } })).toBe("editWindow");
    expect(chatErrorKey({ status: 500, data: { message: "stack trace" } })).toBe("generic");
  });
});
