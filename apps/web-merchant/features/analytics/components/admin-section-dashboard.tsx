"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/lib/navigation";
import { Loader2 } from "lucide-react";
import { Button, Card, Badge, TrendLineChart, GroupedBarChart, DataTable, ColumnDef } from "@dhruto/ui";
import {
  useGetParcelAnalyticsQuery,
  useGetDeliveryAnalyticsQuery,
  useGetHubAnalyticsQuery,
  useGetRiderAnalyticsQuery,
  useGetMerchantComparisonQuery,
  useGetRtoAnalyticsV2Query,
  useGetCodAnalyticsV2Query,
  useGetFinanceAnalyticsQuery,
  useGetNotificationAnalyticsQuery,
  useGetWebhookAnalyticsQuery,
  useGetIntelligenceAnalyticsQuery,
  useListAlertsQuery,
  useAcknowledgeAlertMutation,
  useListReportsQuery,
  useRequestReportMutation,
} from "../api/analytics.api";
import { MetricCard } from "./metric-card";
import {
  FilterBar,
  filterFromSearch,
  filterToSearch,
  filterToApiParams,
  type FilterState,
} from "./filter-bar";
import { ExportButton } from "./export-button";
import { PageHeader } from "@/components/page-header";
import { getApiErrorMessage } from "@/lib/api-error";
import type { ExportDataset } from "@dhruto/contracts";
import { useFormatters } from "@/lib/format";

export type AnalyticsSection =
  | "parcels"
  | "delivery"
  | "hubs"
  | "riders"
  | "merchants"
  | "rto"
  | "cod"
  | "finance"
  | "notifications"
  | "intelligence"
  | "alerts"
  | "reports";

const SECTION_DATASET: Partial<Record<AnalyticsSection, ExportDataset>> = {
  parcels: "parcels",
  riders: "riders",
  hubs: "hubs",
  rto: "rto",
  cod: "cod",
  finance: "finance",
};

function State({
  loading,
  error,
  empty,
  onRetry,
  children,
}: {
  loading: boolean;
  error: boolean;
  empty: boolean;
  onRetry: () => void;
  children: React.ReactNode;
}) {
  if (loading) {
    return (
      <Card className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
        Loading…
      </Card>
    );
  }
  if (error) {
    return (
      <Card className="space-y-2 p-6 text-center">
        <p className="text-sm font-medium">Could not load this section</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      </Card>
    );
  }
  if (empty) {
    return (
      <Card className="p-10 text-center text-sm text-muted-foreground">
        No data for selected period
      </Card>
    );
  }
  return <>{children}</>;
}

function SimpleTable({
  head,
  rows,
}: {
  head: string[];
  rows: Array<Array<string | number | null>>;
}) {
  const columns: ColumnDef<Array<string | number | null>>[] = React.useMemo(() => {
    return head.map((h, j) => ({
      accessorKey: String(j),
      id: String(j),
      header: h,
      cell: ({ row }) => {
        const c = row.original[j];
        return (
          <span className={j > 0 ? "font-mono" : ""}>
            {c === null ? "—" : typeof c === "number" ? c.toLocaleString() : String(c)}
          </span>
        );
      },
    }));
  }, [head]);

  return (
    <DataTable
      columns={columns}
      data={rows}
      className="p-0 border-0 shadow-none"
    />
  );
}

function flatKpi(value: number | null): {
  value: number | null;
  previous: null;
  changePct: null;
  trend: "flat";
  noData: boolean;
} {
  return { value, previous: null, changePct: null, trend: "flat", noData: value === null };
}

/** Section dashboard: one component, per-section queries, shared chrome. */
export function AdminSectionDashboard({ section }: { section: AnalyticsSection }) {
  const t = useTranslations("AnalyticsSections");
  const { dateTime } = useFormatters();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [filter, setFilter] = React.useState<FilterState>(() => filterFromSearch(searchParams));
  const apiParams = React.useMemo(() => filterToApiParams(filter), [filter]);
  const applyFilter = (next: FilterState) => {
    setFilter(next);
    router.replace(`?${filterToSearch(next)}` as never);
  };

  const parcelsQ = useGetParcelAnalyticsQuery(apiParams, { skip: section !== "parcels" });
  const deliveryQ = useGetDeliveryAnalyticsQuery(apiParams, { skip: section !== "delivery" });
  const hubsQ = useGetHubAnalyticsQuery(apiParams, { skip: section !== "hubs" });
  const ridersQ = useGetRiderAnalyticsQuery(apiParams, { skip: section !== "riders" });
  const merchantsQ = useGetMerchantComparisonQuery(apiParams, { skip: section !== "merchants" });
  const rtoQ = useGetRtoAnalyticsV2Query(apiParams, { skip: section !== "rto" });
  const codQ = useGetCodAnalyticsV2Query(apiParams, { skip: section !== "cod" });
  const financeQ = useGetFinanceAnalyticsQuery(apiParams, { skip: section !== "finance" });
  const notificationsQ = useGetNotificationAnalyticsQuery(apiParams, {
    skip: section !== "notifications",
  });
  const webhooksQ = useGetWebhookAnalyticsQuery(apiParams, { skip: section !== "notifications" });
  const intelQ = useGetIntelligenceAnalyticsQuery(apiParams, { skip: section !== "intelligence" });
  const alertsQ = useListAlertsQuery(undefined, { skip: section !== "alerts" });
  const reportsQ = useListReportsQuery(undefined, { skip: section !== "reports" });
  const [ack] = useAcknowledgeAlertMutation();
  const [reportError, setReportError] = React.useState<string | null>(null);

  const parcels = parcelsQ.data?.data;
  const delivery = deliveryQ.data?.data;
  const hubs = hubsQ.data?.data?.hubs ?? [];
  const riders = ridersQ.data?.data;
  const merchants = merchantsQ.data?.data?.merchants ?? [];
  const rto = rtoQ.data?.data;
  const cod = codQ.data?.data;
  const finance = financeQ.data?.data;
  const notif = notificationsQ.data?.data;
  const webhooks = webhooksQ.data?.data;
  const intelAddr = intelQ.data?.data?.address;
  const intelRto = intelQ.data?.data?.rto;
  const intelVersions = intelQ.data?.data?.byModelVersion ?? [];
  const alertItems = alertsQ.data?.data ?? [];
  const reportItems = reportsQ.data?.data ?? [];

  const dataset = SECTION_DATASET[section];

  return (
    <div className="w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title={t(`section_${section}_title`)}
        description={t(`section_${section}_desc`)}
        actions={
          dataset ? (
            <ExportButton
              dataset={dataset}
              preset={filter.preset}
              from={apiParams.from}
              to={apiParams.to}
            />
          ) : undefined
        }
      />
      <FilterBar value={filter} onChange={applyFilter} />

      {section === "parcels" && (
        <State
          loading={parcelsQ.isLoading}
          error={parcelsQ.isError}
          empty={!parcels}
          onRetry={() => parcelsQ.refetch()}
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-4">
              <GroupedBarChart
                title={t("funnelTitle")}
                data={(parcels?.funnel ?? []).map((s) => ({ label: s.stage, value: s.count }))}
                tone="info"
              />
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {(parcels?.funnel ?? []).map((s) => (
                  <li key={s.stage} className="flex justify-between">
                    <span>{s.stage}</span>
                    <span className="font-mono">
                      {s.count.toLocaleString()}
                      {s.conversionPct !== null ? ` · ${s.conversionPct}%` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="space-y-2 p-4">
              <h3 className="text-sm font-semibold">{t("latencyTitle")}</h3>
              <SimpleTable
                head={["metric", "hours"]}
                rows={[
                  ["n", parcels?.latency.count ?? null],
                  ["avg", parcels?.latency.avgHours ?? null],
                  ["p50", parcels?.latency.p50 ?? null],
                  ["p75", parcels?.latency.p75 ?? null],
                  ["p90", parcels?.latency.p90 ?? null],
                  ["p95", parcels?.latency.p95 ?? null],
                  ["p99", parcels?.latency.p99 ?? null],
                ]}
              />
            </Card>
          </div>
        </State>
      )}

      {section === "delivery" && (
        <State
          loading={deliveryQ.isLoading}
          error={deliveryQ.isError}
          empty={!delivery}
          onRetry={() => deliveryQ.refetch()}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label={t("firstAttempt")}
              kpi={flatKpi(delivery?.firstAttemptSuccess ?? null)}
              format={(v) => `${v}%`}
            />
            <MetricCard
              label={t("p50")}
              kpi={flatKpi(delivery?.latency.p50 ?? null)}
              format={(v) => `${v}h`}
              invertTrend
            />
            <MetricCard
              label={t("p95")}
              kpi={flatKpi(delivery?.latency.p95 ?? null)}
              format={(v) => `${v}h`}
              invertTrend
            />
            <MetricCard
              label={t("p99")}
              kpi={flatKpi(delivery?.latency.p99 ?? null)}
              format={(v) => `${v}h`}
              invertTrend
            />
          </div>
        </State>
      )}

      {section === "hubs" && (
        <State
          loading={hubsQ.isLoading}
          error={hubsQ.isError}
          empty={hubs.length === 0}
          onRetry={() => hubsQ.refetch()}
        >
          <SimpleTable
            head={["hub", "code", "incoming", "dispatched", "pending", "per-day", "oldest(h)"]}
            rows={hubs.map((h) => [
              h.hubName,
              h.code,
              h.incoming,
              h.dispatched,
              h.pending,
              h.throughputPerDay,
              h.oldestPendingHours,
            ])}
          />
          {hubs.map((h) => (
            <Card key={h.hubId} className="mt-3 p-4">
              <h4 className="mb-2 text-sm font-semibold">
                {h.hubName} · {t("backlogTitle")}
              </h4>
              <GroupedBarChart
                data={h.backlog.map((b) => ({ label: b.bucket, value: b.count }))}
                tone="warning"
              />
            </Card>
          ))}
        </State>
      )}

      {section === "riders" && (
        <State
          loading={ridersQ.isLoading}
          error={ridersQ.isError}
          empty={(riders?.riders.length ?? 0) === 0}
          onRetry={() => ridersQ.refetch()}
        >
          <p className="text-[11px] text-muted-foreground">{riders?.limitations}</p>
          <SimpleTable
            head={[
              "rider",
              "hub",
              "assigned",
              "delivered",
              "failed",
              "success%",
              "first%",
              "avg(h)",
              "cod",
            ]}
            rows={(riders?.riders ?? []).map((r) => [
              r.name,
              r.hubName,
              r.assigned,
              r.delivered,
              r.failed,
              r.successRate,
              r.firstAttemptSuccess,
              r.avgCompletionHours,
              r.codCollected,
            ])}
          />
        </State>
      )}

      {section === "merchants" && (
        <State
          loading={merchantsQ.isLoading}
          error={merchantsQ.isError}
          empty={merchants.length === 0}
          onRetry={() => merchantsQ.refetch()}
        >
          <SimpleTable
            head={["merchant", "parcels", "delivered", "success%", "rto%", "cod", "avg(h)"]}
            rows={merchants.map((m) => [
              m.merchantName,
              m.parcels,
              m.delivered,
              m.successRate,
              m.rtoRate,
              m.codVolume,
              m.avgDeliveryHours,
            ])}
          />
        </State>
      )}

      {section === "rto" && (
        <State
          loading={rtoQ.isLoading}
          error={rtoQ.isError}
          empty={!rto}
          onRetry={() => rtoQ.refetch()}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <MetricCard label={t("rtoCount")} kpi={flatKpi(rto?.rtoCount ?? null)} />
            <MetricCard
              label={t("rtoRate")}
              kpi={rto?.rtoRate ?? null}
              format={(v) => `${v}%`}
              invertTrend
            />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-4">
              <GroupedBarChart
                title={t("rtoReasons")}
                data={(rto?.byReason ?? []).map((r) => ({ label: r.reason, value: r.count }))}
                tone="danger"
              />
            </Card>
            <Card className="p-4">
              <TrendLineChart
                title={t("rtoOverTime")}
                data={(rto?.overTime ?? []).map((p) => ({ label: p.bucket, value: p.count }))}
              />
            </Card>
          </div>
          <SimpleTable
            head={["district", "rto", "rate%"]}
            rows={(rto?.byDistrict ?? []).map((d) => [d.district, d.count, d.rtoRate])}
          />
          <p className="text-[11px] text-muted-foreground">{rto?.costNote}</p>
        </State>
      )}

      {section === "cod" && (
        <State
          loading={codQ.isLoading}
          error={codQ.isError}
          empty={!cod}
          onRetry={() => codQ.refetch()}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label={t("codBooked")}
              kpi={flatKpi(cod?.booked ?? null)}
              format={(v) => `৳${Math.round(v).toLocaleString()}`}
            />
            <MetricCard
              label={t("codCollected")}
              kpi={flatKpi(cod?.collected ?? null)}
              format={(v) => `৳${Math.round(v).toLocaleString()}`}
            />
            <MetricCard
              label={t("codPending")}
              kpi={flatKpi(cod?.pending ?? null)}
              format={(v) => `৳${Math.round(v).toLocaleString()}`}
            />
            <MetricCard
              label={t("codRate")}
              kpi={flatKpi(cod?.collectionRate ?? null)}
              format={(v) => `${v}%`}
            />
          </div>
          <Card className="p-4">
            <TrendLineChart
              title={t("codOverTime")}
              data={(cod?.overTime ?? []).map((p) => ({ label: p.bucket, value: p.collected }))}
              formatValue={(v) => `৳${Math.round(v).toLocaleString()}`}
            />
          </Card>
        </State>
      )}

      {section === "finance" && (
        <State
          loading={financeQ.isLoading}
          error={financeQ.isError}
          empty={!finance}
          onRetry={() => financeQ.refetch()}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label={t("pendingSettlement")}
              kpi={flatKpi(finance ? finance.pendingSettlementMinor / 100 : null)}
              format={(v) => `৳${Math.round(v).toLocaleString()}`}
            />
            <MetricCard
              label={t("settled")}
              kpi={flatKpi(finance ? finance.settledMinor / 100 : null)}
              format={(v) => `৳${Math.round(v).toLocaleString()}`}
            />
            <MetricCard
              label={t("payoutRequested")}
              kpi={flatKpi(finance ? finance.payoutRequestedMinor / 100 : null)}
              format={(v) => `৳${Math.round(v).toLocaleString()}`}
            />
            <MetricCard
              label={t("payoutCompleted")}
              kpi={flatKpi(finance ? finance.payoutCompletedMinor / 100 : null)}
              format={(v) => `৳${Math.round(v).toLocaleString()}`}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">{finance?.sourceNote}</p>
        </State>
      )}

      {section === "notifications" && (
        <State
          loading={notificationsQ.isLoading || webhooksQ.isLoading}
          error={notificationsQ.isError || webhooksQ.isError}
          empty={!notif}
          onRetry={() => {
            notificationsQ.refetch();
            webhooksQ.refetch();
          }}
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-4">
              <GroupedBarChart
                title={t("notifByChannel")}
                data={(notif?.byChannel ?? []).map((c) => ({ label: c.channel, value: c.sent }))}
                tone="info"
              />
              <SimpleTable
                head={["channel", "sent", "failed", "rate%"]}
                rows={(notif?.byChannel ?? []).map((c) => [
                  c.channel,
                  c.sent,
                  c.failed,
                  c.deliveryRate,
                ])}
              />
            </Card>
            <Card className="space-y-2 p-4">
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
        </State>
      )}

      {section === "intelligence" && (
        <State
          loading={intelQ.isLoading}
          error={intelQ.isError}
          empty={!intelQ.data?.data}
          onRetry={() => intelQ.refetch()}
        >
          <IntelSectionBody address={intelAddr} rto={intelRto} byModelVersion={intelVersions} />
        </State>
      )}

      {section === "alerts" && (
        <State
          loading={alertsQ.isLoading}
          error={alertsQ.isError}
          empty={alertItems.length === 0}
          onRetry={() => alertsQ.refetch()}
        >
          <div className="space-y-2">
            {alertItems.map((a) => (
              <div
                key={a.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-3 text-xs"
              >
                <Badge variant={a.severity === "CRITICAL" ? "destructive" : "secondary"}>
                  {a.severity}
                </Badge>
                <span className="font-mono font-medium">{a.alertKey}</span>
                <Badge variant="outline">{a.status}</Badge>
                <span className="text-muted-foreground">
                  {a.metricValue} vs {a.threshold}
                </span>
                <span className="ml-auto flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">
                    {dateTime(a.triggeredAt)}
                  </span>
                  {a.status === "OPEN" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px]"
                      onClick={() => ack(a.id).then(() => alertsQ.refetch())}
                    >
                      {t("ack")}
                    </Button>
                  )}
                </span>
              </div>
            ))}
          </div>
        </State>
      )}

      {section === "reports" && (
        <State
          loading={reportsQ.isLoading}
          error={reportsQ.isError}
          empty={false}
          onRetry={() => reportsQ.refetch()}
        >
          <div className="flex flex-wrap items-center gap-2">
            {(["parcels", "rto", "cod", "riders", "hubs", "finance"] as const).map((d) => (
              <ReportRequestButton
                key={d}
                dataset={d}
                preset={filter.preset}
                from={apiParams.from}
                to={apiParams.to}
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
        </State>
      )}
    </div>
  );
}

function IntelSectionBody({
  address,
  rto,
  byModelVersion,
}: {
  address: { parses: number; lowConfidence: number } | undefined;
  rto: { predictions: number; precision: number | null; insufficientData: boolean } | undefined;
  byModelVersion: Array<{
    modelVersion: string;
    predictions: number;
    outcomes: number;
    precision: number | null;
  }>;
}) {
  const t = useTranslations("AnalyticsSections");
  if (!address || !rto) return null;
  return (
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
      <SimpleTable
        head={["model", "predictions", "outcomes", "precision%"]}
        rows={byModelVersion.map((m) => [m.modelVersion, m.predictions, m.outcomes, m.precision])}
      />
      {rto.insufficientData && (
        <p className="text-[11px] text-muted-foreground">{t("insufficientDataHint")}</p>
      )}
    </>
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
    <span className="flex items-center gap-1.5 rounded-lg border border-border px-2 py-1.5 text-xs">
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
        className="h-6 px-2 text-[11px]"
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
