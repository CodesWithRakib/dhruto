"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Calculator,
  Clock,
  Compass,
  MapPin,
  ShieldCheck,
  Truck,
  Zap,
} from "lucide-react";

interface RouteTier {
  id: string;
  name: string;
  badge: string;
  pickupCutoff: string;
  deliveryWindow: string;
  returnWindow: string;
  codSettlement: string;
  startingRate: string;
  coverageHighlight: string;
  keyAreas: string[];
  protocol: string;
}

const ROUTE_TIERS: RouteTier[] = [
  {
    id: "dhaka-metro",
    name: "Dhaka Metro",
    badge: "SAME-DAY SPEED",
    pickupCutoff: "12:00 PM (Same Day) / 6:00 PM (Next Morning)",
    deliveryWindow: "4 to 8 Hours (Same-Day Delivery)",
    returnWindow: "24 Hours to Merchant Warehouse",
    codSettlement: "Next Morning by 10:00 AM",
    startingRate: "৳60",
    coverageHighlight: "All Thanas within Dhaka North & South City Corporations",
    keyAreas: ["Gulshan", "Banani", "Dhanmondi", "Uttara", "Mirpur", "Motijheel", "Badda", "Mohakhali"],
    protocol: "Direct intra-city rider relay; zero intermediate line-haul waiting.",
  },
  {
    id: "dhaka-suburbs",
    name: "Greater Dhaka Suburbs",
    badge: "NEXT-DAY RELIABLE",
    pickupCutoff: "5:00 PM Daily",
    deliveryWindow: "24 Hours (Guaranteed Next Day)",
    returnWindow: "48 Hours",
    codSettlement: "Next Morning Post-Delivery",
    startingRate: "৳100",
    coverageHighlight: "Surrounding industrial & residential sub-hubs",
    keyAreas: ["Gazipur", "Savar", "Narayanganj", "Keraniganj", "Tongi", "Dhamrai", "Ashulia"],
    protocol: "Evening cross-dock sorting; early morning suburban van dispatch.",
  },
  {
    id: "divisional",
    name: "Divisional Capitals",
    badge: "HIGHWAY ARTERIAL",
    pickupCutoff: "6:00 PM Line-Haul Manifest",
    deliveryWindow: "24 to 48 Hours",
    returnWindow: "72 Hours",
    codSettlement: "Next Morning Post-Delivery",
    startingRate: "৳130",
    coverageHighlight: "All 7 Major Divisional Centers Outside Dhaka",
    keyAreas: ["Chattogram", "Rajshahi", "Sylhet", "Khulna", "Barishal", "Rangpur", "Mymensingh"],
    protocol: "Nightly express line-haul trailers with GPS telemetry and seal verification.",
  },
  {
    id: "remote-thanas",
    name: "Nationwide 495+ Thanas",
    badge: "SOVEREIGN REACH",
    pickupCutoff: "6:00 PM Line-Haul Manifest",
    deliveryWindow: "48 to 72 Hours",
    returnWindow: "96 Hours",
    codSettlement: "Next Morning Post-Delivery",
    startingRate: "৳150",
    coverageHighlight: "Doorstep service to every rural Upazila in Bangladesh",
    keyAreas: ["Teknaf", "Sunamganj", "Bandarban", "Panchagarh", "Patuakhali", "Meherpur", "Kurigram"],
    protocol: "Hub-to-hub container bags handed off to local Upazila fleet riders.",
  },
];

export function ServicesSLAMatrix() {
  const [activeTab, setActiveTab] = React.useState<string>("dhaka-metro");
  const selectedTier = ROUTE_TIERS.find((t) => t.id === activeTab) ?? ROUTE_TIERS[0]!;

  return (
    <section id="route-matrix" className="relative scroll-mt-20 py-24 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
            <Compass className="h-3.5 w-3.5" aria-hidden="true" />
            <span>NATIONWIDE SLA COMMITMENT</span>
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Predictable Delivery Windows Across All 64 Districts
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            Choose your destination tier to review guaranteed pickup cutoffs, transit velocity, and financial settlement schedules.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-2.5">
          {ROUTE_TIERS.map((tier) => {
            const isActive = activeTab === tier.id;
            return (
              <button
                key={tier.id}
                type="button"
                onClick={() => setActiveTab(tier.id)}
                className={`srv-matrix-tab-btn ${isActive ? "active" : ""}`}
              >
                <span>{tier.name}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    isActive ? "bg-white/25 text-white" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {tier.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Interactive Route Specification Card */}
        <div className="mt-10 overflow-hidden rounded-3xl bg-surface">
          <div className="bg-muted/40 p-6 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                  <span>{selectedTier.badge}</span>
                  <span>•</span>
                  <span>{selectedTier.name}</span>
                </div>
                <h3 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
                  {selectedTier.coverageHighlight}
                </h3>
              </div>
              <div className="flex items-baseline gap-1.5 rounded-2xl bg-primary/10 px-5 py-3">
                <span className="text-xs text-muted-foreground">Starting from</span>
                <span className="text-3xl font-extrabold text-primary">{selectedTier.startingRate}</span>
                <span className="text-xs text-muted-foreground">/ parcel</span>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {/* 4 Core SLA Metrics */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl bg-muted/20 p-5">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>Pickup Cutoff</span>
                </div>
                <div className="mt-2 text-base font-bold text-foreground">
                  {selectedTier.pickupCutoff}
                </div>
              </div>

              <div className="rounded-2xl bg-muted/20 p-5">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <Zap className="h-4 w-4 text-success" />
                  <span>Doorstep Delivery SLA</span>
                </div>
                <div className="mt-2 text-base font-bold text-success">
                  {selectedTier.deliveryWindow}
                </div>
              </div>

              <div className="rounded-2xl bg-muted/20 p-5">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-warning" />
                  <span>COD Settlement</span>
                </div>
                <div className="mt-2 text-base font-bold text-foreground">
                  {selectedTier.codSettlement}
                </div>
              </div>

              <div className="rounded-2xl bg-muted/20 p-5">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <Truck className="h-4 w-4 text-info" />
                  <span>Return SLA (RTO)</span>
                </div>
                <div className="mt-2 text-base font-bold text-foreground">
                  {selectedTier.returnWindow}
                </div>
              </div>
            </div>

            {/* Key Service Areas & Operating Protocol */}
            <div className="mt-6 grid gap-6 lg:grid-cols-12">
              <div className="rounded-2xl bg-muted/15 p-5 lg:col-span-8">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Key Hubs & Coverage Zones
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedTier.keyAreas.map((area) => (
                    <span
                      key={area}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-surface px-3 py-1.5 text-xs font-medium text-foreground"
                    >
                      <MapPin className="h-3 w-3 text-primary" />
                      <span>{area}</span>
                    </span>
                  ))}
                </div>
                <div className="mt-4 text-xs leading-relaxed text-muted-foreground">
                  <strong>Protocol:</strong> {selectedTier.protocol}
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-2xl bg-primary/5 p-5 lg:col-span-4">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-primary">
                    Custom Weight Calculation?
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    Estimate exact multi-kilogram freight fees, COD charges, and wallet balance with our live estimator.
                  </p>
                </div>
                <div className="mt-4 pt-2">
                  <Link
                    href="/pricing"
                    className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline"
                  >
                    <Calculator className="h-4 w-4" />
                    <span>Open Rate & Payout Calculator</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
