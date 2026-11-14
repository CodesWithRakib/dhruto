"use client";

import React from "react";
import { useTranslations } from "next-intl";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Clock,
  Edit3,
  MapPin,
  Package,
  Printer,
  RefreshCw,
  ShieldCheck,
  Truck,
  User,
  Wallet,
  XCircle,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DetailsSkeleton,
} from "@dhruto/ui";
import { ParcelStatus } from "@dhruto/contracts";
import { Link } from "@/lib/navigation";
import { useRouteBase } from "@/config/route-base";
import { StatusBadge } from "@/components/data-display/status-badge";
import { HighlightCard } from "@/components/data-display/cards";
import { Timeline, TimelineItem } from "@/components/data-display/timeline";
import { PARCEL_STATUS_CONFIG, statusConfig } from "@/config/status";
import { ErrorState, RetryButton } from "@/components/feedback/states";
import { useGetParcelByIdQuery, useGetParcelHistoryQuery } from "../api/parcels.api";
import { ParcelIntelligencePanel } from "@/features/intelligence/components/parcel-intelligence-panel";
import { useFormatters } from "@/lib/format";
import { lastListUrl } from "@/lib/last-list-url";
import { ParcelCancelDialog } from "./parcel-cancel-dialog";
import { ParcelEditDialog } from "./parcel-edit-dialog";
import { ParcelPickupDialog } from "./parcel-pickup-dialog";
import { cn } from "@/lib/cn";

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

export function ParcelDetailsView({ parcelId }: ParcelDetailsViewProps) {
  const t = useTranslations("ParcelDetails");
  const tStates = useTranslations("States");
  const { bdt, dateTime } = useFormatters();
  const tStatus = useTranslations("ParcelStatus");
  const routes = useRouteBase();
  const { data, isLoading, isError, refetch } = useGetParcelByIdQuery(parcelId);
  const { data: standaloneHistory, refetch: refetchHistory } = useGetParcelHistoryQuery(parcelId, {
    skip: !parcelId,
    pollingInterval: 15000,
    skipPollingIfUnfocused: true,
  });

  // Back returns to the exact list workspace (filters + page) when the user
  // arrived from it; deep links fall back to the list root.
  const [backHref, setBackHref] = React.useState(routes.parcels);
  const [showCancelModal, setShowCancelModal] = React.useState(false);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [showPickupModal, setShowPickupModal] = React.useState(false);
  React.useEffect(() => {
    setBackHref(lastListUrl(routes.parcels, routes.parcels));
  }, [routes.parcels]);

  if (isLoading) {
    return <DetailsSkeleton />;
  }

  if (isError || !data?.data) {
    return (
      <div className="rounded-xl border border-border/70 bg-surface">
        <ErrorState
          title={t("notFoundTitle")}
          description={t("notFoundDescription")}
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <RetryButton label={tStates("retry")} onRetry={() => void refetch()} />
              <Link href={routes.parcels}>
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  {t("back")}
                </Button>
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  const parcel = data.data;
  const netReceivable = Math.max(0, parcel.codAmount - parcel.deliveryFee);
  const milestones = isReturnFlow(parcel.status) ? RETURN_MILESTONES : MILESTONES;
  // Unknown/terminal statuses (cancelled, lost, damaged) match no milestone:
  // show the track unpassed instead of implying step 1 is complete.
  const matchedStep = milestones.findIndex((milestone) =>
    milestone.statuses.includes(parcel.status),
  );
  // "What happens next" is derived from the same milestone order as the
  // progress track, so guidance can never contradict the lifecycle.
  const nextMilestone = matchedStep === -1 ? undefined : milestones[matchedStep + 1];
  const nextStep: { tone: "info" | "success" | "warning"; body: string } =
    matchedStep === -1
      ? { tone: "warning", body: t("exceptionNext") }
      : nextMilestone
        ? {
            tone: "info",
            body: t("nextIs", { stage: tStatus(nextMilestone.labelKey) }),
          }
        : isReturnFlow(parcel.status)
          ? { tone: "success", body: t("returnedNext") }
          : { tone: "success", body: t("deliveredNext") };
  const currentStep = matchedStep === -1 ? 0 : matchedStep + 1;
  const progress = milestones.length > 1 ? ((currentStep - 1) / (milestones.length - 1)) * 100 : 0;
  const intelligence = parcel.addressIntelligence;

  const isCancellable = [
    ParcelStatus.CREATED,
    ParcelStatus.PICKUP_REQUESTED,
    ParcelStatus.PICKUP_ASSIGNED,
  ].includes(parcel.status);

  const isEditable = [ParcelStatus.CREATED, ParcelStatus.PICKUP_REQUESTED].includes(parcel.status);

  const isPickupRequestable = parcel.status === ParcelStatus.CREATED;

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <Link href={backHref}>
          <Button variant="ghost" size="sm" className="-ml-2 gap-1.5">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t("back")}
          </Button>
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void refetch()}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {t("refresh")}
          </Button>

          {isPickupRequestable ? (
            <Button
              size="sm"
              className="gap-1.5 bg-primary text-primary-foreground shadow-sm"
              onClick={() => setShowPickupModal(true)}
            >
              <Truck className="h-4 w-4" aria-hidden="true" />
              <span>Request Pickup</span>
            </Button>
          ) : null}

          {isEditable ? (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setShowEditModal(true)}
            >
              <Edit3 className="h-4 w-4" aria-hidden="true" />
              <span>Edit Details</span>
            </Button>
          ) : null}

          {isCancellable ? (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-danger border-danger/30 hover:bg-danger-soft hover:text-danger"
              onClick={() => setShowCancelModal(true)}
            >
              <XCircle className="h-4 w-4" aria-hidden="true" />
              <span>Cancel Booking</span>
            </Button>
          ) : null}

          <Link href={routes.parcelLabel(parcel.id)}>
            <Button size="sm" className="gap-1.5">
              <Printer className="h-4 w-4" aria-hidden="true" />
              {t("printLabel")}
            </Button>
          </Link>
        </div>
      </div>

      <Card className="rounded-2xl border border-border/60 shadow-soft">
        <CardHeader className="flex flex-col gap-3 pb-2 sm:flex-row sm:items-center sm:justify-between sm:pb-3">
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
        <CardContent className="py-4 sm:py-6">
          <ol
            className="relative mx-auto flex max-w-2xl justify-between"
            aria-label={t("orderStatus")}
          >
            <div
              className="absolute top-3.5 -translate-y-1/2 h-0.5"
              style={{
                left: `${100 / (milestones.length * 2)}%`,
                right: `${100 / (milestones.length * 2)}%`,
              }}
              aria-hidden="true"
            >
              <div className="h-full w-full bg-surface-muted rounded-full" />
              <div
                className="absolute top-0 left-0 h-full bg-primary rounded-full transition-all duration-base ease-out"
                style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
              />
            </div>
            {milestones.map((milestone, index) => {
              const step = index + 1;
              const isPassed = currentStep >= step;
              const isCurrent = currentStep === step;
              return (
                <li
                  key={milestone.labelKey}
                  className="relative z-10 flex min-w-0 flex-1 flex-col items-center"
                  aria-current={isCurrent ? "step" : undefined}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full text-caption font-bold transition-all duration-200",
                      isPassed
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-surface-muted text-muted-foreground",
                      isCurrent && "ring-4 ring-primary/25 scale-105",
                    )}
                  >
                    {step}
                  </span>
                  <span
                    className={cn(
                      "mt-2 max-w-full px-1 text-center text-caption transition-colors",
                      isCurrent
                        ? "font-bold text-primary"
                        : isPassed
                          ? "font-medium text-foreground"
                          : "text-muted-foreground",
                    )}
                  >
                    {tStatus(milestone.labelKey)}
                  </span>
                </li>
              );
            })}
          </ol>
        </CardContent>

        <CardContent className="grid grid-cols-1 gap-6 pt-2 sm:pt-4 md:grid-cols-2">
          {/* Recipient */}
          <section className="space-y-3">
            <h3 className="flex items-center gap-2 text-caption font-bold uppercase tracking-wider text-muted-foreground">
              <User className="h-4 w-4 text-primary" aria-hidden="true" />
              {t("recipientInfo")}
            </h3>
            <div className="space-y-3 rounded-2xl border border-border/50 bg-surface-muted/40 p-5 text-body-sm transition-colors">
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
            <div className="space-y-3 rounded-2xl border border-border/50 bg-surface-muted/40 p-5 text-body-sm transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("codCollection")}</span>
                <span className="font-bold tabular-nums text-foreground">
                  {bdt(parcel.codAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-border/40 pb-2.5 text-caption text-muted-foreground">
                <span>{t("deliveryFee")}</span>
                <span className="tabular-nums">− {bdt(parcel.deliveryFee)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">{t("netReceivable")}</span>
                <span className="text-h4 font-bold tabular-nums text-primary">
                  {bdt(netReceivable)}
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
              <div className="flex items-center gap-3.5 rounded-2xl border border-border/50 bg-surface-muted/40 p-4 sm:p-5 transition-colors">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Building2 className="h-6 w-6" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <span className="text-caption text-muted-foreground">{t("currentHub")}</span>
                  <p className="font-medium text-foreground truncate">
                    {parcel.currentHubName ?? t("awaitingHub")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3.5 rounded-2xl border border-border/50 bg-surface-muted/40 p-4 sm:p-5 transition-colors">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Truck className="h-6 w-6" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <span className="text-caption text-muted-foreground">{t("assignedRider")}</span>
                  <p className="font-medium text-foreground truncate">
                    {parcel.currentRiderName ?? t("notAssigned")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3.5 rounded-2xl border border-border/50 bg-surface-muted/40 p-4 sm:p-5 transition-colors">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Package className="h-6 w-6" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <span className="text-caption text-muted-foreground">
                    {t("parcelDescription")}
                  </span>
                  <p className="font-medium text-foreground truncate">
                    {parcel.parcelDescription || t("noDescription")}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border/50 bg-surface-muted/40 p-5 text-body-sm">
              <p className="text-caption text-muted-foreground">{t("merchant")}</p>
              <p className="font-semibold text-foreground">{parcel.merchantName}</p>
              <p className="mt-1 text-caption text-muted-foreground">{t("pickupAddress")}</p>
              <p className="text-foreground">{parcel.pickupAddress}</p>
            </div>

            {intelligence.confidenceScore !== null || intelligence.riskTier !== null ? (
              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/50 bg-surface-muted/40 p-4 sm:p-5 text-caption">
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

      <HighlightCard tone={nextStep.tone} className="p-4 sm:p-5">
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <span className="block text-caption font-bold uppercase tracking-wider text-muted-foreground">
              {t("whatsNext")}
            </span>
            <p className="mt-0.5 text-body-sm font-semibold text-foreground">{nextStep.body}</p>
          </div>
        </div>
      </HighlightCard>

      {/* History */}
      <Card className="rounded-2xl border border-border/60 shadow-soft">
        <CardHeader className="pb-3 pt-6 px-6">
          <CardTitle className="flex items-center gap-2 text-body font-bold text-foreground">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Clock className="h-4 w-4" aria-hidden="true" />
            </div>
            <span>{t("statusHistory")}</span>
          </CardTitle>
          <CardDescription className="text-caption text-muted-foreground mt-1">
            {t("statusHistoryHint")}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2 px-6 pb-6">
          {(() => {
            const historyEntries = standaloneHistory?.data ?? parcel.history ?? [];
            if (historyEntries.length === 0) {
              return (
                <p className="flex items-center gap-2 text-body-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  {t("noHistory")}
                </p>
              );
            }
            return (
              <Timeline label={t("statusHistory")}>
                {[...historyEntries]
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((entry, index) => (
                    <TimelineItem
                      key={entry.id}
                      title={<StatusBadge status={entry.toStatus} />}
                      timestamp={dateTime(entry.createdAt)}
                      dateTime={entry.createdAt}
                      tone={statusConfig(entry.toStatus as ParcelStatus).tone}
                      current={index === 0}
                    >
                      {entry.fromStatus ? (
                        <span className="mt-1 block text-caption text-muted-foreground">
                          {t("fromStatus", {
                            status: tStatus(PARCEL_STATUS_CONFIG[entry.fromStatus].labelKey),
                          })}
                        </span>
                      ) : null}
                      {entry.description ? (
                        <p className="mt-1 text-body-sm text-muted-foreground">
                          {entry.description}
                        </p>
                      ) : null}
                      <p className="mt-1 text-caption text-muted-foreground">
                        {t("recordedBy", { role: entry.actorRole })}
                      </p>
                    </TimelineItem>
                  ))}
              </Timeline>
            );
          })()}
        </CardContent>
      </Card>

      <ParcelCancelDialog
        parcelId={parcel.id}
        trackingCode={parcel.trackingCode}
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onSuccess={() => {
          void refetch();
          void refetchHistory();
        }}
      />

      <ParcelEditDialog
        parcelId={parcel.id}
        trackingCode={parcel.trackingCode}
        initialRecipientName={parcel.recipientName}
        initialRecipientPhone={parcel.recipientPhone}
        initialDeliveryAddress={parcel.deliveryAddress}
        initialNotes={parcel.parcelDescription}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSuccess={() => {
          void refetch();
          void refetchHistory();
        }}
      />

      <ParcelPickupDialog
        parcelId={parcel.id}
        trackingCode={parcel.trackingCode}
        pickupAddress={parcel.pickupAddress}
        isOpen={showPickupModal}
        onClose={() => setShowPickupModal(false)}
        onSuccess={() => {
          void refetch();
          void refetchHistory();
        }}
      />
    </div>
  );
}
