"use client";

import React from "react";
import Image from "next/image";
import { CheckCircle2, FileCheck, Sparkles } from "lucide-react";

interface JourneyStage {
  id: string;
  stepNumber: string;
  eyebrow: string;
  title: string;
  description: string;
  artifact: string;
  metric: string;
  metricLabel: string;
  bullets: string[];
  image: string;
}

const JOURNEY_STAGES: JourneyStage[] = [
  {
    id: "pickup",
    stepNumber: "01",
    eyebrow: "Step 01 · First Mile Induction",
    title: "Doorstep Pickup & Barcode Induction",
    description:
      "A dedicated Dhruto rider arrives at your warehouse or pickup point within the chosen window. Each parcel is scanned on the spot, creating an immutable parcel digital twin with a unique tracking ID.",
    artifact: "Digital Manifest #DHR-IND-8841",
    metric: "< 180ms",
    metricLabel: "Induction sync latency",
    bullets: [
      "Scheduled morning, noon, and evening collection batches",
      "Optical barcode scan triggers instant recipient SMS",
      "Live manifest uploaded to merchant dashboard in real time",
    ],
    image: "/images/hero-logistics.jpg",
  },
  {
    id: "sortation",
    stepNumber: "02",
    eyebrow: "Step 02 · Mid-Mile Processing",
    title: "Cross-Dock Hub Sortation & Bagging",
    description:
      "Parcels arrive at regional sorting hubs where high-speed automated belts read barcodes and weigh packages. Shipments are consolidated into tamper-evident bags destined for line-haul dispatch.",
    artifact: "Line-Haul Bag #DHR-BAG-0419",
    metric: "12,000/hr",
    metricLabel: "Sortation belt capacity",
    bullets: [
      "Automated weight and volumetric dimension verification",
      "Numbered tamper-evident security seals on all transit bags",
      "Direct line-haul manifest linking every parcel to its transport container",
    ],
    image: "/images/merchant-hub.jpg",
  },
  {
    id: "linehaul",
    stepNumber: "03",
    eyebrow: "Step 03 · Sovereign Transit",
    title: "Sovereign Highway Line-Haul Mesh",
    description:
      "Nightly express line-haul trucks transport consolidated bags across dedicated inter-district routes. Every vehicle is GPS monitored with continuous temperature and door-open telemetry.",
    artifact: "Highway Route Manifest #DHR-RT-64",
    metric: "64 Districts",
    metricLabel: "Direct arterial coverage",
    bullets: [
      "Inter-district nocturnal line-haul bypassing daytime congestion",
      "Continuous GPS telematics tracking container location every 30 seconds",
      "Zero intermediate handling or unverified transfer points",
    ],
    image: "/images/auth-courier.jpg",
  },
  {
    id: "delivery",
    stepNumber: "04",
    eyebrow: "Step 04 · Last Mile Verification",
    title: "Doorstep Delivery & 4-Digit OTP Verification",
    description:
      "Local hub riders navigate optimized delivery runs. At the customer’s doorstep, delivery is finalized strictly upon validation of a 4-digit SMS OTP, guaranteeing zero false delivery disputes.",
    artifact: "Verified Proof of Delivery (POD)",
    metric: "4-Digit OTP",
    metricLabel: "Cryptographic handoff check",
    bullets: [
      "Real-time recipient SMS with rider contact details and live ETA",
      "Cash on Delivery counted and logged into rider mobile wallet",
      "Geotagged timestamp and recipient signature stored in parcel record",
    ],
    image: "/images/hero-logistics.jpg",
  },
  {
    id: "settlement",
    stepNumber: "05",
    eyebrow: "Step 05 · Merchant Liquidity",
    title: "Automated COD Settlement & Escrow Payout",
    description:
      "Collected cash is counted at the destination hub and immediately reconciled against the shipment ledger. Payouts are disbursed to your merchant wallet next morning without escrow delays.",
    artifact: "Settlement Tx #DHR-SET-9902",
    metric: "Next Morning",
    metricLabel: "Guaranteed disbursement SLA",
    bullets: [
      "0% hidden deductions; completely transparent delivery fee breakdown",
      "Direct disbursement to bKash, Nagad, Rocket, or BEFTN bank transfer",
      "Itemized downloadable CSV and PDF statements for accounting",
    ],
    image: "/images/dashboard-banner.jpg",
  },
];

export function ServicesJourney() {
  const [activeStepIndex, setActiveStepIndex] = React.useState<number>(0);
  const activeStage = JOURNEY_STAGES[activeStepIndex] ?? JOURNEY_STAGES[0]!;

  return (
    <section id="operational-journey" className="relative scroll-mt-20 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span>OPERATIONAL INTEGRITY</span>
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Under the Hood: From Pickup to Proof of Delivery
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            Every delivery service runs on the same rigorous, scanned, and auditable 5-stage lifecycle. No parcels disappear into unmonitored hands.
          </p>
        </div>

        {/* Interactive Kinetic Journey Canvas */}
        <div className="srv-journey-canvas mt-16 text-white shadow-2xl">
          {/* Stage Step Selector Buttons */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-3">
            {JOURNEY_STAGES.map((stage, idx) => {
              const isSelected = activeStepIndex === idx;
              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => setActiveStepIndex(idx)}
                  className={`group relative flex flex-col items-start rounded-xl p-3.5 text-left transition-all duration-300 ${
                    isSelected
                      ? "border border-primary/50 bg-white/10 shadow-lg shadow-primary/20"
                      : "border border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold transition-all ${
                        isSelected
                          ? "bg-primary text-white shadow-md shadow-primary/40"
                          : "bg-white/10 text-slate-300 group-hover:text-white"
                      }`}
                    >
                      {stage.stepNumber}
                    </span>
                    {isSelected && (
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                      </span>
                    )}
                  </div>
                  <span className="mt-3 text-xs font-semibold tracking-tight text-white line-clamp-1">
                    {stage.id.toUpperCase()}
                  </span>
                  <span className="text-[11px] text-slate-400 line-clamp-1">
                    {stage.title.split("&")[0]?.trim()}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Stage Detailed Spotlight */}
          <div className="mt-10 grid items-center gap-8 lg:grid-cols-12">
            {/* Left Content */}
            <div className="space-y-6 lg:col-span-7">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-primary/20 px-3 py-1 text-xs font-bold text-primary">
                  {activeStage.eyebrow}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                  <FileCheck className="h-3 w-3 text-emerald-400" />
                  <span>{activeStage.artifact}</span>
                </span>
              </div>

              <h3 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {activeStage.title}
              </h3>

              <p className="text-sm leading-relaxed text-slate-300 sm:text-base">
                {activeStage.description}
              </p>

              {/* Checkmark Bullets */}
              <ul className="space-y-2.5 pt-1 text-sm text-slate-200">
                {activeStage.bullets.map((bullet, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 flex-none text-primary mt-0.5" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>

              {/* Metric Card */}
              <div className="inline-flex items-center gap-4 rounded-xl border border-white/15 bg-white/5 px-4 py-3 backdrop-blur-md">
                <div className="text-2xl font-extrabold text-primary">
                  {activeStage.metric}
                </div>
                <div className="text-xs text-slate-400">
                  {activeStage.metricLabel}
                </div>
              </div>
            </div>

            {/* Right Photography Frame */}
            <div className="lg:col-span-5">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-white/15 bg-slate-900 shadow-2xl">
                <Image
                  src={activeStage.image}
                  alt={activeStage.title}
                  fill
                  className="object-cover transition-transform duration-700 hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 40vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-white">
                  <span className="font-semibold tracking-wide">
                    {activeStage.title}
                  </span>
                  <span className="rounded bg-black/60 px-2 py-0.5 text-[10px] text-emerald-400 font-mono">
                    VERIFIED STEP
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
