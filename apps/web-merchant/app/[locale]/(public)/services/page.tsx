import React from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  Banknote,
  MapPin,
  PackageCheck,
  RotateCcw,
  Search,
  Truck,
  Workflow,
  Zap,
} from "lucide-react";
import { MarketingPage } from "@/features/marketing/components/marketing-page";
import { FeatureGrid, type FeatureItem } from "@/features/marketing/components/sections";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Same-day and nationwide delivery, cash-on-delivery, real-time tracking, merchant automation and returns — Dhruto delivery services.",
  alternates: { canonical: "/services" },
};

const ICONS = [Zap, Truck, Banknote, Search, Workflow, RotateCcw, PackageCheck, MapPin];

export default async function ServicesPage() {
  const t = await getTranslations("Services");
  const raw = t.raw("items") as { title: string; description: string }[];

  const items: FeatureItem[] = raw.map((item, index) => ({
    icon: ICONS[index] ?? Truck,
    title: item.title,
    description: item.description,
  }));

  return (
    <MarketingPage eyebrow={t("eyebrow")} title={t("title")} description={t("description")}>
      <FeatureGrid items={items} />
    </MarketingPage>
  );
}
