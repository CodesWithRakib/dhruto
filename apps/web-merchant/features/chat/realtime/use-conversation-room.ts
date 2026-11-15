"use client";

import { useEffect } from "react";
import { ChatSocketErrorCode } from "@dhruto/contracts";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { chatApi } from "../api/chat.api";
import { presenceSnapshot, typingCleared } from "../state/chat-ephemeral.slice";
import { cursorUpdated } from "../state/chat-timeline.slice";
import { syncToHead } from "../state/chat-thunks";
import { useChatRealtime } from "./chat-realtime-provider";

/**
 * Joins exactly the active conversation's room and leaves it on switch or
 * unmount. Re-runs after every reconnect (epoch), implementing the recovery
 * protocol: re-authorized join -> compare head -> afterSequence gap-fill ->
 * presence/cursor resync.
 */
export function useConversationRoom(conversationId: string | null, myUserId: string | null): void {
  const dispatch = useAppDispatch();
  const { client, epoch } = useChatRealtime();
  const connected = useAppSelector((state) => state.chatEphemeral.connection === "connected");

  useEffect(() => {
    if (!client || !conversationId || !myUserId || !connected) return;
    let active = true;
    void (async () => {
      const ack = await client.join(conversationId);
      if (!active || !ack) return;
      if (!ack.ok) {
        // Access lost or never granted: let the detail query surface it.
        if (ack.error.code === ChatSocketErrorCode.NOT_FOUND) {
          dispatch(chatApi.util.invalidateTags([{ type: "ChatConversation", id: conversationId }]));
        }
        return;
      }
      dispatch(presenceSnapshot(ack.data.presence));
      dispatch(
        cursorUpdated({
          conversationId,
          userId: myUserId,
          read: ack.data.lastReadSequence,
          delivered: ack.data.lastDeliveredSequence,
        }),
      );
      await dispatch(syncToHead(conversationId, ack.data.lastMessageSequence));
    })();
    return () => {
      active = false;
      void client.leave(conversationId);
      dispatch(typingCleared(conversationId));
    };
  }, [client, conversationId, myUserId, connected, epoch, dispatch]);
}
