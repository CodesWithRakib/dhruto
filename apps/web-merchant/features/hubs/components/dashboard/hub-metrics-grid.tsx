"use client";

import React from "react";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Hourglass,
  Inbox,
  Package,
  PackageCheck,
  PackageOpen,
  Truck,
} from "lucide-react";
import type { HubDashboard } from "@dhruto/contracts";

interface HubMetricsGridProps {
  metrics?: HubDashboard["metrics"];
  isLoading?: boolean;
}

export function HubMetricsGrid({ metrics, isLoading }: HubMetricsGridProps) {
  const t = useTranslations("Hub");

  if (isLoading || !metrics) {
    return (
      <section aria-label="Hub Metrics Loading">
        <div
          className="grid grid-cols-2 gap-3.5 sm:gap-4 md:grid-cols-3 lg:grid-cols-5"
          role="status"
          aria-live="polite"
        >
          {Array.from({ length: 9 }).map((_, index) => (
            <div
              key={index}
              className="rounded-3xl bg-card/80 p-4 sm:p-5"
            >
              <div className="space-y-2">
                <div className="h-3.5 w-2/3 animate-pulse rounded bg-surface-muted" />
                <div className="h-8 w-1/3 animate-pulse rounded bg-surface-muted" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  const metricCards = [
    {
      label: t("dashboard.inboundToday"),
      value: metrics.inboundToday,
      icon: ArrowDownToLine,
      tone: "bg-success-soft text-success",
    },
    {
      label: t("dashboard.outboundToday"),
      value: metrics.outboundToday,
      icon: ArrowUpFromLine,
      tone: "bg-info-soft text-info",
    },
    {
      label: t("dashboard.parcelsAtHub"),
      value: metrics.parcelsAtHub,
      icon: Package,
      tone: "bg-primary-soft text-primary",
    },
    {
      label: t("dashboard.openBags"),
      value: metrics.openBags,
      icon: PackageOpen,
      tone: "bg-warning-soft text-warning",
    },
    {
      label: t("dashboard.sealedBags"),
      value: metrics.sealedBags,
      icon: PackageCheck,
      tone: "bg-success-soft text-success",
    },
    {
      label: t("dashboard.pendingManifests"),
      value: metrics.pendingManifests,
      icon: Hourglass,
      tone: "bg-warning-soft text-warning",
    },
    {
      label: t("dashboard.dispatchedManifests"),
      value: metrics.dispatchedManifests,
      icon: Truck,
      tone: "bg-info-soft text-info",
    },
    {
      label: t("dashboard.expectedInbound"),
      value: metrics.expectedInboundManifests,
      icon: Inbox,
      tone: "bg-primary-soft text-primary",
    },
    {
      label: t("dashboard.openExceptions"),
      value: metrics.openExceptions,
      icon: AlertTriangle,
      tone: "bg-danger-soft text-danger",
    },
  ];

  return (
    <section aria-label={t("dashboard.title")}>
      <div className="grid grid-cols-2 gap-3.5 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
        {metricCards.map((card) => (
          <div
            key={card.label}
            className="group relative rounded-3xl bg-card/90 backdrop-blur-md p-4 sm:p-5 transition-all duration-200 hover:-translate-y-0.5"
          >
            {/* Specular top highlight */}

            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {card.label}
                </p>
                <p className="mt-2 text-2xl sm:text-3xl font-extrabold tabular-nums tracking-tight text-foreground">
                  {card.value}
                </p>
              </div>
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${card.tone}`}>
                <card.icon className="h-5 w-5" aria-hidden="true" />
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
