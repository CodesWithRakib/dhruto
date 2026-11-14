"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Button, Badge } from "@dhruto/ui";
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
  ClipboardList,
  History,
  User,
  Settings,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
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
import { RiderIllustrationBg } from "@/components/visual/illustration-backgrounds";

/**
 * Rider dashboard: live task counts, COD still to collect and the next
 * delivery CTA. Every number comes from `GET /riders/me/dashboard`.
 */
export function RiderDashboard() {
  const t = useTranslations("Rider");
  const { bdt } = useFormatters();
  const [showSop, setShowSop] = React.useState(true);
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
  const totalTasks =
    dashboard.counts.assigned +
    dashboard.counts.inProgress +
    dashboard.counts.deliveredToday +
    dashboard.counts.failedToday;
  const completedTasks = dashboard.counts.deliveredToday;
  const completionPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

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

  const quickNav = [
    {
      title: "Delivery Runsheet",
      subtitle: `${dashboard.counts.assigned + dashboard.counts.inProgress} tasks active`,
      href: RIDER_ROUTES.tasks,
      icon: ClipboardList,
      badge: `${dashboard.counts.inProgress} In-Flight`,
    },
    {
      title: "Delivery History",
      subtitle: `${dashboard.counts.deliveredToday} completed today`,
      href: RIDER_ROUTES.history,
      icon: History,
      badge: "Settled",
    },
    {
      title: "Rider Profile",
      subtitle: `${dashboard.riderCode} · Hub ${dashboard.hubName}`,
      href: RIDER_ROUTES.profile,
      icon: User,
      badge: "Fleet ID",
    },
    {
      title: "Shift Settings",
      subtitle: "Duty, vehicle & notification toggles",
      href: RIDER_ROUTES.settings,
      icon: Settings,
      badge: "Config",
    },
  ];

  return (
    <div className="relative w-full space-y-6 pb-6">
      <RiderIllustrationBg opacity={0.35} />
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
              className="gap-1.5"
            >
              <Power className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{onDuty ? t("goOffDuty") : t("goOnDuty")}</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              aria-label={t("refresh")}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetchingTasks ? "animate-spin" : ""}`} aria-hidden="true" />
            </Button>
          </div>
        }
      />

      {/* Daily Runsheet Completion Tracker */}
      <div className="rounded-3xl bg-surface-elevated p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Bike className="h-4 w-4" />
              </span>
              <h2 className="text-sm font-extrabold text-foreground">
                Today's Delivery Runsheet
              </h2>
              <Badge variant="primary-soft" className="text-[10px] font-bold border-0">
                {completionPercent}% Completed
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {completedTasks} of {totalTasks} packages delivered · {dashboard.counts.inProgress} currently out for delivery
            </p>
          </div>

          <Link href={RIDER_ROUTES.tasks}>
            <Button size="sm" className="h-9 gap-1.5 rounded-xl px-4 text-xs font-bold">
              <ClipboardList className="h-3.5 w-3.5" />
              <span>Open Runsheet</span>
            </Button>
          </Link>
        </div>

        {/* Visual Progress Bar */}
        <div className="mt-4 space-y-1.5">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500 transition-all duration-500"
              style={{ width: `${Math.max(completionPercent, 4)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
            <span>Dispatched from Hub</span>
            <span className="font-bold text-foreground">{completedTasks} / {totalTasks} Parcels Done</span>
            <span>Close Shift</span>
          </div>
        </div>
      </div>

      {/* Live metrics */}
      <div className="grid grid-cols-2 gap-3.5 sm:gap-4 lg:grid-cols-4">
        {metricCards.map((card) => (
          <div
            key={card.label}
            className="rounded-3xl bg-surface-elevated p-5 transition-all duration-200 hover:-translate-y-0.5 hover:bg-surface-muted/60"
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
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${card.toneBg} ${card.toneText}`}
              >
                <card.icon className="h-5 w-5" aria-hidden="true" />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* COD + Parcels in hand */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-4">
        <div className="rounded-3xl bg-surface-elevated p-5 sm:p-6 transition-all duration-200 hover:-translate-y-0.5 hover:bg-surface-muted/60">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t("dashboard.codToCollect")}
              </p>
              <p className="mt-2 font-mono text-3xl font-extrabold tabular-nums tracking-tight text-foreground">
                {bdt(dashboard.codToCollect)}
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Pending cash collection from current runsheet leg
              </p>
            </div>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-warning-soft text-warning-soft-foreground">
              <Wallet className="h-6 w-6" aria-hidden="true" />
            </span>
          </div>
        </div>

        <div className="rounded-3xl bg-surface-elevated p-5 sm:p-6 transition-all duration-200 hover:-translate-y-0.5 hover:bg-surface-muted/60">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t("dashboard.parcelsInHand")}
              </p>
              <p className="mt-2 text-3xl font-extrabold tabular-nums tracking-tight text-foreground">
                {dashboard.parcelsInHand}
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Packages currently dispatched with you on the road
              </p>
            </div>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <Bike className="h-6 w-6" aria-hidden="true" />
            </span>
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <section aria-label="Rider Quick Navigation">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickNav.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group flex flex-col justify-between rounded-3xl bg-surface-elevated p-4 transition-all duration-200 hover:-translate-y-0.5 hover:bg-surface-muted/60"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                      {item.badge}
                    </span>
                  </div>
                  <h3 className="mt-3 text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                    {item.subtitle}
                  </p>
                </div>
                <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-primary">
                  <span>View Details</span>
                  <ArrowRight className="h-3 w-3" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Doorstep Delivery & Safety SOP Handbook */}
      <div className="rounded-3xl bg-surface-elevated p-5 sm:p-6 overflow-hidden">
        <div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-extrabold text-foreground">
                    Doorstep Delivery & Cash Protocol
                  </h3>
                  <Badge variant="primary-soft" className="text-[10px] font-bold border-0">Rider Safety SOP</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  4 mandatory steps for every delivery handoff and cash collection.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSop(!showSop)}
              className="inline-flex h-9 items-center justify-center gap-1.5 self-start sm:self-center rounded-xl bg-surface-muted/60 px-3 text-xs font-bold text-foreground hover:bg-surface-muted transition-colors"
            >
              <span>{showSop ? "Collapse SOP" : "View SOP Guide"}</span>
              {showSop ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>

          {showSop ? (
            <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4 border-t border-border/20 pt-4">
              <div className="rounded-2xl bg-surface-muted/40 p-3.5 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 font-bold text-xs">1</span>
                  <span className="text-xs font-bold text-foreground">GPS Navigation</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Open Google Maps / Waze directly from the task card to reach the customer address accurately.
                </p>
              </div>

              <div className="rounded-2xl bg-surface-muted/40 p-3.5 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-xs">2</span>
                  <span className="text-xs font-bold text-foreground">6-Digit OTP Handshake</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Request the 6-digit verification code from the customer before unboxing or handing over the package.
                </p>
              </div>

              <div className="rounded-2xl bg-surface-muted/40 p-3.5 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 font-bold text-xs">3</span>
                  <span className="text-xs font-bold text-foreground">Exact COD Collection</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Collect the exact cash amount shown on screen. Confirm physical cash or digital payment before marking done.
                </p>
              </div>

              <div className="rounded-2xl bg-surface-muted/40 p-3.5 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-500/10 text-purple-600 font-bold text-xs">4</span>
                  <span className="text-xs font-bold text-foreground">Hub Cash Hand-In</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  At the end of your shift, hand in all collected cash at the Hub Cash Desk to settle your daily ledger.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Next delivery CTA */}
      {nextTask ? (
        <div className="overflow-hidden rounded-3xl bg-primary/10 p-5 sm:p-6 transition-all duration-200">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/20 text-primary">
                <Package className="h-6 w-6" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-xl bg-primary/20 px-2.5 py-0.5 font-mono text-xs font-bold text-primary">
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
                  <span className="inline-flex items-center rounded-full bg-surface-elevated px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
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
                  className="inline-flex h-11 items-center justify-center gap-1.5 rounded-2xl bg-surface-elevated px-4 text-xs font-bold text-foreground transition-colors hover:bg-surface-muted"
                >
                  <Phone className="h-4 w-4 text-success" aria-hidden="true" />
                  <span className="hidden sm:inline">{t("tasks.callCustomer")}</span>
                </a>
              )}
              <Link href={RIDER_ROUTES.task(nextTask.id)} className="w-full sm:w-auto">
                <Button className="h-11 w-full gap-2 rounded-2xl px-5 text-sm font-bold sm:w-auto">
                  <Play className="h-4 w-4" aria-hidden="true" />
                  {nextTask.status === "OUT_FOR_DELIVERY"
                    ? t("details.attemptDelivery")
                    : t("dashboard.startNext")}
                </Button>
              </Link>
            </div>
          </div>
        </div>
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
