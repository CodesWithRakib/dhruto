import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import {
  ChatMessageType,
  type ChatMessageItem,
  type ChatMessagePage,
  type ChatPageSender,
  type ChatParticipantItem,
} from "@dhruto/contracts";
import {
  compareSequence,
  compareTimeline,
  contiguousHead,
  fromServer,
  maxSequence,
  mergeMessage,
  messageKey,
  type TimelineMessage,
} from "../lib/timeline";

/**
 * Message timelines, one per opened conversation.
 *
 * Why a slice and not the RTK Query cache: a timeline is the merge of three
 * sources — REST history pages (older and gap-fill), at-least-once realtime
 * events, and optimistic sends. This slice is a bounded window cache of what
 * the client has loaded; PostgreSQL via REST remains the source of truth.
 *
 * Invariants:
 *  - one entry per message key (`clientMessageId ?? id`) — no duplicates;
 *  - `order` is sorted by sequence (pending last);
 *  - delta events (reactions, cursors) are deduplicated by `eventId`;
 *  - participant cursors only move forward.
 */

const MAX_CACHED_CONVERSATIONS = 8;
const MAX_APPLIED_EVENT_IDS = 500;

export interface ParticipantCursor {
  read: string;
  delivered: string;
}

export interface ConversationTimeline {
  messages: Record<string, TimelineMessage>;
  order: string[];
  /** server id -> key (for events that reference `messageId`). */
  keyById: Record<string, string>;
  /** Lowest loaded sequence (older pages continue below it). */
  oldestSequence: string | null;
  hasMoreOlder: boolean;
  /** True once the latest page has been loaded at least once. */
  initialized: boolean;
  senders: Record<string, ChatPageSender>;
  cursors: Record<string, ParticipantCursor>;
  appliedEventIds: string[];
  /** Optimistic payloads kept for retry (same clientMessageId). */
  outbox: Record<string, { content: string; replyToMessageId: string | null }>;
}

export interface ChatTimelineState {
  conversations: Record<string, ConversationTimeline>;
  /** Most recently opened first (LRU for eviction). */
  recent: string[];
}

const initialState: ChatTimelineState = { conversations: {}, recent: [] };

function emptyTimeline(): ConversationTimeline {
  return {
    messages: {},
    order: [],
    keyById: {},
    oldestSequence: null,
    hasMoreOlder: true,
    initialized: false,
    senders: {},
    cursors: {},
    appliedEventIds: [],
    outbox: {},
  };
}

function ensure(state: ChatTimelineState, conversationId: string): ConversationTimeline {
  let timeline = state.conversations[conversationId];
  if (!timeline) {
    timeline = emptyTimeline();
    state.conversations[conversationId] = timeline;
  }
  return timeline;
}

function reorder(timeline: ConversationTimeline): void {
  timeline.order = Object.values(timeline.messages)
    .sort(compareTimeline)
    .map((message) => message.key);
}

function upsert(timeline: ConversationTimeline, incoming: TimelineMessage): void {
  const existing = timeline.messages[incoming.key];
  const merged = mergeMessage(existing, incoming);
  timeline.messages[incoming.key] = merged;
  if (merged.id) timeline.keyById[merged.id] = merged.key;
  if (merged.localState === "sent" && merged.clientMessageId) delete timeline.outbox[merged.clientMessageId];
  if (merged.sequence !== null && (timeline.oldestSequence === null || compareSequence(merged.sequence, timeline.oldestSequence) < 0)) {
    timeline.oldestSequence = merged.sequence;
  }
}

/** Returns false when the event was already applied (duplicate delivery). */
function claimEvent(timeline: ConversationTimeline, eventId: string | undefined): boolean {
  if (!eventId) return true;
  if (timeline.appliedEventIds.includes(eventId)) return false;
  timeline.appliedEventIds.push(eventId);
  if (timeline.appliedEventIds.length > MAX_APPLIED_EVENT_IDS) timeline.appliedEventIds.shift();
  return true;
}

function bumpCursor(timeline: ConversationTimeline, userId: string, read: string, delivered: string): void {
  const current = timeline.cursors[userId];
  const nextRead = maxSequence(current?.read ?? "0", read) ?? "0";
  const nextDelivered = maxSequence(maxSequence(current?.delivered ?? "0", delivered), nextRead) ?? "0";
  timeline.cursors[userId] = { read: nextRead, delivered: nextDelivered };
}

const chatTimelineSlice = createSlice({
  name: "chatTimeline",
  initialState,
  reducers: {
    /** Marks a conversation as recently used and evicts the least recent ones. */
    conversationOpened(state, action: PayloadAction<string>) {
      const id = action.payload;
      ensure(state, id);
      state.recent = [id, ...state.recent.filter((existing) => existing !== id)];
      for (const evicted of state.recent.slice(MAX_CACHED_CONVERSATIONS)) delete state.conversations[evicted];
      state.recent = state.recent.slice(0, MAX_CACHED_CONVERSATIONS);
    },

    /** Drops a cached window (e.g. a gap too large to fill: reload latest). */
    conversationReset(state, action: PayloadAction<string>) {
      const previous = state.conversations[action.payload];
      const fresh = emptyTimeline();
      if (previous) {
        fresh.cursors = previous.cursors;
        fresh.senders = previous.senders;
      }
      state.conversations[action.payload] = fresh;
    },

    historyLoaded(
      state,
      action: PayloadAction<{ conversationId: string; page: ChatMessagePage; direction: "latest" | "older" | "after" }>,
    ) {
      const { conversationId, page, direction } = action.payload;
      const timeline = ensure(state, conversationId);
      for (const item of page.items) upsert(timeline, fromServer(item));
      for (const sender of page.senders) timeline.senders[sender.userId] = sender;
      if (direction !== "after") timeline.hasMoreOlder = page.hasMore;
      if (direction === "latest") timeline.initialized = true;
      reorder(timeline);
    },

    /** Canonical message from REST or realtime (`message:new` / `message:updated`). */
    messageReceived(state, action: PayloadAction<{ message: ChatMessageItem; eventId?: string }>) {
      const { message } = action.payload;
      const timeline = state.conversations[message.conversationId];
      if (!timeline) return; // not loaded: the next open fetches it from REST
      upsert(timeline, fromServer(message));
      reorder(timeline);
    },

    optimisticAdded(
      state,
      action: PayloadAction<{
        conversationId: string;
        clientMessageId: string;
        senderId: string;
        content: string;
        replyToMessageId: string | null;
        createdAt: string;
      }>,
    ) {
      const { conversationId, clientMessageId, senderId, content, replyToMessageId, createdAt } = action.payload;
      const timeline = ensure(state, conversationId);
      timeline.outbox[clientMessageId] = { content, replyToMessageId };
      timeline.messages[clientMessageId] = {
        key: clientMessageId,
        id: null,
        clientMessageId,
        conversationId,
        sequence: null,
        senderId,
        type: ChatMessageType.TEXT,
        content,
        replyToMessageId,
        metadata: null,
        attachments: [],
        reactions: [],
        createdAt,
        editedAt: null,
        deletedAt: null,
        localState: "pending",
        error: null,
      };
      reorder(timeline);
    },

    optimisticRetrying(state, action: PayloadAction<{ conversationId: string; clientMessageId: string }>) {
      const message = state.conversations[action.payload.conversationId]?.messages[action.payload.clientMessageId];
      if (message && message.localState === "failed") {
        message.localState = "pending";
        message.error = null;
      }
    },

    optimisticFailed(state, action: PayloadAction<{ conversationId: string; clientMessageId: string; error: string }>) {
      const message = state.conversations[action.payload.conversationId]?.messages[action.payload.clientMessageId];
      // Never downgrade a message the server already confirmed (e.g. realtime arrived first).
      if (message && message.localState !== "sent") {
        message.localState = "failed";
        message.error = action.payload.error;
      }
    },

    /** Removes a failed optimistic message the user chose to discard. */
    optimisticDiscarded(state, action: PayloadAction<{ conversationId: string; clientMessageId: string }>) {
      const timeline = state.conversations[action.payload.conversationId];
      const message = timeline?.messages[action.payload.clientMessageId];
      if (!timeline || !message || message.localState === "sent") return;
      delete timeline.messages[action.payload.clientMessageId];
      delete timeline.outbox[action.payload.clientMessageId];
      reorder(timeline);
    },

    messageDeleted(
      state,
      action: PayloadAction<{ conversationId: string; messageId: string; deletedAt: string; eventId?: string }>,
    ) {
      const timeline = state.conversations[action.payload.conversationId];
      if (!timeline || !claimEvent(timeline, action.payload.eventId)) return;
      const key = timeline.keyById[action.payload.messageId];
      const message = key ? timeline.messages[key] : undefined;
      if (!message || message.deletedAt) return;
      message.deletedAt = action.payload.deletedAt;
      message.content = null;
      message.metadata = null;
      message.attachments = [];
      message.reactions = [];
    },

    /** Delta from `reaction:updated` — deduplicated by eventId. */
    reactionChanged(
      state,
      action: PayloadAction<{
        conversationId: string;
        messageId: string;
        userId: string;
        reaction: string;
        action: "added" | "removed";
        myUserId: string;
        eventId?: string;
      }>,
    ) {
      const { conversationId, messageId, userId, reaction, myUserId, eventId } = action.payload;
      const timeline = state.conversations[conversationId];
      if (!timeline || !claimEvent(timeline, eventId)) return;
      const key = timeline.keyById[messageId];
      const message = key ? timeline.messages[key] : undefined;
      if (!message || message.deletedAt) return;
      const mine = userId === myUserId;
      const existing = message.reactions.find((r) => r.reaction === reaction);
      if (action.payload.action === "added") {
        if (mine && existing?.reactedByMe) return; // already applied via REST response
        if (existing) {
          existing.count += 1;
          if (mine) existing.reactedByMe = true;
        } else {
          message.reactions.push({ reaction, count: 1, reactedByMe: mine });
        }
      } else if (existing) {
        if (mine && !existing.reactedByMe) return;
        existing.count -= 1;
        if (mine) existing.reactedByMe = false;
        if (existing.count <= 0) message.reactions = message.reactions.filter((r) => r.reaction !== reaction);
      }
    },

    cursorsSeeded(state, action: PayloadAction<{ conversationId: string; participants: ChatParticipantItem[] }>) {
      const timeline = ensure(state, action.payload.conversationId);
      for (const participant of action.payload.participants) {
        bumpCursor(timeline, participant.userId, participant.lastReadSequence, participant.lastDeliveredSequence);
        timeline.senders[participant.userId] ??= {
          userId: participant.userId,
          displayName: participant.displayName,
          platformRole: participant.platformRole,
        };
      }
    },

    cursorUpdated(
      state,
      action: PayloadAction<{ conversationId: string; userId: string; read: string; delivered: string; eventId?: string }>,
    ) {
      const timeline = state.conversations[action.payload.conversationId];
      if (!timeline || !claimEvent(timeline, action.payload.eventId)) return;
      bumpCursor(timeline, action.payload.userId, action.payload.read, action.payload.delivered);
    },
  },
});

export const {
  conversationOpened,
  conversationReset,
  historyLoaded,
  messageReceived,
  optimisticAdded,
  optimisticRetrying,
  optimisticFailed,
  optimisticDiscarded,
  messageDeleted,
  reactionChanged,
  cursorsSeeded,
  cursorUpdated,
} = chatTimelineSlice.actions;

export default chatTimelineSlice.reducer;

/* ------------------------------------------------------------------ */
/* Selectors (pure; take the slice state)                              */
/* ------------------------------------------------------------------ */

/** Highest persisted sequence in the window (the local head). */
export function latestSequence(timeline: ConversationTimeline | undefined): string | null {
  if (!timeline) return null;
  for (let index = timeline.order.length - 1; index >= 0; index -= 1) {
    const key = timeline.order[index];
    const sequence = key ? timeline.messages[key]?.sequence : null;
    if (sequence) return sequence;
  }
  return null;
}

/**
 * `lastSeenSequence` of the recovery protocol: the highest sequence such that
 * the window is contiguous from its oldest loaded message up to it.
 */
export function lastSeenSequence(timeline: ConversationTimeline | undefined): string | null {
  if (!timeline || timeline.oldestSequence === null) return null;
  const sequences = Object.values(timeline.messages)
    .map((message) => message.sequence)
    .filter((sequence): sequence is string => sequence !== null);
  const start = (BigInt(timeline.oldestSequence) - 1n).toString();
  return contiguousHead(sequences, start);
}

export function findByMessageId(timeline: ConversationTimeline | undefined, messageId: string): TimelineMessage | undefined {
  if (!timeline) return undefined;
  const key = timeline.keyById[messageId];
  return key ? timeline.messages[key] : undefined;
}

export { messageKey };
