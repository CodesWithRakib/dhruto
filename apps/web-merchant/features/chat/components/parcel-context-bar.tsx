"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { ArrowUpRight, Package } from "lucide-react";
import { type ChatParcelContext } from "@dhruto/contracts";
import { Link } from "@/lib/navigation";
import { StatusBadge } from "@/components/data-display/status-badge";
import { parcelHref, type MessengerSection } from "../lib/routes";

/**
 * Parcel context of a parcel-linked conversation (Phase 5). Data comes only
 * from the authorized conversation API (`detail.parcel`: id, tracking code,
 * status) — never from URL parameters — and includes no recipient contact
 * data. The status refreshes when lifecycle system messages arrive.
 */
export function ParcelContextBar({
  parcel,
  section,
}: {
  parcel: ChatParcelContext;
  section: MessengerSection;
}) {
  const t = useTranslations("Chat");
  return (
    <div
      className="flex shrink-0 items-center gap-2 bg-muted/40 px-3 py-2 text-xs sm:px-4"
      aria-label={t("parcelContext")}
      role="region"
    >
      <Package className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="font-mono font-semibold text-foreground">{parcel.trackingCode}</span>
      <StatusBadge status={parcel.status} />
      <Link
        href={parcelHref(section, parcel)}
        className="ms-auto inline-flex items-center gap-1 rounded-md px-1.5 py-1 font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {t("viewParcel")}
        <ArrowUpRight className="h-3.5 w-3.5 rtl:-scale-x-100" aria-hidden="true" />
      </Link>
    </div>
  );
}
