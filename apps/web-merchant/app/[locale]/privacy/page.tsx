import React from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MarketingPage } from "../../../features/marketing/components/marketing-page";

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
    <MarketingPage eyebrow={t("eyebrow")} title={t("title")} description={t("updated")}>
      <div className="max-w-3xl space-y-6">
        {sections.map((section) => (
          <section key={section.title} className="space-y-1.5">
            <h2 className="text-h4 text-foreground">{section.title}</h2>
            <p className="text-body text-muted-foreground text-pretty">{section.body}</p>
          </section>
        ))}
      </div>
    </MarketingPage>
  );
}
