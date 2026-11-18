"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/lib/navigation";
import { Button, TrendLineChart } from "@dhruto/ui";
import {
  useGetAnalyticsOverviewQuery,
  useGetDeliveryAnalyticsQuery,
  useGetRtoAnalyticsV2Query,
  useGetCodAnalyticsV2Query,
  useListReportsQuery,
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
import { useFormatters } from "@/lib/format";
import { RefreshCw, TrendingUp, AlertTriangle, Wallet, FileText, Truck } from "lucide-react";

/** Merchant analytics: own data only, mobile-first stacked cards. */
export function MerchantAnalyticsDashboard() {
  const t = useTranslations("MerchantAnalytics");
  const { dateTime, bdt } = useFormatters();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [filter, setFilter] = React.useState<FilterState>(() => filterFromSearch(searchParams));
  const apiParams = React.useMemo(() => filterToApiParams(filter), [filter]);
  const applyFilter = (next: FilterState) => {
    setFilter(next);
    router.replace(`?${filterToSearch(next)}` as never);
  };

  const overview = useGetAnalyticsOverviewQuery(apiParams);
  const delivery = useGetDeliveryAnalyticsQuery(apiParams);
  const rto = useGetRtoAnalyticsV2Query(apiParams);
  const cod = useGetCodAnalyticsV2Query(apiParams);
  const reports = useListReportsQuery();

  const refresh = () => {
    overview.refetch();
    delivery.refetch();
    rto.refetch();
    cod.refetch();
  };

  const data = overview.data?.data;
  const codData = cod.data?.data;
  const rtoData = rto.data?.data;
  const deliveryData = delivery.data?.data;

  return (
    <div className="w-full space-y-6">
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
              onClick={refresh}
              disabled={overview.isFetching}
              className="h-10 gap-2 text-xs rounded-xl hover:bg-surface-elevated font-medium"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${overview.isFetching ? "animate-spin text-primary" : ""}`} />
              <span>{t("refresh")}</span>
            </Button>
          </div>
        }
      />

      <FilterBar value={filter} onChange={applyFilter} />

      {overview.isLoading ? (
        <div className="space-y-4 py-12 text-center">
          <div className="inline-flex h-10 w-10 animate-spin items-center justify-center rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-body-sm text-muted-foreground font-medium">{t("loading")}</p>
        </div>
      ) : overview.isError || !data ? (
        <div className="rounded-3xl bg-surface-elevated/90 p-8 text-center space-y-3 backdrop-blur-md">
          <p className="text-body font-bold text-foreground">{t("loadErrorTitle")}</p>
          <Button variant="outline" size="sm" onClick={refresh} className="rounded-xl">
            {t("retry")}
          </Button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label={t("kpiOrders")} kpi={data.kpis.totalParcels} />
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
            <MetricCard label={t("kpiCod")} kpi={data.kpis.codCollected} format={(v) => bdt(v)} />
          </div>

          {/* Volume Trend Bento Card */}
          <div className="relative overflow-hidden rounded-3xl bg-surface-elevated/90 p-6 backdrop-blur-md space-y-4">
            <div className="flex items-center gap-2.5 pb-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <TrendingUp className="h-4 w-4" />
              </span>
              <h3 className="text-body font-bold text-foreground tracking-tight">{t("volumeTrend")}</h3>
            </div>
            <TrendLineChart
              title={t("volumeTrend")}
              data={data.trends.map((p) => ({ label: p.bucket, value: p.booked }))}
              emptyMessage={t("emptyTrends")}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Delivery Performance Bento Card */}
            <div className="relative overflow-hidden rounded-3xl bg-surface-elevated/85 p-6 backdrop-blur-md space-y-3">
              <div className="flex items-center gap-2.5 pb-1">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Truck className="h-4 w-4" />
                </span>
                <h3 className="text-body font-bold text-foreground">{t("deliveryTitle")}</h3>
              </div>
              <p className="text-body-sm text-muted-foreground font-medium">
                {t("deliverySummary", {
                  p50: deliveryData?.latency.p50 ?? "—",
                  first: deliveryData?.firstAttemptSuccess ?? "—",
                })}
              </p>
            </div>

            {/* RTO Deep Dive Bento Card */}
            <div className="relative overflow-hidden rounded-3xl bg-surface-elevated/85 p-6 backdrop-blur-md space-y-3">
              <div className="flex items-center gap-2.5 pb-1">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-warning/10 text-warning">
                  <AlertTriangle className="h-4 w-4" />
                </span>
                <h3 className="text-body font-bold text-foreground">{t("rtoTitle")}</h3>
              </div>
              <p className="text-body-sm text-muted-foreground font-medium">
                {t("rtoSummary", {
                  count: rtoData?.rtoCount ?? 0,
                  rate: rtoData?.rtoRate.value ?? "—",
                })}
              </p>
              <div className="space-y-1.5 pt-1">
                {(rtoData?.byReason ?? []).slice(0, 3).map((r) => (
                  <div key={r.reason} className="flex items-center justify-between text-caption rounded-xl bg-surface-muted/50 px-3 py-1.5">
                    <span className="font-mono font-medium text-foreground">{r.reason}</span>
                    <span className="text-muted-foreground font-semibold">
                      {r.count} ({r.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* COD Settlement Analytics Card */}
          <div className="relative overflow-hidden rounded-3xl bg-surface-elevated/85 p-6 backdrop-blur-md space-y-3">
            <div className="flex items-center gap-2.5 pb-1">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Wallet className="h-4 w-4" />
              </span>
              <h3 className="text-body font-bold text-foreground">{t("codTitle")}</h3>
            </div>
            <p className="text-body-sm text-muted-foreground font-medium">
              {t("codSummary", {
                collected: codData ? bdt(codData.collected) : "—",
                pending: codData ? bdt(codData.pending) : "—",
                rate: codData?.collectionRate ?? "—",
              })}
            </p>
          </div>

          {/* Generated Reports History Card */}
          <div className="relative overflow-hidden rounded-3xl bg-surface-elevated/85 p-6 backdrop-blur-md space-y-4">
            <div className="flex items-center gap-2.5 pb-1">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FileText className="h-4 w-4" />
              </span>
              <h3 className="text-body font-bold text-foreground">
                {t("reportsTitle", { count: reports.data?.data?.length ?? 0 })}
              </h3>
            </div>
            {(reports.data?.data ?? []).length === 0 ? (
              <p className="text-caption text-muted-foreground font-medium">{t("reportsEmpty")}</p>
            ) : (
              <ul className="space-y-2">
                {(reports.data?.data ?? []).slice(0, 5).map((r) => (
                  <li key={r.id} className="flex items-center justify-between rounded-xl bg-surface-muted/40 p-3 text-caption hover:bg-surface-muted/70 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold uppercase text-foreground">
                        {r.dataset} · {r.format}
                      </span>
                      <span className="text-muted-foreground">
                        ({r.status}
                        {r.rowCount !== null ? ` · ${r.rowCount} rows` : ""})
                      </span>
                    </div>
                    <span className="text-muted-foreground font-mono">
                      {dateTime(r.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
