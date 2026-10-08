import React from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  Banknote,
  Building2,
  MapPin,
  PackageCheck,
  RotateCcw,
  Search,
  Sparkles,
  Truck,
  Workflow,
  Zap,
} from "lucide-react";
import { PageHero } from "@/features/marketing/components/page-hero";
import { CTASection, FeatureShowcase } from "@/features/marketing/components/blocks";
import { Reveal } from "@/features/marketing/components/reveal";
import { FeatureGrid, Section, SectionHeading, type FeatureItem } from "@/features/marketing/components/sections";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Same-day and nationwide delivery, cash-on-delivery, real-time tracking, merchant automation and returns — Dhruto delivery services.",
  alternates: { canonical: "/services" },
};

const ICONS = [Zap, Truck, Banknote, Search, Workflow, RotateCcw, PackageCheck, MapPin];

const SHOWCASE_ICONS = [Truck, Banknote, Search, RotateCcw];
const SHOWCASE_IMAGES = [
  { src: "/images/hero-logistics.jpg", alt: "Dhruto rider collecting parcels for doorstep delivery" },
  { src: "/images/dashboard-banner.jpg", alt: "Merchant dashboard showing cash-on-delivery settlement" },
  { src: "/images/auth-courier.jpg", alt: "Dhruto courier scanning a parcel in transit" },
  { src: "", alt: "" },
];

export default async function ServicesPage() {
  const t = await getTranslations("Services");
  const raw = t.raw("items") as { title: string; description: string }[];
  const showcase = t.raw("showcase.items") as {
    eyebrow: string;
    title: string;
    description: string;
    bullets: string[];
  }[];
  const guarantees = t.raw("guarantees.items") as { title: string; description: string }[];

  const items: FeatureItem[] = raw.map((item, index) => ({
    icon: ICONS[index] ?? Truck,
    title: item.title,
    description: item.description,
  }));

  const stats = [
    { value: t("stats.coverage"), label: t("stats.coverageLabel"), icon: MapPin },
    { value: t("stats.thanas"), label: t("stats.thanasLabel"), icon: Building2 },
    { value: t("stats.daily"), label: t("stats.dailyLabel"), icon: Truck },
    { value: t("stats.sla"), label: t("stats.slaLabel"), icon: PackageCheck },
  ];

  return (
    <>
      <PageHero
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        align="center"
        tone="light"
        stats={stats}
        badge={
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            {t("badge")}
          </span>
        }
      />

      <Section>
        <SectionHeading
          eyebrow={t("grid.eyebrow")}
          title={t("grid.title")}
          description={t("grid.description")}
          align="center"
        />
        <Reveal>
          <FeatureGrid items={items} />
        </Reveal>
      </Section>

      <Section muted>
        <SectionHeading
          eyebrow={t("showcase.eyebrow")}
          title={t("showcase.title")}
          description={t("showcase.description")}
          align="center"
        />
        <Reveal>
          <FeatureShowcase
            items={showcase.map((item, index) => ({
              ...item,
              icon: SHOWCASE_ICONS[index] ?? Truck,
              image: SHOWCASE_IMAGES[index]?.src
                ? { src: SHOWCASE_IMAGES[index]!.src, alt: SHOWCASE_IMAGES[index]!.alt }
                : undefined,
            }))}
          />
        </Reveal>
      </Section>

      <Section>
        <SectionHeading
          eyebrow={t("guarantees.eyebrow")}
          title={t("guarantees.title")}
          description={t("guarantees.description")}
          align="center"
        />
        <Reveal className="mt-10">
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {guarantees.map((item, index) => {
              const Icon = ICONS[index] ?? PackageCheck;
              return (
                <li
                  key={item.title}
                  className="group rounded-2xl border border-border/60 bg-surface p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lift"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-h4 font-bold text-foreground">{item.title}</h3>
                  <p className="mt-1.5 text-body-sm leading-relaxed text-pretty text-muted-foreground">
                    {item.description}
                  </p>
                </li>
              );
            })}
          </ul>
        </Reveal>
      </Section>

      <CTASection
        eyebrow={t("cta.eyebrow")}
        title={t("cta.title")}
        description={t("cta.description")}
        primary={{ href: "/register", label: t("cta.primary"), icon: Sparkles }}
        secondary={{ href: "/contact", label: t("cta.secondary") }}
        note={t("cta.note")}
      />
    </>
  );
}
