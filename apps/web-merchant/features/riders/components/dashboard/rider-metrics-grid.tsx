"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, Bike, Package, PackageCheck, Play, Wallet } from "lucide-react";
import { useFormatters } from "@/lib/format";

interface RiderMetricsGridProps {
  assigned: number;
  inProgress: number;
  deliveredToday: number;
  failedToday: number;
  codToCollect: number;
  parcelsInHand: number;
}

export function RiderMetricsGrid({
  assigned,
  inProgress,
  deliveredToday,
  failedToday,
  codToCollect,
  parcelsInHand,
}: RiderMetricsGridProps) {
  const t = useTranslations("Rider");
  const { bdt } = useFormatters();

  const metricCards = [
    {
      label: t("dashboard.assigned"),
      value: assigned,
      icon: Package,
      toneBg: "bg-info-soft",
      toneText: "text-info-soft-foreground",
    },
    {
      label: t("dashboard.inProgress"),
      value: inProgress,
      icon: Play,
      toneBg: "bg-warning-soft",
      toneText: "text-warning-soft-foreground",
    },
    {
      label: t("dashboard.deliveredToday"),
      value: deliveredToday,
      icon: PackageCheck,
      toneBg: "bg-success-soft",
      toneText: "text-success-soft-foreground",
    },
    {
      label: t("dashboard.failedToday"),
      value: failedToday,
      icon: AlertTriangle,
      toneBg: "bg-danger-soft",
      toneText: "text-danger-soft-foreground",
    },
  ];

  return (
    <div className="space-y-4">
      {/* 4 Status Metric Cards */}
      <div className="grid grid-cols-2 gap-3.5 sm:gap-4 lg:grid-cols-4">
        {metricCards.map((card) => (
          <div
            key={card.label}
            className="group relative rounded-3xl border border-border/60 bg-card/90 backdrop-blur-md p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
          >
            {/* Specular top highlight */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent"
              aria-hidden="true"
            />
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {card.label}
                </p>
                <p className="mt-2 text-3xl font-extrabold tabular-nums tracking-tight text-foreground">
                  {card.value}
                </p>
              </div>
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${card.toneBg} ${card.toneText}`}
              >
                <card.icon className="h-5 w-5" aria-hidden="true" />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* COD + Parcels in hand cards */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-4">
        <div className="relative rounded-3xl border border-border/60 bg-card/90 backdrop-blur-md p-5 sm:p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-500/40 hover:shadow-md">
          {/* Specular top highlight */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent"
            aria-hidden="true"
          />
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t("dashboard.codToCollect")}
              </p>
              <p className="mt-2 font-mono text-3xl font-extrabold tabular-nums tracking-tight text-foreground">
                {bdt(codToCollect)}
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Pending cash collection from current runsheet leg
              </p>
            </div>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-warning-soft text-warning-soft-foreground shadow-2xs">
              <Wallet className="h-6 w-6" aria-hidden="true" />
            </span>
          </div>
        </div>

        <div className="relative rounded-3xl border border-border/60 bg-card/90 backdrop-blur-md p-5 sm:p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
          {/* Specular top highlight */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"
            aria-hidden="true"
          />
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t("dashboard.parcelsInHand")}
              </p>
              <p className="mt-2 text-3xl font-extrabold tabular-nums tracking-tight text-foreground">
                {parcelsInHand}
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Packages currently dispatched with you on the road
              </p>
            </div>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary shadow-2xs">
              <Bike className="h-6 w-6" aria-hidden="true" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
