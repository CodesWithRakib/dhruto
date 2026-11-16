import React from "react";
import type { Metadata } from "next";
import { PricingCalculatorCockpit } from "@/features/pricing/components/pricing-calculator-cockpit";
import { DashboardCanvasBg } from "@/features/dashboard/components/dashboard-canvas-bg";
import { MERCHANT_ROUTES } from "@/config/routes";

export const metadata: Metadata = {
  title: "Delivery Cost & Escrow Calculator | Dhruto Express",
  description: "Simulate zone-based delivery fees, excess weight rates, and net cash-on-delivery settlements.",
  robots: { index: false, follow: false },
};

export default function MerchantCalculatorPage() {
  return (
    <div className="relative min-h-[calc(100vh-4rem)] w-full space-y-6 py-2">
      {/* Tactical Canvas Background with dot matrix & ambient glows */}
      <DashboardCanvasBg />

      {/* Calculator Cockpit */}
      <div className="relative z-10 w-full">
        <PricingCalculatorCockpit
          compact
          ctaHref={MERCHANT_ROUTES.createBooking}
        />
      </div>
    </div>
  );
}
