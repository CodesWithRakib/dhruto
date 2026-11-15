"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, CheckCircle2, Coins } from "lucide-react";
import { KpiCard } from "@/components/data-display/kpi-card";
import { useFormatters } from "@/lib/format";

interface CashDeskKpiStripProps {
  totalPendingCod: number;
  totalVerifiedCod: number;
  openDiscrepanciesCount: number;
}

export function CashDeskKpiStrip({
  totalPendingCod,
  totalVerifiedCod,
  openDiscrepanciesCount,
}: CashDeskKpiStripProps) {
  const t = useTranslations("Finance");
  const { bdt } = useFormatters();

  const summaryCards = [
    {
      label: t("cash.expectedCash"),
      value: bdt(totalPendingCod),
      icon: Coins,
      tone: "warning" as const,
    },
    {
      label: t("admin.totalCod"),
      value: bdt(totalVerifiedCod),
      icon: CheckCircle2,
      tone: "success" as const,
    },
    {
      label: t("admin.openDiscrepancies"),
      value: `${openDiscrepanciesCount}`,
      icon: AlertTriangle,
      tone: "danger" as const,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
      {summaryCards.map((card) => (
        <div key={card.label} className="relative overflow-hidden rounded-3xl shadow-sm">
          {/* Specular top highlight */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"
            aria-hidden="true"
          />
          <KpiCard
            label={card.label}
            value={card.value}
            icon={card.icon}
            tone={card.tone}
            className="rounded-3xl border border-border/60 bg-card/90 backdrop-blur-md"
          />
        </div>
      ))}
    </div>
  );
}
