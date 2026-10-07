"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/lib/navigation";
import { Loader2, TriangleAlert } from "lucide-react";
import { Button, Card, TrendLineChart, GroupedBarChart } from "@dhruto/ui";
import { useGetAnalyticsOverviewQuery, useListAlertsQuery } from "../api/analytics.api";
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
import { useFormatters } from "@/lib/format";

const taka = (v: number): string => `৳${Math.round(v).toLocaleString()}`;

/** Admin executive overview: KPIs with previous-period deltas, trends, alerts. */
export function AdminOverviewDashboard() {
  const t = useTranslations("AnalyticsOverview");
  const { dateTime } = useFormatters();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [filter, setFilter] = React.useState<FilterState>(() => filterFromSearch(searchParams));

  const apiParams = React.useMemo(() => filterToApiParams(filter), [filter]);
  const overview = useGetAnalyticsOverviewQuery(apiParams);
  const alerts = useListAlertsQuery({ status: "OPEN" });

  const applyFilter = (next: FilterState) => {
    setFilter(next);
    router.replace(`?${filterToSearch(next)}` as never);
  };

  const data = overview.data?.data;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ExportButton
              dataset="parcels"
              preset={filter.preset}
              from={apiParams.from}
              to={apiParams.to}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                overview.refetch();
                alerts.refetch();
              }}
              className="h-8 text-xs"
            >
              {t("refresh")}
            </Button>
          </div>
        }
      />

      <FilterBar value={filter} onChange={applyFilter} />

      {overview.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i} className="flex h-28 items-center justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            </Card>
          ))}
        </div>
      ) : overview.isError || !data ? (
        <Card className="space-y-2 p-6 text-center">
          <p className="text-sm font-medium">{t("loadErrorTitle")}</p>
          <p className="text-xs text-muted-foreground">
            {overview.error ? getApiErrorMessage(overview.error, "") : t("loadErrorDescription")}
          </p>
          <Button variant="outline" size="sm" onClick={() => overview.refetch()}>
            {t("retry")}
          </Button>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label={t("kpiParcels")} kpi={data.kpis.totalParcels} />
            <MetricCard
              label={t("kpiSuccess")}
              kpi={data.kpis.successRate}
              format={(v) => `${v}%`}
            />
            <MetricCard
              label={t("kpiRto")}
              kpi={data.kpis.rtoRate}
              format={(v) => `${v}%`}
              invertTrend
            />
            <MetricCard label={t("kpiCod")} kpi={data.kpis.codCollected} format={taka} />
            <MetricCard label={t("kpiDelivered")} kpi={data.kpis.delivered} />
            <MetricCard
              label={t("kpiAvgHours")}
              kpi={data.kpis.avgDeliveryHours}
              format={(v) => `${v}h`}
              invertTrend
            />
            <MetricCard
              label={t("kpiPendingSettlement")}
              kpi={data.kpis.pendingSettlement}
              format={taka}
            />
            <MetricCard
              label={t("kpiInTransit")}
              kpi={{
                value: data.kpis.inTransit,
                previous: null,
                changePct: null,
                trend: "flat",
                noData: false,
              }}
              hint={t("inTransitHint")}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-4">
              <TrendLineChart
                title={t("volumeTrend")}
                data={data.trends.map((p) => ({ label: p.bucket, value: p.booked }))}
                emptyMessage={t("emptyTrends")}
              />
            </Card>
            <Card className="p-4">
              <TrendLineChart
                title={t("codTrend")}
                data={data.trends.map((p) => ({ label: p.bucket, value: p.codCollected }))}
                formatValue={(v) => `৳${Math.round(v).toLocaleString()}`}
                emptyMessage={t("emptyTrends")}
              />
            </Card>
          </div>
          <p className="text-[11px] text-muted-foreground">{data.generatedAtNote}</p>
        </>
      )}

      <Card className="p-4">
        <div className="mb-2 flex items-center gap-2">
          <TriangleAlert className="h-4 w-4 text-warning" aria-hidden="true" />
          <h3 className="text-sm font-semibold">
            {t("openAlerts", { count: alerts.data?.data?.length ?? 0 })}
          </h3>
        </div>
        {!alerts.data?.data?.length ? (
          <p className="py-2 text-center text-xs text-muted-foreground">{t("noAlerts")}</p>
        ) : (
          <ul className="space-y-1.5">
            {alerts.data.data.slice(0, 5).map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs"
              >
                <span className="font-mono font-medium">{a.alertKey}</span>
                <span className="text-muted-foreground">
                  {a.severity} · {a.metricValue} vs {a.threshold}
                </span>
                <span className="ml-auto text-[11px] text-muted-foreground">
                  {dateTime(a.triggeredAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-4">
        <GroupedBarChart
          title={t("deliveredTrend")}
          data={(data?.trends ?? []).map((p) => ({ label: p.bucket, value: p.delivered }))}
          tone="success"
          emptyMessage={t("emptyTrends")}
        />
      </Card>
    </div>
  );
}
