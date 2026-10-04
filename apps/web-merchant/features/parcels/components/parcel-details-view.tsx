"use client";

import React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
} from "@dhruto/ui";
import {
  ArrowLeft,
  Printer,
  Search,
  Truck,
  MapPin,
  Phone,
  User,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
} from "lucide-react";
import { useGetParcelByIdQuery } from "../api/parcels.api";

interface ParcelDetailsViewProps {
  parcelId: string;
}

const MILESTONES = [
  { step: 1, label: "Booking", statuses: ["CREATED", "PICKUP_REQUESTED", "PICKUP_ASSIGNED"] },
  { step: 2, label: "Picked Up", statuses: ["PICKED_UP", "ORIGIN_HUB_RECEIVED"] },
  { step: 3, label: "Sorting & Transit", statuses: ["BAGGED", "IN_TRANSIT", "DESTINATION_HUB_RECEIVED"] },
  { step: 4, label: "Out for Delivery", statuses: ["ASSIGNED_TO_RIDER", "OUT_FOR_DELIVERY", "DELIVERY_ATTEMPTED", "RESCHEDULED"] },
  { step: 5, label: "Delivered", statuses: ["DELIVERED", "CASH_PENDING", "CASH_VERIFIED"] },
];

function getCurrentStepIndex(currentStatus: string): number {
  if (["DELIVERED", "CASH_PENDING", "CASH_VERIFIED"].includes(currentStatus)) return 5;
  if (["ASSIGNED_TO_RIDER", "OUT_FOR_DELIVERY", "DELIVERY_ATTEMPTED", "RESCHEDULED"].includes(currentStatus)) return 4;
  if (["BAGGED", "IN_TRANSIT", "DESTINATION_HUB_RECEIVED"].includes(currentStatus)) return 3;
  if (["PICKED_UP", "ORIGIN_HUB_RECEIVED"].includes(currentStatus)) return 2;
  return 1;
}

export function ParcelDetailsView({ parcelId }: ParcelDetailsViewProps) {
  const t = useTranslations("ParcelDetails");
  const { data, isLoading, error } = useGetParcelByIdQuery(parcelId);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center space-y-3">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground">Loading shipment details...</p>
      </div>
    );
  }

  if (error || !data?.data) {
    return (
      <Card className="max-w-xl mx-auto my-8 border-destructive/20 text-center p-8">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-3" />
        <CardTitle className="text-xl">Shipment Not Found</CardTitle>
        <CardDescription className="mt-1">
          Unable to find shipment with ID "{parcelId}".
        </CardDescription>
        <Link href="/parcels" className="mt-4 inline-block">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("back")}
          </Button>
        </Link>
      </Card>
    );
  }

  const parcel = data.data;
  const currentStep = getCurrentStepIndex(parcel.status);
  const netReceivable = Math.max(0, parcel.codAmount - parcel.deliveryFee);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Link href="/parcels">
          <Button variant="ghost" size="sm" className="flex items-center gap-1.5 -ml-2">
            <ArrowLeft className="h-4 w-4" />
            {t("back")}
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Link href={`/track/${parcel.trackingCode}`}>
            <Button variant="outline" size="sm" className="flex items-center gap-1.5">
              <Search className="h-4 w-4" />
              {t("publicTracking")}
            </Button>
          </Link>
          <Link href={`/parcels/${parcel.id}/label`}>
            <Button size="sm" className="flex items-center gap-1.5">
              <Printer className="h-4 w-4" />
              {t("printLabel")}
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Info Card */}
      <Card className="shadow-md border-primary/20">
        <CardHeader className="bg-primary/5 border-b border-primary/10 rounded-t-xl">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div>
              <span className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">
                {t("trackingCode")}
              </span>
              <h1 className="text-2xl font-mono font-extrabold text-foreground">
                {parcel.trackingCode}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="default" className="text-sm px-3 py-1 font-semibold">
                {parcel.status}
              </Badge>
            </div>
          </div>
        </CardHeader>

        {/* Milestone Stepper */}
        <CardContent className="pt-6 pb-6 border-b bg-card">
          <div className="relative flex justify-between items-center max-w-2xl mx-auto">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-muted -z-0">
              <div
                className="h-1 bg-primary transition-all duration-500"
                style={{ width: `${((currentStep - 1) / (MILESTONES.length - 1)) * 100}%` }}
              ></div>
            </div>

            {MILESTONES.map((m) => {
              const isPassed = currentStep >= m.step;
              const isCurrent = currentStep === m.step;

              return (
                <div key={m.step} className="relative z-10 flex flex-col items-center">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                      isPassed
                        ? "bg-primary text-primary-foreground shadow"
                        : "bg-muted text-muted-foreground border-2 border-background"
                    } ${isCurrent ? "ring-4 ring-primary/20" : ""}`}
                  >
                    {isPassed ? <CheckCircle2 className="h-5 w-5" /> : m.step}
                  </div>
                  <span
                    className={`text-xs mt-2 text-center max-w-[80px] font-medium leading-tight ${
                      isPassed ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {m.label}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>

        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
          {/* Recipient Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              {t("recipientInfo")}
            </h3>
            <div className="p-4 rounded-lg bg-muted/40 border space-y-2 text-sm">
              <div>
                <span className="text-xs text-muted-foreground">{t("recipientName")}</span>
                <p className="font-semibold text-foreground">{parcel.recipientName}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">{t("recipientPhone")}</span>
                <p className="font-mono font-medium text-foreground flex items-center gap-1.5 mt-0.5">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  {parcel.recipientPhone}
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">{t("address")}</span>
                <p className="font-medium text-foreground flex items-start gap-1.5 mt-0.5">
                  <MapPin className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>
                    {parcel.deliveryAddress}, {parcel.thana}, {parcel.district}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              {t("financialSummary")}
            </h3>
            <div className="p-4 rounded-lg bg-muted/40 border space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t("codCollection")}</span>
                <span className="text-base font-bold text-foreground">
                  ৳{parcel.codAmount.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs text-muted-foreground border-b pb-2">
                <span>{t("deliveryFee")}</span>
                <span>- ৳{parcel.deliveryFee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pt-1 font-semibold">
                <span className="text-foreground">{t("netReceivable")}</span>
                <span className="text-lg font-extrabold text-primary">
                  ৳{netReceivable.toLocaleString()}
                </span>
              </div>
              <div className="text-xs text-muted-foreground pt-1">
                Weight: <span className="font-semibold text-foreground">{parcel.weight} kg</span>
              </div>
            </div>
          </div>

          {/* Operational Logistics */}
          <div className="space-y-4 md:col-span-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" />
              {t("operations")}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted/40 border flex items-center gap-3">
                <Building2 className="h-8 w-8 text-primary/70 flex-shrink-0" />
                <div>
                  <span className="text-xs text-muted-foreground">{t("currentHub")}</span>
                  <p className="font-medium text-foreground">
                    {parcel.currentHubName || "Dhaka Central Sorting Hub (DHK-01)"}
                  </p>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-muted/40 border flex items-center gap-3">
                <Truck className="h-8 w-8 text-primary/70 flex-shrink-0" />
                <div>
                  <span className="text-xs text-muted-foreground">{t("assignedRider")}</span>
                  <p className="font-medium text-foreground">
                    {parcel.currentRiderName
                      ? `${parcel.currentRiderName} (${parcel.currentRiderPhone || ""})`
                      : t("notAssigned")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* History Timeline */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            {t("statusHistory")}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {parcel.statusHistory.length === 0 ? (
            <p className="text-muted-foreground text-sm">No milestone history recorded yet.</p>
          ) : (
            <ol className="relative border-l border-primary/30 ml-4 space-y-6">
              {parcel.statusHistory.map((hist, idx) => (
                <li key={hist.id || idx} className="ml-6">
                  <span className="absolute -left-3 flex items-center justify-center w-6 h-6 bg-primary text-primary-foreground rounded-full ring-4 ring-background text-xs">
                    ✓
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">
                      {hist.toStatus}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                      {new Date(hist.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {hist.reason && (
                    <p className="text-xs text-muted-foreground mt-1 bg-muted/50 p-2 rounded w-fit">
                      {hist.reason}
                    </p>
                  )}
                  <span className="text-[11px] text-muted-foreground mt-1 block">
                    Recorded by role: <span className="font-medium">{hist.changedByRole}</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
