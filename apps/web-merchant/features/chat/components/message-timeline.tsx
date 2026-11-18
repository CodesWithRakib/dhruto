"use client";

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowDown, Loader2 } from "lucide-react";
import { Button } from "@dhruto/ui";
import { type ChatPageSender } from "@dhruto/contracts";
import { ErrorState } from "@/components/feedback/states";
import { buildRows, deliveryState, type TimelineMessage } from "../lib/timeline";
import { formatDayLabel, senderName } from "../lib/display";
import { type ConversationCaps } from "../lib/permissions";
import { type ParticipantCursor } from "../state/chat-timeline.slice";
import { MessageBubble, type MessageBubbleHandlers } from "./message-bubble";

const BOTTOM_THRESHOLD_PX = 80;
const TOP_LOAD_THRESHOLD_PX = 160;

export interface MessageTimelineProps {
  messages: TimelineMessage[];
  initialized: boolean;
  hasMoreOlder: boolean;
  loadingOlder: boolean;
  error: boolean;
  onRetry: () => void;
  onLoadOlder: () => Promise<boolean>;
  myUserId: string;
  senders: Record<string, ChatPageSender>;
  cursors: Record<string, ParticipantCursor>;
  pinnedIds: ReadonlySet<string>;
  showSenderNames: boolean;
  caps: ConversationCaps;
  handlers: MessageBubbleHandlers;
  highlightMessageId: string | null;
  onAtBottomChange: (atBottom: boolean) => void;
}

/**
 * Scrollable message list.
 *  - Initial open scrolls to the newest message.
 *  - Scrolling near the top loads ONE older page (keyset `beforeSequence`);
 *    the scroll position is anchored so content never jumps.
 *  - New messages auto-scroll only when the reader is already at the bottom
 *    (or just sent one); otherwise a "jump to latest" button appears.
 *  - Off-screen rows skip layout/paint via `content-visibility: auto`
 *    (native, no virtualization dependency); history is paged, never loaded whole.
 */
export function MessageTimeline({
  messages,
  initialized,
  hasMoreOlder,
  loadingOlder,
  error,
  onRetry,
  onLoadOlder,
  myUserId,
  senders,
  cursors,
  pinnedIds,
  showSenderNames,
  caps,
  handlers,
  highlightMessageId,
  onAtBottomChange,
}: MessageTimelineProps) {
  const t = useTranslations("Chat");
  const locale = useLocale();
  const scrollRef = useRef<HTMLDivElement>(null);
  const anchor = useRef<{ height: number; top: number } | null>(null);
  const atBottomRef = useRef(true);
  const lastKeyRef = useRef<string | null>(null);
  const didInitialScroll = useRef(false);
  const [showJump, setShowJump] = useState(false);

  const rows = useMemo(() => buildRows(messages), [messages]);
  const byId = useMemo(() => {
    const map = new Map<string, TimelineMessage>();
    for (const message of messages) if (message.id) map.set(message.id, message);
    return map;
  }, [messages]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
    setShowJump(false);
  }, []);

  const requestOlder = useCallback(() => {
    const el = scrollRef.current;
    if (!el || loadingOlder || !hasMoreOlder || !initialized) return;
    anchor.current = { height: el.scrollHeight, top: el.scrollTop };
    void onLoadOlder().then((loaded) => {
      if (!loaded) anchor.current = null;
    });
  }, [hasMoreOlder, initialized, loadingOlder, onLoadOlder]);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < BOTTOM_THRESHOLD_PX;
    if (atBottom !== atBottomRef.current) {
      atBottomRef.current = atBottom;
      onAtBottomChange(atBottom);
      if (atBottom) setShowJump(false);
    }
    if (el.scrollTop < TOP_LOAD_THRESHOLD_PX) requestOlder();
  }, [onAtBottomChange, requestOlder]);

  // Keep scroll position stable after prepending, follow new messages at the bottom.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || !initialized) return;
    const lastKey = messages[messages.length - 1]?.key ?? null;
    if (!didInitialScroll.current) {
      didInitialScroll.current = true;
      lastKeyRef.current = lastKey;
      scrollToBottom();
      onAtBottomChange(true);
      return;
    }
    if (anchor.current) {
      el.scrollTop = el.scrollHeight - anchor.current.height + anchor.current.top;
      anchor.current = null;
    }
    if (lastKey !== lastKeyRef.current) {
      const newest = messages[messages.length - 1];
      lastKeyRef.current = lastKey;
      const mineJustSent = newest?.senderId === myUserId && newest.localState === "pending";
      if (atBottomRef.current || mineJustSent) scrollToBottom();
      else setShowJump(true);
    }
  }, [messages, initialized, myUserId, scrollToBottom, onAtBottomChange]);

  // Bring a highlighted (search result / reply target) message into view once.
  useEffect(() => {
    if (!highlightMessageId) return;
    const el = document.getElementById(`msg-${highlightMessageId}`);
    el?.scrollIntoView({ block: "center" });
  }, [highlightMessageId, messages.length]);

  if (error && !initialized) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <ErrorState
          title={t("historyError")}
          action={
            <Button variant="outline" onClick={onRetry}>
              {t("retry")}
            </Button>
          }
        />
      </div>
    );
  }

  if (!initialized) {
    return (
      <div className="flex flex-1 items-center justify-center" role="status" aria-label={t("loadingOlder")}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground motion-reduce:animate-none" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="h-full overflow-y-auto overscroll-contain py-3"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label={t("title")}
      >
        <div className="flex justify-center py-2">
          {hasMoreOlder ? (
            <Button variant="ghost" size="sm" onClick={requestOlder} disabled={loadingOlder}>
              {loadingOlder && <Loader2 className="me-2 h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
              {loadingOlder ? t("loadingOlder") : t("loadMore")}
            </Button>
          ) : (
            messages.length > 0 && <p className="text-xs text-muted-foreground">{t("beginningOfConversation")}</p>
          )}
        </div>

        {messages.length === 0 && <p className="px-6 py-12 text-center text-sm text-muted-foreground">{t("noMessages")}</p>}

        {rows.map((row) => {
          if (row.kind === "date") {
            return (
              <div key={row.key} className="sticky top-0 z-10 flex justify-center py-2">
                <span className="rounded-full bg-surface/90 px-3 py-0.5 text-xs font-medium text-muted-foreground backdrop-blur">
                  {formatDayLabel(row.date, locale, t)}
                </span>
              </div>
            );
          }
          const { message } = row;
          const mine = message.senderId === myUserId;
          const replyTarget = message.replyToMessageId ? (byId.get(message.replyToMessageId) ?? null) : undefined;
          return (
            <MessageBubble
              key={row.key}
              message={message}
              mine={mine}
              senderLabel={senderName(senders, message.senderId, myUserId, t)}
              showSender={showSenderNames && !mine && row.firstInGroup}
              firstInGroup={row.firstInGroup}
              lastInGroup={row.lastInGroup}
              replyTarget={replyTarget}
              replyName={replyTarget ? senderName(senders, replyTarget.senderId, myUserId, t) : undefined}
              pinned={message.id !== null && pinnedIds.has(message.id)}
              delivery={mine ? deliveryState(message, myUserId, cursors) : null}
              highlighted={message.id !== null && message.id === highlightMessageId}
              locale={locale}
              caps={caps}
              handlers={handlers}
            />
          );
        })}
      </div>

      {showJump && (
        <Button
          variant="elevated"
          size="icon"
          onClick={() => scrollToBottom("smooth")}
          aria-label={t("jumpToLatest")}
          className="absolute bottom-3 end-4 rounded-full"
        >
          <ArrowDown className="h-4 w-4" aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}
