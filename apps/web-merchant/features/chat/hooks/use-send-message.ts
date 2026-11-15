"use client";

import { useCallback } from "react";
import { ChatMessageType } from "@dhruto/contracts";
import { useStore } from "react-redux";
import type { RootState } from "@/store";
import { useAppDispatch } from "@/store/hooks";
import { chatErrorKey } from "../lib/errors";
import { useSendMessageMutation } from "../api/chat.api";
import {
  messageReceived,
  optimisticAdded,
  optimisticDiscarded,
  optimisticFailed,
  optimisticRetrying,
} from "../state/chat-timeline.slice";
import { applyMessageToInbox } from "../state/chat-thunks";

function newClientMessageId(): string {
  return globalThis.crypto.randomUUID();
}

/**
 * Optimistic sending over the durable REST path.
 *
 *  - One `clientMessageId` per LOGICAL message, generated before the first
 *    attempt and reused for every retry, so the backend's idempotency key
 *    (conversation, sender, clientMessageId) prevents duplicates.
 *  - The pending bubble shares its list key with the canonical message, so
 *    whichever arrives first (REST response or realtime `message:new`)
 *    replaces it in place; the other is a no-op merge.
 *  - A rejected send is shown as failed with the server's error — never as
 *    sent — and can be retried or discarded.
 */
export function useSendMessage(conversationId: string, myUserId: string) {
  const dispatch = useAppDispatch();
  const store = useStore<RootState>();
  const [sendMutation] = useSendMessageMutation();

  const attempt = useCallback(
    async (clientMessageId: string, content: string, replyToMessageId: string | null) => {
      try {
        const message = await sendMutation({
          conversationId,
          body: {
            type: ChatMessageType.TEXT,
            clientMessageId,
            content,
            ...(replyToMessageId ? { replyToMessageId } : {}),
          },
        }).unwrap();
        dispatch(messageReceived({ message }));
        dispatch(applyMessageToInbox(message, myUserId, true));
        return true;
      } catch (error) {
        dispatch(optimisticFailed({ conversationId, clientMessageId, error: chatErrorKey(error) }));
        return false;
      }
    },
    [conversationId, dispatch, myUserId, sendMutation],
  );

  const send = useCallback(
    (content: string, replyToMessageId: string | null) => {
      const clientMessageId = newClientMessageId();
      dispatch(
        optimisticAdded({
          conversationId,
          clientMessageId,
          senderId: myUserId,
          content,
          replyToMessageId,
          createdAt: new Date().toISOString(),
        }),
      );
      return attempt(clientMessageId, content, replyToMessageId);
    },
    [attempt, conversationId, dispatch, myUserId],
  );

  /** Retries with the SAME clientMessageId (idempotent on the server). */
  const retry = useCallback(
    (clientMessageId: string) => {
      const stored = store.getState().chatTimeline.conversations[conversationId]?.outbox[clientMessageId];
      if (!stored) return Promise.resolve(false);
      dispatch(optimisticRetrying({ conversationId, clientMessageId }));
      return attempt(clientMessageId, stored.content, stored.replyToMessageId);
    },
    [attempt, conversationId, dispatch, store],
  );

  const discard = useCallback(
    (clientMessageId: string) => dispatch(optimisticDiscarded({ conversationId, clientMessageId })),
    [conversationId, dispatch],
  );

  return { send, retry, discard };
}
