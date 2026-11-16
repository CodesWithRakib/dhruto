"use client";

import { useCallback } from "react";
import {
  ChatMessageType,
  type ChatAttachmentItem,
  type ChatVoiceMetadata,
  type SendChatMessageRequest,
} from "@dhruto/contracts";
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
  type OutboxEntry,
} from "../state/chat-timeline.slice";
import { applyMessageToInbox } from "../state/chat-thunks";

function newClientMessageId(): string {
  return globalThis.crypto.randomUUID();
}

/** Media payload of a message (Phase 6). Attachments are already UPLOADED. */
export interface OutgoingMedia {
  type: ChatMessageType.IMAGE | ChatMessageType.FILE | ChatMessageType.VOICE;
  attachments: ChatAttachmentItem[];
  metadata?: ChatVoiceMetadata;
}

/** Builds the send request for a logical message (identical on every retry). */
export function buildSendRequest(clientMessageId: string, entry: OutboxEntry): SendChatMessageRequest {
  const reply = entry.replyToMessageId ? { replyToMessageId: entry.replyToMessageId } : {};
  const attachmentIds = (entry.attachments ?? []).map((a) => a.id);
  const content = entry.content.trim() ? { content: entry.content } : {};
  switch (entry.type) {
    case ChatMessageType.IMAGE:
      return { type: ChatMessageType.IMAGE, clientMessageId, attachmentIds, ...content, ...reply };
    case ChatMessageType.FILE:
      return { type: ChatMessageType.FILE, clientMessageId, attachmentIds, ...content, ...reply };
    case ChatMessageType.VOICE:
      return {
        type: ChatMessageType.VOICE,
        clientMessageId,
        attachmentIds,
        metadata: entry.metadata ?? { durationMs: 1 },
        ...reply,
      };
    default:
      return { type: ChatMessageType.TEXT, clientMessageId, content: entry.content, ...reply };
  }
}

/** IMAGE when every attachment is an image, otherwise FILE (documents may mix with images). */
export function mediaTypeFor(attachments: readonly ChatAttachmentItem[]): ChatMessageType.IMAGE | ChatMessageType.FILE {
  return attachments.every((a) => a.kind === "image") ? ChatMessageType.IMAGE : ChatMessageType.FILE;
}

/**
 * Optimistic sending over the durable REST path.
 *
 *  - One `clientMessageId` per LOGICAL message, generated before the first
 *    attempt and reused for every retry, so the backend's idempotency key
 *    (conversation, sender, clientMessageId) prevents duplicates — including
 *    for media messages, whose attachment links are part of the same send.
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
    async (clientMessageId: string, entry: OutboxEntry) => {
      try {
        const message = await sendMutation({
          conversationId,
          body: buildSendRequest(clientMessageId, entry),
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
    (content: string, replyToMessageId: string | null, media?: OutgoingMedia) => {
      const clientMessageId = newClientMessageId();
      const entry: OutboxEntry = {
        content,
        replyToMessageId,
        ...(media ? { type: media.type, attachments: media.attachments } : {}),
        ...(media?.metadata ? { metadata: media.metadata } : {}),
      };
      dispatch(
        optimisticAdded({
          conversationId,
          clientMessageId,
          senderId: myUserId,
          createdAt: new Date().toISOString(),
          ...entry,
        }),
      );
      return attempt(clientMessageId, entry);
    },
    [attempt, conversationId, dispatch, myUserId],
  );

  /** Retries with the SAME clientMessageId and payload (idempotent on the server). */
  const retry = useCallback(
    (clientMessageId: string) => {
      const stored = store.getState().chatTimeline.conversations[conversationId]?.outbox[clientMessageId];
      if (!stored) return Promise.resolve(false);
      dispatch(optimisticRetrying({ conversationId, clientMessageId }));
      return attempt(clientMessageId, stored);
    },
    [attempt, conversationId, dispatch, store],
  );

  const discard = useCallback(
    (clientMessageId: string) => dispatch(optimisticDiscarded({ conversationId, clientMessageId })),
    [conversationId, dispatch],
  );

  return { send, retry, discard };
}
