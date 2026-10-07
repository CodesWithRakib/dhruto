"use client";

import React from "react";
import { useTranslations } from "next-intl";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Clock,
  MapPin,
  Package,
  Printer,
  Search,
  ShieldCheck,
  Truck,
  User,
  Wallet,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@dhruto/ui";
import { ParcelStatus } from "@dhruto/contracts";
import { Link } from "@/lib/navigation";
import { useRouteBase } from "@/config/route-base";
import { StatusBadge } from "@/components/data-display/status-badge";
import { PARCEL_STATUS_CONFIG } from "@/config/status";
import { ErrorState, LoadingState } from "@/components/feedback/states";
import { useGetParcelByIdQuery } from "../api/parcels.api";
import { ParcelIntelligencePanel } from "@/features/intelligence/components/parcel-intelligence-panel";
import { useFormatters } from "@/lib/format";

interface ParcelDetailsViewProps {
  parcelId: string;
}

/** Lifecycle milestones shown as a progress track, keyed to `ParcelStatus` labels. */
const MILESTONES: { statuses: ParcelStatus[]; labelKey: string }[] = [
  { statuses: [ParcelStatus.CREATED, ParcelStatus.PICKUP_REQUESTED], labelKey: "created" },
  {
    statuses: [
      ParcelStatus.PICKUP_ASSIGNED,
      ParcelStatus.PICKED_UP,
      ParcelStatus.ORIGIN_HUB_RECEIVED,
      ParcelStatus.BAGGED,
    ],
    labelKey: "pickedUp",
  },
  {
    statuses: [ParcelStatus.IN_TRANSIT, ParcelStatus.DESTINATION_HUB_RECEIVED],
    labelKey: "inTransit",
  },
  {
    statuses: [
      ParcelStatus.ASSIGNED_TO_RIDER,
      ParcelStatus.OUT_FOR_DELIVERY,
      ParcelStatus.DELIVERY_ATTEMPTED,
      ParcelStatus.RESCHEDULED,
    ],
    labelKey: "outForDelivery",
  },
  {
    statuses: [ParcelStatus.DELIVERED, ParcelStatus.CASH_PENDING, ParcelStatus.CASH_VERIFIED],
    labelKey: "delivered",
  },
];

const RETURN_MILESTONES: { statuses: ParcelStatus[]; labelKey: string }[] = [
  {
    statuses: [ParcelStatus.RTO_INITIATED, ParcelStatus.RETURN_IN_TRANSIT],
    labelKey: "rtoInitiated",
  },
  { statuses: [ParcelStatus.RETURNED_TO_MERCHANT], labelKey: "returnedToMerchant" },
];

function isReturnFlow(status: ParcelStatus): boolean {
  return [
    ParcelStatus.RTO_INITIATED,
    ParcelStatus.RETURN_IN_TRANSIT,
    ParcelStatus.RETURNED_TO_MERCHANT,
  ].includes(status);
}

function formatBdt(value: number): string {
  return `৳${value.toLocaleString()}`;
}

export function ParcelDetailsView({ parcelId }: ParcelDetailsViewProps) {
  const t = useTranslations("ParcelDetails");
  const { dateTime } = useFormatters();
  const tStatus = useTranslations("ParcelStatus");
  const routes = useRouteBase();

  const { data, isLoading, isError, refetch } = useGetParcelByIdQuery(parcelId);

  if (isLoading) {
    return (
      <div className="rounded-md border border-border bg-surface">
        <LoadingState title={t("loading")} />
      </div>
    );
  }

  if (isError || !data?.data) {
    return (
      <div className="rounded-md border border-border bg-surface">
        <ErrorState
          title={t("notFoundTitle")}
          description={t("notFoundDescription")}
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

  const parcel = data.data;
  const netReceivable = Math.max(0, parcel.codAmount - parcel.deliveryFee);
  const milestones = isReturnFlow(parcel.status) ? RETURN_MILESTONES : MILESTONES;
  const currentStep = Math.max(
    1,
    milestones.findIndex((milestone) => milestone.statuses.includes(parcel.status)) + 1,
  );
  const progress = milestones.length > 1 ? ((currentStep - 1) / (milestones.length - 1)) * 100 : 0;
  const intelligence = parcel.addressIntelligence;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <Link href={routes.parcels}>
          <Button variant="ghost" size="sm" className="-ml-2 gap-1.5">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t("back")}
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void refetch()}>
            <Search className="h-4 w-4" aria-hidden="true" />
            {t("refresh")}
          </Button>
          <Link href={routes.parcelLabel(parcel.id)}>
            <Button size="sm" className="gap-1.5">
              <Printer className="h-4 w-4" aria-hidden="true" />
              {t("printLabel")}
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 border-b border-border sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-caption font-semibold uppercase tracking-wider text-muted-foreground">
              {t("trackingCode")}
            </span>
            <p className="font-mono text-h3 font-bold text-foreground">{parcel.trackingCode}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={parcel.status} withIcon />
            <span className="text-caption text-muted-foreground">
              {t("createdOn", { date: dateTime(parcel.createdAt) })}
            </span>
          </div>
        </CardHeader>

        {/* Progress track */}
        <CardContent className="border-b border-border py-6">
          <ol className="relative mx-auto flex max-w-2xl justify-between">
            <div
              className="absolute left-0 top-3.5 h-0.5 w-full bg-surface-muted"
              aria-hidden="true"
            />
            <div
              className="absolute left-0 top-3.5 h-0.5 bg-primary transition-all"
              style={{ width: `${progress}%` }}
              aria-hidden="true"
            />
            {milestones.map((milestone, index) => {
              const step = index + 1;
              const isPassed = currentStep >= step;
              return (
                <li key={milestone.labelKey} className="relative z-10 flex flex-col items-center">
                  <span
                    aria-hidden="true"
                    className={
                      isPassed
                        ? "flex h-7 w-7 items-center justify-center rounded-full bg-primary text-caption font-bold text-primary-foreground"
                        : "flex h-7 w-7 items-center justify-center rounded-full bg-surface-muted text-caption font-bold text-muted-foreground"
                    }
                  >
                    {step}
                  </span>
                  <span
                    className={
                      isPassed
                        ? "mt-2 max-w-[80px] text-center text-caption font-medium text-foreground"
                        : "mt-2 max-w-[80px] text-center text-caption text-muted-foreground"
                    }
                  >
                    {tStatus(milestone.labelKey)}
                  </span>
                </li>
              );
            })}
          </ol>
        </CardContent>

        <CardContent className="grid grid-cols-1 gap-6 pt-6 md:grid-cols-2">
          {/* Recipient */}
          <section className="space-y-3">
            <h3 className="flex items-center gap-2 text-caption font-bold uppercase tracking-wider text-muted-foreground">
              <User className="h-4 w-4 text-primary" aria-hidden="true" />
              {t("recipientInfo")}
            </h3>
            <div className="space-y-3 rounded-md border border-border bg-surface-muted p-4 text-body-sm">
              <div>
                <span className="text-caption text-muted-foreground">{t("recipientName")}</span>
                <p className="font-semibold text-foreground">{parcel.recipientName}</p>
              </div>
              <div>
                <span className="text-caption text-muted-foreground">{t("recipientPhone")}</span>
                <p className="font-mono font-medium text-foreground">{parcel.recipientPhone}</p>
              </div>
              <div>
                <span className="text-caption text-muted-foreground">{t("address")}</span>
                <p className="flex items-start gap-1.5 font-medium text-foreground">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <span>
                    {parcel.deliveryAddress}, {parcel.thana}, {parcel.district}
                  </span>
                </p>
              </div>
            </div>
          </section>

          {/* Pricing */}
          <section className="space-y-3">
            <h3 className="flex items-center gap-2 text-caption font-bold uppercase tracking-wider text-muted-foreground">
              <Wallet className="h-4 w-4 text-primary" aria-hidden="true" />
              {t("financialSummary")}
            </h3>
            <div className="space-y-3 rounded-md border border-border bg-surface-muted p-4 text-body-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("codCollection")}</span>
                <span className="font-bold tabular-nums text-foreground">
                  {formatBdt(parcel.codAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-border pb-2 text-caption text-muted-foreground">
                <span>{t("deliveryFee")}</span>
                <span className="tabular-nums">− {formatBdt(parcel.deliveryFee)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">{t("netReceivable")}</span>
                <span className="text-h4 font-bold tabular-nums text-primary">
                  {formatBdt(netReceivable)}
                </span>
              </div>
              <div className="flex items-center justify-between text-caption text-muted-foreground">
                <span>{t("weight")}</span>
                <span className="font-semibold text-foreground">{parcel.weight} kg</span>
              </div>
              <div className="flex items-center justify-between text-caption text-muted-foreground">
                <span>{t("codStatus")}</span>
                <Badge variant={parcel.codAmount > 0 ? "warning" : "success"}>
                  {parcel.codAmount > 0 ? t("collectCash") : t("prepaid")}
                </Badge>
              </div>
            </div>
          </section>

          {/* Parcel + operations */}
          <section className="space-y-3 md:col-span-2">
            <h3 className="flex items-center gap-2 text-caption font-bold uppercase tracking-wider text-muted-foreground">
              <Truck className="h-4 w-4 text-primary" aria-hidden="true" />
              {t("operations")}
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex items-center gap-3 rounded-md border border-border bg-surface-muted p-4">
                <Building2 className="h-7 w-7 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <span className="text-caption text-muted-foreground">{t("currentHub")}</span>
                  <p className="font-medium text-foreground">
                    {parcel.currentHubName ?? t("awaitingHub")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-md border border-border bg-surface-muted p-4">
                <Truck className="h-7 w-7 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <span className="text-caption text-muted-foreground">{t("assignedRider")}</span>
                  <p className="font-medium text-foreground">
                    {parcel.currentRiderName ?? t("notAssigned")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-md border border-border bg-surface-muted p-4">
                <Package className="h-7 w-7 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <span className="text-caption text-muted-foreground">
                    {t("parcelDescription")}
                  </span>
                  <p className="font-medium text-foreground">
                    {parcel.parcelDescription || t("noDescription")}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-md border border-border bg-surface-muted p-4 text-body-sm">
              <p className="text-caption text-muted-foreground">{t("merchant")}</p>
              <p className="font-semibold text-foreground">{parcel.merchantName}</p>
              <p className="mt-1 text-caption text-muted-foreground">{t("pickupAddress")}</p>
              <p className="text-foreground">{parcel.pickupAddress}</p>
            </div>

            {intelligence.confidenceScore !== null || intelligence.riskTier !== null ? (
              <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-surface-muted p-4 text-caption">
                <span className="flex items-center gap-1.5 font-semibold text-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
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
                  <span className="text-muted-foreground">{intelligence.zone}</span>
                ) : null}
              </div>
            ) : null}
            <ParcelIntelligencePanel parcelId={parcel.id} />
          </section>
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader className="border-b border-border pb-3">
          <CardTitle className="flex items-center gap-2 text-body font-bold">
            <Clock className="h-4 w-4 text-primary" aria-hidden="true" />
            {t("statusHistory")}
          </CardTitle>
          <CardDescription>{t("statusHistoryHint")}</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {parcel.history.length === 0 ? (
            <p className="flex items-center gap-2 text-body-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              {t("noHistory")}
            </p>
          ) : (
            <ol className="relative ml-3 space-y-6 border-l border-border pl-6">
              {[...parcel.history]
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((entry) => (
                  <li key={entry.id} className="relative">
                    <span
                      aria-hidden="true"
                      className="absolute -left-[31px] top-1 h-2.5 w-2.5 rounded-full bg-primary"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={entry.toStatus} />
                      {entry.fromStatus ? (
                        <span className="text-caption text-muted-foreground">
                          {t("fromStatus", {
                            status: tStatus(PARCEL_STATUS_CONFIG[entry.fromStatus].labelKey),
                          })}
                        </span>
                      ) : null}
                      <time
                        dateTime={entry.createdAt}
                        className="font-mono text-caption text-muted-foreground"
                      >
                        {dateTime(entry.createdAt)}
                      </time>
                    </div>
                    {entry.description ? (
                      <p className="mt-1 text-body-sm text-muted-foreground">{entry.description}</p>
                    ) : null}
                    <p className="mt-1 text-caption text-muted-foreground">
                      {t("recordedBy", { role: entry.actorRole })}
                    </p>
                  </li>
                ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
