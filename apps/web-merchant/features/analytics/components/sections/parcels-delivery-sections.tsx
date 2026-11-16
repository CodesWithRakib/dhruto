"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Card, GroupedBarChart } from "@dhruto/ui";
import type { ParcelAnalyticsResponse } from "@dhruto/contracts";
import { MetricCard } from "../metric-card";
import { SectionState, SimpleTable, flatKpi } from "./section-helpers";

interface ParcelsSectionProps {
  isLoading: boolean;
  isError: boolean;
  parcels?: ParcelAnalyticsResponse;
  onRetry: () => void;
}

export function ParcelsSection({ isLoading, isError, parcels, onRetry }: ParcelsSectionProps) {
  const t = useTranslations("AnalyticsSections");

  return (
    <SectionState
      loading={isLoading}
      error={isError}
      empty={!parcels}
      onRetry={onRetry}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-3xl bg-surface-elevated p-6">
          <GroupedBarChart
            title={t("funnelTitle")}
            data={(parcels?.funnel ?? []).map((s: { stage: string; count: number }) => ({
              label: s.stage,
              value: s.count,
            }))}
            tone="info"
          />
          <ul className="mt-4 space-y-1.5 text-xs text-muted-foreground">
            {(parcels?.funnel ?? []).map((s: { stage: string; count: number; conversionPct: number | null }) => (
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
        <Card className="space-y-4 rounded-3xl bg-surface-elevated p-6">
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
    </SectionState>
  );
}

interface DeliverySectionProps {
  isLoading: boolean;
  isError: boolean;
  delivery?: {
    latency: ParcelAnalyticsResponse["latency"];
    firstAttemptSuccess: number | null;
  };
  onRetry: () => void;
}

export function DeliverySection({ isLoading, isError, delivery, onRetry }: DeliverySectionProps) {
  const t = useTranslations("AnalyticsSections");

  return (
    <SectionState
      loading={isLoading}
      error={isError}
      empty={!delivery}
      onRetry={onRetry}
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
    </SectionState>
  );
}
