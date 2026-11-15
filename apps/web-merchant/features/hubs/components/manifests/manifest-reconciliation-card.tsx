"use client";

import React from "react";
import { useTranslations } from "next-intl";
import type { ManifestReconciliation } from "@dhruto/contracts";

interface ManifestReconciliationCardProps {
  reconciliation: ManifestReconciliation;
}

export function ManifestReconciliationCard({ reconciliation }: ManifestReconciliationCardProps) {
  const t = useTranslations("Hub");

  return (
    <div className="relative rounded-3xl border border-border/60 bg-card/90 backdrop-blur-md p-5 sm:p-6 space-y-4 shadow-sm">
      {/* Specular top highlight */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"
        aria-hidden="true"
      />

      <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {t("manifests.reconciliation")}
      </h2>

      <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
        <div className="rounded-2xl border border-border/40 bg-surface-muted/40 p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {t("manifests.expected")}
          </p>
          <p className="font-mono text-xl font-bold tabular-nums text-foreground mt-1">
            {reconciliation.expectedBagCount}
          </p>
        </div>
        <div className="rounded-2xl border border-border/40 bg-surface-muted/40 p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {t("manifests.received")}
          </p>
          <p className="font-mono text-xl font-bold tabular-nums text-foreground mt-1">
            {reconciliation.receivedBagCount}
          </p>
        </div>
        <div className="rounded-2xl border border-border/40 bg-surface-muted/40 p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {t("manifests.missing")}
          </p>
          <p className="font-mono text-xl font-bold tabular-nums text-foreground mt-1">
            {reconciliation.missingBagCodes.length}
          </p>
        </div>
        <div className="rounded-2xl border border-border/40 bg-surface-muted/40 p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {t("manifests.expected")} parcels
          </p>
          <p className="font-mono text-xl font-bold tabular-nums text-foreground mt-1">
            {reconciliation.receivedParcelCount}/{reconciliation.expectedParcelCount}
          </p>
        </div>
      </div>

      {reconciliation.missingBagCodes.length > 0 ? (
        <div className="rounded-2xl border border-amber-500/30 bg-warning-soft p-3.5 text-xs">
          <p className="font-semibold text-warning">{t("manifests.missing")}:</p>
          <p className="font-mono text-warning mt-0.5">
            {reconciliation.missingBagCodes.join(", ")}
          </p>
        </div>
      ) : null}

      {reconciliation.missingTrackingCodes.length > 0 ? (
        <div className="rounded-2xl border border-amber-500/30 bg-warning-soft p-3.5 text-xs">
          <p className="font-semibold text-warning">{t("manifests.missing")} parcels:</p>
          <p className="font-mono text-warning mt-0.5">
            {reconciliation.missingTrackingCodes.join(", ")}
          </p>
        </div>
      ) : null}
    </div>
  );
}
