"use client";

import React from "react";
import { useLocale, useTranslations } from "next-intl";
import { ErrorState, LoadingState, RetryButton } from "@/components/feedback/states";
import { cn } from "@/lib/cn";
import { useGetAdminMetricsQuery } from "../api/chat-admin.api";
import { formatDateTime } from "../lib/admin";

/** Metrics refresh while the tab is visible (no socket for staff aggregates). */
const METRICS_POLL_MS = 60_000;

function Metric({
  label,
  value,
  hint,
  tone = "neutral",
  onClick,
}: {
  label: string;
  value: number;
  hint?: string;
  tone?: "neutral" | "warning" | "danger";
  onClick?: () => void;
}) {
  const body = (
    <>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span
        className={cn(
          "text-2xl font-semibold tabular-nums",
          tone === "danger" && value > 0 && "text-danger",
          tone === "warning" && value > 0 && "text-warning-soft-foreground",
        )}
      >
        {value.toLocaleString()}
      </span>
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </>
  );
  const className = "flex flex-col gap-1 rounded-xl bg-card p-4 text-start";
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        className,
        "hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      {body}
    </button>
  ) : (
    <div className={className}>{body}</div>
  );
}

/**
 * Overview metrics, all from `GET /chat/admin/metrics` (live counts). Tiles
 * that map to a queue navigate to it.
 */
export function OverviewPanel({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const t = useTranslations("ChatAdmin");
  const locale = useLocale();
  const { data, isLoading, isError, refetch } = useGetAdminMetricsQuery(undefined, {
    pollingInterval: METRICS_POLL_MS,
    skipPollingIfUnfocused: true,
  });
  if (isLoading) return <LoadingState title={t("loading")} />;
  if (isError || !data) {
    return (
      <ErrorState
        title={t("errors.loadFailed")}
        action={<RetryButton label={t("retry")} onRetry={() => void refetch()} />}
      />
    );
  }
  const max = Math.max(1, ...data.conversationVolume.map((d) => d.count));
  return (
    <div className="space-y-5">
      <section aria-labelledby="ca-metrics" className="space-y-3">
        <h2 id="ca-metrics" className="sr-only">
          {t("overview.heading")}
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Metric
            label={t("overview.total")}
            value={data.conversations.total}
            hint={t("overview.active", { count: data.conversations.active })}
          />
          <Metric
            label={t("overview.needsAttention")}
            value={data.needsAttention}
            tone="warning"
            onClick={() => onNavigate("inbox")}
          />
          <Metric
            label={t("overview.escalations")}
            value={data.escalations.open + data.escalations.inReview + data.escalations.escalated}
            hint={t("overview.escalationBreakdown", {
              open: data.escalations.open,
              review: data.escalations.inReview,
              escalated: data.escalations.escalated,
            })}
            tone="danger"
            onClick={() => onNavigate("escalations")}
          />
          <Metric
            label={t("overview.reports")}
            value={data.reports.open + data.reports.underReview}
            hint={t("overview.reportBreakdown", {
              open: data.reports.open,
              review: data.reports.underReview,
            })}
            tone="warning"
            onClick={() => onNavigate("reports")}
          />
          <Metric label={t("overview.assignedToMe")} value={data.escalations.assignedToMe} />
          <Metric label={t("overview.myUnread")} value={data.myUnreadConversations} />
          <Metric label={t("overview.interventions")} value={data.interventionsLast7Days} />
          <Metric
            label={t("overview.attachments")}
            value={data.attachments.blocked}
            hint={t("overview.scanPending", { count: data.attachments.scanPending })}
            tone="danger"
            onClick={() => onNavigate("attachments")}
          />
        </div>
      </section>
      <section aria-labelledby="ca-volume" className="space-y-2 rounded-xl bg-card p-4">
        <h2 id="ca-volume" className="text-sm font-semibold">
          {t("overview.volume")}
        </h2>
        <ol className="flex h-32 items-end gap-1" aria-label={t("overview.volume")}>
          {data.conversationVolume.map((d) => (
            <li
              key={d.day}
              className="flex h-full flex-1 flex-col justify-end"
              title={`${d.day}: ${d.count}`}
            >
              <span className="sr-only">{`${d.day}: ${d.count}`}</span>
              <span
                aria-hidden="true"
                className="block w-full rounded-t bg-primary/70"
                style={{ height: `${Math.max(2, (d.count / max) * 100)}%` }}
              />
            </li>
          ))}
        </ol>
        <p className="text-xs text-muted-foreground">
          {t("overview.generatedAt", { time: formatDateTime(data.generatedAt, locale) })}
        </p>
      </section>
    </div>
  );
}
