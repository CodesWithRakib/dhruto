"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Copy, Check, Printer, Eye, Plus } from "lucide-react";
import { Button, Card, CardContent } from "@dhruto/ui";
import type { ParcelCreatedResponse } from "@dhruto/contracts";
import { Link } from "@/lib/navigation";
import { useRouteBase } from "@/config/route-base";
import { useFormatters } from "@/lib/format";

interface BookingSuccessProps {
  parcel: ParcelCreatedResponse;
  onBookAnother: () => void;
}

/** Confirmation panel shown once the parcel has been persisted by the API. */
export function BookingSuccess({ parcel, onBookAnother }: BookingSuccessProps) {
  const t = useTranslations("BookingForm");
  const { bdt } = useFormatters();
  const routes = useRouteBase();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(parcel.trackingCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied; the code stays visible for manual copy.
    }
  };

  return (
    <Card className="mx-auto max-w-xl text-center">
      <CardContent className="space-y-5 pt-6">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-soft text-success-soft-foreground">
          <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
        </span>

        <div>
          <h2 className="text-h3 text-foreground">{t("successTitle")}</h2>
          <p className="mt-1 text-body-sm text-muted-foreground">{t("successDescription")}</p>
        </div>

        <div className="rounded-md border border-border bg-surface-muted p-4 text-left">
          <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
            <div className="min-w-0">
              <span className="block text-caption font-semibold uppercase tracking-wider text-muted-foreground">
                {t("trackingCode")}
              </span>
              <p className="truncate font-mono text-h4 font-bold tracking-wide text-foreground">
                {parcel.trackingCode}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="shrink-0 gap-1.5"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {copied ? t("copied") : t("copyTracking")}
            </Button>
          </div>

          <dl className="mt-3 grid grid-cols-2 gap-3 text-body-sm">
            <div>
              <dt className="text-caption text-muted-foreground">{t("recipient")}</dt>
              <dd className="font-medium text-foreground">{parcel.recipientName}</dd>
            </div>
            <div>
              <dt className="text-caption text-muted-foreground">{t("mobile")}</dt>
              <dd className="font-mono font-medium text-foreground">{parcel.recipientPhone}</dd>
            </div>
            <div>
              <dt className="text-caption text-muted-foreground">{t("destination")}</dt>
              <dd className="font-medium text-foreground">
                {parcel.thana}, {parcel.district}
              </dd>
            </div>
            <div>
              <dt className="text-caption text-muted-foreground">{t("codAmount")}</dt>
              <dd className="font-semibold tabular-nums text-foreground">
                {bdt(parcel.codAmount)}
              </dd>
            </div>
          </dl>

          <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-body-sm">
            <span className="text-muted-foreground">{t("deliveryCharge")}</span>
            <span className="font-bold tabular-nums text-foreground">
              {bdt(parcel.deliveryFee)}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link href={routes.parcel(parcel.id)}>
            <Button variant="outline" className="w-full gap-1.5 sm:w-auto">
              <Eye className="h-4 w-4" aria-hidden="true" />
              {t("viewDetails")}
            </Button>
          </Link>
          <Link href={routes.parcelLabel(parcel.id)}>
            <Button variant="outline" className="w-full gap-1.5 sm:w-auto">
              <Printer className="h-4 w-4" aria-hidden="true" />
              {t("printLabel")}
            </Button>
          </Link>
          <Button onClick={onBookAnother} className="w-full gap-1.5 sm:w-auto">
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t("bookAnother")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
