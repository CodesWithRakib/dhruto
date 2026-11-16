"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { useAppSelector } from "@/store/hooks";
import { useGetUnreadSummaryQuery } from "../api/chat.api";

/** Outside the messenger there is no chat socket, so the badge polls lightly. */
const UNREAD_POLL_MS = 60_000;

/**
 * Global chat unread indicator for the dashboard navigation (Phase 5).
 * Counts accessible conversations with unread messages via the server
 * (`GET /chat/conversations/unread-summary`, eligibility-filtered and capped).
 * Refreshes on an interval, on window focus, and immediately when the
 * messenger's realtime handlers or read receipts invalidate `ChatUnread`.
 * Renders nothing when there is nothing unread or the request failed.
 */
export function ChatUnreadBadge({ className }: { className?: string }) {
  const t = useTranslations("Chat");
  const signedIn = useAppSelector((state) => Boolean(state.auth.accessToken && state.auth.user));
  const { data } = useGetUnreadSummaryQuery(undefined, {
    skip: !signedIn,
    pollingInterval: UNREAD_POLL_MS,
    refetchOnFocus: true,
    skipPollingIfUnfocused: true,
  });
  if (!data || data.unreadConversations === 0) return null;
  const label = data.capped ? "99+" : String(data.unreadConversations);
  return (
    <span
      className={
        className ??
        "ms-auto inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground"
      }
      aria-label={t("unreadConversations", { count: data.unreadConversations })}
    >
      {label}
    </span>
  );
}
