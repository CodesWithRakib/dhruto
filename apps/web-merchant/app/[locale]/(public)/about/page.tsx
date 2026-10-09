import React from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Sparkles } from "lucide-react";
import { CTASection } from "@/features/marketing/components/blocks";
import { AboutHero } from "@/features/about/components/about-hero";
import { AboutManifesto } from "@/features/about/components/about-manifesto";
import { AboutPillarsBento } from "@/features/about/components/about-pillars-bento";
import { AboutOperationsShowcase } from "@/features/about/components/about-operations-showcase";
import { AboutValues } from "@/features/about/components/about-values";

export const metadata: Metadata = {
  title: "About Dhruto — Sovereign Logistics Infrastructure for Bangladesh",
  description:
    "Dhruto is building the digital logistics backbone for Bangladeshi commerce — nationwide 64-district coverage, transparent next-day COD settlements, and merchant-first telemetry tooling.",
  alternates: { canonical: "/about" },
};

export default async function AboutPage() {
  const t = await getTranslations("About");

  return (
    <>
      {/* Cinematic Dark Luxe Hero with Live Stats Cockpit */}
      <AboutHero />

      {/* Sticky Scroll-Driven Engineering Manifesto */}
      <AboutManifesto />

      {/* 4-Column Cyber-Logistics Architectural Pillars Bento */}
      <AboutPillarsBento />

      {/* Interactive Infrastructure Deep-Dive Studio */}
      <AboutOperationsShowcase />

      {/* 4 Core Guiding Operating Principles */}
      <AboutValues />

      {/* Merchant Scale CTA */}
      <CTASection
        eyebrow={t("cta.eyebrow")}
        title={t("cta.title")}
        description={t("cta.description")}
        primary={{ href: "/register", label: t("cta.primary"), icon: Sparkles }}
        secondary={{ href: "/contact", label: t("cta.secondary") }}
        note={t("cta.note")}
      />
    </>
  );
}
