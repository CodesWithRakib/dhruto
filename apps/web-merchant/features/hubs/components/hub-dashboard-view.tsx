"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpFromLine,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Hourglass,
  Inbox,
  Layers,
  Package,
  PackageCheck,
  PackageOpen,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  Truck,
  Wallet,
  Warehouse,
} from "lucide-react";
import { Badge, Button } from "@dhruto/ui";
import { Link } from "@/lib/navigation";
import { HUB_ROUTES } from "@/config/routes";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/feedback/states";
import { useActiveHub } from "../hooks/use-active-hub";
import { HubSelector } from "./hub-selector";
import { useGetHubDashboardQuery, useGetExceptionsQuery } from "../api/hubs.api";
import { ExceptionStatus } from "@dhruto/contracts";
import { useFormatters } from "@/lib/format";
import { HubIllustrationBg } from "@/components/visual/illustration-backgrounds";

/**
 * Hub operations dashboard.
 *
 * Every number is a live aggregate from `GET /hubs/:id/dashboard` — no
 * placeholder metrics. Includes interactive 5-stage Hub Operations Pipeline
 * and Shift SOP guidance.
 */
export function HubDashboardView() {
  const t = useTranslations("Hub");
  const { time: fmtTime } = useFormatters();
  const [showSop, setShowSop] = React.useState(true);
  const [activeSopTab, setActiveSopTab] = React.useState<"morning" | "midday" | "evening">("morning");

  const {
    hubs,
    activeHub,
    activeHubId,
    setActiveHubId,
    isLoading: hubsLoading,
    isError: hubsError,
    refetch: refetchHubs,
  } = useActiveHub();

  const {
    data: dashboardData,
    isLoading: dashboardLoading,
    isError: dashboardError,
    refetch: refetchDashboard,
  } = useGetHubDashboardQuery(activeHubId ?? "", { skip: !activeHubId });

  const { data: exceptionsData } = useGetExceptionsQuery(
    { hubId: activeHubId ?? undefined, status: ExceptionStatus.OPEN },
    { skip: !activeHubId },
  );

  const dashboard = dashboardData?.data;
  const metrics = dashboard?.metrics;
  const recentScans = dashboard?.recentScans ?? [];
  const openExceptions = exceptionsData?.data ?? [];

  const handleRefresh = React.useCallback(() => {
    refetchHubs();
    refetchDashboard();
  }, [refetchHubs, refetchDashboard]);

  if (hubsLoading) {
    return (
      <div className="py-24 text-center" role="status" aria-live="polite">
        <RefreshCw className="mx-auto mb-3 h-8 w-8 animate-spin text-primary" aria-hidden="true" />
        <p className="font-medium text-muted-foreground">{t("loadingHubs")}</p>
      </div>
    );
  }

  if (hubsError || hubs.length === 0) {
    return (
      <EmptyState
        icon={Warehouse}
        title={t("noHubs")}
        description={t("noHubsDescription")}
        className="mx-auto mt-12 max-w-md"
      />
    );
  }

  const metricCards = metrics
    ? [
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
      ]
    : [];

  const quickActions = [
    {
      href: HUB_ROUTES.scanner,
      title: t("dashboard.scanParcel"),
      description: t("dashboard.scanParcelDescription"),
      icon: ScanLine,
    },
    {
      href: HUB_ROUTES.parcels,
      title: t("dashboard.lookupParcel"),
      description: t("dashboard.lookupParcelDescription"),
      icon: Inbox,
    },
    {
      href: HUB_ROUTES.bags,
      title: t("dashboard.createBag"),
      description: t("dashboard.createBagDescription"),
      icon: Package,
    },
    {
      href: HUB_ROUTES.manifests,
      title: t("dashboard.createManifest"),
      description: t("dashboard.createManifestDescription"),
      icon: Truck,
    },
    {
      href: HUB_ROUTES.cash,
      title: t("dashboard.cashDesk"),
      description: t("dashboard.cashDeskDescription"),
      icon: Wallet,
    },
  ];

  const pipelineStages = [
    {
      step: 1,
      title: "1. Inbound Scans",
      subtitle: `${metrics?.inboundToday ?? 0} packages received today`,
      icon: ArrowDownToLine,
      color: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      actionHref: HUB_ROUTES.scanner,
      actionText: "Scan Inbound",
    },
    {
      step: 2,
      title: "2. Sorting & Bags",
      subtitle: `${metrics?.openBags ?? 0} open · ${metrics?.sealedBags ?? 0} sealed`,
      icon: PackageOpen,
      color: "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200",
      actionHref: HUB_ROUTES.bags,
      actionText: "Manage Bags",
    },
    {
      step: 3,
      title: "3. Linehaul Manifests",
      subtitle: `${metrics?.pendingManifests ?? 0} pending · ${metrics?.dispatchedManifests ?? 0} dispatched`,
      icon: Truck,
      color: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
      actionHref: HUB_ROUTES.manifests,
      actionText: "Manifests",
    },
    {
      step: 4,
      title: "4. Last-Mile Inventory",
      subtitle: `${metrics?.parcelsAtHub ?? 0} parcels currently at hub`,
      icon: Package,
      color: "border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300",
      actionHref: HUB_ROUTES.parcels,
      actionText: "Floor Inventory",
    },
    {
      step: 5,
      title: "5. Cash Desk & Audit",
      subtitle: `${metrics?.openExceptions ?? 0} exceptions · Cash hand-in`,
      icon: Wallet,
      color: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
      actionHref: HUB_ROUTES.cash,
      actionText: "Cash Desk",
    },
  ];

  return (
    <div className="relative w-full space-y-6 pb-6">
      <HubIllustrationBg opacity={0.35} />
      <PageHeader
        title={t("dashboard.title")}
        description={
          activeHub
            ? t("dashboard.subtitle", { hub: `${activeHub.name} (${activeHub.code})` })
            : undefined
        }
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <HubSelector hubs={hubs} activeHubId={activeHubId} onChange={setActiveHubId} />
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${dashboardLoading ? "animate-spin" : ""}`} aria-hidden="true" />
              <span>{t("refresh")}</span>
            </Button>
          </div>
        }
      />

      {dashboardError ? (
        <EmptyState
          icon={AlertTriangle}
          tone="error"
          title={t("scanner.errorTitle")}
          action={
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              {t("retry")}
            </Button>
          }
        />
      ) : null}

      {/* Hub Operational Pipeline Overview */}
      <section aria-label="Hub Operational Pipeline" className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <Layers className="h-4 w-4" />
            </span>
            <h2 className="text-sm font-extrabold tracking-tight text-foreground">
              Hub Operations Pipeline
            </h2>
            <Badge variant="primary-soft" className="text-[10px] uppercase font-bold">Live Flow</Badge>
          </div>
          <Link href="/workflow" className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1">
            <span>System Guide</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {pipelineStages.map((stage) => {
            const Icon = stage.icon;
            return (
              <div
                key={stage.step}
                className="group relative flex flex-col justify-between rounded-2xl bg-surface-elevated p-4 transition-all duration-200 hover:-translate-y-0.5 hover:bg-surface-muted/60"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${stage.color}`}>
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Stage {stage.step}
                    </span>
                  </div>
                  <h3 className="mt-3 text-xs font-bold text-foreground">
                    {stage.title}
                  </h3>
                  <p className="mt-1 text-[11px] text-muted-foreground line-clamp-1">
                    {stage.subtitle}
                  </p>
                </div>

                <div className="mt-3 pt-3">
                  <Link href={stage.actionHref} className="block">
                    <Button variant="ghost" size="sm" className="h-8 w-full text-[11px] font-bold justify-between px-2.5 rounded-xl bg-surface-muted/50 hover:bg-surface-muted hover:text-primary">
                      <span>{stage.actionText}</span>
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Hub Operating SOP & Guidelines (Collapsible Card) */}
      <div className="rounded-3xl bg-surface-elevated overflow-hidden p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-foreground">
                  Hub Standard Operating Procedures (SOP)
                </h3>
                <Badge variant="primary-soft" className="text-[10px] font-bold border-0">Operator Handbook</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Official shift protocol for high-throughput scanning, bag sealing, and COD handover.
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSop(!showSop)}
            className="gap-1.5 self-start sm:self-center rounded-xl bg-surface-muted/60 hover:bg-surface-muted"
          >
            <span>{showSop ? "Collapse SOP" : "View SOP Guide"}</span>
            {showSop ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </div>

        {showSop ? (
          <div className="mt-4 pt-4 space-y-3.5">
            <div className="flex flex-wrap gap-2">
              {[
                { id: "morning", label: "Morning Shift (07:00 - 11:00)", badge: "Inbound & Runsheet" },
                { id: "midday", label: "Mid-day Shift (11:00 - 16:00)", badge: "Sorting & Bagging" },
                { id: "evening", label: "Evening Shift (16:00 - 21:00)", badge: "Cash Desk & Manifests" },
              ].map((shift) => (
                <button
                  key={shift.id}
                  type="button"
                  onClick={() => setActiveSopTab(shift.id as any)}
                  className={`inline-flex items-center gap-2 rounded-2xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                    activeSopTab === shift.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-surface-muted/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>{shift.label}</span>
                  <span className={`text-[10px] rounded-lg px-1.5 py-0.5 ${activeSopTab === shift.id ? "bg-white/20 text-white" : "bg-background/60 text-muted-foreground"}`}>
                    {shift.badge}
                  </span>
                </button>
              ))}
            </div>

            {activeSopTab === "morning" && (
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 pt-1">
                <div className="rounded-2xl bg-surface-muted/40 p-3.5">
                  <span className="font-mono text-xs font-bold text-primary block">Step 1 · Linehaul Arrival</span>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    Inspect inbound vehicle seals, verify manifest ID against incoming linehaul truck, and mark manifest received.
                  </p>
                </div>
                <div className="rounded-2xl bg-surface-muted/40 p-3.5">
                  <span className="font-mono text-xs font-bold text-primary block">Step 2 · High-Speed Inbound Scan</span>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    Use barcode scanner in Continuous Inbound mode. Every parcel status immediately transitions to <code className="text-primary font-bold">AT_HUB</code>.
                  </p>
                </div>
                <div className="rounded-2xl bg-surface-muted/40 p-3.5">
                  <span className="font-mono text-xs font-bold text-primary block">Step 3 · Rider Dispatch Runsheet</span>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    Sort packages by delivery zone and assign to on-duty delivery riders for morning last-mile attempt.
                  </p>
                </div>
              </div>
            )}

            {activeSopTab === "midday" && (
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 pt-1">
                <div className="rounded-2xl bg-surface-muted/40 p-3.5">
                  <span className="font-mono text-xs font-bold text-primary block">Step 1 · Bin Sorting</span>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    Direct parcels into dedicated destination bins (Chittagong, Sylhet, Rajshahi, Khulna, etc.).
                  </p>
                </div>
                <div className="rounded-2xl bg-surface-muted/40 p-3.5">
                  <span className="font-mono text-xs font-bold text-primary block">Step 2 · Bag Consolidation</span>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    Open a new bag for the destination hub, scan parcels into the bag, and audit package weights.
                  </p>
                </div>
                <div className="rounded-2xl bg-surface-muted/40 p-3.5">
                  <span className="font-mono text-xs font-bold text-primary block">Step 3 · Tamper-Evident Seal</span>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    Affix serialized security seal tag, enter the seal tag number, and transition bag status to <code className="text-primary font-bold">SEALED</code>.
                  </p>
                </div>
              </div>
            )}

            {activeSopTab === "evening" && (
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 pt-1">
                <div className="rounded-2xl bg-surface-muted/40 p-3.5">
                  <span className="font-mono text-xs font-bold text-primary block">Step 1 · Rider Cash Hand-In</span>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    Collect and count COD cash from returning riders at the Cash Desk. Confirm counted amount against system expected total.
                  </p>
                </div>
                <div className="rounded-2xl bg-surface-muted/40 p-3.5">
                  <span className="font-mono text-xs font-bold text-primary block">Step 2 · Discrepancy Logging</span>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    If counted cash differs, system automatically opens a formal discrepancy ticket with audit notes for finance review.
                  </p>
                </div>
                <div className="rounded-2xl bg-surface-muted/40 p-3.5">
                  <span className="font-mono text-xs font-bold text-primary block">Step 3 · Night Linehaul Dispatch</span>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    Bundle sealed bags into an outbound Manifest, assign vehicle number and driver phone, and mark <code className="text-primary font-bold">DISPATCHED</code>.
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Quick actions - 5 columns */}
      <section aria-label={t("dashboard.quickActions")}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="group flex flex-col justify-between rounded-3xl bg-surface-elevated p-4 transition-all duration-200 hover:-translate-y-0.5 hover:bg-surface-muted/60"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <action.icon className="h-5 w-5" aria-hidden="true" />
                </span>
              </div>
              <div className="mt-3">
                <span className="block text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                  {action.title}
                </span>
                <span className="mt-1 block text-[11px] leading-relaxed text-muted-foreground line-clamp-2">
                  {action.description}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Live metrics */}
      <section aria-label={t("dashboard.title")}>
        {dashboardLoading || !metrics ? (
          <div
            className="grid grid-cols-2 gap-3.5 sm:gap-4 md:grid-cols-3 lg:grid-cols-5"
            role="status"
            aria-live="polite"
          >
            {Array.from({ length: 9 }).map((_, index) => (
              <div key={index} className="rounded-3xl bg-surface-elevated p-4 sm:p-5">
                <div className="space-y-2">
                  <div className="h-3.5 w-2/3 animate-pulse rounded bg-surface-muted" />
                  <div className="h-8 w-1/3 animate-pulse rounded bg-surface-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3.5 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
            {metricCards.map((card) => (
              <div
                key={card.label}
                className="rounded-3xl bg-surface-elevated p-4 sm:p-5 transition-all duration-200 hover:-translate-y-0.5 hover:bg-surface-muted/60"
              >
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
        )}
      </section>

      {/* Exceptions needing attention */}
      {openExceptions.length > 0 ? (
        <div className="rounded-3xl bg-amber-500/10 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-700 dark:text-amber-300">
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-extrabold text-foreground">
                  {t("dashboard.exceptionsNeedAttention")} ({openExceptions.length})
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {openExceptions.slice(0, 4).map((e, idx) => (
                    <span
                      key={idx}
                      className="rounded-lg bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-800 dark:text-amber-200"
                    >
                      {e.type.replace(/_/g, " ")}
                    </span>
                  ))}
                  {openExceptions.length > 4 ? (
                    <span className="text-[11px] font-medium text-muted-foreground">
                      +{openExceptions.length - 4} more
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
            <Link href="/hub/exceptions" className="shrink-0">
              <Button size="sm" variant="ghost" className="h-10 gap-1.5 rounded-xl bg-surface-elevated text-xs font-bold text-amber-800 dark:text-amber-200 hover:bg-amber-500/15">
                <ClipboardList className="h-4 w-4" aria-hidden="true" />
                <span>{t("dashboard.reviewExceptions")}</span>
              </Button>
            </Link>
          </div>
        </div>
      ) : null}

      {/* Recent scans */}
      <div className="overflow-hidden rounded-3xl bg-surface-elevated">
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {t("dashboard.recentScans")}
          </h2>
          <Link
            href={HUB_ROUTES.scanner}
            className="text-xs font-bold text-primary hover:underline"
          >
            {t("dashboard.viewAll")}
          </Link>
        </div>
        {recentScans.length === 0 ? (
          <p className="px-4 py-10 text-center text-xs text-muted-foreground">
            {t("dashboard.noRecentScans")}
          </p>
        ) : (
          <ul className="divide-y divide-border/20">
            {recentScans.slice(0, 8).map((scan) => (
              <li key={scan.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-xs transition-colors hover:bg-surface-muted/30">
                <span className="font-mono text-xs font-bold text-foreground">
                  {scan.trackingCode ?? scan.bagCode ?? "—"}
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    scan.outcome === "APPLIED"
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                      : scan.outcome === "DUPLICATE"
                        ? "bg-surface-muted text-muted-foreground"
                        : "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                  }`}
                >
                  {scan.scanType.replace(/_/g, " ")} · {scan.outcome}
                </span>
                <span className="ml-auto font-mono text-[11px] tabular-nums text-muted-foreground">
                  {fmtTime(scan.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
