"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Card, GroupedBarChart, TrendLineChart } from "@dhruto/ui";
import type { RtoAnalyticsV2, CodAnalyticsV2, FinanceAnalyticsResponse } from "@dhruto/contracts";
import { MetricCard } from "../metric-card";
import { SectionState, SimpleTable, flatKpi } from "./section-helpers";

export function RtoSection({
  isLoading,
  isError,
  rto,
  onRetry,
}: {
  isLoading: boolean;
  isError: boolean;
  rto?: RtoAnalyticsV2;
  onRetry: () => void;
}) {
  const t = useTranslations("AnalyticsSections");

  return (
    <SectionState
      loading={isLoading}
      error={isError}
      empty={!rto}
      onRetry={onRetry}
    >
      <div className="space-y-4">
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
          <Card className="rounded-3xl bg-surface-elevated p-6">
            <GroupedBarChart
              title={t("rtoReasons")}
              data={(rto?.byReason ?? []).map((r) => ({ label: r.reason, value: r.count }))}
              tone="danger"
            />
          </Card>
          <Card className="rounded-3xl bg-surface-elevated p-6">
            <TrendLineChart
              title={t("rtoOverTime")}
              data={(rto?.overTime ?? []).map((p) => ({ label: p.bucket, value: p.count }))}
            />
          </Card>
        </div>
        <div className="rounded-3xl bg-surface-elevated p-6 space-y-3">
          <SimpleTable
            head={["district", "rto", "rate%"]}
            rows={(rto?.byDistrict ?? []).map((d) => [d.district, d.count, d.rtoRate])}
          />
          {rto?.costNote ? (
            <p className="text-[11px] text-muted-foreground">{rto.costNote}</p>
          ) : null}
        </div>
      </div>
    </SectionState>
  );
}

export function CodSection({
  isLoading,
  isError,
  cod,
  onRetry,
}: {
  isLoading: boolean;
  isError: boolean;
  cod?: CodAnalyticsV2;
  onRetry: () => void;
}) {
  const t = useTranslations("AnalyticsSections");

  return (
    <SectionState
      loading={isLoading}
      error={isError}
      empty={!cod}
      onRetry={onRetry}
    >
      <div className="space-y-4">
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
        <Card className="rounded-3xl bg-surface-elevated p-6">
          <TrendLineChart
            title={t("codOverTime")}
            data={(cod?.overTime ?? []).map((p) => ({ label: p.bucket, value: p.collected }))}
            formatValue={(v) => `৳${Math.round(v).toLocaleString()}`}
          />
        </Card>
      </div>
    </SectionState>
  );
}

export function FinanceSection({
  isLoading,
  isError,
  finance,
  onRetry,
}: {
  isLoading: boolean;
  isError: boolean;
  finance?: FinanceAnalyticsResponse;
  onRetry: () => void;
}) {
  const t = useTranslations("AnalyticsSections");

  return (
    <SectionState
      loading={isLoading}
      error={isError}
      empty={!finance}
      onRetry={onRetry}
    >
      <div className="space-y-4">
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
        {finance?.sourceNote ? (
          <p className="text-[11px] text-muted-foreground">{finance.sourceNote}</p>
        ) : null}
      </div>
    </SectionState>
  );
}
