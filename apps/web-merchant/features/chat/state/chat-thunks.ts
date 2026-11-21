import {
  computeChatUnreadCount,
  type ChatConversationStatus,
  type ChatConversationSummary,
  type ChatMessageItem,
} from "@dhruto/contracts";
import type { AppDispatch, RootState } from "@/store";
import { chatApi, type ConversationListArgs } from "../api/chat.api";
import { compareSequence, maxSequence } from "../lib/timeline";
import {
  conversationReset,
  historyLoaded,
  lastSeenSequence,
  latestSequence,
} from "./chat-timeline.slice";

type Thunk<R = void> = (dispatch: AppDispatch, getState: () => RootState) => Promise<R>;

export const HISTORY_PAGE_SIZE = 50;
const GAP_PAGE_SIZE = 100;
/** Beyond this many gap pages, reload the latest page instead of replaying history. */
const MAX_GAP_PAGES = 5;

/** The single inbox query the sidebar subscribes to (realtime patches target it). */
export const INBOX_ARGS: ConversationListArgs = { limit: 20 };

const inFlight = new Set<string>();

async function fetchPage(
  dispatch: AppDispatch,
  args: { conversationId: string; beforeSequence?: string; afterSequence?: string; limit: number },
) {
  return dispatch(chatApi.endpoints.getMessages.initiate(args, { subscribe: false, forceRefetch: true })).unwrap();
}

/** Loads the newest page (initial open, or after a reset). */
export function loadLatest(conversationId: string): Thunk {
  return async (dispatch) => {
    const key = `latest:${conversationId}`;
    if (inFlight.has(key)) return; // initial open and room join can race
    inFlight.add(key);
    try {
      const page = await fetchPage(dispatch, { conversationId, limit: HISTORY_PAGE_SIZE });
      dispatch(historyLoaded({ conversationId, page, direction: "latest" }));
    } finally {
      inFlight.delete(key);
    }
  };
}

/** Loads the page just before the oldest loaded message (scroll-up). */
export function loadOlder(conversationId: string): Thunk<boolean> {
  return async (dispatch, getState) => {
    const key = `older:${conversationId}`;
    const timeline = getState().chatTimeline.conversations[conversationId];
    if (!timeline?.hasMoreOlder || !timeline.oldestSequence || inFlight.has(key)) return false;
    inFlight.add(key);
    try {
      const page = await fetchPage(dispatch, {
        conversationId,
        beforeSequence: timeline.oldestSequence,
        limit: HISTORY_PAGE_SIZE,
      });
      dispatch(historyLoaded({ conversationId, page, direction: "older" }));
      return page.items.length > 0;
    } finally {
      inFlight.delete(key);
    }
  };
}

/**
 * Recovery protocol (PHASE-3-REALTIME-PROTOCOL.md §10, steps 3-4): bring the
 * local window up to the authoritative `head` with bounded `afterSequence`
 * gap-fill. Never replays unbounded history — a very large gap resets the
 * window to the latest page.
 */
export function syncToHead(conversationId: string, head: string): Thunk {
  return async (dispatch, getState) => {
    const key = `sync:${conversationId}`;
    if (inFlight.has(key)) return;
    inFlight.add(key);
    try {
      const timeline = getState().chatTimeline.conversations[conversationId];
      if (!timeline?.initialized) {
        await dispatch(loadLatest(conversationId));
        return;
      }
      for (let pageIndex = 0; pageIndex < MAX_GAP_PAGES; pageIndex += 1) {
        const current = getState().chatTimeline.conversations[conversationId];
        const lastSeen = lastSeenSequence(current) ?? latestSequence(current) ?? "0";
        if (compareSequence(lastSeen, head) >= 0) return;
        const page = await fetchPage(dispatch, { conversationId, afterSequence: lastSeen, limit: GAP_PAGE_SIZE });
        dispatch(historyLoaded({ conversationId, page, direction: "after" }));
        if (!page.hasMore) return;
      }
      dispatch(conversationReset(conversationId));
      await dispatch(loadLatest(conversationId));
    } finally {
      inFlight.delete(key);
    }
  };
}

/* ------------------------------------------------------------------ */
/* Inbox cache patches (realtime)                                      */
/* ------------------------------------------------------------------ */

/** Coalesces global-badge refreshes during message bursts (one refetch per window). */
const UNREAD_REFRESH_WINDOW_MS = 1500;
let unreadRefreshTimer: ReturnType<typeof setTimeout> | null = null;

/** Schedules a `ChatUnread` refresh (nav badge) in-memory without HTTP polling. */
export function refreshUnreadSoon(dispatch: AppDispatch): void {
  if (unreadRefreshTimer) return;
  unreadRefreshTimer = setTimeout(() => {
    unreadRefreshTimer = null;
    dispatch(
      chatApi.util.updateQueryData("getConversations", INBOX_ARGS, (draft) => {
        let unreadTotal = 0;
        for (const page of draft.pages) {
          for (const item of page.items) {
            if ((item.unreadCount ?? 0) > 0) {
              unreadTotal += 1;
            }
          }
        }
        dispatch(
          chatApi.util.updateQueryData("getUnreadSummary", undefined, (summary) => {
            summary.unreadConversations = unreadTotal;
            summary.capped = unreadTotal > 99;
          }),
        );
      }),
    );
  }, UNREAD_REFRESH_WINDOW_MS);
}

/**
 * Applies a new/edited message to the inbox entry and moves it to the top.
 * Unknown conversations (e.g. just created) trigger a refetch instead.
 */
export function applyMessageToInbox(message: ChatMessageItem, myUserId: string, isNew: boolean) {
  return (dispatch: AppDispatch): void => {
    let found = false;
    dispatch(
      chatApi.util.updateQueryData("getConversations", INBOX_ARGS, (draft) => {
        let entry: ChatConversationSummary | undefined;
        for (const page of draft.pages) {
          const index = page.items.findIndex((item) => item.id === message.conversationId);
          if (index >= 0) {
            [entry] = page.items.splice(index, 1);
            break;
          }
        }
        if (!entry) return;
        found = true;
        const head = maxSequence(entry.lastMessageSequence, message.sequence) ?? message.sequence;
        entry.lastMessageSequence = head;
        if (!entry.lastMessage || compareSequence(message.sequence, entry.lastMessage.sequence) >= 0) {
          entry.lastMessage = {
            id: message.id,
            sequence: message.sequence,
            senderId: message.senderId,
            preview: message.deletedAt ? null : message.content,
            createdAt: message.createdAt,
          };
        }
        if (message.senderId === myUserId && isNew) {
          entry.myParticipation.lastReadSequence =
            maxSequence(entry.myParticipation.lastReadSequence, message.sequence) ?? message.sequence;
        }
        entry.unreadCount = computeChatUnreadCount(head, entry.myParticipation.lastReadSequence);
        draft.pages[0]?.items.unshift(entry);
      }),
    );
    // Not in the loaded pages (new or older conversation): refetch the inbox.
    // Invalidating a tag with no active subscription is a no-op.
    if (!found && isNew) dispatch(chatApi.util.invalidateTags(["ChatConversations"]));
    if (isNew && message.senderId !== myUserId) refreshUnreadSoon(dispatch);
  };
}

/** My read cursor advanced (this device or another): recompute unread. */
export function applyMyCursorToInbox(conversationId: string, lastReadSequence: string) {
  return (dispatch: AppDispatch): void => {
    dispatch(
      chatApi.util.updateQueryData("getConversations", INBOX_ARGS, (draft) => {
        for (const page of draft.pages) {
          const entry = page.items.find((item) => item.id === conversationId);
          if (!entry) continue;
          entry.myParticipation.lastReadSequence =
            maxSequence(entry.myParticipation.lastReadSequence, lastReadSequence) ?? lastReadSequence;
          entry.unreadCount = computeChatUnreadCount(entry.lastMessageSequence, entry.myParticipation.lastReadSequence);
        }
      }),
    );
    refreshUnreadSoon(dispatch);
  };
}

export function applyStatusToCaches(conversationId: string, status: ChatConversationStatus) {
  return (dispatch: AppDispatch): void => {
    dispatch(
      chatApi.util.updateQueryData("getConversations", INBOX_ARGS, (draft) => {
        for (const page of draft.pages) {
          const entry = page.items.find((item) => item.id === conversationId);
          if (entry) entry.status = status;
        }
      }),
    );
    dispatch(
      chatApi.util.updateQueryData("getConversation", conversationId, (draft) => {
        draft.status = status;
      }),
    );
  };
}
