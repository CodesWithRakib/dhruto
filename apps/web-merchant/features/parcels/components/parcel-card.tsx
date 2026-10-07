"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Eye, Hash, MapPin, Phone, Printer } from "lucide-react";
import { Button } from "@dhruto/ui";
import type { ParcelListItem } from "@dhruto/contracts";
import { Link } from "@/lib/navigation";
import { useRouteBase } from "@/config/route-base";
import { StatusBadge } from "@/components/data-display/status-badge";
import { useFormatters } from "@/lib/format";

interface ParcelCardProps {
  parcel: ParcelListItem;
}

/**
 * Mobile representation of one parcel row. The desktop table is unusable at
 * 320-414px, so small screens get a purpose-built card instead of an
 * horizontally scrolled table.
 */
export function ParcelCard({ parcel }: ParcelCardProps) {
  const t = useTranslations("ParcelList");
  const { bdt } = useFormatters();
  const routes = useRouteBase();

  return (
    <li className="rounded-md border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <Link
          href={routes.parcel(parcel.id)}
          className="flex min-w-0 items-center gap-1.5 font-mono text-body-sm font-semibold text-primary"
        >
          <Hash className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="truncate">{parcel.trackingCode}</span>
        </Link>
        <StatusBadge status={parcel.status} className="shrink-0" />
      </div>

      <dl className="mt-3 space-y-1.5 text-body-sm">
        <div className="flex items-center gap-1.5">
          <dt className="sr-only">{t("recipient")}</dt>
          <span className="font-medium text-foreground">{parcel.recipientName}</span>
          <span className="flex items-center gap-1 font-mono text-caption text-muted-foreground">
            <Phone className="h-3 w-3" aria-hidden="true" />
            {parcel.recipientPhone}
          </span>
        </div>
        <div className="flex items-start gap-1.5 text-caption text-muted-foreground">
          <dt className="sr-only">{t("address")}</dt>
          <MapPin className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
          <span>
            {parcel.thana}, {parcel.district}
          </span>
        </div>
      </dl>

      <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-body-sm">
        <div>
          <span className="text-caption text-muted-foreground">{t("cod")}</span>
          <p className="font-semibold tabular-nums text-foreground">{bdt(parcel.codAmount)}</p>
        </div>
        <div className="text-right">
          <span className="text-caption text-muted-foreground">{t("fee")}</span>
          <p className="tabular-nums text-foreground">{bdt(parcel.deliveryFee)}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Link href={routes.parcel(parcel.id)} className="flex-1">
          <Button variant="outline" size="sm" className="w-full gap-1.5">
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            {t("view")}
          </Button>
        </Link>
        <Link href={routes.parcelLabel(parcel.id)} aria-label={t("printLabel")}>
          <Button variant="ghost" size="sm" aria-label={t("printLabel")}>
            <Printer className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </Link>
      </div>
    </li>
  );
}
