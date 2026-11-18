"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button, DetailsSkeleton } from "@dhruto/ui";
import { ParcelStatus } from "@dhruto/contracts";
import { Link } from "@/lib/navigation";
import { useRouteBase } from "@/config/route-base";
import { HighlightCard } from "@/components/data-display/cards";
import { ErrorState, RetryButton } from "@/components/feedback/states";
import { useGetParcelByIdQuery, useGetParcelHistoryQuery } from "../api/parcels.api";
import { useFormatters } from "@/lib/format";
import { lastListUrl } from "@/lib/last-list-url";
import { ParcelCancelDialog } from "./parcel-cancel-dialog";
import { ParcelEditDialog } from "./parcel-edit-dialog";
import { ParcelPickupDialog } from "./parcel-pickup-dialog";
import { ParcelDetailsActions } from "./details/parcel-details-actions";
import { ParcelProgressTrack, type MilestoneItem } from "./details/parcel-progress-track";
import { ParcelInfoSections } from "./details/parcel-info-sections";
import { ParcelTimelineCard } from "./details/parcel-timeline-card";

interface ParcelDetailsViewProps {
  parcelId: string;
}

const MILESTONES: MilestoneItem[] = [
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

const RETURN_MILESTONES: MilestoneItem[] = [
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

  const [backHref, setBackHref] = useState(routes.parcels);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPickupModal, setShowPickupModal] = useState(false);

  useEffect(() => {
    setBackHref(lastListUrl(routes.parcels, routes.parcels));
  }, [routes.parcels]);

  if (isLoading) {
    return <DetailsSkeleton />;
  }

  if (isError || !data?.data) {
    return (
      <div className="rounded-3xl bg-surface-elevated/90 p-8 backdrop-blur-md">
        <ErrorState
          title={t("notFoundTitle")}
          description={t("notFoundDescription")}
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <RetryButton label={tStates("retry")} onRetry={() => void refetch()} />
              <Link href={routes.parcels}>
                <Button variant="outline" size="sm" className="gap-1.5 rounded-xl">
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
  const milestones = isReturnFlow(parcel.status) ? RETURN_MILESTONES : MILESTONES;
  const matchedStep = milestones.findIndex((milestone) =>
    milestone.statuses.includes(parcel.status),
  );

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
  const historyEntries = standaloneHistory?.data ?? parcel.history ?? [];

  return (
    <div className="w-full space-y-6">
      <ParcelDetailsActions
        t={t}
        backHref={backHref}
        status={parcel.status}
        parcelId={parcel.id}
        printLabelHref={routes.parcelLabel(parcel.id)}
        onRefresh={() => void refetch()}
        onRequestPickup={() => setShowPickupModal(true)}
        onEditDetails={() => setShowEditModal(true)}
        onCancelBooking={() => setShowCancelModal(true)}
      />

      <ParcelProgressTrack
        t={t}
        tStatus={tStatus}
        trackingCode={parcel.trackingCode}
        status={parcel.status}
        createdAt={parcel.createdAt}
        dateTimeStr={dateTime(parcel.createdAt)}
        milestones={milestones}
        currentStep={currentStep}
        progress={progress}
      />

      <ParcelInfoSections
        t={t}
        parcel={parcel}
        bdt={bdt}
      />

      <HighlightCard tone={nextStep.tone} className="p-5 rounded-3xl bg-surface-elevated/85 backdrop-blur-md">
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

      <ParcelTimelineCard
        t={t}
        tStatus={tStatus}
        dateTime={dateTime}
        historyEntries={historyEntries}
      />

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
