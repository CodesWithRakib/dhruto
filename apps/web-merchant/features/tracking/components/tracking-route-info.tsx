"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { StatusBadge } from "@/components/data-display/status-badge";
import { Building2, Clock, MapPin, Phone, ShieldCheck } from "lucide-react";
import { useFormatters } from "@/lib/format";
import { ParcelStatus } from "@dhruto/contracts";

interface TrackingRouteInfoProps {
  recipientDistrict: string;
  recipientThana: string;
  currentHubName?: string | null;
  recipientPhoneMasked: string;
  updatedAt: string | Date;
  status: ParcelStatus | string;
}

export function TrackingRouteInfo({
  recipientDistrict,
  recipientThana,
  currentHubName,
  recipientPhoneMasked,
  updatedAt,
  status,
}: TrackingRouteInfoProps) {
  const t = useTranslations("Tracking");
  const { dateTime } = useFormatters();

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Destination */}
      <div className="rounded-2xl bg-card p-5 transition-all">
        <div className="flex items-center gap-2 mb-2 text-caption font-semibold uppercase tracking-wider text-muted-foreground">
          <MapPin className="h-4 w-4 text-primary" />
          <span>{t("destination")}</span>
        </div>
        <p className="text-base font-bold text-foreground">
          {recipientThana}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {t("districtSuffix", { district: recipientDistrict })}
        </p>
      </div>

      {/* Current Location Hub */}
      <div className="rounded-2xl bg-card p-5 transition-all">
        <div className="flex items-center gap-2 mb-2 text-caption font-semibold uppercase tracking-wider text-muted-foreground">
          <Building2 className="h-4 w-4 text-primary" />
          <span>{t("location")}</span>
        </div>
        <p className="text-base font-bold text-foreground truncate">
          {currentHubName ?? t("locationPending")}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {currentHubName ? t("atHub") : t("notAtHubYet")}
        </p>
      </div>

      {/* Masked Contact */}
      <div className="rounded-2xl bg-card p-5 transition-all">
        <div className="flex items-center gap-2 mb-2 text-caption font-semibold uppercase tracking-wider text-muted-foreground">
          <Phone className="h-4 w-4 text-primary" />
          <span>{t("contact")}</span>
        </div>
        <p className="font-mono text-base font-bold text-foreground">
          {recipientPhoneMasked}
        </p>
        <div className="flex items-center gap-1 text-[11px] text-success font-medium mt-0.5">
          <ShieldCheck className="h-3 w-3" />
          <span>{t("maskedPrivacy")}</span>
        </div>
      </div>

      {/* Last Updated */}
      <div className="rounded-2xl bg-card p-5 transition-all">
        <div className="flex items-center gap-2 mb-2 text-caption font-semibold uppercase tracking-wider text-muted-foreground">
          <Clock className="h-4 w-4 text-primary" />
          <span>{t("lastUpdatedLabel")}</span>
        </div>
        <p className="text-xs font-semibold text-foreground leading-snug">
          {dateTime(updatedAt)}
        </p>
        <div className="mt-2">
          <StatusBadge status={status} />
        </div>
      </div>
    </div>
  );
}
