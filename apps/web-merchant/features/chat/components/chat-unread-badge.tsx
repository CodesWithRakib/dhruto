"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { useAppSelector } from "@/store/hooks";
import { useGetUnreadSummaryQuery } from "../api/chat.api";

export function ChatUnreadBadge({ className }: { className?: string }) {
  const t = useTranslations("Chat");
  const signedIn = useAppSelector((state) => Boolean(state.auth.accessToken && state.auth.user));
  const { data } = useGetUnreadSummaryQuery(undefined, {
    skip: !signedIn,
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
