"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, ChartSkeleton, TrendLineChart } from "@dhruto/ui";
import { RefreshCw } from "lucide-react";
import type { MerchantAnalyticsSummary } from "@dhruto/contracts";
import { cn } from "@/lib/cn";
import { useFormatters } from "@/lib/format";
import { EmptyState, RetryButton } from "@/components/feedback/states";
import { buildTrendData } from "../lib/overview";

type Metric = "delivered" | "booked";

/**
 * Shipment activity over the analytics period.
 *
 * Answers one question — "how many parcels actually moved each day?" — via the
 * merchant analytics daily series. The series toggle is the only interaction.
 */
export function ShipmentPerformance({
  analytics,
  isLoading,
  isError,
  onRetry,
}: {
  analytics?: MerchantAnalyticsSummary;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  const t = useTranslations("Index");
  const { number } = useFormatters();
  const [metric, setMetric] = React.useState<Metric>("delivered");

  const trends = analytics?.dailyTrends ?? [];
  const series = buildTrendData(trends, metric);
  const total = series.reduce((sum, point) => sum + point.value, 0);

  const metricLabel = metric === "delivered" ? t("performance.delivered") : t("performance.booked");

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-col gap-3 border-b border-border/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <CardTitle className="text-h4">{t("performance.title")}</CardTitle>
          <CardDescription className="mt-0.5">{t("performance.description")}</CardDescription>
        </div>

        <div
          role="group"
          aria-label={t("performance.metricLabel")}
          className="flex shrink-0 items-center gap-1 rounded-lg border border-border/60 bg-surface-muted/60 p-1"
        >
          {(["delivered", "booked"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setMetric(option)}
              aria-pressed={metric === option}
              className={cn(
                "rounded-md px-3 py-1.5 text-caption font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                metric === option
                  ? "bg-surface text-foreground shadow-soft"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {option === "delivered" ? t("performance.delivered") : t("performance.booked")}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5">
        {isLoading ? (
          <ChartSkeleton className="border-0 p-0 shadow-none" />
        ) : isError ? (
          <EmptyState
            title={t("performance.errorTitle")}
            description={t("performance.errorDescription")}
            action={<RetryButton label={t("retry")} onRetry={onRetry} />}
          />
        ) : series.length === 0 ? (
          <EmptyState
            title={t("performance.emptyTitle")}
            description={t("performance.emptyDescription")}
          />
        ) : (
          <>
            <TrendLineChart
              data={series}
              title={metricLabel}
              emptyMessage={t("performance.emptyTitle")}
              formatValue={(value) => number(value)}
            />
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border/50 pt-4">
              <div>
                <p className="text-caption font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("performance.totalLabel", { metric: metricLabel })}
                </p>
                <p className="mt-0.5 text-h3 font-bold tabular-nums text-foreground">
                  {number(total)}
                </p>
              </div>
              {analytics ? (
                <div>
                  <p className="text-caption font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("health.successRate")}
                  </p>
                  <p className="mt-0.5 text-h3 font-bold tabular-nums text-foreground">
                    {number(Math.round(analytics.kpis.deliverySuccessRate))}%
                  </p>
                </div>
              ) : null}
              <p className="ml-auto inline-flex items-center gap-1.5 text-caption text-muted-foreground">
                <RefreshCw className="h-3 w-3" aria-hidden="true" />
                {t("performance.period")}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
