"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Card, CardSkeleton } from "@dhruto/ui";
import { CheckCircle2, Clock, Package, RotateCcw, Truck } from "lucide-react";
import type { MerchantAnalyticsSummary } from "@dhruto/contracts";
import { cn } from "@/lib/cn";
import { useFormatters } from "@/lib/format";
import { KpiCard } from "@/components/data-display/kpi-card";
import type { DashboardStats } from "@/features/merchants/api/merchants.api";
import { pendingCodAmount } from "../lib/overview";

/**
 * Five real KPIs. Every number comes from the dashboard or merchant-analytics
 * APIs — nothing is invented, and no trend delta is shown because the API does
 * not return one.
 */
export function ShipmentKpis({
  stats,
  isLoading,
}: {
  stats: DashboardStats;
  isLoading: boolean;
}) {
  const t = useTranslations("Index");
  const { number } = useFormatters();

  const gridClass = "grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-5";

  if (isLoading) {
    return (
      <div className={gridClass} aria-hidden="true">
        {Array.from({ length: 5 }).map((_, index) => (
          <CardSkeleton key={index} />
        ))}
      </div>
    );
  }

  return (
    <div className={gridClass}>
      <KpiCard
        label={t("totalBookings")}
        value={number(stats.totalOrders)}
        hint={t("totalBookingsHint")}
        icon={Package}
        tone="primary"
        emphasis
      />
      <KpiCard
        label={t("pending")}
        value={number(stats.pendingOrders)}
        hint={t("pendingHint")}
        icon={Clock}
        tone="warning"
      />
      <KpiCard
        label={t("inTransit")}
        value={number(stats.inTransitOrders)}
        hint={t("inTransitHint")}
        icon={Truck}
        tone="info"
      />
      <KpiCard
        label={t("delivered")}
        value={number(stats.deliveredOrders)}
        hint={t("deliveredHint")}
        icon={CheckCircle2}
        tone="success"
      />
      <KpiCard
        label={t("returnsTitle")}
        value={number(stats.returnedOrders)}
        hint={t("returnsHint")}
        icon={RotateCcw}
        tone="danger"
      />
    </div>
  );
}

function HealthCell({
  label,
  value,
  hint,
  progress,
  tone = "primary",
}: {
  label: string;
  value: string;
  hint?: string;
  progress?: number;
  tone?: "primary" | "success" | "danger" | "info";
}) {
  const barTone = {
    primary: "bg-primary",
    success: "bg-success",
    danger: "bg-danger",
    info: "bg-info",
  }[tone];

  return (
    <div className="min-w-0 p-4 sm:p-5">
      <p className="truncate text-caption font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-h3 font-bold tabular-nums text-foreground">{value}</p>
      {typeof progress === "number" ? (
        <div
          className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted"
          role="img"
          aria-label={`${label}: ${value}`}
        >
          <div
            className={cn("h-full rounded-full transition-all duration-700 ease-out", barTone)}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      ) : null}
      {hint ? <p className="mt-2 line-clamp-2 text-caption text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

const PLACEHOLDER = "—";

/**
 * Network health derived from the merchant analytics summary plus the
 * dashboard's own COD figures. The analytics-derived cells degrade to a
 * placeholder when that request fails, without taking the strip down.
 */
export function DeliveryHealth({
  stats,
  analytics,
  isLoading,
  isAnalyticsAvailable,
}: {
  stats: DashboardStats;
  analytics?: MerchantAnalyticsSummary;
  isLoading: boolean;
  isAnalyticsAvailable: boolean;
}) {
  const t = useTranslations("Index");
  const { bdt, number } = useFormatters();

  const pendingCod = pendingCodAmount(stats);
  const kpis = analytics?.kpis;

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border/60 px-5 py-4">
        <h2 className="text-h4 font-bold text-foreground">{t("health.title")}</h2>
        <p className="mt-0.5 text-caption text-muted-foreground">{t("health.description")}</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 divide-x divide-y divide-border/50 sm:grid-cols-4 sm:divide-y-0">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="p-4 sm:p-5">
              <CardSkeleton className="border-0 bg-transparent p-0 shadow-none" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 divide-x divide-y divide-border/50 sm:grid-cols-4 sm:divide-y-0">
            <HealthCell
              label={t("health.successRate")}
              value={
                isAnalyticsAvailable && kpis
                  ? `${number(Math.round(kpis.deliverySuccessRate))}%`
                  : PLACEHOLDER
              }
              progress={isAnalyticsAvailable && kpis ? kpis.deliverySuccessRate : undefined}
              tone="success"
              hint={t("health.successRateHint")}
            />
            <HealthCell
              label={t("health.rtoRate")}
              value={
                isAnalyticsAvailable && kpis ? `${number(Math.round(kpis.rtoRate))}%` : PLACEHOLDER
              }
              progress={isAnalyticsAvailable && kpis ? kpis.rtoRate : undefined}
              tone="danger"
              hint={t("health.rtoRateHint")}
            />
            <HealthCell
              label={t("health.avgDelivery")}
              value={
                isAnalyticsAvailable && kpis
                  ? t("health.hours", { hours: number(Math.round(kpis.avgDeliveryHours)) })
                  : PLACEHOLDER
              }
              tone="info"
              hint={t("health.avgDeliveryHint")}
            />
            <HealthCell
              label={t("health.pendingCod")}
              value={bdt(pendingCod)}
              tone="primary"
              hint={t("health.pendingCodHint")}
            />
          </div>

          {!isAnalyticsAvailable ? (
            <p className="border-t border-border/50 px-5 py-3 text-caption text-muted-foreground">
              {t("health.unavailable")}
            </p>
          ) : null}
        </>
      )}
    </Card>
  );
}
