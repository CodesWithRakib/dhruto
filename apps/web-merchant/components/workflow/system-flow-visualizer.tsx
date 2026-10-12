"use client";

import * as React from "react";
import {
  Bike,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  FileText,
  Key,
  Layers,
  MapPin,
  Package,
  QrCode,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Truck,
  User,
  Wallet,
  Zap,
} from "lucide-react";
import { Badge, Button, Card, CardContent } from "@dhruto/ui";
import { Link } from "@/lib/navigation";
import { CUSTOMER_ROUTES, MERCHANT_ROUTES, HUB_ROUTES, RIDER_ROUTES, ADMIN_ROUTES } from "@/config/routes";

type RoleKey = "CUSTOMER" | "MERCHANT" | "HUB" | "RIDER" | "ADMIN";

interface FlowStep {
  step: number;
  title: string;
  trigger: string;
  systemAction: string;
  actionUrl?: string;
  actionLabel?: string;
  securityGuarantee: string;
  icon: React.ComponentType<{ className?: string }>;
}

const FLOWS_BY_ROLE: Record<
  RoleKey,
  {
    roleName: string;
    roleDesc: string;
    badge: string;
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
    steps: FlowStep[];
  }
> = {
  CUSTOMER: {
    roleName: "Customer (Recipient)",
    roleDesc: "Track incoming orders, coordinate delivery time, share doorstep OTP, and view digital POD receipts.",
    badge: "Consumer Portal",
    icon: User,
    accentColor: "from-blue-500/20 to-indigo-500/10 border-blue-500/30 text-blue-500",
    steps: [
      {
        step: 1,
        title: "SMS Notification & Tracking Code",
        trigger: "Merchant books parcel on Dhruto platform.",
        systemAction: "System dispatches SMS containing unique tracking code (e.g. DHR-2610-00107) and live web link.",
        actionUrl: "/track",
        actionLabel: "Public Track Page",
        securityGuarantee: "No financial amounts or merchant credentials leaked in public SMS.",
        icon: Smartphone,
      },
      {
        step: 2,
        title: "Access Customer Portal",
        trigger: "Customer logs in via verified phone number / OTP.",
        systemAction: "Loads personalized incoming deliveries dashboard with real-time ETA and status progress.",
        actionUrl: CUSTOMER_ROUTES.dashboard,
        actionLabel: "My Deliveries Dashboard",
        securityGuarantee: "Session token scoped strictly to customer's recipient phone records.",
        icon: Layers,
      },
      {
        step: 3,
        title: "Active Tracking & Doorstep OTP",
        trigger: "Parcel moves to 'Out for Delivery'.",
        systemAction: "Customer portal generates secure 4-digit delivery handshake OTP and displays assigned rider contact.",
        actionUrl: CUSTOMER_ROUTES.dashboard,
        actionLabel: "View Delivery OTP",
        securityGuarantee: "OTP generated server-side; rider terminal cannot mark DELIVERED without matching OTP.",
        icon: Key,
      },
      {
        step: 4,
        title: "Delivery Instructions & Rescheduling",
        trigger: "Customer needs specific arrival window or special gate instructions.",
        systemAction: "Customer submits time slot (Morning/Evening) and notes ('Leave with guard'). Rider terminal updates live.",
        actionUrl: CUSTOMER_ROUTES.dashboard,
        actionLabel: "Reschedule Modal",
        securityGuarantee: "Preferences automatically broadcast to rider without exposing customer private contact.",
        icon: Clock,
      },
      {
        step: 5,
        title: "Doorstep Delivery & COD Payment",
        trigger: "Rider arrives at customer doorstep.",
        systemAction: "Customer verifies physical parcel, pays COD amount (if cash on delivery), and provides 4-digit OTP.",
        actionUrl: CUSTOMER_ROUTES.history,
        actionLabel: "Delivery History",
        securityGuarantee: "Physical package verification before OTP handover ensures zero missing deliveries.",
        icon: ShieldCheck,
      },
      {
        step: 6,
        title: "Digital Proof of Delivery (POD)",
        trigger: "Successful doorstep OTP handoff.",
        systemAction: "System registers completed delivery, issues digital PDF/certificate receipt with timestamp.",
        actionUrl: CUSTOMER_ROUTES.history,
        actionLabel: "View Digital POD",
        securityGuarantee: "Append-only cryptographic timeline log protects both customer and merchant.",
        icon: FileText,
      },
    ],
  },
  MERCHANT: {
    roleName: "Merchant (Business)",
    roleDesc: "Create bookings, print 4x6 labels, batch dispatch pickups, track returns, and receive automated COD payouts.",
    badge: "Commerce Engine",
    icon: Package,
    accentColor: "from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-500",
    steps: [
      {
        step: 1,
        title: "Create Booking (Single or Bulk CSV)",
        trigger: "Merchant books parcel manually or uploads CSV batch.",
        systemAction: "Backend validates recipient district/thana, applies zone pricing, and enforces idempotency key.",
        actionUrl: MERCHANT_ROUTES.createBooking,
        actionLabel: "New Booking Form",
        securityGuarantee: "Idempotency prevents duplicate orders on accidental double-clicks or unstable network.",
        icon: Package,
      },
      {
        step: 2,
        title: "Print 4x6 Barcode Shipping Label",
        trigger: "Parcel booking confirmed in CREATED state.",
        systemAction: "Generates high-resolution thermal shipping label with Code128 barcode and routing QR code.",
        actionUrl: MERCHANT_ROUTES.parcels,
        actionLabel: "Shipments List",
        securityGuarantee: "Standardized thermal format eliminates manual handwriting errors at sorting hubs.",
        icon: QrCode,
      },
      {
        step: 3,
        title: "Request Pickup (Single or Batch)",
        trigger: "Merchant clicks 'Request Pickup' for packed orders.",
        systemAction: "Parcel state advances to PICKUP_REQUESTED. System dispatches pickup task to nearest hub rider.",
        actionUrl: MERCHANT_ROUTES.parcels,
        actionLabel: "Batch Pickup Action",
        securityGuarantee: "Automated task dispatch prevents lost parcels at merchant warehouse.",
        icon: Truck,
      },
      {
        step: 4,
        title: "Warehouse Pickup & Rider Scan",
        trigger: "Dhruto rider arrives at merchant premises.",
        systemAction: "Rider scans barcode; parcel transitions to PICKUP_ASSIGNED -> PICKED_UP -> IN_TRANSIT.",
        actionUrl: MERCHANT_ROUTES.parcels,
        actionLabel: "Live Parcel Status",
        securityGuarantee: "Instant scan handoff ensures merchant liability ends as soon as rider scans.",
        icon: CheckCircle2,
      },
      {
        step: 5,
        title: "Hub Sorting & RTO Return Management",
        trigger: "Shipment journeys through regional hubs or recipient delivery attempt fails.",
        systemAction: "If delivery succeeds: advances to DELIVERED. If customer rejects: moves to RTO Returns Hub.",
        actionUrl: MERCHANT_ROUTES.returns,
        actionLabel: "Returns & RTO Hub",
        securityGuarantee: "Multi-attempt delivery retry protocol with automated reverse-leg tracking.",
        icon: RotateCcw,
      },
      {
        step: 6,
        title: "T+1 Automated COD Wallet Settlement",
        trigger: "Delivered parcel COD collected by rider and audited at hub.",
        systemAction: "Funds credited to Merchant Balance with deduction of delivery fee. Printable payout voucher generated.",
        actionUrl: MERCHANT_ROUTES.finance,
        actionLabel: "Merchant Financials",
        securityGuarantee: "Strict double-entry financial ledger prevents discrepancies or delayed remittances.",
        icon: Wallet,
      },
    ],
  },
  HUB: {
    roleName: "Hub Manager (Operations)",
    roleDesc: "Inbound barcode scanning, parcel sorting, bag manifest dispatch, exception management, and cash reconciliation.",
    badge: "Network Hub",
    icon: Building2,
    accentColor: "from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-500",
    steps: [
      {
        step: 1,
        title: "Inbound Parcel Barcode Scanning",
        trigger: "Parcels arrive from merchant pickup or inter-hub trunk line.",
        systemAction: "Hub manager uses camera or laser scanner at /hub/scanner. Status updates to RECEIVED_AT_HUB.",
        actionUrl: HUB_ROUTES.scanner,
        actionLabel: "Barcode Scanner Terminal",
        securityGuarantee: "Instant barcode validation checks for missing, damaged, or misrouted parcels.",
        icon: QrCode,
      },
      {
        step: 2,
        title: "Consolidation into Transit Bags",
        trigger: "Sorted parcels grouped by destination hub or delivery zone.",
        systemAction: "Manager packs parcels into a Bag with unique serial tag (e.g. BAG-DH-CTG-001) at /hub/bags.",
        actionUrl: HUB_ROUTES.bags,
        actionLabel: "Bag Consolidation",
        securityGuarantee: "Tamper-evident bag seal ensures individual packages cannot be pilfered en route.",
        icon: Layers,
      },
      {
        step: 3,
        title: "Inter-Hub Vehicle Manifest Generation",
        trigger: "Bags loaded onto transport truck for highway line-haul.",
        systemAction: "Generates transport Manifest with vehicle number and driver signature voucher at /hub/manifests.",
        actionUrl: HUB_ROUTES.manifests,
        actionLabel: "Transit Manifests",
        securityGuarantee: "Chain-of-custody handoff legally signed off before vehicle departs hub.",
        icon: Truck,
      },
      {
        step: 4,
        title: "Last-Mile Rider Task Assignment",
        trigger: "Destination hub receives bags and unseals parcels.",
        systemAction: "Manager assigns parcels to delivery riders in designated coverage zones (ASSIGNED_TO_RIDER).",
        actionUrl: HUB_ROUTES.parcels,
        actionLabel: "Hub Parcel Queue",
        securityGuarantee: "Rider task limits prevent route overload and optimize delivery completion rate.",
        icon: Bike,
      },
      {
        step: 5,
        title: "Delivery Exception & RTO Processing",
        trigger: "Rider reports recipient absent, address incorrect, or parcel rejected.",
        systemAction: "Hub registers exception at /hub/exceptions; triggers retry attempt or initiates Return-To-Origin (RTO).",
        actionUrl: HUB_ROUTES.exceptions,
        actionLabel: "Exception Resolution Desk",
        securityGuarantee: "Mandatory photo/call log verification prevents fraudulent non-delivery claims.",
        icon: ShieldAlert,
      },
      {
        step: 6,
        title: "Evening Cash Desk Physical Audit",
        trigger: "Riders return to hub at end of shift with collected COD cash.",
        systemAction: "Hub cashier audits cash denominations at /hub/cash and reconciles against rider tasks in safe.",
        actionUrl: HUB_ROUTES.cash,
        actionLabel: "Hub Cash Desk",
        securityGuarantee: "Zero-count reconciliation ensures every Taka collected is accounted for and vaulted.",
        icon: Wallet,
      },
    ],
  },
  RIDER: {
    roleName: "Rider (Delivery Fleet)",
    roleDesc: "Duty status management, pickup/delivery task execution, customer contact, doorstep OTP handshake, and COD return.",
    badge: "Field Fleet",
    icon: Bike,
    accentColor: "from-green-500/20 to-emerald-500/10 border-green-500/30 text-green-500",
    steps: [
      {
        step: 1,
        title: "Rider Duty Toggle",
        trigger: "Rider starts shift at assigned hub.",
        systemAction: "Rider clicks 'Go On Duty' at /rider/dashboard. GPS location is shared with hub dispatch.",
        actionUrl: RIDER_ROUTES.dashboard,
        actionLabel: "Rider Duty Terminal",
        securityGuarantee: "Only active on-duty riders receive pickup and delivery parcel tasks.",
        icon: Zap,
      },
      {
        step: 2,
        title: "Accept Assigned Task Queue",
        trigger: "Hub manager or algorithm assigns pickup and delivery list.",
        systemAction: "Rider views task cards arranged by geographic proximity with customer address and COD amount.",
        actionUrl: RIDER_ROUTES.tasks,
        actionLabel: "Rider Tasks Feed",
        securityGuarantee: "One-click route optimization saves fuel and speeds up doorstep delivery.",
        icon: Layers,
      },
      {
        step: 3,
        title: "En-Route Navigation & One-Tap Call",
        trigger: "Rider departs for recipient address.",
        systemAction: "Rider marks OUT_FOR_DELIVERY. One-tap call button dials customer securely.",
        actionUrl: RIDER_ROUTES.tasks,
        actionLabel: "Task Action View",
        securityGuarantee: "Customer receives real-time SMS / app alert that rider is arriving shortly.",
        icon: MapPin,
      },
      {
        step: 4,
        title: "Doorstep OTP Handshake & Cash Collection",
        trigger: "Rider arrives at doorstep with package.",
        systemAction: "Rider collects COD cash, prompts customer for 4-digit OTP, and inputs into terminal to complete.",
        actionUrl: RIDER_ROUTES.tasks,
        actionLabel: "Confirm Handshake",
        securityGuarantee: "System prohibits marking DELIVERED without entering valid customer OTP.",
        icon: Key,
      },
      {
        step: 5,
        title: "Log Exception If Delivery Fails",
        trigger: "Customer not at home, phone switched off, or asks to reschedule.",
        systemAction: "Rider selects standardized failure reason (Customer Rescheduled, Address Not Found). Status updates.",
        actionUrl: RIDER_ROUTES.tasks,
        actionLabel: "Log Failure Reason",
        securityGuarantee: "System records timestamp and GPS coordinate to eliminate false non-delivery excuses.",
        icon: RotateCcw,
      },
      {
        step: 6,
        title: "Daily Cash Return at Hub Desk",
        trigger: "Rider finishes daily delivery route.",
        systemAction: "Rider visits hub cashier desk and hands over collected physical cash matching terminal total.",
        actionUrl: RIDER_ROUTES.dashboard,
        actionLabel: "Rider Summary",
        securityGuarantee: "Cashier prints receipt and rider account COD liability is instantly cleared to zero.",
        icon: Wallet,
      },
    ],
  },
  ADMIN: {
    roleName: "Admin (Executive Control)",
    roleDesc: "Global network telemetry, high-risk fraud AI intelligence, finance audits, hub governance, and developer integrations.",
    badge: "Global Controller",
    icon: ShieldCheck,
    accentColor: "from-purple-500/20 to-pink-500/10 border-purple-500/30 text-purple-500",
    steps: [
      {
        step: 1,
        title: "Global Network Telemetry",
        trigger: "Admin opens Dhruto command dashboard.",
        systemAction: "Live metrics for all 64 districts: active volume, on-time SLA rate, hub capacity, and rider counts.",
        actionUrl: ADMIN_ROUTES.dashboard,
        actionLabel: "Admin Command Center",
        securityGuarantee: "Sub-second database telemetry across PostgreSQL, Redis, and BullMQ queues.",
        icon: Layers,
      },
      {
        step: 2,
        title: "Parcel Investigation & Override",
        trigger: "Operational bottleneck, escalation, or high-value shipment investigation.",
        systemAction: "Admin can view immutable status history, audit trails, and reassign hubs or riders (/admin/parcels).",
        actionUrl: ADMIN_ROUTES.parcels,
        actionLabel: "Global Parcel Registry",
        securityGuarantee: "Every admin action is recorded in immutable audit logs with admin user ID and timestamp.",
        icon: Package,
      },
      {
        step: 3,
        title: "AI Risk Intelligence & Fraud Queue",
        trigger: "System flags suspicious booking (high COD, newly created merchant, repeat failed address).",
        systemAction: "Held in pre-dispatch review queue (/admin/intelligence) until merchant identity or phone is verified.",
        actionUrl: ADMIN_ROUTES.intelligence,
        actionLabel: "Risk Review Queue",
        securityGuarantee: "Prevents courier fraud, fake COD orders, and return-to-origin loss before rider dispatch.",
        icon: ShieldAlert,
      },
      {
        step: 4,
        title: "Financial Ledger & Escrow Audits",
        trigger: "Daily merchant payout processing and hub cash desk audits.",
        systemAction: "Reconciles digital gateway collections, rider cash deposits, and dispatches automated bank payouts.",
        actionUrl: ADMIN_ROUTES.finance,
        actionLabel: "Financial Reconciliation",
        securityGuarantee: "Double-entry accounting with 100% statutory escrow compliance.",
        icon: Wallet,
      },
      {
        step: 5,
        title: "Developer Integrations & Webhooks",
        trigger: "Merchant e-commerce sites (Shopify, WooCommerce) connect via REST API.",
        systemAction: "Monitors outgoing webhook event delivery latency, retry queues, and API key permissions.",
        actionUrl: ADMIN_ROUTES.integrations,
        actionLabel: "Integrations Dashboard",
        securityGuarantee: "HMAC-SHA256 signed payloads and granular rate limiting per merchant token.",
        icon: Zap,
      },
    ],
  },
};

export function SystemFlowVisualizer() {
  const [activeRole, setActiveRole] = React.useState<RoleKey>("MERCHANT");
  const currentFlow = FLOWS_BY_ROLE[activeRole];

  return (
    <div className="space-y-6">
      {/* Role Navigation Pills */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/80 bg-surface/80 p-2 shadow-2xs backdrop-blur-md">
        {(Object.keys(FLOWS_BY_ROLE) as RoleKey[]).map((key) => {
          const item = FLOWS_BY_ROLE[key];
          const isSelected = activeRole === key;
          const Icon = item.icon;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveRole(key)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
                isSelected
                  ? "bg-primary text-primary-foreground shadow-xs scale-[1.02]"
                  : "bg-surface hover:bg-surface-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.roleName}</span>
              <span
                className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                  isSelected ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                }`}
              >
                {item.steps.length} Steps
              </span>
            </button>
          );
        })}
      </div>

      {/* Role Flow Header Card */}
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-surface p-6 sm:p-7 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary border border-primary/20">
                {currentFlow.badge}
              </span>
              <span className="text-xs text-muted-foreground font-semibold">End-to-End Operational Lifecycle</span>
            </div>
            <h2 className="text-xl font-extrabold text-foreground sm:text-2xl">
              {currentFlow.roleName} Workflow Guide
            </h2>
            <p className="text-xs text-muted-foreground max-w-2xl sm:text-sm leading-relaxed">
              {currentFlow.roleDesc}
            </p>
          </div>

          <Badge variant="outline" className="self-start sm:self-center border-primary/30 text-primary font-bold px-3 py-1.5">
            Verified Production Flow
          </Badge>
        </div>
      </div>

      {/* Step-by-Step Interactive Workflow */}
      <div className="space-y-4">
        {currentFlow.steps.map((stepItem, index) => {
          const StepIcon = stepItem.icon;
          const isLast = index === currentFlow.steps.length - 1;

          return (
            <div key={stepItem.step} className="relative">
              {!isLast ? (
                <div
                  className="absolute left-6 top-16 bottom-0 w-0.5 bg-border/80 -translate-x-1/2 z-0 hidden sm:block"
                  aria-hidden="true"
                />
              ) : null}

              <Card className="relative z-10 border border-border/80 bg-surface shadow-2xs hover:shadow-soft hover:border-primary/40 transition-all">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
                    {/* Step Number Badge */}
                    <div className="flex items-center gap-3 sm:flex-col sm:items-center">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-black text-base shadow-xs">
                        {stepItem.step}
                      </div>
                      <span className="text-[11px] font-mono font-bold text-muted-foreground sm:text-center block">
                        Step {stepItem.step}
                      </span>
                    </div>

                    {/* Step Details */}
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                        <div className="flex items-center gap-2">
                          <StepIcon className="h-4.5 w-4.5 text-primary" />
                          <h3 className="text-sm font-extrabold text-foreground sm:text-base">
                            {stepItem.title}
                          </h3>
                        </div>

                        {stepItem.actionUrl && stepItem.actionLabel ? (
                          <Link href={stepItem.actionUrl}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1.5 text-xs font-semibold hover:border-primary/40"
                            >
                              <span>{stepItem.actionLabel}</span>
                              <ExternalLink className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          </Link>
                        ) : null}
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
                        <div className="rounded-xl border border-border/70 bg-surface-muted/40 p-3 space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                            Trigger / Action
                          </span>
                          <p className="font-semibold text-foreground leading-relaxed">
                            {stepItem.trigger}
                          </p>
                        </div>

                        <div className="rounded-xl border border-border/70 bg-surface-muted/40 p-3 space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                            System Automation & State
                          </span>
                          <p className="font-medium text-foreground leading-relaxed">
                            {stepItem.systemAction}
                          </p>
                        </div>
                      </div>

                      {/* Security & Escrow Guarantee */}
                      <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary-soft/40 px-3.5 py-2 text-[11px] text-primary-soft-foreground">
                        <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
                        <span>
                          <strong>Security & SLA Protocol:</strong> {stepItem.securityGuarantee}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      {/* State Machine Journey Card */}
      <Card className="border border-border/80 bg-surface shadow-2xs">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Layers className="h-4.5 w-4.5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-foreground">
                Centralized State Machine Transitions
              </h3>
              <p className="text-xs text-muted-foreground">
                Deterministic lifecycle validated by @dhruto/contracts state machine
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            {[
              "CREATED",
              "PICKUP_REQUESTED",
              "PICKUP_ASSIGNED",
              "PICKED_UP",
              "IN_TRANSIT",
              "RECEIVED_AT_HUB",
              "SORTED",
              "BAGGED",
              "MANIFESTED",
              "ASSIGNED_TO_RIDER",
              "OUT_FOR_DELIVERY",
              "DELIVERED",
            ].map((st, i, arr) => (
              <React.Fragment key={st}>
                <span
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-mono font-bold ${
                    st === "DELIVERED"
                      ? "bg-success-soft text-success border border-success/30"
                      : st === "CREATED"
                        ? "bg-primary-soft text-primary border border-primary/30"
                        : "bg-surface-muted border border-border/80 text-foreground"
                  }`}
                >
                  {st}
                </span>
                {i < arr.length - 1 ? (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                ) : null}
              </React.Fragment>
            ))}
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-warning/30 bg-warning-soft/30 p-3 text-xs text-warning-soft-foreground">
            <RotateCcw className="h-4 w-4 shrink-0 text-warning" />
            <span>
              <strong>Return Loop (RTO):</strong> DELIVERY_ATTEMPTED → RTO_INITIATED → RETURN_IN_TRANSIT → RETURNED_TO_MERCHANT
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
