import React from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MarketingPage } from "@/features/marketing/components/marketing-page";

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
