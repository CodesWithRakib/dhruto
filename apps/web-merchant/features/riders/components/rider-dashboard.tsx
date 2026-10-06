"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, Button, Badge } from "@dhruto/ui";
import {
  Bike,
  Package,
  PackageCheck,
  CheckCircle2,
  AlertTriangle,
  Wallet,
  RefreshCw,
  Play,
} from "lucide-react";
import {
  useGetRiderDashboardQuery,
  useGetRiderTasksQuery,
  useSetDutyMutation,
} from "../api/riders.api";
import { Link } from "@/lib/navigation";
import { RIDER_ROUTES } from "@/config/routes";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { getApiErrorMessage } from "@/lib/api-error";
import { RiderDutyStatus } from "@dhruto/contracts";
import { toast } from "sonner";

/**
 * Rider dashboard: live task counts, COD still to collect and the next
 * delivery CTA. Every number comes from `GET /riders/me/dashboard`.
 */
export function RiderDashboard() {
  const t = useTranslations("Rider");
  const {
    data: dashboardData,
    isLoading,
    isError,
    refetch,
  } = useGetRiderDashboardQuery();
  const { data: tasksData, refetch: refetchTasks } = useGetRiderTasksQuery();
  const [setDuty, { isLoading: isTogglingDuty }] = useSetDutyMutation();

  const dashboard = dashboardData?.data;
  const tasks = tasksData?.data ?? [];
  const nextTask =
    tasks.find((task) => task.status === "OUT_FOR_DELIVERY") ??
    tasks.find((task) => task.status === "ASSIGNED_TO_RIDER");

  const handleDutyToggle = async () => {
    if (!dashboard) return;
    const next =
      dashboard.duty === RiderDutyStatus.ON_DUTY ? RiderDutyStatus.OFF_DUTY : RiderDutyStatus.ON_DUTY;
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
      <div className="mx-auto max-w-4xl px-4 py-24 text-center" role="status" aria-live="polite">
        <RefreshCw className="mx-auto mb-3 h-8 w-8 animate-spin text-primary" aria-hidden="true" />
        <p className="font-medium text-muted-foreground">{t("loading")}</p>
      </div>
    );
  }

  if (isError || !dashboard) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6">
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
    { label: t("dashboard.assigned"), value: dashboard.counts.assigned, icon: Package, tone: "bg-info-soft text-info" },
    { label: t("dashboard.inProgress"), value: dashboard.counts.inProgress, icon: Play, tone: "bg-warning-soft text-warning" },
    { label: t("dashboard.deliveredToday"), value: dashboard.counts.deliveredToday, icon: PackageCheck, tone: "bg-success-soft text-success" },
    { label: t("dashboard.failedToday"), value: dashboard.counts.failedToday, icon: AlertTriangle, tone: "bg-danger-soft text-danger" },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <PageHeader
        title={t("dashboard.title")}
        description={t("dashboard.subtitle", {
          name: "",
          code: dashboard.riderCode,
          hub: dashboard.hubName,
        })}
        actions={
          <>
            <Badge variant={onDuty ? "success" : "secondary"} className="h-9 px-3 text-xs">
              {onDuty ? t("onDuty") : t("offDuty")}
            </Badge>
            <Button variant="outline" size="sm" onClick={handleDutyToggle} disabled={isTogglingDuty} className="h-9 text-xs">
              {onDuty ? t("goOffDuty") : t("goOnDuty")}
            </Button>
            <Button variant="outline" size="sm" onClick={handleRefresh} className="h-9 text-xs" aria-label={t("refresh")}>
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </>
        }
      />

      {/* Live metrics */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metricCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="flex items-center justify-between gap-2 p-4">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {card.label}
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{card.value}</p>
              </div>
              <span className={`rounded-lg p-2.5 ${card.tone}`}>
                <card.icon className="h-5 w-5" aria-hidden="true" />
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* COD + next delivery */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center justify-between gap-2 p-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("dashboard.codToCollect")}
              </p>
              <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-foreground">
                ৳{dashboard.codToCollect.toLocaleString()}
              </p>
            </div>
            <span className="rounded-lg bg-warning-soft p-2.5 text-warning">
              <Wallet className="h-5 w-5" aria-hidden="true" />
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between gap-2 p-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("dashboard.parcelsInHand")}
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                {dashboard.parcelsInHand}
              </p>
            </div>
            <span className="rounded-lg bg-primary-soft p-2.5 text-primary">
              <Bike className="h-5 w-5" aria-hidden="true" />
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Next delivery CTA */}
      {nextTask ? (
        <Card className="border-primary/30">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="rounded-lg bg-primary/10 p-2.5 text-primary">
                <Package className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="font-mono text-sm font-bold text-foreground">{nextTask.trackingCode}</p>
                <p className="text-xs text-muted-foreground">
                  {nextTask.recipientName} · {nextTask.status}
                  {nextTask.codAmount > 0 ? ` · ৳${nextTask.codAmount.toLocaleString()}` : ""}
                </p>
              </div>
            </div>
            <Link href={RIDER_ROUTES.task(nextTask.id)}>
              <Button className="w-full gap-1.5 sm:w-auto">
                <Play className="h-4 w-4" aria-hidden="true" />
                {nextTask.status === "OUT_FOR_DELIVERY"
                  ? t("details.attemptDelivery")
                  : t("dashboard.startNext")}
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          icon={CheckCircle2}
          title={t("dashboard.noTasks")}
          description={t("dashboard.noTasksDescription")}
          action={
            <Link href={RIDER_ROUTES.tasks}>
              <Button variant="outline" size="sm">
                {t("dashboard.viewTasks")}
              </Button>
            </Link>
          }
        />
      )}
    </div>
  );
}
