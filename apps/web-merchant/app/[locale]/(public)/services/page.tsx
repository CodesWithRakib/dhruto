import React from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Sparkles } from "lucide-react";
import { ServicesHero } from "@/features/services/components/services-hero";
import { ServicesTierGrid } from "@/features/services/components/services-tier-grid";
import { ServicesJourney } from "@/features/services/components/services-journey";
import { ServicesSLAMatrix } from "@/features/services/components/services-sla-matrix";
import { ServicesTechBento } from "@/features/services/components/services-tech-bento";
import { ServicesGuarantees } from "@/features/services/components/services-guarantees";
import { CTASection } from "@/features/marketing/components/blocks";

export const metadata: Metadata = {
  title: "Services — High-Velocity Courier & Logistics Operating System",
  description:
    "Same-day intra-city express, nationwide 64-district line-haul, automated next-morning COD escrow, and developer API — Dhruto delivery services for Bangladesh.",
  alternates: { canonical: "/services" },
};

export default async function ServicesPage() {
  const t = await getTranslations("Services");

  const stats = {
    coverage: t("stats.coverage"),
    coverageLabel: t("stats.coverageLabel"),
    thanas: t("stats.thanas"),
    thanasLabel: t("stats.thanasLabel"),
    daily: t("stats.daily"),
    dailyLabel: t("stats.dailyLabel"),
    sla: t("stats.sla"),
    slaLabel: t("stats.slaLabel"),
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* 1. Cinematic Dark Hero with Category Filter & Live Stats */}
      <ServicesHero
        badge={t("badge")}
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        stats={stats}
      />

      {/* 2. Bento Service Cards (Deshbyte-Inspired Layout with Featured Intra-City & Wide API) */}
      <ServicesTierGrid
        eyebrow={t("grid.eyebrow")}
        title={t("grid.title")}
        description={t("grid.description")}
      />

      {/* 3. Under the Hood: 5-Stage Operational Journey & Technical Audit Trail */}
      <ServicesJourney />

      {/* 4. Interactive SLA & Route Matrix Across Bangladesh */}
      <ServicesSLAMatrix />

      {/* 5. Developer & Enterprise Automation Engine (Terminal & Webhooks) */}
      <ServicesTechBento />

      {/* 6. Four Core Service Standards & Operating Guarantees */}
      <ServicesGuarantees
        eyebrow={t("guarantees.eyebrow")}
        title={t("guarantees.title")}
        description={t("guarantees.description")}
      />

      {/* 7. Merchant Conversion CTA */}
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
