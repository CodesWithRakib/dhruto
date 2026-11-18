"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Truck } from "lucide-react";
import { EnumBadge } from "@/components/data-display/enum-badge";
import { MANIFEST_STATUS_TONE } from "@/config/status";
import type { ManifestDetails } from "@dhruto/contracts";

interface ManifestSummaryCardProps {
  manifest: ManifestDetails;
}

export function ManifestSummaryCard({ manifest }: ManifestSummaryCardProps) {
  const t = useTranslations("Hub");

  return (
    <div className="relative rounded-3xl bg-card/90 backdrop-blur-md overflow-hidden p-5 sm:p-6 space-y-4">
      {/* Specular top highlight */}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Truck className="h-4 w-4 text-primary" aria-hidden="true" />
          <span className="text-sm font-bold text-foreground">{t("manifests.details")}</span>
          <span className="text-muted-foreground/40 font-light">·</span>
          <span className="rounded-lg bg-surface-muted px-2 py-0.5 font-mono text-xs font-semibold text-muted-foreground">
            {manifest.manifestCode}
          </span>
        </div>
        <EnumBadge
          namespace="ManifestStatus"
          value={manifest.status}
          tones={MANIFEST_STATUS_TONE}
          className="text-[10px]"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 pt-2">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Manifest Code
          </p>
          <p className="font-mono text-sm font-bold text-foreground">{manifest.manifestCode}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {t("status")}
          </p>
          <div className="mt-1">
            <EnumBadge
              namespace="ManifestStatus"
              value={manifest.status}
              tones={MANIFEST_STATUS_TONE}
              className="text-[11px]"
            />
          </div>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Route</p>
          <p className="text-sm font-semibold text-foreground">
            {manifest.originHubName} → {manifest.destinationHubName}
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {t("manifests.vehicle")}
          </p>
          <p className="font-mono text-sm text-foreground">{manifest.vehicleNumber}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {t("manifests.bagsInManifest")}
          </p>
          <p className="font-mono text-sm font-bold tabular-nums text-foreground">
            {manifest.bagCount} · {t("manifests.parcelCount", { count: manifest.parcelCount })}
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {t("manifests.driverName")}
          </p>
          <p className="text-sm text-foreground">{manifest.driverName ?? "—"}</p>
        </div>
      </div>
    </div>
  );
}
