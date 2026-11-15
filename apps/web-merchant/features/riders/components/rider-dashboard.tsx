"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Button } from "@dhruto/ui";
import { Power, RefreshCw } from "lucide-react";
import {
  useGetRiderDashboardQuery,
  useGetRiderTasksQuery,
  useSetDutyMutation,
} from "../api/riders.api";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/feedback/states";
import { getApiErrorMessage } from "@/lib/api-error";
import { RiderDutyStatus } from "@dhruto/contracts";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { RiderRunsheetProgress } from "./dashboard/rider-runsheet-progress";
import { RiderMetricsGrid } from "./dashboard/rider-metrics-grid";
import { RiderQuickNav } from "./dashboard/rider-quick-nav";
import { RiderSafetySop } from "./dashboard/rider-safety-sop";
import { RiderNextTaskHero } from "./dashboard/rider-next-task-hero";

/**
 * Rider dashboard: live task counts, COD still to collect and the next delivery CTA.
 * Every metric is dynamic from `GET /riders/me/dashboard` — zero mock data.
 */
export function RiderDashboard() {
  const t = useTranslations("Rider");
  const { data: dashboardData, isLoading, isError, refetch } = useGetRiderDashboardQuery();
  const { data: tasksData, isFetching: isFetchingTasks, refetch: refetchTasks } = useGetRiderTasksQuery();
  const [setDuty, { isLoading: isTogglingDuty }] = useSetDutyMutation();

  const dashboard = dashboardData?.data;
  const tasks = tasksData?.data ?? [];
  const nextTask =
    tasks.find((task) => task.status === "OUT_FOR_DELIVERY") ??
    tasks.find((task) => task.status === "ASSIGNED_TO_RIDER");

  const handleDutyToggle = async () => {
    if (!dashboard) return;
    const next =
      dashboard.duty === RiderDutyStatus.ON_DUTY
        ? RiderDutyStatus.OFF_DUTY
        : RiderDutyStatus.ON_DUTY;
    try {
      const res = await setDuty({ duty: next }).unwrap();
      if (res.success) {
        toast.success(res.message);
        refetch();
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("dutyBlocked")));
    }
  };

  const handleRefresh = React.useCallback(() => {
    refetch();
    refetchTasks();
  }, [refetch, refetchTasks]);

  if (isLoading) {
    return (
      <div className="w-full px-4 py-24 text-center" role="status" aria-live="polite">
        <RefreshCw className="mx-auto mb-3 h-8 w-8 animate-spin text-primary" aria-hidden="true" />
        <p className="font-medium text-muted-foreground">{t("loading")}</p>
      </div>
    );
  }

  if (isError || !dashboard) {
    return (
      <div className="w-full space-y-6 pb-6">
        <EmptyState
          icon={AlertTriangle}
          tone="error"
          title={t("loading")}
          action={
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              {t("retry")}
            </Button>
          }
        />
      </div>
    );
  }

  const onDuty = dashboard.duty === RiderDutyStatus.ON_DUTY;
  const totalTasks =
    dashboard.counts.assigned +
    dashboard.counts.inProgress +
    dashboard.counts.deliveredToday +
    dashboard.counts.failedToday;
  const completedTasks = dashboard.counts.deliveredToday;
  const completionPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="relative w-full space-y-6 pb-6">
      <PageHeader
        title={t("dashboard.title")}
        description={t("dashboard.subtitle", {
          name: dashboard.riderName || "Rider",
          code: dashboard.riderCode,
          hub: dashboard.hubName,
        })}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            {onDuty ? (
              <span className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/20 px-3.5 py-2 text-xs font-bold text-emerald-200">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                {t("onDuty")}
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-xl bg-surface-muted px-3.5 py-2 text-xs font-bold text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                {t("offDuty")}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleDutyToggle}
              disabled={isTogglingDuty}
              className="gap-1.5 rounded-xl shadow-2xs"
            >
              <Power className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{onDuty ? t("goOffDuty") : t("goOnDuty")}</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              aria-label={t("refresh")}
              className="rounded-xl shadow-2xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetchingTasks ? "animate-spin" : ""}`} aria-hidden="true" />
            </Button>
          </div>
        }
      />

      {/* Daily Runsheet Completion Tracker */}
      <RiderRunsheetProgress
        completedTasks={completedTasks}
        totalTasks={totalTasks}
        inProgressTasks={dashboard.counts.inProgress}
        completionPercent={completionPercent}
      />

      {/* Live metrics & COD status */}
      <RiderMetricsGrid
        assigned={dashboard.counts.assigned}
        inProgress={dashboard.counts.inProgress}
        deliveredToday={dashboard.counts.deliveredToday}
        failedToday={dashboard.counts.failedToday}
        codToCollect={dashboard.codToCollect}
        parcelsInHand={dashboard.parcelsInHand}
      />

      {/* Quick Navigation Cards */}
      <RiderQuickNav
        activeCount={dashboard.counts.assigned + dashboard.counts.inProgress}
        inFlightCount={dashboard.counts.inProgress}
        deliveredTodayCount={dashboard.counts.deliveredToday}
        riderCode={dashboard.riderCode}
        hubName={dashboard.hubName}
      />

      {/* Doorstep Delivery & Safety SOP Handbook */}
      <RiderSafetySop />

      {/* Next delivery CTA */}
      <RiderNextTaskHero nextTask={nextTask} />
    </div>
  );
}
