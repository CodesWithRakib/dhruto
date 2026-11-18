"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Building2,
  Calendar,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  FileCheck,
  MapPin,
  MessageSquare,
  Phone,
  RefreshCw,
  ShieldCheck,
  Truck,
  Bike,
} from "lucide-react";
import { Badge, Button } from "@dhruto/ui";
import { Link } from "@/lib/navigation";
import { CUSTOMER_ROUTES } from "@/config/routes";
import { ParcelStatus } from "@dhruto/contracts";
import type { CustomerDelivery } from "../../hooks/use-customer-deliveries";
import { useFormatters } from "@/lib/format";
import { OpenConversationButton } from "@/features/chat/components/open-conversation-button";

export function getProgressStep(status: ParcelStatus | string): {
  step: number;
  percentage: number;
  label: string;
} {
  switch (status) {
    case ParcelStatus.CREATED:
    case "BOOKED":
      return { step: 1, percentage: 20, label: "Booking Confirmed" };
    case ParcelStatus.PICKUP_REQUESTED:
    case ParcelStatus.PICKUP_ASSIGNED:
    case ParcelStatus.PICKED_UP:
      return { step: 2, percentage: 40, label: "Picked Up from Merchant" };
    case ParcelStatus.ORIGIN_HUB_RECEIVED:
    case ParcelStatus.BAGGED:
    case ParcelStatus.IN_TRANSIT:
    case "IN_TRANSIT":
    case ParcelStatus.DESTINATION_HUB_RECEIVED:
      return { step: 3, percentage: 65, label: "In Hub Transit" };
    case ParcelStatus.ASSIGNED_TO_RIDER:
    case ParcelStatus.OUT_FOR_DELIVERY:
    case "OUT_FOR_DELIVERY":
    case ParcelStatus.RESCHEDULED:
    case ParcelStatus.DELIVERY_ATTEMPTED:
      return { step: 4, percentage: 85, label: "Out for Delivery" };
    case ParcelStatus.DELIVERED:
    case "DELIVERED":
      return { step: 5, percentage: 100, label: "Delivered" };
    default:
      return { step: 2, percentage: 40, label: "Processing" };
  }
}

interface CustomerActiveShipmentCardProps {
  activeShipment: CustomerDelivery;
  showOtp: boolean;
  onToggleShowOtp: () => void;
  onCopy: (text: string, label: string) => void;
  onRefreshOtp: (code: string) => void;
  onOpenReschedule: (code: string) => void;
  onOpenPod: (shipment: CustomerDelivery) => void;
}

export function CustomerActiveShipmentCard({
  activeShipment,
  showOtp,
  onToggleShowOtp,
  onCopy,
  onRefreshOtp,
  onOpenReschedule,
  onOpenPod,
}: CustomerActiveShipmentCardProps) {
  const t = useTranslations("Customer");
  const { bdt } = useFormatters();
  const currentStep = getProgressStep(activeShipment.status);

  return (
    <div className="overflow-hidden rounded-3xl bg-card">
      <div className="bg-gradient-to-r from-primary-soft/60 via-primary-soft/30 to-card px-5 py-4 sm:px-7 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-primary">
            {activeShipment.status === ParcelStatus.DELIVERED
              ? "Completed Delivery Record"
              : t("activeShipmentArriving")}
          </span>
          <span className="text-xs text-muted-foreground">•</span>
          <span className="font-mono text-xs font-extrabold text-foreground">
            {activeShipment.trackingCode}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="bg-background/80 text-foreground font-bold"
          >
            {activeShipment.eta}
          </Badge>
          <Badge
            variant="primary-soft"
            className="font-semibold"
          >
            {activeShipment.statusLabel}
          </Badge>
        </div>
      </div>

      <div className="p-5 sm:p-7 space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Shipment info & Stepper */}
          <div className="space-y-6 lg:col-span-7">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" />
                <span>
                  {t("shippedFrom")}:{" "}
                  <strong className="text-foreground">{activeShipment.merchantName}</strong>
                </span>
              </div>
              <h3 className="mt-1 text-lg font-extrabold text-foreground">
                {activeShipment.itemsDescription}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="truncate">{activeShipment.destination}</span>
              </p>

              {/* Rider Note if Rescheduled */}
              {activeShipment.deliveryNote ? (
                <div className="mt-3 flex items-start gap-2 rounded-2xl bg-warning/10 p-3.5 text-xs text-warning-soft-foreground">
                  <MessageSquare className="h-3.5 w-3.5 shrink-0 mt-0.5 text-warning" />
                  <div>
                    <span className="font-bold">Customer Instruction:</span>{" "}
                    {activeShipment.deliveryNote}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Dynamic Progress Stepper */}
            <div className="rounded-2xl bg-muted/40 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span>{t("liveDeliveryProgress")}</span>
                <span className="text-primary font-bold">
                  Step {currentStep.step} of 5 ({currentStep.label})
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-success transition-all duration-500"
                  style={{ width: `${currentStep.percentage}%` }}
                />
              </div>
              <div className="grid grid-cols-5 pt-1 text-[10px] text-muted-foreground text-center">
                <span className={currentStep.step >= 1 ? "text-foreground font-bold" : ""}>
                  Booked
                </span>
                <span className={currentStep.step >= 2 ? "text-foreground font-bold" : ""}>
                  Picked Up
                </span>
                <span className={currentStep.step >= 3 ? "text-foreground font-bold" : ""}>
                  Hub Transit
                </span>
                <span className={currentStep.step >= 4 ? "text-primary font-extrabold" : ""}>
                  Out for Delivery
                </span>
                <span className={currentStep.step >= 5 ? "text-success font-extrabold" : ""}>
                  Delivered
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2.5 pt-2">
              {activeShipment.status !== ParcelStatus.DELIVERED ? (
                <Button
                  onClick={() => onOpenReschedule(activeShipment.trackingCode)}
                  variant="outline"
                  className="h-10 text-xs font-semibold gap-1.5 rounded-xl bg-card hover:bg-surface-muted"
                >
                  <Calendar className="h-3.5 w-3.5" />
                  {t("rescheduleOrInstructions")}
                </Button>
              ) : (
                <Button
                  onClick={() => onOpenPod(activeShipment)}
                  variant="outline"
                  className="h-10 text-xs font-semibold gap-1.5 rounded-xl bg-card hover:bg-surface-muted"
                >
                  <FileCheck className="h-3.5 w-3.5" />
                  View Proof of Delivery (POD)
                </Button>
              )}

              {/* Delivery conversation with the rider; the API checks recipient ownership. */}
              <OpenConversationButton
                target={{ kind: "parcel", parcelId: activeShipment.id }}
                size="default"
                className="h-10 text-xs font-semibold gap-1.5 rounded-xl bg-card hover:bg-surface-muted"
              />

              <Link href={`${CUSTOMER_ROUTES.tracking}/${activeShipment.trackingCode}`}>
                <Button
                  variant="default"
                  className="h-10 text-xs font-semibold gap-1.5 rounded-xl"
                >
                  <Truck className="h-3.5 w-3.5" />
                  {t("viewFullTimeline")}
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Column: Secure OTP & Assigned Rider */}
          <div className="flex flex-col gap-3.5 rounded-2xl bg-muted/40 p-4.5 sm:p-5 lg:col-span-5">
            {/* Secure OTP Card */}
            {activeShipment.status === ParcelStatus.DELIVERED ? (
              <div className="space-y-2 rounded-2xl bg-card p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                    Doorstep Delivery Handoff
                  </span>
                  <span className="inline-flex items-center rounded-full bg-success-soft text-success px-2 py-0.5 text-[10px] font-extrabold">
                    Verified
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-xs text-muted-foreground block font-medium">
                      OTP Verified:
                    </span>
                    <span className="font-mono text-lg font-bold text-success tracking-wider">
                      {activeShipment.otp}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground font-medium">
                    Handoff confirmed at doorstep
                  </span>
                </div>
              </div>
            ) : activeShipment.otp ? (
              <div className="space-y-2 rounded-2xl bg-card p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                    {t("doorstepDeliveryOtp")}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase text-primary bg-primary-soft px-2 py-0.5 rounded-full">
                      Unique Code
                    </span>
                    <button
                      type="button"
                      onClick={onToggleShowOtp}
                      className="text-muted-foreground hover:text-foreground text-xs"
                      aria-label="Toggle OTP visibility"
                    >
                      {showOtp ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-mono text-2xl font-black tracking-widest text-primary">
                    {showOtp ? activeShipment.otp : "••••••"}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="soft"
                      size="sm"
                      onClick={() => onCopy(activeShipment.otp, "Delivery OTP")}
                      className="h-8 gap-1 text-xs font-semibold rounded-xl"
                    >
                      <Copy className="h-3 w-3" />
                      Copy
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onRefreshOtp(activeShipment.trackingCode)}
                      title="Generate fresh OTP"
                      className="h-8 gap-1 text-xs font-semibold rounded-xl text-muted-foreground hover:text-foreground"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Fresh
                    </Button>
                  </div>
                </div>

                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  {t("otpSafetyNotice")}
                </p>
              </div>
            ) : null}

            {/* Assigned Rider Contact */}
            {activeShipment.riderName ? (
              <div className="flex items-center justify-between rounded-2xl bg-card p-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold">
                    <Bike className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block uppercase font-bold">
                      Assigned Rider
                    </span>
                    <span className="text-xs font-extrabold text-foreground">
                      {activeShipment.riderName}
                    </span>
                    <span className="text-[11px] text-muted-foreground font-mono block">
                      Dhruto Express Fleet
                    </span>
                  </div>
                </div>

                {activeShipment.riderPhone ? (
                  <a href={`tel:${activeShipment.riderPhone}`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 gap-1 text-xs font-semibold rounded-xl bg-primary-soft text-primary hover:bg-primary/20"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      Call
                    </Button>
                  </a>
                ) : null}
              </div>
            ) : null}

            {/* COD Cash Amount */}
            <div className="flex items-center justify-between rounded-2xl bg-card p-3.5 text-xs">
              <span className="text-muted-foreground font-medium">{t("codPayment")}:</span>
              <span className="font-bold text-foreground">
                {activeShipment.codAmount === null ? (
                  <span className="text-muted-foreground font-semibold">Not disclosed</span>
                ) : activeShipment.codAmount > 0 && !activeShipment.isPaid ? (
                  <span className="text-primary font-black">
                    {bdt(activeShipment.codAmount)} (Cash on Delivery)
                  </span>
                ) : (
                  <span className="text-success font-semibold">Paid in Advance</span>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
