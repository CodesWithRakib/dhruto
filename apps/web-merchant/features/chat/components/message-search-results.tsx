"use client";

import React from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, SearchX } from "lucide-react";
import { Button } from "@dhruto/ui";
import { Link } from "@/lib/navigation";
import { EmptyState, ErrorState } from "@/components/feedback/states";
import { useSearchMessagesQuery } from "../api/chat.api";
import { formatListTime } from "../lib/display";
import { highlightParts } from "../lib/timeline";
import { type MessengerRoutes } from "../lib/routes";

/**
 * Server-side search (`GET /chat/search`): the backend only searches
 * conversations the caller may access, whole-word full-text, max 50 results.
 * No client-side filtering of loaded messages.
 */
export function MessageSearchResults({
  query,
  routes,
  titleFor,
}: {
  query: string;
  routes: MessengerRoutes;
  titleFor: (conversationId: string) => string;
}) {
  const t = useTranslations("Chat");
  const locale = useLocale();
  const search = useSearchMessagesQuery({ q: query, limit: 30 });

  if (search.isFetching && !search.data) {
    return (
      <div className="flex justify-center p-6" role="status" aria-label={t("searchResults")}>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground motion-reduce:animate-none" aria-hidden="true" />
      </div>
    );
  }
  if (search.isError) {
    return (
      <div className="p-4">
        <ErrorState
          title={t("searchError")}
          action={
            <Button variant="outline" onClick={() => void search.refetch()}>
              {t("retry")}
            </Button>
          }
        />
      </div>
    );
  }
  const items = search.data?.items ?? [];
  if (items.length === 0) {
    return (
      <div className="p-4">
        <EmptyState icon={SearchX} title={t("searchEmpty")} />
      </div>
    );
  }
  return (
    <section aria-label={t("searchResults")}>
      <ul className="space-y-0.5 p-2">
        {items.map((item) => (
          <li key={item.messageId}>
            <Link
              href={`${routes.thread(item.conversationId)}?m=${item.messageId}&seq=${item.sequence}`}
              className="block rounded-xl px-3 py-2.5 transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-sm font-medium text-foreground">{titleFor(item.conversationId)}</p>
                <time dateTime={item.createdAt} className="shrink-0 text-[11px] text-muted-foreground">
                  {formatListTime(item.createdAt, locale)}
                </time>
              </div>
              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                {highlightParts(item.snippet, query).map((part, index) =>
                  part.match ? (
                    <mark key={index} className="rounded bg-warning-soft px-0.5 text-warning-soft-foreground">
                      {part.text}
                    </mark>
                  ) : (
                    <React.Fragment key={index}>{part.text}</React.Fragment>
                  ),
                )}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
