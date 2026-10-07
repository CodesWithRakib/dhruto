"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Calculator, Clock, Loader2, TriangleAlert } from "lucide-react";
import { DeliveryZone, type PricingResult } from "@dhruto/contracts";
import { cn } from "@/lib/cn";

const ZONE_LABEL_KEY: Record<DeliveryZone, string> = {
  [DeliveryZone.INSIDE_DHAKA]: "zoneInsideDhaka",
  [DeliveryZone.DHAKA_SUBURBS]: "zoneDhakaSuburbs",
  [DeliveryZone.OUTSIDE_DHAKA]: "zoneOutsideDhaka",
};

function formatBdt(value: number): string {
  return `৳${value.toLocaleString("en-BD", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

interface PricingSummaryProps {
  pricing: PricingResult | null;
  isCalculating: boolean;
  isError: boolean;
  codAmount: number;
}

/**
 * Displays the authoritative delivery quote returned by `POST /pricing/calculate`.
 * The component never computes a fee — it only renders the breakdown.
 */
export function PricingSummary({
  pricing,
  isCalculating,
  isError,
  codAmount,
}: PricingSummaryProps) {
  const t = useTranslations("BookingForm");

  const rows: { labelKey: string; value: number }[] = pricing
    ? [
        { labelKey: "baseFee", value: pricing.baseFee },
        { labelKey: "weightFee", value: pricing.weightFee },
        { labelKey: "codFee", value: pricing.codFee },
      ]
    : [];

  if (pricing && pricing.additionalCharge > 0) {
    rows.push({ labelKey: "additionalCharge", value: pricing.additionalCharge });
  }

  return (
    <section
      aria-labelledby="pricing-summary-heading"
      className="rounded-md border border-border bg-surface-muted p-4"
    >
      <header className="flex items-center justify-between gap-3">
        <h3
          id="pricing-summary-heading"
          className="flex items-center gap-2 text-body-sm font-semibold text-foreground"
        >
          <Calculator className="h-4 w-4 text-primary" aria-hidden="true" />
          {t("pricingTitle")}
        </h3>
        {pricing ? (
          <span className="rounded-sm bg-primary-soft px-2 py-0.5 text-caption font-medium text-primary">
            {t(ZONE_LABEL_KEY[pricing.zone])}
          </span>
        ) : null}
      </header>

      <div aria-live="polite" className="mt-3 space-y-2 text-body-sm">
        {isCalculating && !pricing ? (
          <p className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            {t("pricingCalculating")}
          </p>
        ) : null}

        {isError ? (
          <p className="flex items-center gap-2 text-danger">
            <TriangleAlert className="h-4 w-4" aria-hidden="true" />
            {t("pricingUnavailable")}
          </p>
        ) : null}

        {!pricing && !isCalculating && !isError ? (
          <p className="text-muted-foreground">{t("pricingEnterDestination")}</p>
        ) : null}

        {pricing ? (
          <>
            <dl className="space-y-1.5">
              {rows.map((row) => (
                <div key={row.labelKey} className="flex items-center justify-between">
                  <dt className="text-muted-foreground">{t(row.labelKey)}</dt>
                  <dd className="tabular-nums text-foreground">{formatBdt(row.value)}</dd>
                </div>
              ))}

              {pricing.discount > 0 ? (
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">{t("discount")}</dt>
                  <dd className="tabular-nums text-success">−{formatBdt(pricing.discount)}</dd>
                </div>
              ) : null}
            </dl>

            <div className="flex items-center justify-between border-t border-border pt-2">
              <span className="font-semibold text-foreground">{t("totalFee")}</span>
              <span className="text-h4 font-bold tabular-nums text-foreground">
                {formatBdt(pricing.totalFee)}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                {t("estimatedDays", { days: pricing.estimatedDays })}
              </span>
              <span
                className={cn(
                  "rounded-sm px-1.5 py-0.5 font-medium",
                  codAmount > 0
                    ? "bg-warning-soft text-warning-soft-foreground"
                    : "bg-success-soft text-success-soft-foreground",
                )}
              >
                {codAmount > 0 ? t("collectCash") : t("prepaid")}
              </span>
            </div>

            <p className="text-caption text-muted-foreground">{t("pricingDescription")}</p>
          </>
        ) : null}
      </div>
    </section>
  );
}
