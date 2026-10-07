"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { RefreshCw, Warehouse } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/feedback/states";
import { useActiveHub } from "../hooks/use-active-hub";
import { HubSelector } from "./hub-selector";
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
 */
export function HubPageShell({ title, description, actions, children }: HubPageShellProps) {
  const t = useTranslations("Hub");
  const { hubs, activeHub, activeHubId, setActiveHubId, isLoading, isError } = useActiveHub();

  if (isLoading) {
    return (
      <div className="w-full px-4 py-24 text-center" role="status" aria-live="polite">
        <RefreshCw className="mx-auto mb-3 h-8 w-8 animate-spin text-primary" aria-hidden="true" />
        <p className="font-medium text-muted-foreground">{t("loadingHubs")}</p>
      </div>
    );
  }

  if (isError || hubs.length === 0 || !activeHub) {
    return (
      <div className="w-full px-4 py-6">
        <EmptyState
          icon={Warehouse}
          title={t("noHubs")}
          description={t("noHubsDescription")}
          className="mx-auto mt-12 max-w-md"
        />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 px-4 py-6">
      <PageHeader
        title={typeof title === "function" ? title(activeHub) : title}
        description={typeof description === "function" ? description(activeHub) : description}
        actions={
          <>
            <HubSelector hubs={hubs} activeHubId={activeHubId} onChange={setActiveHubId} />
            {actions}
          </>
        }
      />
      {children(activeHub)}
    </div>
  );
}
