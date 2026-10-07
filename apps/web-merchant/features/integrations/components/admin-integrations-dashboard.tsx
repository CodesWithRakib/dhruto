"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Inbox,
  Loader2,
  RefreshCw,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { Button, Badge, Card, DataTable } from "@dhruto/ui";
import {
  useGetIntegrationOverviewQuery,
  useListIntegrationFailuresQuery,
  useReplayIntegrationFailureMutation,
  useResolveIntegrationFailureMutation,
  useGetOutboxOverviewQuery,
  useReplayOutboxEventMutation,
} from "../api/integrations.api";
import { IntegrationFailureStatus, type IntegrationFailureItem } from "@dhruto/contracts";
import { getApiErrorMessage } from "@/lib/api-error";
import { PageHeader } from "@/components/page-header";
import { useFormatters } from "@/lib/format";

/** Admin-only operational view: queues, providers, dead-letter + outbox replay. */
export function AdminIntegrationsDashboard() {
  const t = useTranslations("AdminIntegrations");
  const { dateTime } = useFormatters();
  const [failurePage, setFailurePage] = React.useState(1);
  const [feedback, setFeedback] = React.useState<string | null>(null);

  const overview = useGetIntegrationOverviewQuery(undefined, {
    pollingInterval: 15000,
    skipPollingIfUnfocused: true,
  });
  const failures = useListIntegrationFailuresQuery({ page: failurePage, limit: 20 });
  const outbox = useGetOutboxOverviewQuery(undefined, {
    pollingInterval: 15000,
    skipPollingIfUnfocused: true,
  });

  const [replay, { isLoading: isReplaying }] = useReplayIntegrationFailureMutation();
  const [resolve, { isLoading: isResolving }] = useResolveIntegrationFailureMutation();
  const [replayOutbox, { isLoading: isReplayingOutbox }] = useReplayOutboxEventMutation();

  const data = overview.data?.data;
  const failureItems = failures.data?.data?.items ?? [];
  const failureTotal = failures.data?.data?.total ?? 0;
  const failurePages = Math.max(1, Math.ceil(failureTotal / 20));
  const outboxData = outbox.data?.data;

  const handleReplay = async (id: string) => {
    setFeedback(null);
    try {
      await replay(id).unwrap();
      failures.refetch();
      overview.refetch();
    } catch (err) {
      setFeedback(getApiErrorMessage(err, t("replayFailed")));
    }
  };

  const handleResolve = async (id: string) => {
    setFeedback(null);
    try {
      await resolve(id).unwrap();
      failures.refetch();
      overview.refetch();
    } catch (err) {
      setFeedback(getApiErrorMessage(err, t("resolveFailed")));
    }
  };

  const handleOutboxReplay = async (id: string) => {
    setFeedback(null);
    try {
      await replayOutbox(id).unwrap();
      outbox.refetch();
      overview.refetch();
    } catch (err) {
      setFeedback(getApiErrorMessage(err, t("replayFailed")));
    }
  };

  const failureRows: IntegrationFailureItem[] = failureItems;

  return (
    <div className="w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              overview.refetch();
              failures.refetch();
              outbox.refetch();
            }}
            className="h-10 gap-2 text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            {t("refresh")}
          </Button>
        }
      />

      {feedback && (
        <div
          role="alert"
          className="rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger-soft-foreground"
        >
          {feedback}
        </div>
      )}

      {overview.isLoading ? (
        <Card className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
          {t("loading")}
        </Card>
      ) : overview.isError || !data ? (
        <Card className="space-y-3 p-6 text-center">
          <XCircle className="mx-auto h-8 w-8 text-danger" aria-hidden="true" />
          <p className="text-sm font-medium">{t("loadErrorTitle")}</p>
          <p className="text-xs text-muted-foreground">{t("loadErrorDescription")}</p>
          <Button variant="outline" size="sm" onClick={() => overview.refetch()}>
            {t("retry")}
          </Button>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Inbox className="h-4 w-4" aria-hidden="true" />
                {t("deadLetter")}
              </div>
              <p className="mt-1 text-2xl font-bold">{data.deadLetterCount}</p>
              <p className="text-[11px] text-muted-foreground">{t("deadLetterHint")}</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                {t("webhookFailureRate")}
              </div>
              <p className="mt-1 text-2xl font-bold">
                {(data.webhookFailureRate24h * 100).toFixed(1)}%
              </p>
              <p className="text-[11px] text-muted-foreground">{t("last24h")}</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Activity className="h-4 w-4" aria-hidden="true" />
                {t("outboxPending")}
              </div>
              <p className="mt-1 text-2xl font-bold">{data.outbox.pending}</p>
              <p className="text-[11px] text-muted-foreground">
                {t("outboxFailed", { count: data.outbox.failed })}
              </p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                {t("providers")}
              </div>
              <div className="mt-2 flex gap-2">
                <Badge variant={data.providers.sms.configured ? "default" : "secondary"}>
                  SMS: {data.providers.sms.mode}
                </Badge>
                <Badge variant={data.providers.email.configured ? "default" : "secondary"}>
                  Email: {data.providers.email.mode}
                </Badge>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">{t("providersHint")}</p>
            </Card>
          </div>

          <Card className="p-4">
            <h3 className="mb-3 text-sm font-semibold">{t("queuesTitle")}</h3>
            {data.queues.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t("queuesEmpty")}</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {data.queues.map((q) => (
                  <div key={q.name} className="rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{q.name}</span>
                      <Badge variant={q.reachable ? "default" : "secondary"}>
                        {q.reachable ? t("reachable") : t("unreachable")}
                      </Badge>
                    </div>
                    <dl className="mt-2 grid grid-cols-5 gap-1 text-center text-[11px]">
                      {(
                        [
                          ["waiting", q.waiting],
                          ["active", q.active],
                          ["completed", q.completed],
                          ["failed", q.failed],
                          ["delayed", q.delayed],
                        ] as const
                      ).map(([k, v]) => (
                        <div key={k}>
                          <dt className="text-muted-foreground">{t(`queue_${k}`)}</dt>
                          <dd className="text-sm font-semibold">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">
            {t("dlqTitle")} ({failureTotal})
          </h3>
          <span className="text-[11px] text-muted-foreground">{t("dlqHint")}</span>
        </div>
        {failures.isLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
            {t("loading")}
          </div>
        ) : failureRows.length === 0 ? (
          <div className="py-10 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-success opacity-60" aria-hidden="true" />
            <p className="mt-2 text-sm font-medium">{t("dlqEmpty")}</p>
            <p className="text-xs text-muted-foreground">{t("dlqEmptyHint")}</p>
          </div>
        ) : (
          <>
            <DataTable
              data={failureRows}
              columns={[
                {
                  accessorKey: "queue",
                  header: t("colQueue"),
                },
                {
                  accessorKey: "kind",
                  header: t("colKind"),
                },
                {
                  accessorKey: "reason",
                  header: t("colReason"),
                  cell: ({ row }: { row: { original: IntegrationFailureItem } }) => (
                    <span className="block max-w-[320px] truncate" title={row.original.reason}>
                      {row.original.reason}
                    </span>
                  ),
                },
                {
                  accessorKey: "attempts",
                  header: t("colAttempts"),
                },
                {
                  accessorKey: "status",
                  header: t("colStatus"),
                },
                {
                  accessorKey: "lastAttemptAt",
                  header: t("colLastAttempt"),
                  cell: ({ row }: { row: { original: IntegrationFailureItem } }) => (
                    <span>
                      {row.original.lastAttemptAt ? dateTime(row.original.lastAttemptAt) : "—"}
                    </span>
                  ),
                },
              ]}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {failureItems
                .filter((f) => f.status === IntegrationFailureStatus.OPEN)
                .slice(0, 5)
                .map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px]"
                  >
                    <span className="max-w-[180px] truncate font-mono">{f.jobId ?? f.id}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-[11px]"
                      disabled={isReplaying}
                      onClick={() => handleReplay(f.id)}
                    >
                      <RotateCcw className="mr-1 h-3 w-3" aria-hidden="true" />
                      {t("replay")}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-[11px]"
                      disabled={isResolving}
                      onClick={() => handleResolve(f.id)}
                    >
                      {t("resolve")}
                    </Button>
                  </div>
                ))}
            </div>
            {failurePages > 1 && (
              <div className="mt-3 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={failurePage <= 1}
                  onClick={() => setFailurePage((p) => Math.max(1, p - 1))}
                >
                  {t("previous")}
                </Button>
                <span className="text-xs text-muted-foreground">
                  {t("pageOf", { page: failurePage, totalPages: failurePages })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={failurePage >= failurePages}
                  onClick={() => setFailurePage((p) => Math.min(failurePages, p + 1))}
                >
                  {t("next")}
                </Button>
              </div>
            )}
          </>
        )}
      </Card>

      <Card className="p-4">
        <h3 className="mb-1 text-sm font-semibold">{t("outboxTitle")}</h3>
        <p className="mb-3 text-[11px] text-muted-foreground">{t("outboxHint")}</p>
        {outbox.isLoading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
            {t("loading")}
          </div>
        ) : !outboxData || outboxData.failed.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">{t("outboxEmpty")}</p>
        ) : (
          <div className="space-y-2">
            {outboxData.failed.map((row) => (
              <div
                key={row.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-2.5 text-xs"
              >
                <Badge variant="secondary">{row.eventType}</Badge>
                <span className="font-mono text-[11px] text-muted-foreground">{row.eventId}</span>
                <span className="text-muted-foreground">
                  {t("attempts", { count: row.attemptCount })}
                </span>
                {row.lastError && (
                  <span className="max-w-full truncate text-danger">{row.lastError}</span>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-auto h-7 text-[11px]"
                  disabled={isReplayingOutbox}
                  onClick={() => handleOutboxReplay(row.id)}
                >
                  <RotateCcw className="mr-1 h-3 w-3" aria-hidden="true" />
                  {t("replay")}
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
