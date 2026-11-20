"use client";

import React from "react";
import { Building2, MapPin, Package, ShieldCheck, Truck, User, Wallet } from "lucide-react";
import { Badge } from "@dhruto/ui";
import { ParcelStatus, type ParcelDetailsResponse } from "@dhruto/contracts";
import { ParcelIntelligencePanel } from "@/features/intelligence/components/parcel-intelligence-panel";

/** While the parcel is on its first-mile leg, the assigned rider is the pickup rider. */
const PICKUP_LEG_STATUSES: ReadonlySet<string> = new Set([ParcelStatus.PICKUP_ASSIGNED, ParcelStatus.PICKED_UP]);

interface ParcelInfoSectionsProps {
  t: (key: string, values?: Record<string, string | number>) => string;
  parcel: ParcelDetailsResponse;
  bdt: (val: number) => string;
}

export function ParcelInfoSections({
  t,
  parcel,
  bdt,
}: ParcelInfoSectionsProps) {
  const netReceivable = Math.max(0, parcel.codAmount - parcel.deliveryFee);
  const intelligence = parcel.addressIntelligence;

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {/* Recipient Bento Card */}
      <section className="relative overflow-hidden rounded-3xl bg-surface-elevated/85 p-6 backdrop-blur-md space-y-4">
        <div className="flex items-center gap-2 text-caption font-bold uppercase tracking-wider text-muted-foreground pb-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <User className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="text-body-sm font-bold text-foreground">{t("recipientInfo")}</span>
        </div>

        <div className="space-y-3.5 text-body-sm">
          <div>
            <span className="text-caption text-muted-foreground font-medium">{t("recipientName")}</span>
            <p className="font-bold text-foreground text-body-md mt-0.5">{parcel.recipientName}</p>
          </div>
          <div>
            <span className="text-caption text-muted-foreground font-medium">{t("recipientPhone")}</span>
            <p className="font-mono font-semibold text-foreground mt-0.5">{parcel.recipientPhone}</p>
          </div>
          <div>
            <span className="text-caption text-muted-foreground font-medium">{t("address")}</span>
            <p className="flex items-start gap-1.5 font-medium text-foreground mt-0.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span>
                {parcel.deliveryAddress}, {parcel.thana}, {parcel.district}
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* Financial Summary Bento Card */}
      <section className="relative overflow-hidden rounded-3xl bg-surface-elevated/85 p-6 backdrop-blur-md space-y-4">
        <div className="flex items-center gap-2 text-caption font-bold uppercase tracking-wider text-muted-foreground pb-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Wallet className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="text-body-sm font-bold text-foreground">{t("financialSummary")}</span>
        </div>

        <div className="space-y-3 text-body-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t("codCollection")}</span>
            <span className="font-bold tabular-nums text-foreground">
              {bdt(parcel.codAmount)}
            </span>
          </div>
          <div className="flex items-center justify-between pb-2.5 text-caption text-muted-foreground">
            <span>{t("deliveryFee")}</span>
            <span className="tabular-nums font-semibold">− {bdt(parcel.deliveryFee)}</span>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="font-bold text-foreground">{t("netReceivable")}</span>
            <span className="text-h3 font-black tabular-nums text-primary tracking-tight">
              {bdt(netReceivable)}
            </span>
          </div>
          <div className="flex items-center justify-between text-caption text-muted-foreground pt-1">
            <span>{t("weight")}</span>
            <span className="font-bold text-foreground">{parcel.weight} kg</span>
          </div>
          <div className="flex items-center justify-between text-caption text-muted-foreground">
            <span>{t("codStatus")}</span>
            <Badge variant={parcel.codAmount > 0 ? "warning" : "success"}>
              {parcel.codAmount > 0 ? t("collectCash") : t("prepaid")}
            </Badge>
          </div>
        </div>
      </section>

      {/* Operations Bento Card */}
      <section className="space-y-4 md:col-span-2">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-3.5 rounded-2xl bg-surface-elevated/80 p-4 sm:p-5 backdrop-blur-sm">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Building2 className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <span className="text-caption text-muted-foreground font-medium">{t("currentHub")}</span>
              <p className="font-semibold text-foreground truncate mt-0.5">
                {parcel.currentHubName ?? t("awaitingHub")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 rounded-2xl bg-surface-elevated/80 p-4 sm:p-5 backdrop-blur-sm">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Truck className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <span className="text-caption text-muted-foreground font-medium">
                {PICKUP_LEG_STATUSES.has(parcel.status) ? t("pickupRider") : t("assignedRider")}
              </span>
              <p className="font-semibold text-foreground truncate mt-0.5">
                {parcel.currentRiderName ?? t("notAssigned")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 rounded-2xl bg-surface-elevated/80 p-4 sm:p-5 backdrop-blur-sm">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Package className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <span className="text-caption text-muted-foreground font-medium">
                {t("parcelDescription")}
              </span>
              <p className="font-semibold text-foreground truncate mt-0.5">
                {parcel.parcelDescription || t("noDescription")}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-surface-elevated/80 p-5 text-body-sm backdrop-blur-sm space-y-1">
          <p className="text-caption text-muted-foreground font-medium">{t("merchant")}</p>
          <p className="font-bold text-foreground">{parcel.merchantName}</p>
          <p className="pt-2 text-caption text-muted-foreground font-medium">{t("pickupAddress")}</p>
          <p className="text-foreground font-medium">{parcel.pickupAddress}</p>
        </div>

        {parcel.merchantNote || parcel.pickupInstructions ? (
          <div className="rounded-2xl bg-surface-elevated/80 p-5 text-body-sm space-y-3">
            {parcel.merchantNote ? (
              <div>
                <p className="text-caption text-muted-foreground font-medium">{t("deliveryNote")}</p>
                <p className="text-foreground font-medium">{parcel.merchantNote}</p>
              </div>
            ) : null}
            {parcel.pickupInstructions ? (
              <div>
                <p className="text-caption text-muted-foreground font-medium">{t("pickupInstructions")}</p>
                <p className="text-foreground font-medium">{parcel.pickupInstructions}</p>
              </div>
            ) : null}
          </div>
        ) : null}

        {intelligence && (intelligence.confidenceScore !== null || intelligence.riskTier !== null) ? (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-surface-elevated/80 p-4 sm:p-5 text-caption backdrop-blur-sm">
            <span className="flex items-center gap-1.5 font-bold text-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
              {t("addressIntelligence")}
            </span>
            {intelligence.confidenceScore !== null ? (
              <Badge variant="secondary">
                {t("confidence", { score: intelligence.confidenceScore })}
              </Badge>
            ) : null}
            {intelligence.riskTier ? (
              <Badge variant={intelligence.riskTier === "HIGH" ? "destructive" : "outline"}>
                {t("riskTier", { tier: intelligence.riskTier })}
              </Badge>
            ) : null}
            {intelligence.zone ? (
              <span className="text-muted-foreground font-medium">{intelligence.zone}</span>
            ) : null}
          </div>
        ) : null}

        <ParcelIntelligencePanel parcelId={parcel.id} />
      </section>
    </div>
  );
}
