import React from "react";
import type { Metadata } from "next";
import { PricingCalculatorCockpit } from "@/features/pricing/components/pricing-calculator-cockpit";
import { MERCHANT_ROUTES } from "@/config/routes";

export const metadata: Metadata = {
  title: "Delivery Cost & Escrow Calculator — Merchant",
  description: "Simulate zone-based delivery fees, excess weight rates, and net cash-on-delivery settlements.",
  robots: { index: false, follow: false },
};

export default function MerchantCalculatorPage() {
  return (
    <div className="relative w-full space-y-6">
      <PricingCalculatorCockpit
        compact
        ctaHref={MERCHANT_ROUTES.createBooking}
        ctaLabel="Create Parcel with These Parameters"
        ctaSubtext="Pre-fills rate specifications into the merchant shipment booking form"
        title="Freight & Escrow Simulator"
        subtitle="Simulate accurate shipping fees across all 64 districts, COD collection commissions, and net daily settlement payouts before booking."
      />
    </div>
  );
}
