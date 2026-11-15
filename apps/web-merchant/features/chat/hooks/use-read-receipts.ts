"use client";

import { useEffect, useRef, useState } from "react";
import { useAppDispatch } from "@/store/hooks";
import { useChatRealtime } from "../realtime/chat-realtime-provider";
import { chatApi } from "../api/chat.api";
import { compareSequence } from "../lib/timeline";
import { cursorUpdated } from "../state/chat-timeline.slice";
import { applyMyCursorToInbox } from "../state/chat-thunks";

const DELIVERED_DEBOUNCE_MS = 1000;
const READ_DEBOUNCE_MS = 600;

function pageIsActive(): boolean {
  return typeof document !== "undefined" && document.visibilityState === "visible" && document.hasFocus();
}

/**
 * Cursor updates for the open conversation (Phase 2 cursor model):
 *  - delivered: whenever newer persisted messages are present locally;
 *  - read: only when the user can actually see the newest message — timeline
 *    scrolled to the bottom AND the tab visible and focused. Opening a
 *    conversation while scrolled up does not mark everything read.
 * Both are monotonic (never sent for a lower sequence), debounced, sent over
 * the socket when connected and over REST otherwise.
 */
export function useReadReceipts(options: {
  conversationId: string;
  myUserId: string;
  latestSequence: string | null;
  initialRead: string | null;
  initialDelivered: string | null;
  atBottom: boolean;
}): void {
  const { conversationId, myUserId, latestSequence, initialRead, initialDelivered, atBottom } = options;
  const dispatch = useAppDispatch();
  const { client } = useChatRealtime();
  const sentRead = useRef<string | null>(null);
  const sentDelivered = useRef<string | null>(null);
  const [active, setActive] = useState(pageIsActive);

  // Reset monotonic memory per conversation from the authoritative cursors.
  useEffect(() => {
    sentRead.current = initialRead;
    sentDelivered.current = initialDelivered;
  }, [conversationId, initialRead, initialDelivered]);

  useEffect(() => {
    const update = () => setActive(pageIsActive());
    document.addEventListener("visibilitychange", update);
    window.addEventListener("focus", update);
    window.addEventListener("blur", update);
    return () => {
      document.removeEventListener("visibilitychange", update);
      window.removeEventListener("focus", update);
      window.removeEventListener("blur", update);
    };
  }, []);

  useEffect(() => {
    if (!latestSequence) return;
    if (sentDelivered.current && compareSequence(latestSequence, sentDelivered.current) <= 0) return;
    const timer = setTimeout(() => {
      sentDelivered.current = latestSequence;
      void (async () => {
        const ack = await client?.markDelivered(conversationId, latestSequence);
        if (!ack) {
          await dispatch(
            chatApi.endpoints.markDelivered.initiate({ conversationId, lastDeliveredSequence: latestSequence }),
          ).catch(() => undefined);
        }
      })();
    }, DELIVERED_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [client, conversationId, latestSequence, dispatch]);

  useEffect(() => {
    if (!latestSequence || !atBottom || !active) return;
    if (sentRead.current && compareSequence(latestSequence, sentRead.current) <= 0) return;
    const timer = setTimeout(() => {
      sentRead.current = latestSequence;
      dispatch(cursorUpdated({ conversationId, userId: myUserId, read: latestSequence, delivered: latestSequence }));
      dispatch(applyMyCursorToInbox(conversationId, latestSequence));
      void (async () => {
        const ack = await client?.markRead(conversationId, latestSequence);
        if (!ack) {
          await dispatch(
            chatApi.endpoints.markRead.initiate({ conversationId, lastReadSequence: latestSequence }),
          ).catch(() => undefined);
        }
      })();
    }, READ_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [client, conversationId, myUserId, latestSequence, atBottom, active, dispatch]);
}
