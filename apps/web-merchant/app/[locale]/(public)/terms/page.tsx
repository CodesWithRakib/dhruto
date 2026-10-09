import React from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Sparkles } from "lucide-react";
import { TermsHero } from "@/features/terms/components/terms-hero";
import { TermsSLACommitments } from "@/features/terms/components/terms-sla-commitments";
import { TermsProhibitedMatrix } from "@/features/terms/components/terms-prohibited-matrix";
import { TermsReader } from "@/features/terms/components/terms-reader";
import { TermsGovernanceCard } from "@/features/terms/components/terms-governance-card";
import { CTASection } from "@/features/marketing/components/blocks";

export const metadata: Metadata = {
  title: "Terms of Service & Merchant SLA Agreement — Dhruto Logistics",
  description:
    "Contractual service level agreements, guaranteed COD remittance schedules, cargo transit insurance, and operating terms for merchants across Bangladesh.",
  alternates: { canonical: "/terms" },
  robots: { index: true, follow: true },
};

export default async function TermsPage() {
  const t = await getTranslations("Terms");
  const sections = t.raw("sections") as { title: string; body: string }[];

  return (
    <div className="flex flex-col min-h-screen">
      {/* 1. Hero with Security Badges & SLA Jump Links */}
      <TermsHero
        eyebrow={t("eyebrow")}
        title={t("title")}
        updated={t("updated")}
      />

      {/* 2. Interactive SLA Commitments & Performance Standards */}
      <TermsSLACommitments />

      {/* 3. Prohibited Goods, Restricted Cargo & Packaging Matrix */}
      <TermsProhibitedMatrix />

      {/* 4. Complete Statutory Legal Clauses Reader with Search & Sticky TOC */}
      <TermsReader
        sections={sections}
        footerNote={t("footerNote")}
      />

      {/* 5. Legal Governance, Entity & Arbitration Card */}
      <TermsGovernanceCard />

      {/* 6. Merchant Conversion CTA */}
      <CTASection
        eyebrow="Merchant Partnership"
        title="Start Shipping Under Guaranteed Enterprise SLAs"
        description="Experience on-time fulfillment, transparent itemized statements, and protected cash-on-delivery remittance."
        primary={{ href: "/register", label: "Open Merchant Account", icon: Sparkles }}
        secondary={{ href: "/pricing", label: "Calculate Delivery Rates" }}
        note="Instant account activation · zero security deposit required · audited payout ledger"
      />
    </div>
  );
}
