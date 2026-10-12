"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
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
  Package,
  Phone,
  Search,
  ShieldCheck,
  Sparkles,
  Truck,
  ArrowRight,
} from "lucide-react";
import { Badge, Button, Card, CardContent } from "@dhruto/ui";
import { Link } from "@/lib/navigation";
import { CUSTOMER_ROUTES } from "@/config/routes";
import { useAppSelector } from "@/store/hooks";
import { RescheduleModal } from "./reschedule-modal";
import { PodModal } from "./pod-modal";
import { toast } from "sonner";

interface CustomerDelivery {
  id: string;
  trackingCode: string;
  merchantName: string;
  destination: string;
  status: "OUT_FOR_DELIVERY" | "IN_TRANSIT" | "DELIVERED" | "PICKED_UP";
  statusLabel: string;
  eta: string;
  codAmount: number;
  isPaid: boolean;
  itemsDescription: string;
  riderName?: string;
  riderPhone?: string;
  otp?: string;
  deliveredAt?: string;
}

const MOCK_CUSTOMER_DELIVERIES: CustomerDelivery[] = [
  {
    id: "del-1",
    trackingCode: "DHR-2610-00107",
    merchantName: "Aarong Fashion Store",
    destination: "House 42, Road 11, Block D, Banani, Dhaka",
    status: "OUT_FOR_DELIVERY",
    statusLabel: "Out for Delivery",
    eta: "Today by 04:30 PM",
    codAmount: 1850,
    isPaid: false,
    itemsDescription: "Silk Kurti & Accessories (1.2 kg)",
    riderName: "Kamrul Hasan",
    riderPhone: "+8801712398745",
    otp: "582419",
  },
  {
    id: "del-2",
    trackingCode: "DHR-2610-00113",
    merchantName: "Apex Footwear Official",
    destination: "House 42, Road 11, Block D, Banani, Dhaka",
    status: "IN_TRANSIT",
    statusLabel: "In Hub Transit",
    eta: "Tomorrow by 02:00 PM",
    codAmount: 0,
    isPaid: true,
    itemsDescription: "Leather Formal Shoes (Size 42)",
  },
  {
    id: "del-3",
    trackingCode: "DHR-2610-00101",
    merchantName: "Shajgoj Beauty Hub",
    destination: "House 42, Road 11, Block D, Banani, Dhaka",
    status: "DELIVERED",
    statusLabel: "Delivered",
    eta: "Yesterday at 03:15 PM",
    codAmount: 920,
    isPaid: true,
    itemsDescription: "Skincare Essentials Pack (0.8 kg)",
    riderName: "Rakibul Islam",
    riderPhone: "+8801819876543",
    deliveredAt: "Yesterday, Oct 11 at 03:15 PM",
  },
];

export function CustomerDashboardView() {
  const t = useTranslations("Customer");
  const authUser = useAppSelector((s) => s.auth.user);

  const [activeFilter, setActiveFilter] = React.useState<"ALL" | "ACTIVE" | "DELIVERED">("ALL");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [showOtp, setShowOtp] = React.useState(true);

  // Modals state
  const [rescheduleOpen, setRescheduleOpen] = React.useState(false);
  const [activeTrackingForModal, setActiveTrackingForModal] = React.useState("DHR-2610-00107");
  const [podOpen, setPodOpen] = React.useState(false);
  const [selectedPodParcel, setSelectedPodParcel] = React.useState<(typeof MOCK_CUSTOMER_DELIVERIES)[0] | null>(null);

  const activeShipment = MOCK_CUSTOMER_DELIVERIES.find(
    (d) => d.status === "OUT_FOR_DELIVERY" || d.status === "IN_TRANSIT"
  );

  const filteredDeliveries = MOCK_CUSTOMER_DELIVERIES.filter((item) => {
    if (activeFilter === "ACTIVE" && item.status === "DELIVERED") return false;
    if (activeFilter === "DELIVERED" && item.status !== "DELIVERED") return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.trackingCode.toLowerCase().includes(q) ||
        item.merchantName.toLowerCase().includes(q) ||
        item.itemsDescription.toLowerCase().includes(q)
      );
    }
    return true;
  });

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

  return (
    <div className="space-y-6">
      {/* Modals */}
      <RescheduleModal
        open={rescheduleOpen}
        onOpenChange={setRescheduleOpen}
        trackingCode={activeTrackingForModal}
        currentAddress={activeShipment?.destination}
      />

      {selectedPodParcel ? (
        <PodModal
          open={podOpen}
          onOpenChange={setPodOpen}
          parcel={{
            trackingCode: selectedPodParcel.trackingCode,
            recipientName: authUser?.name || "Customer",
            recipientPhone: authUser?.phone || "+8801700000000",
            deliveryAddress: selectedPodParcel.destination,
            deliveredAt: selectedPodParcel.deliveredAt || "Delivered",
            riderName: selectedPodParcel.riderName || "Dhruto Rider",
            merchantName: selectedPodParcel.merchantName,
            codAmount: selectedPodParcel.codAmount,
            description: selectedPodParcel.itemsDescription,
          }}
        />
      ) : null}

      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-surface via-surface-muted/50 to-primary-soft/30 p-6 sm:p-8 shadow-soft">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary border border-primary/20">
                <Sparkles className="h-3.5 w-3.5" />
                {t("verifiedRecipientBadge")}
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                {authUser?.phone || "+88017********"}
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
              {t("greeting", { name: authUser?.name || "Valued Customer" })}
            </h1>
            <p className="text-xs text-muted-foreground sm:text-sm">
              {t("portalSubtitle")}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:self-center">
            <Link href={CUSTOMER_ROUTES.tracking}>
              <Button variant="outline" className="h-10 text-xs font-semibold gap-1.5">
                <Search className="h-3.5 w-3.5" />
                {t("trackAnyParcel")}
              </Button>
            </Link>
            <Link href={CUSTOMER_ROUTES.settings}>
              <Button variant="secondary" className="h-10 text-xs font-semibold gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {t("manageAddresses")}
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-border/80 bg-surface/90 p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">{t("statIncoming")}</span>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
            </div>
            <div className="mt-2 text-2xl font-black text-foreground">2</div>
            <span className="text-[11px] text-primary font-medium">1 arriving today</span>
          </div>

          <div className="rounded-2xl border border-border/80 bg-surface/90 p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">{t("statDelivered")}</span>
              <CheckCircle2 className="h-4 w-4 text-success" />
            </div>
            <div className="mt-2 text-2xl font-black text-foreground">14</div>
            <span className="text-[11px] text-muted-foreground">Past 30 days</span>
          </div>

          <div className="rounded-2xl border border-border/80 bg-surface/90 p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">{t("statCodDue")}</span>
              <Clock className="h-4 w-4 text-warning" />
            </div>
            <div className="mt-2 text-2xl font-black text-foreground">৳1,850</div>
            <span className="text-[11px] text-muted-foreground">Cash ready for rider</span>
          </div>

          <div className="rounded-2xl border border-border/80 bg-surface/90 p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">{t("statAddress")}</span>
              <MapPin className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-2 text-2xl font-black text-foreground">Banani</div>
            <span className="text-[11px] text-muted-foreground">Primary Delivery Point</span>
          </div>
        </div>
      </div>

      {/* Active Delivery Spotlight Card */}
      {activeShipment ? (
        <Card className="overflow-hidden border border-primary/30 bg-surface shadow-md">
          <div className="border-b border-primary/20 bg-primary-soft/40 px-5 py-3.5 sm:px-6 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-600" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                {t("activeShipmentArriving")}
              </span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="font-mono text-xs font-bold text-foreground">
                {activeShipment.trackingCode}
              </span>
            </div>
            <Badge variant="outline" className="border-primary/30 bg-surface text-primary font-bold">
              {activeShipment.eta}
            </Badge>
          </div>

          <CardContent className="p-5 sm:p-7 space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* Left Column: Shipment info & Stepper */}
              <div className="space-y-6 lg:col-span-7">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <Building2 className="h-3.5 w-3.5" />
                    <span>{t("shippedFrom")}: <strong className="text-foreground">{activeShipment.merchantName}</strong></span>
                  </div>
                  <h3 className="mt-1 text-lg font-extrabold text-foreground">
                    {activeShipment.itemsDescription}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="truncate">{activeShipment.destination}</span>
                  </p>
                </div>

                {/* Progress Stepper */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                    <span>{t("liveDeliveryProgress")}</span>
                    <span className="text-primary font-bold">Step 4 of 5</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full w-4/5 rounded-full bg-gradient-to-r from-primary to-emerald-500 transition-all duration-500" />
                  </div>
                  <div className="grid grid-cols-4 pt-1 text-[11px] text-muted-foreground">
                    <span className="text-foreground font-semibold">Booked</span>
                    <span className="text-foreground font-semibold">Picked Up</span>
                    <span className="text-foreground font-semibold">Hub Transit</span>
                    <span className="text-primary font-bold text-right sm:text-left">Out for Delivery</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2.5 pt-2">
                  <Button
                    onClick={() => handleOpenReschedule(activeShipment.trackingCode)}
                    variant="outline"
                    className="h-10 text-xs font-semibold gap-1.5"
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    {t("rescheduleOrInstructions")}
                  </Button>
                  <Link href={`${CUSTOMER_ROUTES.tracking}/${activeShipment.trackingCode}`}>
                    <Button variant="secondary" className="h-10 text-xs font-semibold gap-1.5">
                      <Truck className="h-3.5 w-3.5" />
                      {t("viewFullTimeline")}
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Right Column: Secure OTP & Assigned Rider */}
              <div className="flex flex-col gap-4 rounded-2xl border border-border/80 bg-surface-muted/40 p-5 lg:col-span-5">
                {/* Secure OTP Card */}
                {activeShipment.otp ? (
                  <div className="space-y-2 rounded-xl border border-primary/25 bg-surface p-4 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                        {t("doorstepDeliveryOtp")}
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

                    <div className="flex items-center justify-between">
                      <span className="font-mono text-2xl font-black tracking-widest text-primary">
                        {showOtp ? activeShipment.otp : "••••••"}
                      </span>
                      <Button
                        type="button"
                        variant="soft"
                        size="sm"
                        onClick={() => handleCopy(activeShipment.otp!, "Delivery OTP")}
                        className="h-8 gap-1 text-xs font-semibold"
                      >
                        <Copy className="h-3 w-3" />
                        Copy
                      </Button>
                    </div>

                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      {t("otpSafetyNotice")}
                    </p>
                  </div>
                ) : null}

                {/* Assigned Rider Contact */}
                {activeShipment.riderName ? (
                  <div className="flex items-center justify-between rounded-xl border border-border/70 bg-surface p-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold shadow-xs">
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
                          variant="outline"
                          size="sm"
                          className="h-9 gap-1 text-xs font-semibold border-primary/30 text-primary hover:bg-primary-soft"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          Call
                        </Button>
                      </a>
                    ) : null}
                  </div>
                ) : null}

                {/* COD Cash Amount */}
                <div className="flex items-center justify-between rounded-xl border border-border/70 bg-surface p-3 text-xs">
                  <span className="text-muted-foreground font-medium">{t("codPayment")}:</span>
                  <span className="font-bold text-foreground">
                    {activeShipment.codAmount > 0 ? (
                      <span className="text-primary font-black">৳{activeShipment.codAmount.toLocaleString()} (Cash on Delivery)</span>
                    ) : (
                      <span className="text-success font-semibold">Paid in Advance</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Deliveries Feed & Search */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: "ALL", label: t("filterAll") },
              { id: "ACTIVE", label: t("filterActive") },
              { id: "DELIVERED", label: t("filterDelivered") },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveFilter(f.id as typeof activeFilter)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                  activeFilter === f.id
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-surface text-muted-foreground hover:bg-surface-muted border border-border/80"
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
              placeholder="Search by code, store, item..."
              className="h-9 w-full rounded-xl border border-border/80 bg-surface pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Deliveries List */}
        <div className="space-y-3">
          {filteredDeliveries.map((delivery) => {
            const isDelivered = delivery.status === "DELIVERED";
            return (
              <div
                key={delivery.id}
                className="group relative flex flex-col justify-between gap-4 rounded-2xl border border-border/80 bg-surface p-4 sm:p-5 shadow-2xs transition-all hover:border-primary/40 hover:shadow-soft sm:flex-row sm:items-center"
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-bold shadow-2xs ${
                      isDelivered
                        ? "bg-success-soft text-success border border-success/20"
                        : "bg-primary-soft text-primary border border-primary/20"
                    }`}
                  >
                    {isDelivered ? <CheckCircle2 className="h-5 w-5" /> : <Package className="h-5 w-5" />}
                  </div>

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
                    </div>

                    <p className="text-xs text-muted-foreground font-medium">
                      {delivery.itemsDescription}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-muted-foreground">
                      <span>{isDelivered ? delivery.deliveredAt : delivery.eta}</span>
                      <span>•</span>
                      <span>
                        COD:{" "}
                        <strong className="text-foreground">
                          {delivery.codAmount > 0 ? `৳${delivery.codAmount}` : "Prepaid"}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
                  {isDelivered ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenPod(delivery)}
                      className="h-9 gap-1.5 text-xs font-semibold"
                    >
                      <FileCheck className="h-3.5 w-3.5" />
                      View POD
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenReschedule(delivery.trackingCode)}
                      className="h-9 gap-1.5 text-xs font-semibold"
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      Reschedule
                    </Button>
                  )}

                  <Link href={`${CUSTOMER_ROUTES.tracking}/${delivery.trackingCode}`}>
                    <Button size="sm" variant="secondary" className="h-9 gap-1 text-xs font-semibold">
                      Track
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
