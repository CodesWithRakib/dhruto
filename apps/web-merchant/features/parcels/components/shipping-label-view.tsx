"use client";

import React from "react";
import { useTranslations, useLocale } from "next-intl";
import { AlertCircle, ArrowLeft, Printer } from "lucide-react";
import { Button } from "@dhruto/ui";
import { Link } from "@/lib/navigation";
import { useRouteBase } from "@/config/route-base";
import { ErrorState, LoadingState } from "@/components/feedback/states";
import { useGetShippingLabelQuery } from "../api/parcels.api";
import { ThermalShippingLabel } from "./thermal-shipping-label";

interface ShippingLabelViewProps {
  parcelId: string;
}

/**
 * Printable 4in x 6in thermal shipping label view.
 *
 * Designed for standard 203/300 DPI thermal roll printers with Code 128 barcode,
 * 2D vector QR code, high-contrast inverted routing box, and COD warnings.
 */
export function ShippingLabelView({ parcelId }: ShippingLabelViewProps) {
  const t = useTranslations("ShippingLabel");
  const locale = useLocale();
  const routes = useRouteBase();
  const { data, isLoading, isError } = useGetShippingLabelQuery(parcelId);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-xl rounded-md bg-surface p-6">
        <LoadingState title={t("generating")} />
      </div>
    );
  }

  if (isError || !data?.data) {
    return (
      <div className="mx-auto max-w-xl rounded-md bg-surface p-6">
        <ErrorState
          title={t("failedTitle")}
          description={t("failedDescription")}
          action={
            <Link href={routes.parcels}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                {t("back")}
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  const label = data.data;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="dhruto-print-hidden flex items-center justify-between gap-3 bg-surface-elevated/70 p-3 rounded-2xl border border-border/40 backdrop-blur-sm">
        <Link href={routes.parcel(parcelId)}>
          <Button variant="ghost" size="sm" className="gap-1.5 rounded-xl">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t("back")}
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Button onClick={() => window.print()} className="gap-2 rounded-xl">
            <Printer className="h-4 w-4" aria-hidden="true" />
            {t("print")}
          </Button>
        </div>
      </div>

      <p className="dhruto-print-hidden flex items-start gap-2 text-caption text-muted-foreground px-1">
        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
        {t("printHint")}
      </p>

      {/* 4in x 6in thermal label wrapped in print container */}
      <div className="dhruto-print-container flex justify-center py-2">
        <ThermalShippingLabel label={label} locale={locale} />
      </div>
    </div>
  );
}
