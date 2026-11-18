"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Badge, Card } from "@dhruto/ui";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { useGetOperationalAnalyticsQuery } from "@/features/analytics/api/analytics.api";
import { useGetSystemMetricsQuery } from "@/features/observability/api/observability.api";
import { cn } from "@/lib/cn";

type Health = "loading" | "healthy" | "degraded" | "unknown";

/**
 * Live network status for the admin console. Platform health comes from
 * `GET /system/metrics`; hub, rider and delivery-success figures come from
 * `GET /analytics/operations/overview`. Nothing here is hard-coded: while
 * data loads or fails the card says so instead of claiming "all systems active".
 */
export function AdminNetworkStatus() {
  const t = useTranslations("Admin.networkStatus");
  const metrics = useGetSystemMetricsQuery(undefined, {
    pollingInterval: 60000,
    skipPollingIfUnfocused: true,
  });
  const ops = useGetOperationalAnalyticsQuery();
  const summary = ops.data?.data;

  const health: Health = metrics.isLoading
    ? "loading"
    : metrics.isError || !metrics.data
      ? "unknown"
      : metrics.data.status === "healthy"
        ? "healthy"
        : "degraded";

  const tone = {
    loading: { icon: Loader2, box: "bg-surface-muted text-muted-foreground", badge: "muted" },
    healthy: { icon: CheckCircle2, box: "bg-success/10 text-success", badge: "success-soft" },
    degraded: { icon: AlertTriangle, box: "bg-warning/10 text-warning", badge: "warning-soft" },
    unknown: { icon: AlertTriangle, box: "bg-danger/10 text-danger", badge: "danger-soft" },
  } as const;
  const { icon: Icon, box, badge } = tone[health];

  const chips: Array<{ dot: string; label: string }> = summary
    ? [
        {
          dot: "bg-success",
          label: t("deliverySuccess", { rate: summary.networkSuccessRate.toFixed(1) }),
        },
        { dot: "bg-info", label: t("activeHubs", { count: summary.activeHubsCount }) },
        { dot: "bg-primary", label: t("activeRiders", { count: summary.activeRidersCount }) },
      ]
    : [];

  return (
    <Card className="rounded-2xl bg-surface-elevated p-4.5 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span
            className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", box)}
          >
            <Icon className={cn("h-5 w-5", health === "loading" && "animate-spin")} />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-extrabold text-foreground">{t("title")}</h3>
              <Badge variant={badge} className="text-[10px] font-bold">
                {t(`state.${health}`)}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{t(`description.${health}`)}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs" aria-live="polite">
          {ops.isLoading ? (
            <span className="text-[11px] text-muted-foreground">{t("loadingFigures")}</span>
          ) : ops.isError ? (
            <span className="text-[11px] text-danger">{t("figuresUnavailable")}</span>
          ) : (
            chips.map((chip) => (
              <span
                key={chip.label}
                className="inline-flex items-center gap-1.5 rounded-lg bg-surface-muted px-2.5 py-1 text-[11px] font-semibold text-foreground"
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", chip.dot)} />
                {chip.label}
              </span>
            ))
          )}
        </div>
      </div>
    </Card>
  );
}
