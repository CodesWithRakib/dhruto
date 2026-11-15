"use client";

import { useEffect } from "react";
import { useStore } from "react-redux";
import { ChatServerEvent, type ChatMessageEvent } from "@dhruto/contracts";
import type { RootState } from "@/store";
import { useAppDispatch } from "@/store/hooks";
import { chatApi } from "../api/chat.api";
import { compareSequence } from "../lib/timeline";
import { presenceReceived, typingReceived } from "../state/chat-ephemeral.slice";
import {
  cursorUpdated,
  lastSeenSequence,
  messageDeleted,
  messageReceived,
  reactionChanged,
} from "../state/chat-timeline.slice";
import { applyMessageToInbox, applyMyCursorToInbox, applyStatusToCaches, syncToHead } from "../state/chat-thunks";
import { type ChatSocketClient } from "./chat-socket-client";

/**
 * Maps server events onto durable caches (timeline slice, RTK Query inbox and
 * detail) and ephemeral state. Registered once per socket; every listener is
 * removed on cleanup. All handlers are idempotent: durable events are
 * at-least-once, so duplicates are absorbed by key/eventId dedupe.
 */
export function useChatEventHandlers(client: ChatSocketClient | null, myUserId: string | null): void {
  const dispatch = useAppDispatch();
  const store = useStore<RootState>();

  useEffect(() => {
    if (!client || !myUserId) return;

    const onMessage = (event: ChatMessageEvent, isNew: boolean) => {
      dispatch(messageReceived({ message: event.message, eventId: event.eventId }));
      dispatch(applyMessageToInbox(event.message, myUserId, isNew));
      // Live gap detection: a sequence beyond lastSeen + 1 means we missed events.
      const timeline = store.getState().chatTimeline.conversations[event.conversationId];
      const lastSeen = timeline?.initialized ? lastSeenSequence(timeline) : null;
      if (lastSeen !== null && compareSequence(lastSeen, event.sequence) < 0) {
        void dispatch(syncToHead(event.conversationId, event.sequence));
      }
    };

    const unsubscribers = [
      client.on(ChatServerEvent.MESSAGE_NEW, (event) => onMessage(event, true)),
      client.on(ChatServerEvent.MESSAGE_UPDATED, (event) => onMessage(event, false)),
      client.on(ChatServerEvent.MESSAGE_DELETED, (event) =>
        dispatch(
          messageDeleted({
            conversationId: event.conversationId,
            messageId: event.messageId,
            deletedAt: event.occurredAt,
            eventId: event.eventId,
          }),
        ),
      ),
      client.on(ChatServerEvent.REACTION_UPDATED, (event) =>
        dispatch(
          reactionChanged({
            conversationId: event.conversationId,
            messageId: event.messageId,
            userId: event.userId,
            reaction: event.reaction,
            action: event.action,
            myUserId,
            eventId: event.eventId,
          }),
        ),
      ),
      client.on(ChatServerEvent.PIN_UPDATED, (event) =>
        dispatch(chatApi.util.invalidateTags([{ type: "ChatPins", id: event.conversationId }])),
      ),
      client.on(ChatServerEvent.CURSOR_UPDATED, (event) => {
        dispatch(
          cursorUpdated({
            conversationId: event.conversationId,
            userId: event.userId,
            read: event.lastReadSequence,
            delivered: event.lastDeliveredSequence,
            eventId: event.eventId,
          }),
        );
        // My cursor moved on another device: keep unread badges in sync.
        if (event.userId === myUserId) dispatch(applyMyCursorToInbox(event.conversationId, event.lastReadSequence));
      }),
      client.on(ChatServerEvent.CONVERSATION_UPDATED, (event) =>
        dispatch(applyStatusToCaches(event.conversationId, event.status)),
      ),
      client.on(ChatServerEvent.CONVERSATION_CREATED, () =>
        dispatch(chatApi.util.invalidateTags(["ChatConversations"])),
      ),
      client.on(ChatServerEvent.PARTICIPANT_UPDATED, (event) =>
        dispatch(chatApi.util.invalidateTags([{ type: "ChatConversation", id: event.conversationId }])),
      ),
      client.on(ChatServerEvent.MEMBERSHIP_REVOKED, (event) =>
        dispatch(
          chatApi.util.invalidateTags(["ChatConversations", { type: "ChatConversation", id: event.conversationId }]),
        ),
      ),
      client.on(ChatServerEvent.TYPING, (event) => {
        if (event.userId === myUserId) return;
        dispatch(
          typingReceived({
            conversationId: event.conversationId,
            userId: event.userId,
            isTyping: event.isTyping,
            expiresAt: Date.now() + event.expiresInMs,
          }),
        );
      }),
      client.on(ChatServerEvent.PRESENCE, (event) => dispatch(presenceReceived(event))),
    ];
    return () => {
      for (const unsubscribe of unsubscribers) unsubscribe();
    };
  }, [client, myUserId, dispatch, store]);
}
