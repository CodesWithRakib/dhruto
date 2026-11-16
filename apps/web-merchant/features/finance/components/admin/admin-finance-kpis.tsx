"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Wallet, Clock, ArrowDownToLine, CheckCircle2, AlertTriangle } from "lucide-react";
import { KpiCard } from "@/components/data-display/kpi-card";

interface AdminFinanceKpisProps {
  overview?: {
    totalVerifiedCod: number;
    totalPendingCod: number;
    totalMerchantBalance: number;
    totalDisbursedPayouts: number;
    openDiscrepanciesCount: number;
  };
}

export function AdminFinanceKpis({ overview }: AdminFinanceKpisProps) {
  const t = useTranslations("Finance");

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
      <KpiCard
        label={t("admin.totalCod")}
        value={overview ? `৳${overview.totalVerifiedCod.toLocaleString()}` : "৳0"}
        icon={Wallet}
        tone="primary"
        emphasis
        hint={t("admin.hints.totalCod")}
      />
      <KpiCard
        label={t("admin.pendingReconciliation")}
        value={overview ? `৳${overview.totalPendingCod.toLocaleString()}` : "৳0"}
        icon={Clock}
        tone="warning"
        hint={t("admin.hints.pendingReconciliation")}
      />
      <KpiCard
        label={t("admin.merchantPayables")}
        value={overview ? `৳${overview.totalMerchantBalance.toLocaleString()}` : "৳0"}
        icon={ArrowDownToLine}
        tone="info"
        hint={t("admin.hints.merchantPayables")}
      />
      <KpiCard
        label={t("admin.disbursedPayouts")}
        value={overview ? `৳${overview.totalDisbursedPayouts.toLocaleString()}` : "৳0"}
        icon={CheckCircle2}
        tone="success"
        hint={t("admin.hints.disbursedPayouts")}
      />
      <KpiCard
        label={t("admin.openDiscrepancies")}
        value={overview ? overview.openDiscrepanciesCount : 0}
        icon={AlertTriangle}
        tone="danger"
        hint={t("admin.hints.openDiscrepancies")}
      />
    </div>
  );
}
