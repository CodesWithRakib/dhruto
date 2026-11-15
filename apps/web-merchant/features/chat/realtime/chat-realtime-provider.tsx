"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useStore } from "react-redux";
import type { RootState } from "@/store";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { apiSocketOrigin } from "@/lib/api/socket-origin";
import { authApi } from "@/features/auth/api/auth.api";
import { chatApi } from "../api/chat.api";
import { connectionChanged } from "../state/chat-ephemeral.slice";
import { ChatSocketClient } from "./chat-socket-client";
import { useChatEventHandlers } from "./use-chat-event-handlers";

interface ChatRealtimeContextValue {
  client: ChatSocketClient | null;
  /** Increments on every successful (re)connect; rooms rejoin when it changes. */
  epoch: number;
}

const ChatRealtimeContext = createContext<ChatRealtimeContextValue>({ client: null, epoch: 0 });

export function useChatRealtime(): ChatRealtimeContextValue {
  return useContext(ChatRealtimeContext);
}

/**
 * Owns the ONE `/chat` socket for the messenger. Mounted by the messenger
 * layout, which persists across conversation navigation, so switching
 * conversations never creates a second socket or duplicate listeners.
 *
 * Token refreshes do not recreate the socket — its `auth` callback reads the
 * current token from the store on every (re)connect. Logout (or leaving the
 * messenger) disconnects it.
 */
export function ChatRealtimeProvider({ children }: { children: React.ReactNode }) {
  const store = useStore<RootState>();
  const dispatch = useAppDispatch();
  const userId = useAppSelector((state) => state.auth.user?.id ?? null);
  const hasSession = useAppSelector((state) => Boolean(state.auth.accessToken && state.auth.user));
  const [client, setClient] = useState<ChatSocketClient | null>(null);
  const [epoch, setEpoch] = useState(0);

  useEffect(() => {
    if (!hasSession) return;
    const instance = new ChatSocketClient({
      origin: apiSocketOrigin(),
      getToken: () => store.getState().auth.accessToken,
      refreshSession: async () => {
        // Any authenticated call goes through the base query's single-flight
        // refresh on 401 — the existing session mechanism, not a new one.
        try {
          await dispatch(authApi.endpoints.getMe.initiate(undefined, { forceRefetch: true, subscribe: false })).unwrap();
          return true;
        } catch {
          return false;
        }
      },
      onStateChange: (state) => dispatch(connectionChanged(state)),
      onConnected: ({ reconnected }) => {
        setEpoch((value) => value + 1);
        // Durable events are not replayed: resync the inbox after a reconnect.
        if (reconnected) dispatch(chatApi.util.invalidateTags(["ChatConversations"]));
      },
    });
    instance.connect();
    setClient(instance);
    return () => {
      instance.disconnect();
      setClient(null);
      dispatch(connectionChanged("idle"));
    };
  }, [hasSession, dispatch, store]);

  useChatEventHandlers(client, userId);

  return <ChatRealtimeContext.Provider value={{ client, epoch }}>{children}</ChatRealtimeContext.Provider>;
}
