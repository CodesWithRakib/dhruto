import React from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LegalPage } from "@/features/marketing/components/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Dhruto collects, uses and protects merchant and recipient data.",
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: true },
};

export default async function PrivacyPage() {
  const t = await getTranslations("Privacy");
  const sections = t.raw("sections") as { title: string; body: string }[];

  return (
    <LegalPage
      eyebrow={t("eyebrow")}
      title={t("title")}
      updated={t("updated")}
      sections={sections}
      footerNote={t("footerNote")}
    />
  );
}
