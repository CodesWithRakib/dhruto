"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { type TimelineMessage } from "../lib/timeline";
import { conversationOpened } from "../state/chat-timeline.slice";
import { loadLatest, loadOlder } from "../state/chat-thunks";

export interface ConversationTimelineView {
  messages: TimelineMessage[];
  initialized: boolean;
  hasMoreOlder: boolean;
  loadingOlder: boolean;
  error: boolean;
  loadOlder: () => Promise<boolean>;
  retry: () => void;
}

/**
 * Opens a conversation's timeline: loads the newest page over REST (works
 * even while the socket is reconnecting) and exposes bounded older-page
 * loading. Re-renders only when THIS conversation's slice entry changes.
 */
export function useConversationTimeline(conversationId: string): ConversationTimelineView {
  const dispatch = useAppDispatch();
  const timeline = useAppSelector((state) => state.chatTimeline.conversations[conversationId]);
  const [error, setError] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    dispatch(conversationOpened(conversationId));
  }, [conversationId, dispatch]);

  const initialized = timeline?.initialized ?? false;
  useEffect(() => {
    if (initialized) return;
    let active = true;
    setError(false);
    dispatch(loadLatest(conversationId)).catch(() => {
      if (active) setError(true);
    });
    return () => {
      active = false;
    };
  }, [conversationId, initialized, attempt, dispatch]);

  const messages = useMemo(
    () =>
      (timeline?.order ?? [])
        .map((key) => timeline?.messages[key])
        .filter((message): message is TimelineMessage => message !== undefined),
    [timeline],
  );

  const older = useCallback(async () => {
    setLoadingOlder(true);
    try {
      return await dispatch(loadOlder(conversationId));
    } catch {
      return false;
    } finally {
      setLoadingOlder(false);
    }
  }, [conversationId, dispatch]);

  return {
    messages,
    initialized,
    hasMoreOlder: timeline?.hasMoreOlder ?? true,
    loadingOlder,
    error,
    loadOlder: older,
    retry: () => setAttempt((value) => value + 1),
  };
}
