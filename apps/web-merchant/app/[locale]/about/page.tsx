import React from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MarketingPage } from "../../../features/marketing/components/marketing-page";

export const metadata: Metadata = {
  title: "About",
  description:
    "Dhruto is building the delivery infrastructure for Bangladeshi commerce — nationwide coverage, transparent COD settlement and merchant-first tooling.",
  alternates: { canonical: "/about" },
};

export default async function AboutPage() {
  const t = await getTranslations("About");
  const values = t.raw("values") as { title: string; description: string }[];

  return (
    <MarketingPage eyebrow={t("eyebrow")} title={t("title")} description={t("lead")}>
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <p key={n} className="text-body text-muted-foreground text-pretty">
              {t(`paragraph${n}`)}
            </p>
          ))}
        </div>

        <ul className="grid gap-4 sm:grid-cols-2">
          {values.map((value) => (
            <li key={value.title} className="rounded-lg border border-border bg-surface p-5">
              <h2 className="text-h4 text-foreground">{value.title}</h2>
              <p className="mt-1 text-body-sm text-muted-foreground text-pretty">
                {value.description}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </MarketingPage>
  );
}
