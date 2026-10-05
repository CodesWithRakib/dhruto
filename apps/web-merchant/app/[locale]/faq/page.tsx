import React from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MarketingPage } from "../../../features/marketing/components/marketing-page";
import { FaqList } from "../../../features/marketing/components/sections";

export const metadata: Metadata = {
  title: "Help & FAQ",
  description:
    "Answers about parcel booking, cash-on-delivery, tracking, delivery timelines and COD settlement with Dhruto.",
  alternates: { canonical: "/faq" },
};

export default async function FaqPage() {
  const t = await getTranslations("Faq");
  const items = t.raw("items") as { question: string; answer: string }[];

  return (
    <MarketingPage eyebrow={t("eyebrow")} title={t("title")} description={t("description")}>
      <FaqList items={items} />
    </MarketingPage>
  );
}
