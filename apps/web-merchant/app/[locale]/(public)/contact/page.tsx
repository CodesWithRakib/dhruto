import React from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Sparkles } from "lucide-react";
import { ContactHero } from "@/features/contact/components/contact-hero";
import { ContactChannels } from "@/features/contact/components/contact-channels";
import { ContactSmartForm } from "@/features/contact/components/contact-smart-form";
import { ContactHubsExplorer } from "@/features/contact/components/contact-hubs-explorer";
import { ContactEscalationSLA } from "@/features/contact/components/contact-escalation-sla";
import { ContactFAQ } from "@/features/contact/components/contact-faq";
import { CTASection } from "@/features/marketing/components/blocks";

export const metadata: Metadata = {
  title: "Contact & 24/7 Operations Desk — Dhruto Logistics",
  description:
    "Direct communication lines to Dhruto territory dispatchers, corporate onboarding specialists, developer API integration engineers, and regional sorting hubs.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const t = await getTranslations("Contact");

  return (
    <div className="flex flex-col min-h-screen">
      {/* 1. High-Trust Operations Desk Hero with Live Response SLAs */}
      <ContactHero
        badge={t("badge")}
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />

      {/* 2. Multi-Channel Contact Matrix (Sales, Support, Developers, HQ Drop-off) */}
      <ContactChannels />

      {/* 3. Intelligent Inquiry Dispatcher (Category Tabs with Live Monospace Ticket Preview) */}
      <ContactSmartForm />

      {/* 4. Interactive Regional Sorting Hubs & Drop-Off Network Across 64 Districts */}
      <ContactHubsExplorer />

      {/* 5. Support & Escalation SLA Framework (3-Tier Resolution Commitments) */}
      <ContactEscalationSLA />

      {/* 6. Operations & Dispatch FAQ (Interactive Accordion) */}
      <ContactFAQ />

      {/* 7. Merchant Conversion CTA */}
      <CTASection
        eyebrow={t("cta.eyebrow")}
        title={t("cta.title")}
        description={t("cta.description")}
        primary={{ href: "/register", label: t("cta.primary"), icon: Sparkles }}
        secondary={{ href: "/faq", label: t("cta.secondary") }}
        note={t("cta.note")}
      />
    </div>
  );
}
