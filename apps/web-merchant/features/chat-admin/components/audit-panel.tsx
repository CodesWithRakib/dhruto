"use client";

import React, { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ScrollText } from "lucide-react";
import { ChatAuditAction } from "@dhruto/contracts";
import { Button, Label } from "@dhruto/ui";
import { EmptyState, ErrorState, LoadingState, RetryButton } from "@/components/feedback/states";
import { useGetAuditLogsInfiniteQuery } from "../api/chat-admin.api";
import { formatDateTime } from "../lib/admin";

/**
 * Read-only audit history (append-only on the server; reading it is itself
 * audited). Shows actor, action, target, reason and safe metadata only.
 */
export function AuditPanel({ conversationId }: { conversationId?: string }) {
  const t = useTranslations("ChatAdmin");
  const locale = useLocale();
  const [action, setAction] = useState<ChatAuditAction | undefined>(undefined);
  const query = useGetAuditLogsInfiniteQuery({ conversationId, action });
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  const selectId = conversationId ? "ca-audit-action-conv" : "ca-audit-action";
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor={selectId}>{t("audit.action")}</Label>
          <select
            id={selectId}
            className="h-10 max-w-full rounded-md border border-input bg-background px-3 text-sm"
            value={action ?? ""}
            onChange={(event) =>
              setAction((event.target.value || undefined) as ChatAuditAction | undefined)
            }
          >
            <option value="">{t("inbox.any")}</option>
            {Object.values(ChatAuditAction).map((a) => (
              <option key={a} value={a}>
                {t(`auditAction.${a}`)}
              </option>
            ))}
          </select>
        </div>
      </div>
      {query.isLoading ? (
        <LoadingState title={t("loading")} />
      ) : query.isError ? (
        <ErrorState
          title={t("errors.loadFailed")}
          action={<RetryButton label={t("retry")} onRetry={() => void query.refetch()} />}
        />
      ) : items.length === 0 ? (
        <EmptyState icon={ScrollText} title={t("audit.empty")} />
      ) : (
        <ol
          className="divide-y divide-border/60 overflow-hidden rounded-xl bg-card"
          aria-label={t("audit.results")}
        >
          {items.map((item) => (
            <li key={item.id} className="space-y-0.5 px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{t(`auditAction.${item.action}`)}</span>
                <time className="text-xs text-muted-foreground" dateTime={item.createdAt}>
                  {formatDateTime(item.createdAt, locale)}
                </time>
              </div>
              <p className="text-xs text-muted-foreground">
                {[
                  item.actorRole ? t("audit.actor", { role: item.actorRole }) : t("audit.system"),
                  item.targetType ? `${item.targetType} ${item.targetId?.slice(0, 8) ?? ""}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {item.reason ? (
                <p className="text-xs">{t("audit.reason", { reason: item.reason })}</p>
              ) : null}
            </li>
          ))}
        </ol>
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
