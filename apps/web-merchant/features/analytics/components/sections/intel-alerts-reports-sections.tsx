"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Badge, Button, Card, GroupedBarChart } from "@dhruto/ui";
import type {
  NotificationAnalyticsResponse,
  WebhookAnalyticsResponse,
  AnalyticsAlert,
  ReportExport,
} from "@dhruto/contracts";
import { MetricCard } from "../metric-card";
import { SectionState, SimpleTable, flatKpi } from "./section-helpers";
import { useRequestReportMutation } from "../../api/analytics.api";
import { getApiErrorMessage } from "@/lib/api-error";
import { useFormatters } from "@/lib/format";

export function NotificationsSection({
  isLoading,
  isError,
  notif,
  webhooks,
  onRetry,
}: {
  isLoading: boolean;
  isError: boolean;
  notif?: NotificationAnalyticsResponse;
  webhooks?: WebhookAnalyticsResponse;
  onRetry: () => void;
}) {
  const t = useTranslations("AnalyticsSections");

  return (
    <SectionState
      loading={isLoading}
      error={isError}
      empty={!notif}
      onRetry={onRetry}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-3xl bg-surface-elevated p-6 space-y-4">
          <GroupedBarChart
            title={t("notifByChannel")}
            data={(notif?.byChannel ?? []).map((c: { channel: string; sent: number }) => ({
              label: c.channel,
              value: c.sent,
            }))}
            tone="info"
          />
          <SimpleTable
            head={["channel", "sent", "failed", "rate%"]}
            rows={(notif?.byChannel ?? []).map(
              (c: { channel: string; sent: number; failed: number; deliveryRate: number | null }) => [
                c.channel,
                c.sent,
                c.failed,
                c.deliveryRate,
              ],
            )}
          />
        </Card>
        <Card className="space-y-4 rounded-3xl bg-surface-elevated p-6">
          <h3 className="text-sm font-semibold">{t("webhookTitle")}</h3>
          <SimpleTable
            head={["metric", "value"]}
            rows={[
              ["total", webhooks?.total ?? null],
              ["delivered", webhooks?.delivered ?? null],
              ["4xx", webhooks?.failed4xx ?? null],
              ["5xx", webhooks?.failed5xx ?? null],
              ["dead-letter", webhooks?.deadLetter ?? null],
              ["success%", webhooks?.successRate ?? null],
            ]}
          />
          <p className="text-[11px] text-muted-foreground">
            {t("notifMeta", {
              retries: notif?.retries ?? 0,
              dlq: notif?.deadLetter ?? 0,
              failure: notif?.failureRate ?? "—",
            })}
          </p>
        </Card>
      </div>
    </SectionState>
  );
}

export function IntelSection({
  isLoading,
  isError,
  address,
  rto,
  byModelVersion,
  onRetry,
}: {
  isLoading: boolean;
  isError: boolean;
  address?: { parses: number; lowConfidence: number };
  rto?: { predictions: number; precision: number | null; insufficientData: boolean };
  byModelVersion: Array<{
    modelVersion: string;
    predictions: number;
    outcomes: number;
    precision: number | null;
  }>;
  onRetry: () => void;
}) {
  const t = useTranslations("AnalyticsSections");

  return (
    <SectionState
      loading={isLoading}
      error={isError}
      empty={!address || !rto}
      onRetry={onRetry}
    >
      <div className="space-y-4">
        {address && rto ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label={t("parses")} kpi={flatKpi(address.parses)} />
              <MetricCard label={t("lowConfidence")} kpi={flatKpi(address.lowConfidence)} invertTrend />
              <MetricCard label={t("predictions")} kpi={flatKpi(rto.predictions)} />
              <MetricCard
                label={t("precision")}
                kpi={rto.precision !== null ? flatKpi(rto.precision) : null}
                format={(v) => `${v}%`}
                hint={rto.insufficientData ? t("insufficientData") : undefined}
              />
            </div>
            <div className="rounded-3xl bg-surface-elevated p-6 space-y-3">
              <SimpleTable
                head={["model", "predictions", "outcomes", "precision%"]}
                rows={byModelVersion.map((m) => [m.modelVersion, m.predictions, m.outcomes, m.precision])}
              />
              {rto.insufficientData && (
                <p className="text-[11px] text-muted-foreground">{t("insufficientDataHint")}</p>
              )}
            </div>
          </>
        ) : null}
      </div>
    </SectionState>
  );
}

export function AlertsSection({
  isLoading,
  isError,
  alertItems,
  onAck,
  onRetry,
}: {
  isLoading: boolean;
  isError: boolean;
  alertItems: AnalyticsAlert[];
  onAck: (id: string) => void;
  onRetry: () => void;
}) {
  const t = useTranslations("AnalyticsSections");
  const { dateTime } = useFormatters();

  return (
    <SectionState
      loading={isLoading}
      error={isError}
      empty={alertItems.length === 0}
      onRetry={onRetry}
    >
      <div className="space-y-2">
        {alertItems.map((a) => (
          <div
            key={a.id}
            className="flex flex-wrap items-center gap-2 rounded-2xl bg-surface-elevated p-4 text-xs"
          >
            <Badge variant={a.severity === "CRITICAL" ? "destructive" : "secondary"}>
              {a.severity}
            </Badge>
            <span className="font-mono font-bold text-foreground">{a.alertKey}</span>
            <Badge variant="outline">{a.status}</Badge>
            <span className="text-muted-foreground">
              {a.metricValue} vs {a.threshold}
            </span>
            <span className="ml-auto flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground font-mono">
                {dateTime(a.triggeredAt)}
              </span>
              {a.status === "OPEN" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px] font-bold"
                  onClick={() => onAck(a.id)}
                >
                  {t("ack")}
                </Button>
              )}
            </span>
          </div>
        ))}
      </div>
    </SectionState>
  );
}

export function ReportsSection({
  isLoading,
  isError,
  reportItems,
  preset,
  from,
  to,
  onRetry,
}: {
  isLoading: boolean;
  isError: boolean;
  reportItems: ReportExport[];
  preset?: string;
  from?: string;
  to?: string;
  onRetry: () => void;
}) {
  const [reportError, setReportError] = React.useState<string | null>(null);
  const { dateTime } = useFormatters();

  return (
    <SectionState
      loading={isLoading}
      error={isError}
      empty={false}
      onRetry={onRetry}
    >
      <div className="rounded-3xl bg-surface-elevated p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {(["parcels", "rto", "cod", "riders", "hubs", "finance"] as const).map((d) => (
            <ReportRequestButton
              key={d}
              dataset={d}
              preset={preset}
              from={from}
              to={to}
              onError={setReportError}
            />
          ))}
        </div>
        {reportError && (
          <p role="alert" className="text-xs text-danger">
            {reportError}
          </p>
        )}
        <SimpleTable
          head={["dataset", "format", "status", "rows", "expires", "created"]}
          rows={reportItems.map((r) => [
            r.dataset,
            r.format,
            r.status,
            r.rowCount,
            r.expiresAt ? dateTime(r.expiresAt) : null,
            dateTime(r.createdAt),
          ])}
        />
      </div>
    </SectionState>
  );
}

function ReportRequestButton({
  dataset,
  preset,
  from,
  to,
  onError,
}: {
  dataset: "parcels" | "rto" | "cod" | "riders" | "hubs" | "finance";
  preset?: string;
  from?: string;
  to?: string;
  onError: (m: string | null) => void;
}) {
  const t = useTranslations("AnalyticsSections");
  const [request, { isLoading }] = useRequestReportMutation();
  const [format, setFormat] = React.useState<"csv" | "xlsx">("csv");

  return (
    <span className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-surface px-2.5 py-1.5 text-xs font-semibold">
      <span className="font-medium capitalize">{dataset}</span>
      <button
        type="button"
        onClick={() => setFormat(format === "csv" ? "xlsx" : "csv")}
        className="font-mono text-[10px] uppercase text-muted-foreground hover:text-foreground"
        aria-label={`${dataset} format`}
      >
        {format}
      </button>
      <Button
        size="sm"
        variant="outline"
        className="h-6 px-2 text-[11px] font-bold"
        disabled={isLoading}
        onClick={async () => {
          onError(null);
          try {
            await request({ dataset, format, preset, from, to }).unwrap();
          } catch (err) {
            onError(getApiErrorMessage(err, t("exportFailed")));
          }
        }}
      >
        {t("requestExport")}
      </Button>
    </span>
  );
}
