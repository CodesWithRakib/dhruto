"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { RefreshCw, Warehouse } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/feedback/states";
import { useActiveHub } from "../hooks/use-active-hub";
import { HubSelector } from "./hub-selector";
import { DashboardCanvasBg } from "@/features/dashboard/components/dashboard-canvas-bg";
import type { HubSummary } from "@dhruto/contracts";

interface HubPageShellProps {
  title: React.ReactNode | ((hub: HubSummary) => React.ReactNode);
  description?: React.ReactNode | ((hub: HubSummary) => React.ReactNode);
  actions?: React.ReactNode;
  children: (hub: HubSummary) => React.ReactNode;
}

/**
 * Shared shell for every hub surface: hub selector, loading and
 * no-assignment states stay identical across scanner, bags, manifests,
 * lookup and exceptions.
 * Includes coordinate dot grid canvas and ambient glow.
 */
export function HubPageShell({ title, description, actions, children }: HubPageShellProps) {
  const t = useTranslations("Hub");
  const { hubs, activeHub, activeHubId, setActiveHubId, isLoading, isError } = useActiveHub();

  if (isLoading) {
    return (
      <div className="relative min-h-[calc(100vh-4rem)] w-full overflow-hidden">
        <DashboardCanvasBg />
        <div className="relative z-10 w-full px-4 py-24 text-center" role="status" aria-live="polite">
          <RefreshCw className="mx-auto mb-3 h-8 w-8 animate-spin text-primary" aria-hidden="true" />
          <p className="font-medium text-muted-foreground">{t("loadingHubs")}</p>
        </div>
      </div>
    );
  }

  if (isError || hubs.length === 0 || !activeHub) {
    return (
      <div className="relative min-h-[calc(100vh-4rem)] w-full overflow-hidden">
        <DashboardCanvasBg />
        <div className="relative z-10 w-full px-4 py-6">
          <EmptyState
            icon={Warehouse}
            title={t("noHubs")}
            description={t("noHubsDescription")}
            className="mx-auto mt-12 max-w-md"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)] w-full overflow-hidden space-y-6 pb-6">
      <DashboardCanvasBg />
      <div className="relative z-10 space-y-6">
        <PageHeader
          title={typeof title === "function" ? title(activeHub) : title}
          description={typeof description === "function" ? description(activeHub) : description}
          actions={
            <div className="flex flex-wrap items-center gap-2.5">
              <HubSelector hubs={hubs} activeHubId={activeHubId} onChange={setActiveHubId} />
              {actions}
            </div>
          }
        />
        {children(activeHub)}
      </div>
    </div>
  );
}
