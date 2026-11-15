"use client";

import { useCallback, useEffect, useRef } from "react";
import { CHAT_TYPING_THROTTLE_MS } from "@dhruto/contracts";
import { useChatRealtime } from "../realtime/chat-realtime-provider";

/** Stop after this long without input (server auto-expires at 6 s anyway). */
const IDLE_STOP_MS = 4000;
/** Re-send start at most this often while typing continues (server throttle 2.5 s). */
const RESEND_MS = Math.max(CHAT_TYPING_THROTTLE_MS + 500, 3000);

/**
 * Throttled typing signals: at most one `typing:start` per ~3 s while the
 * user keeps typing, one `typing:stop` after idle / send / blur / switch /
 * unmount. Never emits per keystroke and never persists anything.
 */
export function useTypingEmitter(conversationId: string) {
  const { client } = useChatRealtime();
  const typing = useRef(false);
  const lastStart = useRef(0);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = null;
    if (!typing.current) return;
    typing.current = false;
    lastStart.current = 0;
    void client?.typing(conversationId, false);
  }, [client, conversationId]);

  const onInput = useCallback(() => {
    const now = Date.now();
    if (!typing.current || now - lastStart.current >= RESEND_MS) {
      typing.current = true;
      lastStart.current = now;
      void client?.typing(conversationId, true);
    }
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(stop, IDLE_STOP_MS);
  }, [client, conversationId, stop]);

  useEffect(() => stop, [stop]);

  return { onInput, stop };
}
