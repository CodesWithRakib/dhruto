"use client";

import React, { useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { AlertCircle, ArrowLeft, CheckCircle2, Printer, RefreshCw } from "lucide-react";
import { Button } from "@dhruto/ui";
import { Link } from "@/lib/navigation";
import { useRouteBase } from "@/config/route-base";
import { ErrorState, LoadingState } from "@/components/feedback/states";
import { useGetBulkShippingLabelsMutation } from "../api/parcels.api";
import { ThermalShippingLabel } from "./thermal-shipping-label";

interface BulkShippingLabelsViewProps {
  parcelIds: string[];
}

export function BulkShippingLabelsView({ parcelIds }: BulkShippingLabelsViewProps) {
  const t = useTranslations("ShippingLabel");
  const locale = useLocale();
  const routes = useRouteBase();

  const [fetchBulkLabels, { data, isLoading, isError, error }] =
    useGetBulkShippingLabelsMutation();

  useEffect(() => {
    if (parcelIds.length > 0) {
      void fetchBulkLabels({ parcelIds });
    }
  }, [fetchBulkLabels, parcelIds]);

  const labels = data?.data ?? [];

  if (parcelIds.length === 0) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl bg-surface p-6 border border-border/40">
        <ErrorState
          title="No shipments selected"
          description="Please select at least one shipment from the parcel list to generate bulk thermal labels."
          action={
            <Link href={routes.parcels}>
              <Button variant="outline" size="sm" className="rounded-xl">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                {t("back")}
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl bg-surface p-6 border border-border/40">
        <LoadingState title={`Generating ${parcelIds.length} thermal labels…`} />
      </div>
    );
  }

  if (isError || (labels.length === 0 && !isLoading)) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl bg-surface p-6 border border-border/40">
        <ErrorState
          title={t("failedTitle")}
          description={
            typeof error === "object" && error && "message" in error
              ? String((error as { message?: string }).message)
              : t("failedDescription")
          }
          action={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void fetchBulkLabels({ parcelIds })}
                className="rounded-xl gap-2"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Retry
              </Button>
              <Link href={routes.parcels}>
                <Button variant="ghost" size="sm" className="rounded-xl">
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  {t("back")}
                </Button>
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Print Controls Toolbar */}
      <div className="dhruto-print-hidden sticky top-4 z-20 flex flex-wrap items-center justify-between gap-3 bg-surface-elevated/90 p-4 rounded-2xl border border-border/40 backdrop-blur-md shadow-xs">
        <div className="flex items-center gap-3">
          <Link href={routes.parcels}>
            <Button variant="ghost" size="sm" className="gap-1.5 rounded-xl">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {t("back")}
            </Button>
          </Link>
          <div className="flex items-center gap-2 text-body-sm font-semibold text-foreground">
            <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />
            <span>
              {labels.length} {labels.length === 1 ? "Label Ready" : "Labels Ready"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={() => window.print()} className="gap-2 rounded-xl">
            <Printer className="h-4 w-4" aria-hidden="true" />
            Print All {labels.length} Labels (4×6 in)
          </Button>
        </div>
      </div>

      <div className="dhruto-print-hidden rounded-xl bg-surface-elevated/50 p-3 border border-border/30 flex items-start gap-2.5 text-caption text-muted-foreground">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <p className="font-semibold text-foreground">Continuous Roll Printing Mode</p>
          <p>{t("printHint")}</p>
        </div>
      </div>

      {/* Render all thermal labels sequentially with page-break-after */}
      <div className="dhruto-print-container flex flex-col items-center gap-8 py-2">
        {labels.map((label, index) => (
          <ThermalShippingLabel
            key={label.trackingCode || `label-${index}`}
            label={label}
            locale={locale}
          />
        ))}
      </div>
    </div>
  );
}
