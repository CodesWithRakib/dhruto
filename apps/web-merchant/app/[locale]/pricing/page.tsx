import React from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { Button } from "@dhruto/ui";
import { Link } from "@/lib/navigation";
import { MarketingPage } from "../../../features/marketing/components/marketing-page";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "How Dhruto pricing works — weight and zone based delivery charges, cash-on-delivery collection and volume merchant rates. Request a quote.",
  alternates: { canonical: "/pricing" },
};

export default async function PricingPage() {
  const t = await getTranslations("Pricing");
  const items = t.raw("items") as { title: string; description: string }[];

  return (
    <MarketingPage eyebrow={t("eyebrow")} title={t("title")} description={t("description")}>
      <ul className="grid gap-4 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.title} className="rounded-lg border border-border bg-surface p-5">
            <h2 className="text-h4 text-foreground">{item.title}</h2>
            <p className="mt-1 text-body text-muted-foreground text-pretty">
              {item.description}
            </p>
          </li>
        ))}
      </ul>

      <div className="mt-8 flex flex-col items-start gap-3 rounded-lg border border-border bg-surface-muted/60 p-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-body text-muted-foreground text-pretty">{t("quoteNote")}</p>
        <Link href="/contact">
          <Button>
            {t("quoteCta")}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </Link>
      </div>
    </MarketingPage>
  );
}
