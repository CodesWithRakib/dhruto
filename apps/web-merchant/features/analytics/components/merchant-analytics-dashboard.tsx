"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/lib/navigation";
import { Button, Card, TrendLineChart } from "@dhruto/ui";
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

const taka = (v: number): string => `৳${Math.round(v).toLocaleString()}`;

/** Merchant analytics: own data only, mobile-first stacked cards. */
export function MerchantAnalyticsDashboard() {
  const t = useTranslations("MerchantAnalytics");
  const { dateTime } = useFormatters();
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
    <div className="w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8">
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
            <Button variant="outline" size="sm" onClick={refresh} className="h-8 text-xs">
              {t("refresh")}
            </Button>
          </div>
        }
      />

      <FilterBar value={filter} onChange={applyFilter} />

      {overview.isLoading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{t("loading")}</p>
      ) : overview.isError || !data ? (
        <Card className="space-y-2 p-6 text-center">
          <p className="text-sm font-medium">{t("loadErrorTitle")}</p>
          <Button variant="outline" size="sm" onClick={refresh}>
            {t("retry")}
          </Button>
        </Card>
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
            <MetricCard label={t("kpiCod")} kpi={data.kpis.codCollected} format={taka} />
          </div>

          <Card className="p-4">
            <TrendLineChart
              title={t("volumeTrend")}
              data={data.trends.map((p) => ({ label: p.bucket, value: p.booked }))}
              emptyMessage={t("emptyTrends")}
            />
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="space-y-2 p-4">
              <h3 className="text-sm font-semibold">{t("deliveryTitle")}</h3>
              <p className="text-xs text-muted-foreground">
                {t("deliverySummary", {
                  p50: deliveryData?.latency.p50 ?? "—",
                  first: deliveryData?.firstAttemptSuccess ?? "—",
                })}
              </p>
            </Card>
            <Card className="space-y-2 p-4">
              <h3 className="text-sm font-semibold">{t("rtoTitle")}</h3>
              <p className="text-xs text-muted-foreground">
                {t("rtoSummary", {
                  count: rtoData?.rtoCount ?? 0,
                  rate: rtoData?.rtoRate.value ?? "—",
                })}
              </p>
              {(rtoData?.byReason ?? []).slice(0, 3).map((r) => (
                <p key={r.reason} className="text-xs">
                  <span className="font-mono">{r.reason}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {r.count} ({r.percentage}%)
                  </span>
                </p>
              ))}
            </Card>
          </div>

          <Card className="space-y-2 p-4">
            <h3 className="text-sm font-semibold">{t("codTitle")}</h3>
            <p className="text-xs text-muted-foreground">
              {t("codSummary", {
                collected: codData ? taka(codData.collected) : "—",
                pending: codData ? taka(codData.pending) : "—",
                rate: codData?.collectionRate ?? "—",
              })}
            </p>
          </Card>

          <Card className="p-4">
            <h3 className="mb-2 text-sm font-semibold">
              {t("reportsTitle", { count: reports.data?.data?.length ?? 0 })}
            </h3>
            {(reports.data?.data ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground">{t("reportsEmpty")}</p>
            ) : (
              <ul className="space-y-1.5">
                {(reports.data?.data ?? []).slice(0, 5).map((r) => (
                  <li key={r.id} className="flex items-center gap-2 text-xs">
                    <span className="font-mono font-medium uppercase">
                      {r.dataset} · {r.format}
                    </span>
                    <span className="text-muted-foreground">
                      {r.status}
                      {r.rowCount !== null ? ` · ${r.rowCount}` : ""}
                    </span>
                    <span className="ml-auto text-[11px] text-muted-foreground">
                      {dateTime(r.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
