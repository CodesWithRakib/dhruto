"use client";

import React from "react";
import { AlertTriangle, PackageCheck, RotateCcw, Truck } from "lucide-react";
import { KpiCard } from "@/components/data-display/kpi-card";

interface ReturnsKpiStripProps {
  t: (key: string, values?: Record<string, string | number>) => string;
  stats: {
    active: number;
    initiated: number;
    inTransit: number;
    completed: number;
    totalCod: number;
  };
  bdt: (val: number) => string;
  formatNumber: (n: number) => string;
}

export function ReturnsKpiStrip({
  t,
  stats,
  bdt,
  formatNumber,
}: ReturnsKpiStripProps) {
  return (
    <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
      <KpiCard
        label={t("inReturnTransit")}
        value={formatNumber(stats.active)}
        hint={t("inReturnTransitHint", {
          initiated: formatNumber(stats.initiated),
          inTransit: formatNumber(stats.inTransit),
        })}
        icon={Truck}
        tone="warning"
        className="rounded-3xl"
      />
      <KpiCard
        label={t("returnedToMerchant")}
        value={formatNumber(stats.completed)}
        hint={t("returnedToMerchantHint")}
        icon={PackageCheck}
        tone="success"
        className="rounded-3xl"
      />
      <KpiCard
        label={t("totalReturns")}
        value={formatNumber(stats.active + stats.completed)}
        hint={t("totalReturnsHint")}
        icon={RotateCcw}
        tone="neutral"
        className="rounded-3xl"
      />
      <KpiCard
        label={t("recoverableValue")}
        value={bdt(stats.totalCod)}
        hint={t("recoverableValueHint")}
        icon={AlertTriangle}
        tone="info"
        className="rounded-3xl"
      />
    </div>
  );
}
