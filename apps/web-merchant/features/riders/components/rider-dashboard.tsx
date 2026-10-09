"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Card, Button } from "@dhruto/ui";
import {
  Bike,
  Package,
  PackageCheck,
  CheckCircle2,
  AlertTriangle,
  Wallet,
  RefreshCw,
  Play,
  Power,
  Phone,
  Copy,
} from "lucide-react";
import {
  useGetRiderDashboardQuery,
  useGetRiderTasksQuery,
  useSetDutyMutation,
} from "../api/riders.api";
import { Link } from "@/lib/navigation";
import { RIDER_ROUTES } from "@/config/routes";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/feedback/states";
import { getApiErrorMessage } from "@/lib/api-error";
import { RiderDutyStatus } from "@dhruto/contracts";
import { toast } from "sonner";
import { useFormatters } from "@/lib/format";

/**
 * Rider dashboard: live task counts, COD still to collect and the next
 * delivery CTA. Every number comes from `GET /riders/me/dashboard`.
 */
export function RiderDashboard() {
  const t = useTranslations("Rider");
  const { bdt } = useFormatters();
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

  const copyTracking = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(code);
  };

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
  const metricCards = [
    {
      label: t("dashboard.assigned"),
      value: dashboard.counts.assigned,
      icon: Package,
      toneBg: "bg-info-soft",
      toneBorder: "border-info/20",
      toneText: "text-info-soft-foreground",
    },
    {
      label: t("dashboard.inProgress"),
      value: dashboard.counts.inProgress,
      icon: Play,
      toneBg: "bg-warning-soft",
      toneBorder: "border-warning/20",
      toneText: "text-warning-soft-foreground",
    },
    {
      label: t("dashboard.deliveredToday"),
      value: dashboard.counts.deliveredToday,
      icon: PackageCheck,
      toneBg: "bg-success-soft",
      toneBorder: "border-success/20",
      toneText: "text-success-soft-foreground",
    },
    {
      label: t("dashboard.failedToday"),
      value: dashboard.counts.failedToday,
      icon: AlertTriangle,
      toneBg: "bg-danger-soft",
      toneBorder: "border-danger/20",
      toneText: "text-danger-soft-foreground",
    },
  ];

  return (
    <div className="w-full space-y-6 pb-6">
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
              <span className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/20 px-3.5 py-2 text-xs font-bold text-emerald-200 shadow-xs backdrop-blur-md">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                {t("onDuty")}
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-bold text-white/80 shadow-xs backdrop-blur-md">
                <span className="h-2 w-2 rounded-full bg-white/40" />
                {t("offDuty")}
              </span>
            )}
            <button
              type="button"
              onClick={handleDutyToggle}
              disabled={isTogglingDuty}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-white/25 bg-white/15 px-3.5 text-xs font-bold text-white shadow-xs backdrop-blur-md transition-all duration-200 hover:bg-white/25 active:scale-[0.98] disabled:opacity-50"
            >
              <Power className="h-3.5 w-3.5" aria-hidden="true" />
              {onDuty ? t("goOffDuty") : t("goOnDuty")}
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/25 bg-white/15 text-white shadow-xs backdrop-blur-md transition-all duration-200 hover:bg-white/25 active:scale-[0.98]"
              aria-label={t("refresh")}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetchingTasks ? "animate-spin" : ""}`} aria-hidden="true" />
            </button>
          </div>
        }
      />

      {/* Live metrics */}
      <div className="grid grid-cols-2 gap-3.5 sm:gap-4 lg:grid-cols-4">
        {metricCards.map((card) => (
          <Card
            key={card.label}
            className="rounded-2xl border-border/80 bg-card p-5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
          >
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
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border shadow-2xs ${card.toneBg} ${card.toneBorder} ${card.toneText}`}
              >
                <card.icon className="h-5 w-5" aria-hidden="true" />
              </span>
            </div>
          </Card>
        ))}
      </div>

      {/* COD + Parcels in hand */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-4">
        <Card className="rounded-2xl border-border/80 bg-card p-5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t("dashboard.codToCollect")}
              </p>
              <p className="mt-2 font-mono text-3xl font-extrabold tabular-nums tracking-tight text-foreground">
                {bdt(dashboard.codToCollect)}
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Pending collection from current delivery run
              </p>
            </div>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-warning/25 bg-warning-soft text-warning-soft-foreground shadow-2xs">
              <Wallet className="h-6 w-6" aria-hidden="true" />
            </span>
          </div>
        </Card>

        <Card className="rounded-2xl border-border/80 bg-card p-5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t("dashboard.parcelsInHand")}
              </p>
              <p className="mt-2 text-3xl font-extrabold tabular-nums tracking-tight text-foreground">
                {dashboard.parcelsInHand}
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Packages currently dispatched to you for delivery
              </p>
            </div>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary-soft text-primary shadow-2xs">
              <Bike className="h-6 w-6" aria-hidden="true" />
            </span>
          </div>
        </Card>
      </div>

      {/* Next delivery CTA */}
      {nextTask ? (
        <Card className="overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-r from-primary/[0.06] via-card to-primary/[0.02] p-5 shadow-sm transition-all duration-200 hover:shadow-md">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/25 bg-primary-soft text-primary shadow-xs">
                <Package className="h-6 w-6" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-lg border border-primary/25 bg-primary-soft px-2.5 py-0.5 font-mono text-xs font-bold text-primary">
                    {nextTask.trackingCode}
                    <button
                      type="button"
                      onClick={() => copyTracking(nextTask.trackingCode)}
                      className="text-primary/70 hover:text-primary"
                      aria-label="Copy code"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </span>
                  <span className="inline-flex items-center rounded-full border border-border/80 bg-surface px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                    {nextTask.status === "OUT_FOR_DELIVERY" ? "Out for Delivery" : "Assigned"}
                  </span>
                </div>
                <p className="mt-1.5 truncate text-base font-bold text-foreground">
                  {nextTask.recipientName}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {nextTask.deliveryAddress}
                  {[nextTask.thana, nextTask.district].filter(Boolean).length > 0
                    ? `, ${[nextTask.thana, nextTask.district].filter(Boolean).join(", ")}`
                    : ""}
                </p>
                {nextTask.codAmount > 0 && (
                  <p className="mt-1 font-mono text-xs font-semibold text-foreground">
                    COD to collect: <span className="font-bold text-primary">{bdt(nextTask.codAmount)}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-nowrap">
              {nextTask.recipientPhone && (
                <a
                  href={`tel:${nextTask.recipientPhone}`}
                  className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-border/80 bg-surface px-3.5 text-xs font-bold text-foreground shadow-2xs transition-colors hover:bg-surface-muted"
                >
                  <Phone className="h-4 w-4 text-success" aria-hidden="true" />
                  <span className="hidden sm:inline">{t("tasks.callCustomer")}</span>
                </a>
              )}
              <Link href={RIDER_ROUTES.task(nextTask.id)} className="w-full sm:w-auto">
                <Button className="h-11 w-full gap-2 rounded-xl px-5 text-sm font-bold shadow-md hover:shadow-primary/25 sm:w-auto">
                  <Play className="h-4 w-4" aria-hidden="true" />
                  {nextTask.status === "OUT_FOR_DELIVERY"
                    ? t("details.attemptDelivery")
                    : t("dashboard.startNext")}
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      ) : (
        <EmptyState
          icon={CheckCircle2}
          title={t("dashboard.noTasks")}
          description={t("dashboard.noTasksDescription")}
          action={
            <Link href={RIDER_ROUTES.tasks}>
              <Button variant="outline" size="sm" className="rounded-xl">
                {t("dashboard.viewTasks")}
              </Button>
            </Link>
          }
        />
      )}
    </div>
  );
}
