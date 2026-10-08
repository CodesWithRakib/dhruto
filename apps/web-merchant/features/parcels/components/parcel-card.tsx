"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, CalendarDays, Eye, MapPin, Printer, User } from "lucide-react";
import { Button } from "@dhruto/ui";
import type { ParcelListItem } from "@dhruto/contracts";
import { Link } from "@/lib/navigation";
import { useRouteBase } from "@/config/route-base";
import { StatusBadge } from "@/components/data-display/status-badge";
import { CopyButton } from "@/components/data-display/copy-button";
import { useFormatters } from "@/lib/format";

interface ParcelCardProps {
  parcel: ParcelListItem;
}

/**
 * Mobile representation of one shipment row.
 *
 * The desktop table is unusable at 320-414px, so small screens get a
 * purpose-built card instead of a horizontally scrolled table. Read order
 * matches what an operator checks first: identifier + status, who/where it is
 * going, what it is worth, then when it was booked and what to do next.
 */
export function ParcelCard({ parcel }: ParcelCardProps) {
  const t = useTranslations("ParcelList");
  const { bdt, date, time } = useFormatters();
  const routes = useRouteBase();

  return (
    <li className="rounded-xl border border-border bg-surface p-4 transition-colors duration-fast hover:border-muted-foreground/30 focus-within:border-primary/40">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1">
          <Link
            href={routes.parcel(parcel.id)}
            className="min-w-0 truncate font-mono text-body-sm font-semibold text-primary"
          >
            {parcel.trackingCode}
          </Link>
          <CopyButton
            value={parcel.trackingCode}
            label={t("copyTrackingCode")}
            copiedLabel={t("trackingCopied")}
            errorLabel={t("copyFailed")}
            size="icon"
          />
        </div>
        <StatusBadge status={parcel.status} withIcon className="shrink-0" />
      </div>

      <dl className="mt-3 space-y-1.5 text-body-sm">
        <div className="flex min-w-0 items-center gap-1.5">
          <dt className="sr-only">{t("recipient")}</dt>
          <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="truncate font-medium text-foreground">{parcel.recipientName}</span>
          <span className="shrink-0 font-mono text-caption text-muted-foreground">
            {parcel.recipientPhone}
          </span>
        </div>
        <div className="flex min-w-0 items-center gap-1.5">
          <dt className="sr-only">{t("address")}</dt>
          <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="truncate text-caption text-muted-foreground">
            {parcel.thana}, {parcel.district}
          </span>
        </div>
      </dl>

      <div className="mt-3 flex items-end justify-between gap-3 border-t border-border pt-3">
        <div>
          <span className="text-caption text-muted-foreground">{t("cod")}</span>
          <p className="font-semibold tabular-nums text-foreground">{bdt(parcel.codAmount)}</p>
        </div>
        <div className="text-right">
          <span className="text-caption text-muted-foreground">{t("fee")}</span>
          <p className="tabular-nums text-foreground">{bdt(parcel.deliveryFee)}</p>
        </div>
      </div>

      <p className="mt-2 flex items-center justify-end gap-1 text-caption text-muted-foreground">
        <CalendarDays className="h-3 w-3" aria-hidden="true" />
        <time dateTime={parcel.createdAt}>
          {date(parcel.createdAt)} · {time(parcel.createdAt)}
        </time>
      </p>

      <div className="mt-3 flex items-center gap-2">
        <Link href={routes.parcel(parcel.id)} className="flex-1">
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-1.5"
            aria-label={`${t("viewDetails")} ${parcel.trackingCode}`}
          >
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            {t("viewDetails")}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </Link>
        <Link
          href={routes.parcelLabel(parcel.id)}
          aria-label={t("printLabel")}
          title={t("printLabel")}
        >
          <Button variant="ghost" size="icon" aria-label={t("printLabel")}>
            <Printer className="h-4 w-4" aria-hidden="true" />
          </Button>
        </Link>
      </div>
    </li>
  );
}
