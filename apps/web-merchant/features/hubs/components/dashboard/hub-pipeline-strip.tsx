"use client";

import React from "react";
import { ArrowDownToLine, ArrowRight, Layers, Package, PackageOpen, Truck, Wallet } from "lucide-react";
import { Badge, Button } from "@dhruto/ui";
import { Link } from "@/lib/navigation";
import { HUB_ROUTES } from "@/config/routes";
import type { HubDashboard } from "@dhruto/contracts";

interface HubPipelineStripProps {
  metrics?: HubDashboard["metrics"];
}

export function HubPipelineStrip({ metrics }: HubPipelineStripProps) {
  const pipelineStages = [
    {
      step: 1,
      title: "1. Inbound Scans",
      subtitle: `${metrics?.inboundToday ?? 0} packages received today`,
      icon: ArrowDownToLine,
      color: "bg-success/10 text-success-soft-foreground",
      actionHref: HUB_ROUTES.scanner,
      actionText: "Scan Inbound",
    },
    {
      step: 2,
      title: "2. Sorting & Bags",
      subtitle: `${metrics?.openBags ?? 0} open · ${metrics?.sealedBags ?? 0} sealed`,
      icon: PackageOpen,
      color: "bg-warning/10 text-warning-soft-foreground",
      actionHref: HUB_ROUTES.bags,
      actionText: "Manage Bags",
    },
    {
      step: 3,
      title: "3. Linehaul Manifests",
      subtitle: `${metrics?.pendingManifests ?? 0} pending · ${metrics?.dispatchedManifests ?? 0} dispatched`,
      icon: Truck,
      color: "bg-info/10 text-info-soft-foreground",
      actionHref: HUB_ROUTES.manifests,
      actionText: "Manifests",
    },
    {
      step: 4,
      title: "4. Last-Mile Inventory",
      subtitle: `${metrics?.parcelsAtHub ?? 0} parcels currently at hub`,
      icon: Package,
      color: "bg-primary/10 text-primary-soft-foreground",
      actionHref: HUB_ROUTES.parcels,
      actionText: "Floor Inventory",
    },
    {
      step: 5,
      title: "5. Cash Desk & Audit",
      subtitle: `${metrics?.openExceptions ?? 0} exceptions · Cash hand-in`,
      icon: Wallet,
      color: "bg-danger/10 text-danger-soft-foreground",
      actionHref: HUB_ROUTES.cash,
      actionText: "Cash Desk",
    },
  ];

  return (
    <section aria-label="Hub Operational Pipeline" className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <Layers className="h-4 w-4" />
          </span>
          <h2 className="text-sm font-extrabold tracking-tight text-foreground">
            Hub Operations Pipeline
          </h2>
          <Badge variant="primary-soft" className="text-[10px] uppercase font-bold">
            Live Flow
          </Badge>
        </div>
        <Link
          href="/workflow"
          className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
        >
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
              className="group relative flex flex-col justify-between rounded-2xl bg-card/90 backdrop-blur-md p-4 transition-all duration-200 hover:-translate-y-0.5"
            >
              {/* Specular top highlight */}

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
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-full text-[11px] font-bold justify-between px-2.5 rounded-xl bg-surface-muted/50 hover:bg-surface-muted hover:text-primary"
                  >
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
  );
}
