"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  Bike,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  Eye,
  EyeOff,
  FileCheck,
  MapPin,
  MessageSquare,
  Package,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Truck,
  X,
} from "lucide-react";
import { Badge, Button, Input } from "@dhruto/ui";
import { Link } from "@/lib/navigation";
import { CUSTOMER_ROUTES } from "@/config/routes";
import { useAppSelector } from "@/store/hooks";
import { RescheduleModal } from "./reschedule-modal";
import { PodModal } from "./pod-modal";
import {
  useCustomerDeliveries,
  type CustomerDelivery,
} from "../hooks/use-customer-deliveries";
import { ParcelStatus } from "@dhruto/contracts";
import { toast } from "sonner";
import { CustomerIllustrationBg } from "@/components/visual/illustration-backgrounds";

/**
 * Calculates current progress step (1-5) and percentage for active delivery
 */
function getProgressStep(status: ParcelStatus | string): { step: number; percentage: number; label: string } {
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

const SAMPLE_TRACKING_CODES = [
  "DHR-20261114-NNN27T",
  "DHR-20261113-K25WQ5",
  "DHR-2610-00101",
  "DHR-2610-00102",
  "DHR-2610-00107",
];

export function CustomerDashboardView() {
  const t = useTranslations("Customer");
  const authUser = useAppSelector((s) => s.auth.user);

  const {
    deliveries,
    activeShipment,
    activeTrackingCode,
    setActiveTrackingCode,
    isRefreshing,
    incomingCount,
    arrivingTodayCount,
    deliveredCount,
    totalCodDue,
    primaryLocation,
    addDeliveryByTrackingCode,
    refreshAllDeliveries,
    rescheduleDelivery,
    removeDelivery,
    refreshOtp,
  } = useCustomerDeliveries();

  // Search & Filters
  const [activeFilter, setActiveFilter] = React.useState<"ALL" | "ACTIVE" | "DELIVERED">("ALL");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [showOtp, setShowOtp] = React.useState(true);

  // New Parcel Quick Connect Form
  const [newCodeInput, setNewCodeInput] = React.useState("");
  const [isAddingCode, setIsAddingCode] = React.useState(false);

  // Modals state
  const [rescheduleOpen, setRescheduleOpen] = React.useState(false);
  const [activeTrackingForModal, setActiveTrackingForModal] = React.useState<string>("");
  const [podOpen, setPodOpen] = React.useState(false);
  const [selectedPodParcel, setSelectedPodParcel] = React.useState<CustomerDelivery | null>(null);

  // Filtered deliveries list
  const filteredDeliveries = React.useMemo(() => {
    return deliveries.filter((item) => {
      if (activeFilter === "ACTIVE" && item.status === ParcelStatus.DELIVERED) return false;
      if (activeFilter === "DELIVERED" && item.status !== ParcelStatus.DELIVERED) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.trackingCode.toLowerCase().includes(q) ||
          item.merchantName.toLowerCase().includes(q) ||
          item.itemsDescription.toLowerCase().includes(q) ||
          item.destination.toLowerCase().includes(q) ||
          (item.riderName && item.riderName.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [deliveries, activeFilter, searchQuery]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const handleOpenPod = (item: CustomerDelivery) => {
    setSelectedPodParcel(item);
    setPodOpen(true);
  };

  const handleOpenReschedule = (code: string) => {
    setActiveTrackingForModal(code);
    setRescheduleOpen(true);
  };

  const handleAddTrackingCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newCodeInput.trim()) return;
    setIsAddingCode(true);
    const ok = await addDeliveryByTrackingCode(newCodeInput);
    if (ok) {
      setNewCodeInput("");
    }
    setIsAddingCode(false);
  };

  const currentStep = activeShipment ? getProgressStep(activeShipment.status) : null;

  return (
    <div className="relative space-y-6">
      <CustomerIllustrationBg opacity={0.35} />
      {/* Reschedule Modal */}
      <RescheduleModal
        open={rescheduleOpen}
        onOpenChange={setRescheduleOpen}
        trackingCode={activeTrackingForModal || activeShipment?.trackingCode || ""}
        currentAddress={activeShipment?.destination}
        onRescheduleSuccess={(details) => {
          rescheduleDelivery(activeTrackingForModal || activeShipment?.trackingCode || "", details);
        }}
      />

      {/* Proof of Delivery (POD) Modal */}
      {selectedPodParcel ? (
        <PodModal
          open={podOpen}
          onOpenChange={setPodOpen}
          parcel={{
            trackingCode: selectedPodParcel.trackingCode,
            recipientName: authUser?.name || "Verified Customer",
            recipientPhone: authUser?.phone || "+8801700000005",
            deliveryAddress: selectedPodParcel.destination,
            deliveredAt: selectedPodParcel.deliveredAt || "Today",
            riderName: selectedPodParcel.riderName || "Dhruto Express Rider",
            merchantName: selectedPodParcel.merchantName,
            codAmount: selectedPodParcel.codAmount,
            description: selectedPodParcel.itemsDescription,
          }}
        />
      ) : null}

      {/* Dynamic Welcome & Live Pulse Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-card via-surface to-surface-muted/30 p-6 sm:p-8 shadow-soft">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary border border-primary/20">
                <Sparkles className="h-3.5 w-3.5" />
                {t("verifiedRecipientBadge")}
              </span>
              {authUser?.phone ? (
                <span className="text-xs text-muted-foreground font-mono">
                  {authUser.phone}
                </span>
              ) : null}
            </div>
            <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
              {t("greeting", { name: authUser?.name || t("defaultRecipientName") || "Customer" })}
            </h1>
            <p className="text-xs text-muted-foreground sm:text-sm">
              {t("portalSubtitle")}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:self-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refreshAllDeliveries()}
              disabled={isRefreshing}
              className="h-10 text-xs font-semibold gap-1.5 rounded-xl border-border/60 bg-background/80 hover:bg-background"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
              {isRefreshing ? "Syncing..." : "Sync Live Status"}
            </Button>
            <Link href={CUSTOMER_ROUTES.tracking}>
              <Button variant="secondary" className="h-10 text-xs font-semibold gap-1.5 rounded-xl shadow-xs">
                <Search className="h-3.5 w-3.5" />
                {t("trackAnyParcel")}
              </Button>
            </Link>
          </div>
        </div>

        {/* Dynamic Real-Time Stats Grid */}
        <div className="mt-6 grid grid-cols-2 gap-3.5 sm:grid-cols-4">
          <div className="rounded-2xl border border-border/70 bg-card dark:bg-card/90 p-4 shadow-xs transition-all hover:border-primary/50 hover:shadow-soft">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">{t("statIncoming")}</span>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
            </div>
            <div className="mt-2 text-2xl font-black text-foreground">{incomingCount}</div>
            <span className="text-[11px] text-primary font-medium">
              {arrivingTodayCount > 0 ? `${arrivingTodayCount} arriving today` : "Scheduled in transit"}
            </span>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card dark:bg-card/90 p-4 shadow-xs transition-all hover:border-success/50 hover:shadow-soft">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">{t("statDelivered")}</span>
              <CheckCircle2 className="h-4 w-4 text-success" />
            </div>
            <div className="mt-2 text-2xl font-black text-foreground">{deliveredCount}</div>
            <span className="text-[11px] text-muted-foreground">Doorstep handoffs logged</span>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card dark:bg-card/90 p-4 shadow-xs transition-all hover:border-warning/50 hover:shadow-soft">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">{t("statCodDue")}</span>
              <Clock className="h-4 w-4 text-warning" />
            </div>
            <div className="mt-2 text-2xl font-black text-foreground">
              ৳{totalCodDue.toLocaleString()}
            </div>
            <span className="text-[11px] text-muted-foreground">Cash ready for delivery rider</span>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card dark:bg-card/90 p-4 shadow-xs transition-all hover:border-primary/50 hover:shadow-soft">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">{t("statAddress")}</span>
              <MapPin className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-2 text-2xl font-black text-foreground truncate">{primaryLocation}</div>
            <span className="text-[11px] text-muted-foreground">Primary Destination</span>
          </div>
        </div>
      </div>

      {/* Dynamic Instant Track & Connect Shipment Bar */}
      <div className="rounded-2xl border border-border/70 bg-card dark:bg-card/90 p-5 shadow-xs">
        <form onSubmit={handleAddTrackingCode} className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Package className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10" />
            <Input
              type="text"
              value={newCodeInput}
              onChange={(e) => setNewCodeInput(e.target.value)}
              placeholder="Connect any tracking code (e.g. DHR-20261114-NNN27T)..."
              className="pl-10 font-mono text-xs bg-muted/40 dark:bg-background rounded-xl border-border/70 focus:bg-background"
            />
          </div>
          <Button
            type="submit"
            disabled={isAddingCode || !newCodeInput.trim()}
            className="h-10 shrink-0 text-xs font-semibold gap-1.5 rounded-xl shadow-xs"
          >
            {isAddingCode ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            Track & Add to Dashboard
          </Button>
        </form>

        <div className="mt-3.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span className="text-[11px] font-semibold">Quick Sample Shipments:</span>
          {SAMPLE_TRACKING_CODES.map((code) => {
            const isTracked = deliveries.some((d) => d.trackingCode === code);
            return (
              <button
                key={code}
                type="button"
                onClick={() => {
                  if (isTracked) {
                    setActiveTrackingCode(code);
                  } else {
                    addDeliveryByTrackingCode(code);
                  }
                }}
                className={`rounded-lg px-2.5 py-1 font-mono text-xs transition-all border ${
                  isTracked
                    ? "bg-primary-soft text-primary font-bold border-primary/30 hover:bg-primary/20"
                    : "bg-surface-muted/60 text-muted-foreground border-border/60 hover:border-border hover:bg-surface-muted hover:text-foreground"
                }`}
              >
                {code} {isTracked && activeTrackingCode === code ? "★" : ""}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Delivery Spotlight Card */}
      {activeShipment ? (
        <div className="overflow-hidden rounded-3xl border border-primary/25 bg-card shadow-soft ring-1 ring-primary/10">
          <div className="border-b border-primary/20 bg-gradient-to-r from-primary-soft/60 via-primary-soft/30 to-card px-5 py-4 sm:px-7 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-600" />
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
              <Badge variant="outline" className="border border-border/60 bg-background/80 text-foreground font-bold shadow-2xs">
                {activeShipment.eta}
              </Badge>
              <Badge variant="primary-soft" className="font-semibold border border-primary/30 shadow-2xs">
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
                    <div className="mt-3 flex items-start gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3.5 text-xs text-amber-800 dark:text-amber-200">
                      <MessageSquare className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                      <div>
                        <span className="font-bold">Customer Instruction:</span> {activeShipment.deliveryNote}
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Dynamic Progress Stepper */}
                <div className="rounded-2xl border border-border/70 bg-muted/40 p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                    <span>{t("liveDeliveryProgress")}</span>
                    <span className="text-primary font-bold">
                      Step {currentStep?.step ?? 3} of 5 ({currentStep?.label})
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-muted border border-border/40">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500 transition-all duration-500"
                      style={{ width: `${currentStep?.percentage ?? 60}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-5 pt-1 text-[10px] text-muted-foreground text-center">
                    <span className={currentStep && currentStep.step >= 1 ? "text-foreground font-bold" : ""}>
                      Booked
                    </span>
                    <span className={currentStep && currentStep.step >= 2 ? "text-foreground font-bold" : ""}>
                      Picked Up
                    </span>
                    <span className={currentStep && currentStep.step >= 3 ? "text-foreground font-bold" : ""}>
                      Hub Transit
                    </span>
                    <span className={currentStep && currentStep.step >= 4 ? "text-primary font-extrabold" : ""}>
                      Out for Delivery
                    </span>
                    <span className={currentStep && currentStep.step >= 5 ? "text-emerald-600 font-extrabold" : ""}>
                      Delivered
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2.5 pt-2">
                  {activeShipment.status !== ParcelStatus.DELIVERED ? (
                    <Button
                      onClick={() => handleOpenReschedule(activeShipment.trackingCode)}
                      variant="outline"
                      className="h-10 text-xs font-semibold gap-1.5 rounded-xl border-border/70 bg-card hover:bg-surface-muted shadow-2xs"
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      {t("rescheduleOrInstructions")}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleOpenPod(activeShipment)}
                      variant="outline"
                      className="h-10 text-xs font-semibold gap-1.5 rounded-xl border-border/70 bg-card hover:bg-surface-muted shadow-2xs"
                    >
                      <FileCheck className="h-3.5 w-3.5" />
                      View Proof of Delivery (POD)
                    </Button>
                  )}

                  <Link href={`${CUSTOMER_ROUTES.tracking}/${activeShipment.trackingCode}`}>
                    <Button variant="default" className="h-10 text-xs font-semibold gap-1.5 rounded-xl shadow-xs">
                      <Truck className="h-3.5 w-3.5" />
                      {t("viewFullTimeline")}
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Right Column: Secure OTP & Assigned Rider */}
              <div className="flex flex-col gap-3.5 rounded-2xl border border-border/70 bg-muted/40 p-4.5 sm:p-5 lg:col-span-5">
                {/* Secure OTP Card */}
                {activeShipment.status === ParcelStatus.DELIVERED ? (
                  <div className="space-y-2 rounded-2xl border border-success/30 bg-card dark:bg-card/90 p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                        Doorstep Delivery Handoff
                      </span>
                      <span className="inline-flex items-center rounded-full bg-success-soft text-success px-2 py-0.5 text-[10px] font-extrabold border border-success/20">
                        Verified
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <span className="text-xs text-muted-foreground block font-medium">OTP Verified:</span>
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
                  <div className="space-y-2 rounded-2xl border border-primary/30 bg-card dark:bg-card/90 p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                        {t("doorstepDeliveryOtp")}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase text-primary bg-primary-soft px-2 py-0.5 rounded-full border border-primary/20">
                          Unique Code
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowOtp(!showOtp)}
                          className="text-muted-foreground hover:text-foreground text-xs"
                          aria-label="Toggle OTP visibility"
                        >
                          {showOtp ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
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
                          onClick={() => handleCopy(activeShipment.otp, "Delivery OTP")}
                          className="h-8 gap-1 text-xs font-semibold rounded-xl"
                        >
                          <Copy className="h-3 w-3" />
                          Copy
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => refreshOtp(activeShipment.trackingCode)}
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
                  <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-card dark:bg-card/90 p-3.5 shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold shadow-2xs">
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
                <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-card dark:bg-card/90 p-3.5 text-xs shadow-xs">
                  <span className="text-muted-foreground font-medium">{t("codPayment")}:</span>
                  <span className="font-bold text-foreground">
                    {activeShipment.codAmount > 0 && !activeShipment.isPaid ? (
                      <span className="text-primary font-black">
                        ৳{activeShipment.codAmount.toLocaleString()} (Cash on Delivery)
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
      ) : null}

      {/* Deliveries Feed & Search */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: "ALL", label: `${t("filterAll")} (${deliveries.length})` },
              { id: "ACTIVE", label: `${t("filterActive")} (${incomingCount})` },
              { id: "DELIVERED", label: `${t("filterDelivered")} (${deliveredCount})` },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveFilter(f.id as typeof activeFilter)}
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all border ${
                  activeFilter === f.id
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-card text-muted-foreground border-border/60 hover:bg-surface-muted hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by code, merchant, item..."
              className="h-10 w-full rounded-2xl border border-border/60 bg-card pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-2xs transition-all"
            />
          </div>
        </div>

        {/* Deliveries List */}
        <div className="space-y-3">
          {filteredDeliveries.length === 0 ? (
            <div className="rounded-2xl border border-border/60 bg-card p-8 text-center text-xs text-muted-foreground shadow-2xs">
              No deliveries match your current search or filter criteria.
            </div>
          ) : (
            filteredDeliveries.map((delivery) => {
              const isDelivered = delivery.status === ParcelStatus.DELIVERED;
              const isSpotlighted = delivery.trackingCode === activeShipment?.trackingCode;

              return (
                <div
                  key={delivery.id}
                  className={`group relative flex flex-col justify-between gap-4 rounded-2xl border p-5 transition-all sm:flex-row sm:items-center ${
                    isSpotlighted
                      ? "border-primary/50 bg-primary-soft/20 dark:bg-primary-soft/10 ring-1 ring-primary/25 shadow-soft"
                      : "border-border/70 bg-card dark:bg-card/90 shadow-xs hover:border-primary/40 hover:shadow-soft"
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <button
                      type="button"
                      onClick={() => setActiveTrackingCode(delivery.trackingCode)}
                      title="Pin to spotlight"
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-bold transition-transform group-hover:scale-105 border ${
                        isDelivered
                          ? "bg-success-soft text-success border-success/20"
                          : "bg-primary-soft text-primary border-primary/20"
                      }`}
                    >
                      {isDelivered ? <CheckCircle2 className="h-5 w-5" /> : <Package className="h-5 w-5" />}
                    </button>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-extrabold text-foreground">
                          {delivery.trackingCode}
                        </span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs font-bold text-foreground">
                          {delivery.merchantName}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            isDelivered
                              ? "bg-success-soft text-success-soft-foreground"
                              : "bg-primary-soft text-primary-soft-foreground"
                          }`}
                        >
                          {delivery.statusLabel}
                        </span>
                        {isSpotlighted ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-extrabold text-primary">
                            ★ Active
                          </span>
                        ) : null}
                      </div>

                      <p className="text-xs text-muted-foreground font-medium">
                        {delivery.itemsDescription}
                      </p>

                      {delivery.deliveryNote ? (
                        <p className="text-[11px] text-amber-700 dark:text-amber-300 font-medium flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          Note: {delivery.deliveryNote}
                        </p>
                      ) : null}

                      <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-muted-foreground">
                        <span>{isDelivered ? delivery.deliveredAt || "Delivered" : delivery.eta}</span>
                        <span>•</span>
                        <span>
                          COD:{" "}
                          <strong className="text-foreground">
                            {delivery.codAmount > 0 && !delivery.isPaid
                              ? `৳${delivery.codAmount}`
                              : "Prepaid"}
                          </strong>
                        </span>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(delivery.otp, `Delivery OTP for ${delivery.trackingCode}`);
                          }}
                          title="Click to copy delivery OTP"
                          className="inline-flex items-center gap-1 font-mono text-[10px] text-primary bg-primary-soft/80 hover:bg-primary-soft hover:border-primary/40 px-2 py-0.5 rounded-md font-bold border border-primary/20 transition-all cursor-pointer shadow-2xs group/otp"
                        >
                          <ShieldCheck className="h-3 w-3 text-primary" />
                          <span>OTP: {delivery.otp}</span>
                          <Copy className="h-2.5 w-2.5 ml-0.5 opacity-70 group-hover/otp:opacity-100 transition-opacity" />
                        </button>
                        <span>•</span>
                        <span className="truncate max-w-[200px]">{delivery.destination}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
                    {!isSpotlighted ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveTrackingCode(delivery.trackingCode)}
                        className="h-9 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground"
                      >
                        Spotlight
                      </Button>
                    ) : null}

                    {isDelivered ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenPod(delivery)}
                        className="h-9 gap-1.5 rounded-xl border-border/60 bg-background/80 hover:bg-surface-muted text-xs font-semibold shadow-2xs"
                      >
                        <FileCheck className="h-3.5 w-3.5" />
                        View POD
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenReschedule(delivery.trackingCode)}
                        className="h-9 gap-1.5 rounded-xl border-border/60 bg-background/80 hover:bg-surface-muted text-xs font-semibold shadow-2xs"
                      >
                        <Calendar className="h-3.5 w-3.5" />
                        Reschedule
                      </Button>
                    )}

                    <Link href={`${CUSTOMER_ROUTES.tracking}/${delivery.trackingCode}`}>
                      <Button size="sm" variant="ghost" className="h-9 gap-1 rounded-xl bg-primary-soft text-primary text-xs font-semibold hover:bg-primary/20">
                        Track
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>

                    <button
                      type="button"
                      onClick={() => removeDelivery(delivery.trackingCode)}
                      title="Remove from tracked list"
                      className="p-2 text-muted-foreground hover:text-destructive transition-colors rounded-xl hover:bg-surface-muted/60"
                      aria-label="Remove delivery"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
