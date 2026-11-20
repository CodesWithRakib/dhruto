"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Clock, Package, TrendingUp, Wallet } from "lucide-react";
import { CardSkeleton } from "@dhruto/ui";
import { KpiCard } from "@/components/data-display/kpi-card";
import { useGetAnalyticsOverviewQuery } from "@/features/analytics/api/analytics.api";
import { useFormatters } from "@/lib/format";

/**
 * Today's platform numbers for the operations console (Asia/Dhaka day),
 * from `GET /analytics/overview?preset=today`. Refreshes every minute.
 */
export function AdminTodayKpis() {
  const t = useTranslations("Admin.today");
  const { number, bdt } = useFormatters();
  const { data, isLoading, isError } = useGetAnalyticsOverviewQuery(
    { preset: "today" },
    { pollingInterval: 60000, skipPollingIfUnfocused: true },
  );
  const k = data?.data?.kpis;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-5" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }
  if (isError || !k) {
    return <p className="rounded-2xl bg-surface-elevated p-4 text-xs text-muted-foreground">{t("unavailable")}</p>;
  }

  const delta = (pct: number | null) => (pct == null ? undefined : t("vsYesterday", { pct: `${pct > 0 ? "+" : ""}${pct}` }));

  return (
    <section aria-label={t("title")} className="space-y-3">
      <h2 className="text-caption font-bold uppercase tracking-wider text-muted-foreground">{t("title")}</h2>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-5">
        <KpiCard label={t("booked")} value={number(k.totalParcels.value)} hint={delta(k.totalParcels.changePct)} icon={Package} tone="primary" emphasis />
        <KpiCard label={t("delivered")} value={number(k.delivered.value)} hint={delta(k.delivered.changePct)} icon={CheckCircle2} tone="success" />
        <KpiCard
          label={t("successRate")}
          value={k.successRate.noData ? "—" : `${k.successRate.value}%`}
          hint={t("inTransit", { count: k.inTransit })}
          icon={TrendingUp}
          tone="info"
        />
        <KpiCard label={t("codCollected")} value={bdt(k.codCollected.value)} hint={delta(k.codCollected.changePct)} icon={Wallet} tone="success" />
        <KpiCard label={t("pendingSettlement")} value={bdt(k.pendingSettlement.value)} hint={t("pendingSettlementHint")} icon={Clock} tone="warning" />
      </div>
    </section>
  );
}
