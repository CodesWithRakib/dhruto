"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { CardSkeleton } from "@dhruto/ui";
import { CheckCircle2, Clock, Package, RotateCcw, Truck } from "lucide-react";
import type { MerchantAnalyticsSummary } from "@dhruto/contracts";
import { cn } from "@/lib/cn";
import { useFormatters } from "@/lib/format";
import { KpiCard } from "@/components/data-display/kpi-card";
import { Link } from "@/lib/navigation";
import { MERCHANT_ROUTES } from "@/config/routes";
import type { DashboardStats } from "@/features/merchants/api/merchants.api";
import { pendingCodAmount } from "../lib/overview";

/**
 * Five real KPIs. Every number comes from the dashboard or merchant-analytics
 * APIs — nothing is invented, and no trend delta is shown because the API does
 * not return one.
 */
export function ShipmentKpis({ stats, isLoading }: { stats: DashboardStats; isLoading: boolean }) {
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
      <Link
        href={MERCHANT_ROUTES.parcels}
        className="block transition-transform hover:-translate-y-0.5"
      >
        <KpiCard
          label={t("totalBookings")}
          value={number(stats.totalOrders)}
          hint={t("totalBookingsHint")}
          icon={Package}
          tone="primary"
          emphasis
        />
      </Link>
      <Link
        href={`${MERCHANT_ROUTES.parcels}?status=CREATED`}
        className="block transition-transform hover:-translate-y-0.5"
      >
        <KpiCard
          label={t("pending")}
          value={number(stats.pendingOrders)}
          hint={t("pendingHint")}
          icon={Clock}
          tone="warning"
        />
      </Link>
      <Link
        href={`${MERCHANT_ROUTES.parcels}?status=IN_TRANSIT`}
        className="block transition-transform hover:-translate-y-0.5"
      >
        <KpiCard
          label={t("inTransit")}
          value={number(stats.inTransitOrders)}
          hint={t("inTransitHint")}
          icon={Truck}
          tone="info"
        />
      </Link>
      <Link
        href={`${MERCHANT_ROUTES.parcels}?status=DELIVERED`}
        className="block transition-transform hover:-translate-y-0.5"
      >
        <KpiCard
          label={t("delivered")}
          value={number(stats.deliveredOrders)}
          hint={t("deliveredHint")}
          icon={CheckCircle2}
          tone="success"
        />
      </Link>
      <Link
        href={MERCHANT_ROUTES.returns}
        className="block transition-transform hover:-translate-y-0.5"
      >
        <KpiCard
          label={t("returnsTitle")}
          value={number(stats.returnedOrders)}
          hint={t("returnsHint")}
          icon={RotateCcw}
          tone="danger"
        />
      </Link>
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
    <div className="min-w-0 p-5 sm:p-6 transition-colors hover:bg-surface-muted/50">
      <p className="line-clamp-2 text-caption font-bold uppercase leading-snug tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-extrabold tabular-nums tracking-tight text-foreground sm:text-3xl">
        {value}
      </p>
      {typeof progress === "number" ? (
        <div
          className="mt-3.5 h-2 w-full overflow-hidden rounded-full bg-muted/70 p-0.5"
          role="img"
          aria-label={`${label}: ${value}`}
        >
          <div
            className={cn("h-full rounded-full transition-all duration-700 ease-out", barTone)}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      ) : null}
      {hint ? (
        <p className="mt-2.5 line-clamp-2 text-caption text-muted-foreground leading-relaxed font-normal">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const PLACEHOLDER = "—";

/**
 * Network health derived from the merchant analytics summary plus the
 * dashboard's own COD figures. Styled as a sleek bento telemetry card.
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

  // The API reports 0 when no delivered parcel can be measured, so 0 means
  // "no data" (never a real zero-hour delivery). Sub-hour averages show minutes.
  const formatLatency = (hours: number): string => {
    if (!(hours > 0)) return PLACEHOLDER;
    if (hours < 1) return t("health.minutes", { minutes: number(Math.max(1, Math.round(hours * 60))) });
    return t("health.hours", { hours: number(Math.round(hours)) });
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-card/90 backdrop-blur-md">
      {/* Top Specular Gradient Line */}

      <div className="flex items-center justify-between px-5 py-4 sm:px-6">
        <div>
          <h2 className="text-h4 font-bold text-foreground">{t("health.title")}</h2>
          <p className="mt-0.5 text-caption text-muted-foreground">{t("health.description")}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/5 px-2.5 py-0.5 text-[10px] font-bold text-primary uppercase tracking-wider">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          Live Radar
        </span>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="p-4 sm:p-5">
              <CardSkeleton className="bg-transparent p-0" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4">
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
                isAnalyticsAvailable && kpis ? formatLatency(kpis.avgDeliveryHours) : PLACEHOLDER
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
            <p className="px-5 py-3 text-caption text-muted-foreground">
              {t("health.unavailable")}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
