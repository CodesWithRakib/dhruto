"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { notificationsApi } from "../api/notifications.api";
import { baseApi } from "@/lib/api/base-api";
import { playNotificationSound } from "@/lib/sound";
import { apiSocketOrigin } from "@/lib/api/socket-origin";

let sharedSocket: Socket | null = null;
let activeConnectionCount = 0;

export interface RealtimeNotificationPayload {
  id: string;
  userId?: string;
  merchantId?: string;
  channel: string;
  type: string;
  title: string;
  message: string;
  status: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface UseNotificationSocketReturn {
  isConnected: boolean;
  latestNotification: RealtimeNotificationPayload | null;
}

/**
 * Real-time notification socket (default "/" namespace).
 * -------------------------------------------------------------
 * Authenticates via JWT, receives instant notifications, plays the chime and
 * invalidates the notification cache. It carries NO chat traffic: the legacy
 * `chat:*` helpers were removed (the server rejects those events — finding
 * S-1). Chat uses the dedicated `/chat` namespace client in
 * `features/chat/realtime/chat-socket-client.ts`.
 */
export function useNotificationSocket(): UseNotificationSocketReturn {
  const dispatch = useAppDispatch();
  const authState = useAppSelector((state) => state.auth);
  const token = authState.accessToken;

  const [isConnected, setIsConnected] = useState(false);
  const [latestNotification, setLatestNotification] = useState<RealtimeNotificationPayload | null>(null);

  useEffect(() => {
    if (!token) {
      if (sharedSocket) {
        sharedSocket.disconnect();
        sharedSocket = null;
      }
      setIsConnected(false);
      return;
    }

    const socketOrigin = apiSocketOrigin();

    if (!sharedSocket || sharedSocket.disconnected) {
      sharedSocket = io(socketOrigin, {
        auth: { token },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionDelay: 2000,
        reconnectionAttempts: 10,
      });
    }

    const socket = sharedSocket;
    activeConnectionCount++;

    const onConnect = () => {
      setIsConnected(true);
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    const onNewNotification = (data: RealtimeNotificationPayload) => {
      setLatestNotification(data);

      // 1. Play real-time audio sound chime
      playNotificationSound();

      // 2. Display rich toast notification
      toast.info(data.title, {
        description: data.message,
        duration: 7000,
      });

      // 3. Immediately refresh Redux RTK notification cache (0ms delay)
      dispatch(notificationsApi.util.invalidateTags(["Notification"]));

      // 4. Invalidate related entities for instant dashboard reactivity
      if (data.type === "PARCEL_STATUS_UPDATE") {
        dispatch(baseApi.util.invalidateTags(["Parcel", "Analytics"]));
      } else if (data.type === "CASH_COLLECTED" || data.type === "PAYOUT_UPDATE") {
        dispatch(baseApi.util.invalidateTags(["Wallet", "Finance"]));
      }
    };

    const onUnreadCount = (_data: { unreadCount: number }) => {
      dispatch(notificationsApi.util.invalidateTags(["Notification"]));
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("notification:new", onNewNotification);
    socket.on("notification:unread_count", onUnreadCount);

    if (socket.connected) {
      setIsConnected(true);
    }

    return () => {
      activeConnectionCount--;
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("notification:new", onNewNotification);
      socket.off("notification:unread_count", onUnreadCount);

      if (activeConnectionCount <= 0 && sharedSocket) {
        sharedSocket.disconnect();
        sharedSocket = null;
      }
    };
  }, [token, dispatch]);

  return {
    isConnected,
    latestNotification,
  };
}
