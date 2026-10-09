import React from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { HomeHero } from "@/features/marketing/components/home-hero";
import { StatsStrip } from "@/features/marketing/components/stats-strip";
import { PartnerMarquee } from "@/features/marketing/components/partner-marquee";
import { ServicesSection } from "@/features/marketing/components/services-section";
import { StackingOperations } from "@/features/marketing/components/stacking-operations";
import { RateCalculatorPreview } from "@/features/marketing/components/rate-calculator-preview";
import { CoverageExplorer } from "@/features/marketing/components/coverage-explorer";
import { ProcessPipeline } from "@/features/marketing/components/process-pipeline";
import { MerchantTestimonials } from "@/features/marketing/components/merchant-testimonials";
import { PartnershipContact } from "@/features/marketing/components/partnership-contact";
import {
  FaqList,
  Section,
  SectionHeading,
} from "@/features/marketing/components/sections";

export const metadata: Metadata = {
  title: "Dhruto — Smart Logistics & Courier Operating System for Bangladesh",
  description:
    "Dhruto is the modern logistics and parcel operating system for Bangladesh. Nationwide 64 districts line-haul delivery, automated next-day COD settlements, and high-speed API infrastructure.",
  alternates: { canonical: "/" },
};

interface Copy {
  title: string;
  description: string;
}

export default async function HomePage() {
  const t = await getTranslations("Home");

  const steps = (t.raw("how.items") as Copy[]) || [];
  const faq = (t.raw("faq.items") as { question: string; answer: string }[]) || [];

  return (
    <>
      {/* 1 — Ultra-Premium Hero Section */}
      <HomeHero />

      {/* 2 — Live Stats & Verification Strip */}
      <StatsStrip />

      {/* 3 — Infinite Partner & Payment Marquee */}
      <PartnerMarquee />

      {/* 4 — Services Bento Grid with Rotating Watermark Masks */}
      <ServicesSection />

      {/* 5 — Sticky Stacking Operations Showcase Cards */}
      <StackingOperations />

      {/* 6 — Interactive Rate & COD Calculator Preview */}
      <RateCalculatorPreview />

      {/* 7 — Nationwide 64 Districts Line-Haul Explorer */}
      <CoverageExplorer />

      {/* 8 — 5-Step Process Pipeline with Curved SVG Wave */}
      <ProcessPipeline steps={steps} />

      {/* 9 — Merchant Testimonials Carousel & Results Panel */}
      <MerchantTestimonials />

      {/* 10 — FAQ Section */}
      {faq.length > 0 && (
        <Section muted id="faq">
          <SectionHeading
            eyebrow={t("faq.eyebrow")}
            title={t("faq.title")}
            description={t("faq.description")}
            align="center"
          />
          <FaqList items={faq} />
        </Section>
      )}

      {/* 11 — High-Conversion Direct Consultation / Contact Section */}
      <PartnershipContact />
    </>
  );
}
