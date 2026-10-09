import React from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Sparkles } from "lucide-react";
import { PricingHero } from "@/features/pricing/components/pricing-hero";
import { PricingCalculatorCockpit } from "@/features/pricing/components/pricing-calculator-cockpit";
import { PricingVolumeCurve } from "@/features/pricing/components/pricing-volume-curve";
import { PricingTierCards } from "@/features/pricing/components/pricing-tier-cards";
import { PricingTransparencyMatrix } from "@/features/pricing/components/pricing-transparency-matrix";
import { PricingFAQ } from "@/features/pricing/components/pricing-faq";
import { CTASection } from "@/features/marketing/components/blocks";

export const metadata: Metadata = {
  title: "Pricing — Transparent Delivery Rates & Automated COD Settlements",
  description:
    "Zero hidden fees, 10:00 AM next-morning COD payouts, volume discounts, and live delivery cost simulator — Dhruto logistics pricing for Bangladesh.",
  alternates: { canonical: "/pricing" },
};

export default async function PricingPage() {
  const t = await getTranslations("Pricing");

  return (
    <div className="flex flex-col min-h-screen">
      {/* 1. High-Precision Financial Hero with Live Guarantee Strip */}
      <PricingHero
        badge={t("badge")}
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />

      {/* 2. Interactive Freight & Escrow Cockpit (Weight & COD Sliders with Live Thermal Receipt) */}
      <PricingCalculatorCockpit />

      {/* 3. Dynamic Volume Discount Curve (Scale Slider with Monthly Estimated Savings) */}
      <PricingVolumeCurve />

      {/* 4. Three Dedicated Merchant Shipping Plans (Starter, Growth Brand, Enterprise) */}
      <PricingTierCards />

      {/* 5. Dhruto vs Traditional Courier Market Transparency Comparison Matrix */}
      <PricingTransparencyMatrix />

      {/* 6. Frequently Asked Pricing & Settlement Questions (Interactive Accordion) */}
      <PricingFAQ />

      {/* 7. Conversion CTA Banner */}
      <CTASection
        eyebrow={t("cta.eyebrow")}
        title={t("cta.title")}
        description={t("cta.description")}
        primary={{ href: "/register", label: t("cta.primary"), icon: Sparkles }}
        secondary={{ href: "/contact", label: t("cta.secondary") }}
        note={t("cta.note")}
      />
    </div>
  );
}
