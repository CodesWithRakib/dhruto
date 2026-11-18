"use client";

import React, { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Truck,
  Edit3,
  XCircle,
  RefreshCw,
  Search,
  ShieldAlert,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from "@dhruto/ui";
import { ParcelStatus } from "@dhruto/contracts";
import { useGetParcelsQuery } from "@/features/parcels/api/parcels.api";
import { useRouteBase } from "@/config/route-base";
import { useFormatters } from "@/lib/format";
import { Link } from "@/lib/navigation";
import { ParcelEditDialog } from "@/features/parcels/components/parcel-edit-dialog";
import { ParcelCancelDialog } from "@/features/parcels/components/parcel-cancel-dialog";
import { ParcelPickupDialog } from "@/features/parcels/components/parcel-pickup-dialog";

type RiskTier = "HIGH" | "MEDIUM" | "LOW" | "UNSCORED";

export function IntelligenceReviewQueue() {
  const t = useTranslations("Intelligence");
  const { bdt, date } = useFormatters();
  const routes = useRouteBase();

  const [search, setSearch] = useState("");
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<"ALL" | "HIGH" | "MEDIUM">("ALL");

  // Selected parcel for modals
  const [editParcel, setEditParcel] = useState<{
    id: string;
    trackingCode: string;
    recipientName: string;
    recipientPhone: string;
    deliveryAddress: string;
    notes?: string | null;
  } | null>(null);

  const [cancelParcel, setCancelParcel] = useState<{
    id: string;
    trackingCode: string;
  } | null>(null);

  const [pickupParcel, setPickupParcel] = useState<{
    id: string;
    trackingCode: string;
    pickupAddress?: string | null;
  } | null>(null);

  // Fetch pre-dispatch bookings
  const { data, isLoading, isFetching, refetch } = useGetParcelsQuery({
    limit: 50,
    status: ParcelStatus.CREATED,
    search: search.trim() || undefined,
  });

  const parcels = useMemo(() => data?.data ?? [], [data]);

  // Risk comes from the server's booking-time intelligence snapshot (score,
  // tier, RTO probability, address confidence). Parcels the engine has not
  // scored are shown as such; the browser never invents a score.
  const reviewedParcels = useMemo(() => {
    return parcels.map((parcel) => {
      const tier = parcel.riskTier?.toUpperCase();
      const riskTier: RiskTier =
        tier === "HIGH" || tier === "MEDIUM" || tier === "LOW" ? tier : "UNSCORED";
      const flags: string[] = [];
      if (typeof parcel.rtoProbability === "number" && parcel.rtoProbability >= 40) {
        flags.push(`Predicted return risk ${Math.round(parcel.rtoProbability)}%`);
      }
      const confidence = parcel.addressConfidenceTier?.toUpperCase();
      if (confidence === "LOW") flags.push("Low address confidence: confirm with recipient");
      else if (confidence === "MEDIUM") flags.push("Address partly matched");
      if (riskTier === "UNSCORED") flags.push("Not scored by the risk engine yet");

      return {
        ...parcel,
        riskScore: typeof parcel.riskScore === "number" ? Math.round(parcel.riskScore) : null,
        riskTier,
        flags,
      };
    });
  }, [parcels]);

  const filtered = useMemo(() => {
    if (selectedRiskFilter === "HIGH") {
      return reviewedParcels.filter((p) => p.riskTier === "HIGH");
    }
    if (selectedRiskFilter === "MEDIUM") {
      return reviewedParcels.filter((p) => p.riskTier === "MEDIUM");
    }
    return reviewedParcels;
  }, [reviewedParcels, selectedRiskFilter]);

  const highRiskCount = reviewedParcels.filter((p) => p.riskTier === "HIGH").length;
  const mediumRiskCount = reviewedParcels.filter((p) => p.riskTier === "MEDIUM").length;
  const lowRiskCount = reviewedParcels.filter((p) => p.riskTier === "LOW").length;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="rounded-xl bg-surface">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("highRiskAttention")}
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-danger/10 text-danger">
                <ShieldAlert className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-danger">
              {highRiskCount}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {t("highRiskDesc")}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl bg-surface">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("moderateAttention")}
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-warning/10 text-warning">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-warning">
              {mediumRiskCount}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {t("moderateDesc")}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl bg-surface">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("safeToDispatch")}
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Truck className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">
              {lowRiskCount}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {t("safeDesc")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Review Queue Table */}
      <Card className="rounded-xl bg-surface">
        <CardHeader className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold text-foreground">
                {t("tabQueue")}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                {t("subtitle")}
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void refetch()}
                disabled={isFetching}
                className="gap-1.5 h-8 text-xs"
              >
                <RefreshCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} />
                {t("reset")}
              </Button>
            </div>
          </div>

          {/* Filter Pills and Search */}
          <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedRiskFilter("ALL")}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  selectedRiskFilter === "ALL"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}
              >
                {t("allRisks")} ({reviewedParcels.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedRiskFilter("HIGH")}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  selectedRiskFilter === "HIGH"
                    ? "bg-danger text-danger-foreground"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}
              >
                {t("highRiskOnly")} ({highRiskCount})
              </button>
              <button
                type="button"
                onClick={() => setSelectedRiskFilter("MEDIUM")}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  selectedRiskFilter === "MEDIUM"
                    ? "bg-warning text-warning-foreground"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}
              >
                {t("mediumRiskOnly")} ({mediumRiskCount})
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("searchQueue")}
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 w-full animate-pulse rounded-lg bg-muted/60" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-foreground">
                {t("noQueueItems")}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
                {t("noQueueItemsDesc")}
              </p>
            </div>
          ) : (
            <div>
              {filtered.map((item) => {
                const isHigh = item.riskTier === "HIGH";
                const isMed = item.riskTier === "MEDIUM";

                return (
                  <div
                    key={item.id}
                    className="p-4 sm:p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 hover:bg-muted/15 transition-colors"
                  >
                    {/* Left: Parcel & Recipient Details */}
                    <div className="min-w-0 space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={routes.parcel(item.id)}
                          className="font-mono text-xs font-bold text-foreground hover:underline hover:text-primary"
                        >
                          {item.trackingCode}
                        </Link>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isHigh
                              ? "bg-danger/10 text-danger"
                              : isMed
                                ? "bg-warning/10 text-warning"
                                : item.riskScore === null
                                  ? "bg-muted text-muted-foreground"
                                  : "bg-success/10 text-success"
                          }`}
                        >
                          {item.riskScore === null
                            ? "Not scored"
                            : `${isHigh ? t("holdReview") : isMed ? t("callNeeded") : t("safeDispatch")} · ${t("riskScore")} ${item.riskScore}`}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {date(item.createdAt)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-2 text-xs text-foreground font-medium">
                        <span>{item.recipientName}</span>
                        <span>·</span>
                        <span className="text-muted-foreground font-mono">{item.recipientPhone}</span>
                        <span>·</span>
                        <span className="text-muted-foreground">{item.district} ({item.thana})</span>
                      </div>

                      <p className="text-xs text-muted-foreground line-clamp-1">
                        <MapPin className="inline h-3 w-3 mr-1 text-muted-foreground" />
                        {item.deliveryAddress}
                      </p>

                      {/* Flags breakdown */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {item.flags.map((flag, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center text-[10px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded"
                          >
                            {isHigh && idx === 0 ? (
                              <AlertTriangle className="h-2.5 w-2.5 mr-1 text-danger" />
                            ) : null}
                            {flag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Right: COD & Actions */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between lg:justify-end gap-3 w-full lg:w-auto shrink-0 pt-3 sm:pt-0">
                      <div className="text-left sm:text-right">
                        <p className="text-xs font-bold text-foreground font-mono">
                          {bdt(item.codAmount)} COD
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Delivery fee: {bdt(item.deliveryFee)}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs gap-1"
                          onClick={() =>
                            setEditParcel({
                              id: item.id,
                              trackingCode: item.trackingCode,
                              recipientName: item.recipientName,
                              recipientPhone: item.recipientPhone,
                              deliveryAddress: item.deliveryAddress,
                              notes: item.parcelDescription,
                            })
                          }
                        >
                          <Edit3 className="h-3 w-3" />
                          {t("editAddress")}
                        </Button>

                        <Button
                          size="sm"
                          className="h-8 text-xs gap-1 bg-primary text-primary-foreground"
                          onClick={() =>
                            setPickupParcel({
                              id: item.id,
                              trackingCode: item.trackingCode,
                              pickupAddress: undefined,
                            })
                          }
                        >
                          <Truck className="h-3 w-3" />
                          {t("requestPickup")}
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-danger hover:bg-danger-soft hover:text-danger"
                          onClick={() =>
                            setCancelParcel({
                              id: item.id,
                              trackingCode: item.trackingCode,
                            })
                          }
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      {editParcel && (
        <ParcelEditDialog
          parcelId={editParcel.id}
          trackingCode={editParcel.trackingCode}
          initialRecipientName={editParcel.recipientName}
          initialRecipientPhone={editParcel.recipientPhone}
          initialDeliveryAddress={editParcel.deliveryAddress}
          initialNotes={editParcel.notes}
          isOpen={true}
          onClose={() => setEditParcel(null)}
          onSuccess={() => {
            setEditParcel(null);
            void refetch();
          }}
        />
      )}

      {cancelParcel && (
        <ParcelCancelDialog
          parcelId={cancelParcel.id}
          trackingCode={cancelParcel.trackingCode}
          isOpen={true}
          onClose={() => setCancelParcel(null)}
          onSuccess={() => {
            setCancelParcel(null);
            void refetch();
          }}
        />
      )}

      {pickupParcel && (
        <ParcelPickupDialog
          parcelId={pickupParcel.id}
          trackingCode={pickupParcel.trackingCode}
          pickupAddress={pickupParcel.pickupAddress}
          isOpen={true}
          onClose={() => setPickupParcel(null)}
          onSuccess={() => {
            setPickupParcel(null);
            void refetch();
          }}
        />
      )}
    </div>
  );
}
