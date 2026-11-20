"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Lock, MessagesSquare, Search, X } from "lucide-react";
import { Button, Input, Skeleton, cn } from "@dhruto/ui";
import { ChatConversationStatus, type ChatConversationSummary } from "@dhruto/contracts";
import { Link } from "@/lib/navigation";
import { EmptyState, ErrorState } from "@/components/feedback/states";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useGetConversationsInfiniteQuery } from "../api/chat.api";
import { INBOX_ARGS } from "../state/chat-thunks";
import { conversationTitle, formatListTime } from "../lib/display";
import { type MessengerRoutes } from "../lib/routes";
import { ChatAvatar } from "./chat-primitives";
import { MessageSearchResults } from "./message-search-results";

/**
 * Inbox: the caller's conversations, newest activity first, paginated with the
 * backend's opaque keyset cursor (never "fetch everything"). Realtime events
 * patch this cache in place (see chat-thunks), so the list stays live without
 * refetching.
 */
export function ConversationSidebar({
  routes,
  activeId,
  myUserId,
  headerAction,
}: {
  routes: MessengerRoutes;
  activeId: string | null;
  myUserId: string;
  /** Role-specific action next to the title (e.g. merchant "Contact operations"). */
  headerAction?: React.ReactNode;
}) {
  const t = useTranslations("Chat");
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query.trim(), 350);
  const inbox = useGetConversationsInfiniteQuery(INBOX_ARGS);

  // Realtime patches move entries between pages; render each conversation once.
  const conversations = useMemo(() => {
    const seen = new Map<string, ChatConversationSummary>();
    for (const page of inbox.data?.pages ?? []) {
      for (const item of page.items) if (!seen.has(item.id)) seen.set(item.id, item);
    }
    return [...seen.values()];
  }, [inbox.data]);

  const titles = useMemo(
    () => new Map(conversations.map((conversation) => [conversation.id, conversationTitle(conversation, t)])),
    [conversations, t],
  );

  const searching = debounced.length >= 2;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-3 px-4 pb-3 pt-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-lg font-semibold text-foreground">{t("title")}</h1>
          {headerAction}
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchLabel")}
            className="h-10 ps-9 pe-9"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label={t("clearSearch")}
              className="absolute end-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
        {query.trim().length === 1 && <p className="text-xs text-muted-foreground">{t("searchMin")}</p>}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {searching ? (
          <MessageSearchResults query={debounced} routes={routes} titleFor={(id) => titles.get(id) ?? t("title")} />
        ) : (
          <InboxList
            conversations={conversations}
            isLoading={inbox.isLoading}
            isError={inbox.isError}
            onRetry={() => void inbox.refetch()}
            hasNextPage={inbox.hasNextPage}
            isFetchingNextPage={inbox.isFetchingNextPage}
            fetchNextPage={() => void inbox.fetchNextPage()}
            routes={routes}
            activeId={activeId}
            myUserId={myUserId}
          />
        )}
      </div>
    </div>
  );
}

function InboxList({
  conversations,
  isLoading,
  isError,
  onRetry,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  routes,
  activeId,
  myUserId,
}: {
  conversations: ChatConversationSummary[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  routes: MessengerRoutes;
  activeId: string | null;
  myUserId: string;
}) {
  const t = useTranslations("Chat");
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasNextPage || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting) && !isFetchingNextPage) fetchNextPage();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return (
      <ul aria-busy="true" aria-label={t("title")} className="space-y-1 p-2">
        {Array.from({ length: 6 }, (_, index) => (
          <li key={index} className="flex items-center gap-3 rounded-xl p-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  if (isError && conversations.length === 0) {
    return (
      <div className="p-4">
        <ErrorState
          title={t("conversationsError")}
          action={
            <Button variant="outline" onClick={onRetry}>
              {t("retry")}
            </Button>
          }
        />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="p-4">
        <EmptyState icon={MessagesSquare} title={t("conversationsEmptyTitle")} description={t("conversationsEmptyDescription")} />
      </div>
    );
  }

  return (
    <nav aria-label={t("title")}>
      <ul className="space-y-0.5 p-2">
        {conversations.map((conversation) => (
          <li key={conversation.id}>
            <ConversationListItem
              conversation={conversation}
              href={routes.thread(conversation.id)}
              active={conversation.id === activeId}
              myUserId={myUserId}
            />
          </li>
        ))}
      </ul>
      {hasNextPage && (
        <div ref={sentinel} className="flex justify-center p-3">
          <Button variant="ghost" size="sm" onClick={fetchNextPage} disabled={isFetchingNextPage}>
            {t("loadMore")}
          </Button>
        </div>
      )}
    </nav>
  );
}

export function ConversationListItem({
  conversation,
  href,
  active,
  myUserId,
}: {
  conversation: ChatConversationSummary;
  href: string;
  active: boolean;
  myUserId: string;
}) {
  const t = useTranslations("Chat");
  const locale = useLocale();
  const title = conversationTitle(conversation, t);
  const last = conversation.lastMessage;
  const preview = !last
    ? t("noMessages")
    : last.senderId === null
      ? t("systemEvent") // server events (no sender) store a raw "[System]" preview
      : last.preview === null
        ? t("deletedMessage")
        : last.senderId === myUserId
          ? `${t("you")}: ${last.preview}`
          : last.preview;
  const unread = conversation.unreadCount;
  const readOnly = conversation.status !== ChatConversationStatus.ACTIVE;

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active ? "bg-surface-selected" : "hover:bg-surface-hover",
      )}
    >
      <ChatAvatar name={title} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className={cn("truncate text-sm text-foreground", unread > 0 ? "font-semibold" : "font-medium")}>{title}</p>
          {last && (
            <time dateTime={last.createdAt} className="shrink-0 text-[11px] text-muted-foreground">
              {formatListTime(last.createdAt, locale)}
            </time>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          {readOnly && (
            <Lock className="h-3 w-3 shrink-0 text-muted-foreground" aria-label={t(`statuses.${conversation.status}`)} />
          )}
          <p className={cn("truncate text-xs", unread > 0 ? "text-foreground" : "text-muted-foreground")}>{preview}</p>
          {unread > 0 && (
            <span
              className="ms-auto inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground"
              aria-label={t("unread", { count: unread })}
            >
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
