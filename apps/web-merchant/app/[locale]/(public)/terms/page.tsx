import React from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LegalPage } from "@/features/marketing/components/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms governing the use of Dhruto delivery services and the merchant portal.",
  alternates: { canonical: "/terms" },
  robots: { index: true, follow: true },
};

export default async function TermsPage() {
  const t = await getTranslations("Terms");
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
