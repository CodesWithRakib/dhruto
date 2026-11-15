"use client";

import React, { useCallback } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, RefreshCw, Warehouse } from "lucide-react";
import { Button } from "@dhruto/ui";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/feedback/states";
import { useActiveHub } from "../hooks/use-active-hub";
import { HubSelector } from "./hub-selector";
import { useGetHubDashboardQuery, useGetExceptionsQuery } from "../api/hubs.api";
import { ExceptionStatus } from "@dhruto/contracts";
import { HubPipelineStrip } from "./dashboard/hub-pipeline-strip";
import { HubSopGuide } from "./dashboard/hub-sop-guide";
import { HubQuickActions } from "./dashboard/hub-quick-actions";
import { HubMetricsGrid } from "./dashboard/hub-metrics-grid";
import { HubExceptionsAlert } from "./dashboard/hub-exceptions-alert";
import { HubRecentScansCard } from "./dashboard/hub-recent-scans-card";

/**
 * Hub operations dashboard.
 *
 * Every metric is live aggregated from `GET /hubs/:id/dashboard` — zero mock data.
 * Modularized with 5-stage pipeline, shift SOPs, and quick actions.
 */
export function HubDashboardView() {
  const t = useTranslations("Hub");

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

  const handleRefresh = useCallback(() => {
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

  return (
    <div className="relative w-full space-y-6 pb-8">
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
              className="gap-1.5 rounded-xl shadow-2xs"
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
      <HubPipelineStrip metrics={metrics} />

      {/* Hub Operating SOP & Guidelines */}
      <HubSopGuide />

      {/* Quick actions - 5 columns */}
      <HubQuickActions />

      {/* Live metrics */}
      <HubMetricsGrid metrics={metrics} isLoading={dashboardLoading} />

      {/* Exceptions needing attention */}
      <HubExceptionsAlert openExceptions={openExceptions} />

      {/* Recent scans */}
      <HubRecentScansCard recentScans={recentScans} />
    </div>
  );
}
