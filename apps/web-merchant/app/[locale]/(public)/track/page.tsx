import React from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Building2, Clock, PackageSearch, Radio, Route, ShieldCheck, Truck } from "lucide-react";
import { PageHero } from "@/features/marketing/components/page-hero";
import { CTASection } from "@/features/marketing/components/blocks";
import { Reveal } from "@/features/marketing/components/reveal";
import { TrackingQuickSearch } from "@/features/marketing/components/tracking-quick-search";
import { Section, SectionHeading } from "@/features/marketing/components/sections";

export const metadata: Metadata = {
  title: "Track Shipment — Dhruto Express",
  description: "Track your parcel delivery progress across Bangladesh with live status updates.",
};

const FEATURE_ICONS = [Radio, Route, Building2, Clock];

export default async function TrackSearchPage() {
  const t = await getTranslations("Tracking");
  const features = t.raw("features.items") as { title: string; description: string }[];
  const how = t.raw("how.items") as { title: string; description: string }[];

  return (
    <>
      <PageHero
        eyebrow={t("eyebrow")}
        title={t("searchTitle")}
        description={t("searchSubtitle")}
        align="center"
        tone="light"
        badge={
          <span className="inline-flex items-center gap-2 rounded-full border border-success/25 bg-success-soft px-3.5 py-1 text-xs font-semibold text-success-soft-foreground">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" aria-hidden="true" />
            {t("badge")}
          </span>
        }
      >
        <div className="mx-auto mt-2 w-full max-w-xl rounded-2xl border border-border/60 bg-surface/80 p-3 shadow-lift backdrop-blur-sm">
          <TrackingQuickSearch />
        </div>
      </PageHero>

      <Section>
        <SectionHeading
          eyebrow={t("features.eyebrow")}
          title={t("features.title")}
          description={t("features.description")}
          align="center"
        />
        <Reveal className="mt-10">
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => {
              const Icon = FEATURE_ICONS[index] ?? PackageSearch;
              return (
                <li
                  key={feature.title}
                  className="group rounded-2xl border border-border/60 bg-surface p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lift"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-h4 font-bold text-foreground">{feature.title}</h3>
                  <p className="mt-1.5 text-body-sm leading-relaxed text-pretty text-muted-foreground">
                    {feature.description}
                  </p>
                </li>
              );
            })}
          </ul>
        </Reveal>
      </Section>

      <Section muted>
        <SectionHeading
          eyebrow={t("how.eyebrow")}
          title={t("how.title")}
          description={t("how.description")}
          align="center"
        />
        <ol className="mt-12 grid gap-5 md:grid-cols-3">
          {how.map((step, index) => (
            <li
              key={step.title}
              className="relative rounded-2xl border border-border/60 bg-surface p-6 shadow-soft"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary font-mono text-sm font-bold text-primary-foreground shadow-soft">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-4 text-h4 font-bold text-foreground">{step.title}</h3>
              <p className="mt-1.5 text-body-sm leading-relaxed text-pretty text-muted-foreground">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
        <Reveal className="mt-10">
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center sm:flex-row sm:text-left">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="text-body text-pretty text-foreground/90">{t("privacyNote")}</p>
          </div>
        </Reveal>
      </Section>

      <CTASection
        eyebrow={t("cta.eyebrow")}
        title={t("cta.title")}
        description={t("cta.description")}
        primary={{ href: "/register", label: t("cta.primary"), icon: Truck }}
        secondary={{ href: "/contact", label: t("cta.secondary") }}
        note={t("cta.note")}
      />
    </>
  );
}
