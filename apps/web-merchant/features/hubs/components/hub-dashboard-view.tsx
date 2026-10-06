"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Inbox,
  Package,
  PackageOpen,
  PackageCheck,
  ScanLine,
  Truck,
  ClipboardList,
  Hourglass,
  RefreshCw,
  Warehouse,
} from "lucide-react";
import { Button, Card, CardContent, Badge } from "@dhruto/ui";
import { Link } from "@/lib/navigation";
import { HUB_ROUTES } from "@/config/routes";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { useActiveHub } from "../hooks/use-active-hub";
import { HubSelector } from "./hub-selector";
import {
  useGetHubDashboardQuery,
  useGetExceptionsQuery,
} from "../api/hubs.api";
import { ExceptionStatus } from "@dhruto/contracts";

/**
 * Hub operations dashboard.
 *
 * Every number is a live aggregate from `GET /hubs/:id/dashboard` — no
 * placeholder metrics. Quick actions route to the dedicated operational
 * surfaces (scanner, lookup, bags, manifests).
 */
export function HubDashboardView() {
  const t = useTranslations("Hub");
  const { hubs, activeHub, activeHubId, setActiveHubId, isLoading: hubsLoading, isError: hubsError, refetch: refetchHubs } = useActiveHub();

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
        { label: t("dashboard.inboundToday"), value: metrics.inboundToday, icon: ArrowDownToLine, tone: "bg-success-soft text-success" },
        { label: t("dashboard.outboundToday"), value: metrics.outboundToday, icon: ArrowUpFromLine, tone: "bg-info-soft text-info" },
        { label: t("dashboard.parcelsAtHub"), value: metrics.parcelsAtHub, icon: Package, tone: "bg-primary-soft text-primary" },
        { label: t("dashboard.openBags"), value: metrics.openBags, icon: PackageOpen, tone: "bg-warning-soft text-warning" },
        { label: t("dashboard.sealedBags"), value: metrics.sealedBags, icon: PackageCheck, tone: "bg-success-soft text-success" },
        { label: t("dashboard.pendingManifests"), value: metrics.pendingManifests, icon: Hourglass, tone: "bg-warning-soft text-warning" },
        { label: t("dashboard.dispatchedManifests"), value: metrics.dispatchedManifests, icon: Truck, tone: "bg-info-soft text-info" },
        { label: t("dashboard.expectedInbound"), value: metrics.expectedInboundManifests, icon: Inbox, tone: "bg-primary-soft text-primary" },
        { label: t("dashboard.openExceptions"), value: metrics.openExceptions, icon: AlertTriangle, tone: "bg-danger-soft text-danger" },
      ]
    : [];

  const quickActions = [
    { href: HUB_ROUTES.scanner, title: t("dashboard.scanParcel"), description: t("dashboard.scanParcelDescription"), icon: ScanLine },
    { href: HUB_ROUTES.parcels, title: t("dashboard.lookupParcel"), description: t("dashboard.lookupParcelDescription"), icon: Inbox },
    { href: HUB_ROUTES.bags, title: t("dashboard.createBag"), description: t("dashboard.createBagDescription"), icon: Package },
    { href: HUB_ROUTES.manifests, title: t("dashboard.createManifest"), description: t("dashboard.createManifestDescription"), icon: Truck },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      <PageHeader
        title={t("dashboard.title")}
        description={activeHub ? t("dashboard.subtitle", { hub: `${activeHub.name} (${activeHub.code})` }) : undefined}
        actions={
          <>
            <HubSelector hubs={hubs} activeHubId={activeHubId} onChange={setActiveHubId} />
            <Button variant="outline" size="sm" onClick={handleRefresh} className="h-10">
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              {t("refresh")}
            </Button>
          </>
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

      {/* Quick actions */}
      <section aria-label={t("dashboard.quickActions")}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="group flex items-start gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary/40"
            >
              <span className="rounded-lg bg-primary/10 p-2.5 text-primary">
                <action.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-foreground">{action.title}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{action.description}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Live metrics */}
      <section aria-label={t("dashboard.title")}>
        {dashboardLoading || !metrics ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5" role="status" aria-live="polite">
            {Array.from({ length: 9 }).map((_, index) => (
              <Card key={index}>
                <CardContent className="space-y-2 p-4">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-surface-muted" />
                  <div className="h-7 w-1/3 animate-pulse rounded bg-surface-muted" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
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
        )}
      </section>

      {/* Exceptions needing attention */}
      {openExceptions.length > 0 ? (
        <Card className="border-warning">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="rounded-lg bg-warning-soft p-2 text-warning">
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {t("dashboard.exceptionsNeedAttention")} ({openExceptions.length})
                </p>
                <p className="text-xs text-muted-foreground">
                  {openExceptions.slice(0, 3).map((e) => e.type).join(" · ")}
                </p>
              </div>
            </div>
            <Link href="/hub/exceptions">
              <Button size="sm" variant="outline">
                <ClipboardList className="h-4 w-4" aria-hidden="true" />
                {t("dashboard.reviewExceptions")}
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : null}

      {/* Recent scans */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              {t("dashboard.recentScans")}
            </h2>
            <Link href={HUB_ROUTES.scanner} className="text-xs font-semibold text-primary hover:underline">
              {t("dashboard.viewAll")}
            </Link>
          </div>
          {recentScans.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              {t("dashboard.noRecentScans")}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {recentScans.slice(0, 8).map((scan) => (
                <li key={scan.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-xs">
                  <span className="font-mono font-semibold text-foreground">
                    {scan.trackingCode ?? scan.bagCode ?? "—"}
                  </span>
                  <Badge
                    variant={scan.outcome === "APPLIED" ? "success" : scan.outcome === "DUPLICATE" ? "secondary" : "destructive"}
                    className="text-[10px]"
                  >
                    {scan.scanType} · {scan.outcome}
                  </Badge>
                  <span className="ml-auto tabular-nums text-muted-foreground">
                    {new Date(scan.createdAt).toLocaleTimeString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
