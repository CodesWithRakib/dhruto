"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { notificationsApi } from "../api/notifications.api";
import { playNotificationSound } from "@/lib/sound";

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

export interface ChatMessagePayload {
  id: string;
  roomId: string;
  senderId: string;
  senderRole: string;
  content: string;
  metadata?: Record<string, unknown> | null;
  timestamp: string;
}

export interface UseNotificationSocketReturn {
  isConnected: boolean;
  latestNotification: RealtimeNotificationPayload | null;
  joinChatRoom: (roomId: string) => void;
  leaveChatRoom: (roomId: string) => void;
  sendChatMessage: (roomId: string, content: string, metadata?: Record<string, unknown>) => void;
  sendChatTyping: (roomId: string, isTyping: boolean) => void;
}

/**
 * Enterprise Real-Time Socket Connection Hook.
 * -------------------------------------------------------------
 * Automatically authenticates via JWT, receives instant notifications,
 * plays harmonic notification sound chime, invalidates caches, and
 * exposes room/chat messaging primitives for future features.
 */
export function useNotificationSocket(): UseNotificationSocketReturn {
  const dispatch = useAppDispatch();
  const authState = useAppSelector((state) => state.auth);
  const token = authState.accessToken;

  const [isConnected, setIsConnected] = useState(false);
  const [latestNotification, setLatestNotification] = useState<RealtimeNotificationPayload | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) {
      if (sharedSocket) {
        sharedSocket.disconnect();
        sharedSocket = null;
      }
      setIsConnected(false);
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
    // Extract base origin (e.g. http://localhost:4000)
    let socketOrigin = "http://localhost:4000";
    try {
      const parsed = new URL(apiUrl);
      socketOrigin = `${parsed.protocol}//${parsed.host}`;
    } catch {
      // Default localhost:4000
    }

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
    socketRef.current = socket;
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

  /* ================================================================== */
  /* Future Chat & Room Primitives                                      */
  /* ================================================================== */

  const joinChatRoom = useCallback((roomId: string) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("chat:join", { roomId });
    }
  }, []);

  const leaveChatRoom = useCallback((roomId: string) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("chat:leave", { roomId });
    }
  }, []);

  const sendChatMessage = useCallback(
    (roomId: string, content: string, metadata?: Record<string, unknown>) => {
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit("chat:message", { roomId, content, metadata });
      }
    },
    [],
  );

  const sendChatTyping = useCallback((roomId: string, isTyping: boolean) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("chat:typing", { roomId, isTyping });
    }
  }, []);

  return {
    isConnected,
    latestNotification,
    joinChatRoom,
    leaveChatRoom,
    sendChatMessage,
    sendChatTyping,
  };
}
