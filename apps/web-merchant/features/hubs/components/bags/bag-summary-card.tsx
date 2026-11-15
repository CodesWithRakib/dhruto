"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Package } from "lucide-react";
import { Link } from "@/lib/navigation";
import { HUB_ROUTES } from "@/config/routes";
import { EnumBadge } from "@/components/data-display/enum-badge";
import { BAG_STATUS_TONE } from "@/config/status";
import type { BagDetails } from "@dhruto/contracts";

interface BagSummaryCardProps {
  bag: BagDetails;
}

export function BagSummaryCard({ bag }: BagSummaryCardProps) {
  const t = useTranslations("Hub");

  return (
    <div className="relative rounded-3xl border border-border/60 bg-card/90 backdrop-blur-md overflow-hidden p-5 sm:p-6 space-y-4 shadow-sm">
      {/* Specular top highlight */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"
        aria-hidden="true"
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" aria-hidden="true" />
          <span className="text-sm font-bold text-foreground">{t("bags.details")}</span>
          <span className="text-muted-foreground/40 font-light">·</span>
          <span className="rounded-lg bg-surface-muted px-2 py-0.5 font-mono text-xs font-semibold text-muted-foreground">
            {bag.bagCode}
          </span>
        </div>
        <EnumBadge
          namespace="BagStatus"
          value={bag.status}
          tones={BAG_STATUS_TONE}
          className="text-[10px]"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 pt-2 border-t border-border/40">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Bag Code
          </p>
          <p className="font-mono text-sm font-bold text-foreground">{bag.bagCode}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {t("status")}
          </p>
          <div className="mt-1">
            <EnumBadge
              namespace="BagStatus"
              value={bag.status}
              tones={BAG_STATUS_TONE}
              className="text-[11px]"
            />
          </div>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {t("bags.destination")}
          </p>
          <p className="text-sm font-semibold text-foreground">
            {bag.destinationHubName} ({bag.destinationHubCode})
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {t("bags.parcelsInBag")}
          </p>
          <p className="font-mono text-sm font-bold tabular-nums text-foreground">
            {t("bags.parcelCount", { count: bag.parcelCount })} ·{" "}
            {t("bags.totalWeight", { weight: bag.totalWeightKg })}
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {t("bags.createdBy")}
          </p>
          <p className="text-sm text-foreground">{bag.createdByName ?? "—"}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {t("bags.sealedBy")}
          </p>
          <p className="text-sm text-foreground">{bag.sealedByName ?? "—"}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {t("bags.sealTag")}
          </p>
          <p className="font-mono text-sm text-foreground">{bag.sealTag ?? "—"}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {t("bags.manifest")}
          </p>
          {bag.manifestId && bag.manifestCode ? (
            <Link
              href={HUB_ROUTES.manifest(bag.manifestId)}
              className="font-mono text-sm font-semibold text-primary hover:underline"
            >
              {bag.manifestCode}
            </Link>
          ) : (
            <p className="text-sm text-muted-foreground">—</p>
          )}
        </div>
      </div>
    </div>
  );
}
