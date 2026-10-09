import React from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Sparkles } from "lucide-react";
import { PrivacyHero } from "@/features/privacy/components/privacy-hero";
import { PrivacyMaskingDemo } from "@/features/privacy/components/privacy-masking-demo";
import { PrivacyDataLifecycle } from "@/features/privacy/components/privacy-data-lifecycle";
import { PrivacyReader } from "@/features/privacy/components/privacy-reader";
import { PrivacyDPOContact } from "@/features/privacy/components/privacy-dpo-contact";
import { CTASection } from "@/features/marketing/components/blocks";

export const metadata: Metadata = {
  title: "Privacy Policy & Data Sovereignty — Dhruto Logistics",
  description:
    "How Dhruto encrypts merchant ledgers, obscures recipient personal information on public trackers, and maintains an immutable audit trail for nationwide logistics.",
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: true },
};

export default async function PrivacyPage() {
  const t = await getTranslations("Privacy");
  const sections = t.raw("sections") as { title: string; body: string }[];

  return (
    <div className="flex flex-col min-h-screen">
      {/* 1. High-Security Privacy Hero with Cryptographic Pillars */}
      <PrivacyHero
        eyebrow={t("eyebrow")}
        title={t("title")}
        updated={t("updated")}
      />

      {/* 2. Live Interactive PII Masking Demonstration (Public vs Authenticated) */}
      <PrivacyMaskingDemo />

      {/* 3. 4-Stage Data Retention Lifecycle Architecture */}
      <PrivacyDataLifecycle />

      {/* 4. Full Legal Articles & Clauses Reader with Sticky Index & Search */}
      <PrivacyReader
        sections={sections}
        footerNote={t("footerNote")}
      />

      {/* 5. Official Data Protection Officer (DPO) Contact & Statutory Rights */}
      <PrivacyDPOContact />

      {/* 6. Merchant Conversion CTA */}
      <CTASection
        eyebrow="Merchant Trust"
        title="Ship with Bangladesh's Sovereign Logistics Network"
        description="Open a merchant account with zero deposit and audited data protection for your brand and customers."
        primary={{ href: "/register", label: "Create merchant account", icon: Sparkles }}
        secondary={{ href: "/contact", label: "Contact privacy office" }}
        note="Free registration · transparent COD settlement · full PII protection"
      />
    </div>
  );
}
