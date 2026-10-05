import React from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  ArrowRight,
  Banknote,
  Building2,
  MapPin,
  PackageCheck,
  RotateCcw,
  Search,
  Truck,
  Workflow,
  Zap,
} from "lucide-react";
import { Button } from "@dhruto/ui";
import { Link } from "@/lib/navigation";
import { TrackingQuickSearch } from "@/features/marketing/components/tracking-quick-search";
import {
  FaqList,
  FeatureGrid,
  Section,
  SectionHeading,
  StepFlow,
  type FeatureItem,
} from "@/features/marketing/components/sections";

export const metadata: Metadata = {
  title: "Dhruto — Smarter Delivery Infrastructure for Bangladesh",
  description:
    "Nationwide parcel delivery, cash-on-delivery collection, merchant automation and real-time tracking — one logistics platform for Bangladesh.",
  alternates: { canonical: "/" },
};

interface Copy {
  title: string;
  description: string;
}

const SERVICE_ICONS = [Zap, Truck, Banknote, Search, Workflow, RotateCcw];
const BENEFIT_ICONS = [PackageCheck, Banknote, MapPin, Building2];
const CAPABILITY_ICONS = [MapPin, Banknote, Search, Building2];

export default async function HomePage() {
  const t = await getTranslations("Home");

  const services = t.raw("services.items") as Copy[];
  const steps = t.raw("how.items") as Copy[];
  const benefits = t.raw("benefits.items") as Copy[];
  const faq = t.raw("faq.items") as { question: string; answer: string }[];
  const capabilities = t.raw("capabilities.items") as Copy[];

  const serviceItems: FeatureItem[] = services.map((item, index) => ({
    icon: SERVICE_ICONS[index] ?? Truck,
    title: item.title,
    description: item.description,
  }));

  const benefitItems: FeatureItem[] = benefits.map((item, index) => ({
    icon: BENEFIT_ICONS[index] ?? PackageCheck,
    title: item.title,
    description: item.description,
  }));

  return (
    <>
      {/* 1 — Hero */}
      <Section className="pb-10 pt-12 sm:pt-16">
        <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-12">
          <div className="space-y-5">
            <p className="dhruto-eyebrow">{t("hero.eyebrow")}</p>
            <h1 className="text-display text-foreground text-balance">
              {t("hero.title")}
            </h1>
            <p className="max-w-xl text-body text-muted-foreground text-pretty sm:text-base">
              {t("hero.subtitle")}
            </p>

            <div className="flex flex-wrap gap-3">
              <Link href="/register">
                <Button size="lg">
                  {t("hero.ctaPrimary")}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </Link>
              <Link href="/services">
                <Button size="lg" variant="outline">
                  {t("hero.ctaSecondary")}
                </Button>
              </Link>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-5 sm:p-6">
            <h2 className="text-h3 text-foreground">{t("hero.trackTitle")}</h2>
            <p className="mb-4 mt-1 text-body text-muted-foreground">
              {t("hero.trackSubtitle")}
            </p>
            <TrackingQuickSearch />
            <ul className="mt-5 space-y-2 border-t border-border pt-4">
              {capabilities.map((item, index) => {
                const Icon = CAPABILITY_ICONS[index] ?? MapPin;
                return (
                  <li key={item.title} className="flex items-start gap-2.5">
                    <Icon
                      className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    <span className="text-body-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{item.title}</span>
                      {" — "}
                      {item.description}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </Section>

      {/* 2 — Core services */}
      <Section muted id="services">
        <SectionHeading
          eyebrow={t("services.eyebrow")}
          title={t("services.title")}
          description={t("services.description")}
        />
        <FeatureGrid items={serviceItems} />
      </Section>

      {/* 3 — How Dhruto works */}
      <Section id="how-it-works">
        <SectionHeading
          eyebrow={t("how.eyebrow")}
          title={t("how.title")}
          description={t("how.description")}
        />
        <StepFlow steps={steps} />
      </Section>

      {/* 4 — Merchant benefits */}
      <Section muted id="merchant">
        <SectionHeading
          eyebrow={t("benefits.eyebrow")}
          title={t("benefits.title")}
          description={t("benefits.description")}
        />
        <FeatureGrid items={benefitItems} />
      </Section>

      {/* 5 — Tracking CTA */}
      <Section>
        <div className="rounded-xl border border-border bg-surface p-6 sm:p-10">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl space-y-2">
              <h2 className="text-h2 text-foreground text-balance">
                {t("trackCta.title")}
              </h2>
              <p className="text-body text-muted-foreground text-pretty">
                {t("trackCta.description")}
              </p>
            </div>
            <div className="w-full max-w-lg">
              <TrackingQuickSearch />
            </div>
          </div>
        </div>
      </Section>

      {/* 6 — FAQ */}
      <Section muted>
        <SectionHeading
          eyebrow={t("faq.eyebrow")}
          title={t("faq.title")}
          description={t("faq.description")}
        />
        <FaqList items={faq} />
      </Section>

      {/* 7 — Final CTA */}
      <Section>
        <div className="flex flex-col items-start gap-5 rounded-xl border border-border bg-primary-soft p-6 sm:flex-row sm:items-center sm:justify-between sm:p-10">
          <div className="max-w-xl space-y-2">
            <h2 className="text-h2 text-primary-soft-foreground text-balance">
              {t("finalCta.title")}
            </h2>
            <p className="text-body text-primary-soft-foreground/80 text-pretty">
              {t("finalCta.description")}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/register">
              <Button size="lg">{t("finalCta.primary")}</Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline">
                {t("finalCta.secondary")}
              </Button>
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}
