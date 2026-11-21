"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Calculator, Clock, Loader2, Sparkles, TriangleAlert } from "lucide-react";
import { DeliveryZone, type PricingResult } from "@dhruto/contracts";
import { cn } from "@/lib/cn";
import { useFormatters } from "@/lib/format";

const ZONE_LABEL_KEY: Record<DeliveryZone, string> = {
  [DeliveryZone.INSIDE_DHAKA]: "zoneInsideDhaka",
  [DeliveryZone.DHAKA_SUBURBS]: "zoneDhakaSuburbs",
  [DeliveryZone.OUTSIDE_DHAKA]: "zoneOutsideDhaka",
};

interface PricingSummaryProps {
  pricing: PricingResult | null;
  isCalculating: boolean;
  isError: boolean;
  codAmount: number;
}

/**
 * Displays the authoritative delivery quote returned by `POST /pricing/calculate`.
 * Styled as an executive fintech bento card with specular highlights.
 */
export function PricingSummary({
  pricing,
  isCalculating,
  isError,
  codAmount,
}: PricingSummaryProps) {
  const t = useTranslations("BookingForm");
  const { bdt } = useFormatters();

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
      className="relative overflow-hidden rounded-2xl bg-surface-elevated p-4.5"
    >

      <header className="relative flex items-center justify-between gap-3">
        <h3
          id="pricing-summary-heading"
          className="flex items-center gap-2 text-body-sm font-bold text-foreground tracking-tight"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Calculator className="h-4 w-4" aria-hidden="true" />
          </span>
          {t("pricingTitle")}
        </h3>
        {pricing ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-0.5 text-caption font-semibold text-primary">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            {t(ZONE_LABEL_KEY[pricing.zone])}
          </span>
        ) : null}
      </header>

      <div aria-live="polite" className="relative mt-4 space-y-3 text-body-sm">
        {isCalculating && !pricing ? (
          <p className="flex items-center gap-2 text-muted-foreground py-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
            {t("pricingCalculating")}
          </p>
        ) : null}

        {isError ? (
          <p className="flex items-center gap-2 text-danger-soft-foreground py-2 font-medium">
            <TriangleAlert className="h-4 w-4" aria-hidden="true" />
            {t("pricingUnavailable")}
          </p>
        ) : null}

        {!pricing && !isCalculating && !isError ? (
          <p className="text-muted-foreground py-1 text-caption sm:text-body-sm">
            {t("pricingEnterDestination")}
          </p>
        ) : null}

        {pricing ? (
          <>
            <dl className="space-y-2 pb-3">
              {rows.map((row) => (
                <div key={row.labelKey} className="flex items-center justify-between text-body-sm">
                  <dt className="text-muted-foreground">{t(row.labelKey)}</dt>
                  <dd className="tabular-nums font-medium text-foreground">{bdt(row.value)}</dd>
                </div>
              ))}

              {pricing.discount > 0 ? (
                <div className="flex items-center justify-between text-body-sm">
                  <dt className="text-muted-foreground">{t("discount")}</dt>
                  <dd className="tabular-nums font-semibold text-success">
                    −{bdt(pricing.discount)}
                  </dd>
                </div>
              ) : null}
            </dl>

            <div className="flex items-baseline justify-between pt-1">
              <span className="font-bold text-foreground">{t("totalFee")}</span>
              <span className="text-h3 font-black tabular-nums tracking-tight text-foreground">
                {bdt(pricing.totalFee)}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-caption text-muted-foreground">
              <span className="inline-flex items-center gap-1 font-medium">
                <Clock className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                {t("estimatedDays", { days: pricing.estimatedDays })}
              </span>
              <span
                className={cn(
                  "rounded-md px-2 py-0.5 font-semibold text-caption",
                  codAmount > 0
                    ? "bg-warning/10 text-warning"
                    : "bg-success/10 text-success",
                )}
              >
                {codAmount > 0 ? t("collectCash") : t("prepaid")}
              </span>
            </div>

            <p className="text-caption text-muted-foreground/80">{t("pricingDescription")}</p>
          </>
        ) : null}
      </div>
    </section>
  );
}
