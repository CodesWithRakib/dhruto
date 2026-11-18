"use client";

import React from "react";
import { ArrowLeft, Edit3, Printer, RefreshCw, Truck, XCircle } from "lucide-react";
import { Button } from "@dhruto/ui";
import { Link } from "@/lib/navigation";
import { ParcelStatus } from "@dhruto/contracts";
import { OpenConversationButton } from "@/features/chat/components/open-conversation-button";

interface ParcelDetailsActionsProps {
  t: (key: string) => string;
  backHref: string;
  status: ParcelStatus;
  parcelId: string;
  printLabelHref: string;
  onRefresh: () => void;
  onRequestPickup: () => void;
  onEditDetails: () => void;
  onCancelBooking: () => void;
}

export function ParcelDetailsActions({
  t,
  backHref,
  status,
  parcelId,
  printLabelHref,
  onRefresh,
  onRequestPickup,
  onEditDetails,
  onCancelBooking,
}: ParcelDetailsActionsProps) {
  const isCancellable = [
    ParcelStatus.CREATED,
    ParcelStatus.PICKUP_REQUESTED,
    ParcelStatus.PICKUP_ASSIGNED,
  ].includes(status);

  const isEditable = [ParcelStatus.CREATED, ParcelStatus.PICKUP_REQUESTED].includes(status);
  const isPickupRequestable = status === ParcelStatus.CREATED;

  return (
    <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
      <Link href={backHref}>
        <Button variant="ghost" size="sm" className="-ml-2 gap-1.5 rounded-xl text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span className="font-medium">{t("back")}</span>
        </Button>
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 rounded-xl hover:bg-surface-elevated font-medium"
          onClick={onRefresh}
        >
          <RefreshCw className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          <span>{t("refresh")}</span>
        </Button>

        {/* Parcel-linked conversation (merchant, admin); eligibility is enforced by the API. */}
        <OpenConversationButton
          target={{ kind: "parcel", parcelId }}
          className="gap-1.5 rounded-xl font-medium"
        />

        {isPickupRequestable ? (
          <Button
            size="sm"
            className="gap-1.5 rounded-xl bg-primary text-primary-foreground hover:scale-[1.01] active:scale-[0.99] transition-all font-semibold"
            onClick={onRequestPickup}
          >
            <Truck className="h-4 w-4" aria-hidden="true" />
            <span>Request Pickup</span>
          </Button>
        ) : null}

        {isEditable ? (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-xl hover:bg-surface-elevated font-medium"
            onClick={onEditDetails}
          >
            <Edit3 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            <span>Edit Details</span>
          </Button>
        ) : null}

        {isCancellable ? (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive font-medium"
            onClick={onCancelBooking}
          >
            <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Cancel Booking</span>
          </Button>
        ) : null}

        <Link href={printLabelHref}>
          <Button size="sm" className="gap-1.5 rounded-xl font-semibold">
            <Printer className="h-4 w-4" aria-hidden="true" />
            <span>{t("printLabel")}</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
