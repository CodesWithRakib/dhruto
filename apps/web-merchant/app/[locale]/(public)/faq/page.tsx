import React from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Truck } from "lucide-react";
import { FaqContainer } from "@/features/faq/components/faq-container";
import { CTASection } from "@/features/marketing/components/blocks";

export const metadata: Metadata = {
  title: "Help & FAQ — Dhruto Logistics Knowledge Base",
  description:
    "Comprehensive merchant answers about parcel booking, express pickup, next-morning COD bank payouts, real-time tracking, RTO procedures, and developer APIs with Dhruto.",
  alternates: { canonical: "/faq" },
  robots: { index: true, follow: true },
};

export default async function FaqPage() {
  const t = await getTranslations("Faq");
  const items = t.raw("items") as { question: string; answer: string }[];

  return (
    <div className="flex flex-col min-h-screen">
      {/* 1. Coordinated Interactive FAQ Architecture */}
      <FaqContainer
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        baseItems={items}
        topicsEyebrow={t("topics.eyebrow")}
        topicsTitle={t("topics.title")}
        topicsDescription={t("topics.description")}
        topicsOpenLabel={t("topics.open")}
      />

      {/* 2. Merchant Onboarding CTA */}
      <CTASection
        eyebrow={t("cta.eyebrow")}
        title={t("cta.title")}
        description={t("cta.description")}
        primary={{ href: "/register", label: t("cta.primary"), icon: Truck }}
        secondary={{ href: "/contact", label: t("cta.secondary") }}
        note={t("cta.note")}
      />
    </div>
  );
}
