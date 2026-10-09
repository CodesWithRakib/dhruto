"use client";

import React from "react";
import { StepFlow } from "@/features/marketing/components/sections";

interface StepItem {
  title: string;
  description: string;
}

const DEFAULT_STEPS: StepItem[] = [
  {
    title: "Integration & Booking",
    description: "Sync via Shopify, WooCommerce or book in seconds from the web dashboard.",
  },
  {
    title: "60-Min Metro Pickup",
    description: "Dedicated van or rider arrives at your hub with automated digital manifest.",
  },
  {
    title: "Central Sorting Hub",
    description: "Automated barcode cross-docking and GPS line-haul routing to destination district.",
  },
  {
    title: "Doorstep Delivery",
    description: "Safe customer handover with OTP verification and real-time cash collection.",
  },
  {
    title: "Instant COD Settlement",
    description: "Funds deposited straight into your bank or MFS wallet the very next morning.",
  },
];

export function ProcessPipeline({ steps = [] }: { steps?: StepItem[] }) {
  const activeSteps = steps.length > 0 ? steps : DEFAULT_STEPS;

  return (
    <section id="process" className="proc dk py-20 sm:py-28 relative overflow-hidden">
      <div className="glow g3" aria-hidden="true" />
      <div className="dhruto-container relative z-10">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-10 sm:mb-14">
          <span className="pill">How It Works</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-white text-balance">
            From booking to doorstep, <em className="text-[var(--acc)] font-normal italic">simply</em>
          </h2>
          <p className="text-base sm:text-lg text-white/70 max-w-xl mx-auto leading-relaxed">
            Five clear operational stages, backed by live telemetry and automated payout triggers.
          </p>
        </div>

        <StepFlow steps={activeSteps} />
      </div>
    </section>
  );
}
