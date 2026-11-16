"use client";

import React, { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Flag, Inbox, Search } from "lucide-react";
import {
  ChatConversationStatus,
  ChatConversationType,
  type ChatEscalationStatus,
  type ChatInboxItem,
  type ChatStaffProfile,
} from "@dhruto/contracts";
import { Button, Input, Label } from "@dhruto/ui";
import { EmptyState, ErrorState, LoadingState, RetryButton } from "@/components/feedback/states";
import { ToneBadge } from "@/components/data-display/tone-badge";
import { ADMIN_ROUTES } from "@/config/routes";
import { Link } from "@/lib/navigation";
import { useGetInboxInfiniteQuery, type InboxArgs } from "../api/chat-admin.api";
import { ESCALATION_TONE, formatDateTime } from "../lib/admin";

const SELECT_CLASS =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * Operational inbox (server-side filters, exact identifier search, keyset
 * "load more"). Rows are metadata; previews/unread appear only where the
 * admin already participates (backend rule). Also used as the escalation
 * queue with `preset.escalation`.
 */
export function InboxPanel({
  profile,
  preset,
  escalationStatuses,
}: {
  profile: ChatStaffProfile;
  preset?: Pick<InboxArgs, "escalation">;
  escalationStatuses?: readonly ChatEscalationStatus[];
}) {
  const t = useTranslations("ChatAdmin");
  const tc = useTranslations("Chat");
  const [filters, setFilters] = useState<InboxArgs>({ ...preset });
  const [search, setSearch] = useState("");
  const query = useGetInboxInfiniteQuery(filters);
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  const set = (patch: Partial<InboxArgs>) => setFilters((current) => ({ ...current, ...patch }));
  const idBase = preset ? "esc" : "inbox";

  return (
    <div className="space-y-4">
      <form
        role="search"
        aria-label={t("inbox.filters")}
        className="grid grid-cols-1 gap-3 rounded-xl bg-card p-4 sm:grid-cols-2 lg:grid-cols-6"
        onSubmit={(event) => {
          event.preventDefault();
          set({ q: search.trim() || undefined });
        }}
      >
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor={`${idBase}-q`}>{t("inbox.search")}</Label>
          <div className="flex gap-2">
            <Input
              id={`${idBase}-q`}
              value={search}
              maxLength={64}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("inbox.searchPlaceholder")}
            />
            <Button type="submit" variant="secondary" aria-label={t("inbox.searchSubmit")}>
              <Search className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${idBase}-type`}>{t("inbox.type")}</Label>
          <select
            id={`${idBase}-type`}
            className={SELECT_CLASS}
            value={filters.type ?? ""}
            onChange={(event) =>
              set({ type: (event.target.value || undefined) as ChatConversationType | undefined })
            }
          >
            <option value="">{t("inbox.any")}</option>
            {Object.values(ChatConversationType).map((type) => (
              <option key={type} value={type}>
                {tc(`types.${type}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${idBase}-status`}>{t("inbox.status")}</Label>
          <select
            id={`${idBase}-status`}
            className={SELECT_CLASS}
            value={filters.status ?? ""}
            onChange={(event) =>
              set({
                status: (event.target.value || undefined) as ChatConversationStatus | undefined,
              })
            }
          >
            <option value="">{t("inbox.any")}</option>
            {Object.values(ChatConversationStatus).map((status) => (
              <option key={status} value={status}>
                {t(`conversationStatus.${status}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${idBase}-esc`}>{t("inbox.escalation")}</Label>
          <select
            id={`${idBase}-esc`}
            className={SELECT_CLASS}
            value={filters.escalation ?? ""}
            onChange={(event) =>
              set({ escalation: (event.target.value || undefined) as InboxArgs["escalation"] })
            }
          >
            {!preset && <option value="">{t("inbox.any")}</option>}
            <option value="ACTIVE">{t("inbox.escalationActive")}</option>
            {!preset && <option value="NONE">{t("inbox.escalationNone")}</option>}
            {(escalationStatuses ?? []).map((status) => (
              <option key={status} value={status}>
                {t(`escalationStatus.${status}`)}
              </option>
            ))}
          </select>
        </div>
        <fieldset className="flex flex-col justify-end gap-1.5 text-sm">
          <legend className="sr-only">{t("inbox.flags")}</legend>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={filters.hasOpenReports === true}
              onChange={(event) => set({ hasOpenReports: event.target.checked || undefined })}
            />
            {t("inbox.hasOpenReports")}
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={filters.assignedToMe === true}
              onChange={(event) => set({ assignedToMe: event.target.checked || undefined })}
            />
            {t("inbox.assignedToMe")}
          </label>
        </fieldset>
      </form>

      {query.isLoading ? (
        <LoadingState title={t("loading")} />
      ) : query.isError ? (
        <ErrorState
          title={t("errors.loadFailed")}
          action={<RetryButton label={t("retry")} onRetry={() => void query.refetch()} />}
        />
      ) : items.length === 0 ? (
        <EmptyState icon={Inbox} title={t("inbox.empty")} description={t("inbox.emptyHint")} />
      ) : (
        <ul
          className="divide-y divide-border/60 overflow-hidden rounded-xl bg-card"
          aria-label={t("inbox.results")}
        >
          {items.map((item) => (
            <InboxRow key={item.id} item={item} meId={profile.userId} />
          ))}
        </ul>
      )}
      {query.hasNextPage && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => void query.fetchNextPage()}
            disabled={query.isFetchingNextPage}
          >
            {t("loadMore")}
          </Button>
        </div>
      )}
    </div>
  );
}

function InboxRow({ item, meId }: { item: ChatInboxItem; meId: string }) {
  const t = useTranslations("ChatAdmin");
  const tc = useTranslations("Chat");
  const locale = useLocale();
  const title =
    item.title ??
    (item.parcel
      ? tc("parcelTitle", { code: item.parcel.trackingCode })
      : tc(`types.${item.type}`));
  return (
    <li>
      <Link
        href={ADMIN_ROUTES.communicationThread(item.id)}
        className="flex flex-col gap-1.5 px-4 py-3 hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:outline-none sm:flex-row sm:items-center sm:gap-4"
      >
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-medium text-foreground">{title}</span>
            {item.unreadCount ? (
              <span className="rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
                {item.unreadCount}
              </span>
            ) : null}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {[tc(`types.${item.type}`), item.merchantName, item.hubName]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {item.lastMessagePreview ? (
            <p className="truncate text-sm text-muted-foreground">{item.lastMessagePreview}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <ToneBadge tone={item.status === "ACTIVE" ? "success" : "neutral"}>
            {t(`conversationStatus.${item.status}`)}
          </ToneBadge>
          {item.escalation ? (
            <ToneBadge tone={ESCALATION_TONE[item.escalation.status]}>
              {t(`escalationStatus.${item.escalation.status}`)}
              {item.escalation.assigneeUserId === meId ? ` · ${t("inbox.mine")}` : ""}
            </ToneBadge>
          ) : null}
          {item.openReportCount > 0 ? (
            <ToneBadge tone="warning">
              <Flag className="h-3 w-3" aria-hidden="true" />
              {t("inbox.reportCount", { count: item.openReportCount })}
            </ToneBadge>
          ) : null}
          <time className="text-xs text-muted-foreground" dateTime={item.lastActivityAt}>
            {formatDateTime(item.lastActivityAt, locale)}
          </time>
        </div>
      </Link>
    </li>
  );
}
