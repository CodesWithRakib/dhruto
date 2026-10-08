import React from "react";
import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import {
  ArrowRight,
  Building2,
  Compass,
  HeartHandshake,
  Languages,
  MapPin,
  ShieldCheck,
  Sparkles,
  Target,
  Truck,
} from "lucide-react";
import { Button } from "@dhruto/ui";
import { Link } from "@/lib/navigation";
import { PageHero } from "@/features/marketing/components/page-hero";
import { CTASection, FeatureShowcase, StatBand } from "@/features/marketing/components/blocks";
import { Reveal } from "@/features/marketing/components/reveal";
import { Section, SectionHeading } from "@/features/marketing/components/sections";

export const metadata: Metadata = {
  title: "About",
  description:
    "Dhruto is building the delivery infrastructure for Bangladeshi commerce — nationwide coverage, transparent COD settlement and merchant-first tooling.",
  alternates: { canonical: "/about" },
};

const VALUE_ICONS = [ShieldCheck, HeartHandshake, Compass, Languages];
const MISSION_ICONS = [Target, Truck, Sparkles];
const SHOWCASE_ICONS = [MapPin, ShieldCheck, Languages];
const SHOWCASE_IMAGES = [
  { src: "/images/merchant-hub.jpg", alt: "Dhruto sorting hub handling parcels" },
  { src: "/images/dashboard-banner.jpg", alt: "Merchant dashboard with COD settlement figures" },
  { src: "", alt: "" },
];

export default async function AboutPage() {
  const t = await getTranslations("About");
  const values = t.raw("values") as { title: string; description: string }[];
  const mission = t.raw("mission.items") as { title: string; description: string }[];
  const showcase = t.raw("showcase.items") as {
    eyebrow: string;
    title: string;
    description: string;
    bullets: string[];
  }[];

  const stats = [
    { value: t("stats.coverage"), label: t("stats.coverageLabel"), icon: MapPin },
    { value: t("stats.thanas"), label: t("stats.thanasLabel"), icon: Building2 },
    { value: t("stats.operations"), label: t("stats.operationsLabel"), icon: Compass },
    { value: t("stats.auditable"), label: t("stats.auditableLabel"), icon: ShieldCheck },
  ];

  return (
    <>
      <PageHero
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("lead")}
        align="start"
        tone="light"
        badge={
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            {t("badge")}
          </span>
        }
        actions={
          <>
            <Link href="/register">
              <Button size="lg" className="h-12 rounded-xl px-6 font-bold">
                {t("heroPrimary")}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button
                size="lg"
                variant="outline"
                className="h-12 rounded-xl border-border/60 bg-surface/70 px-6 font-semibold"
              >
                {t("heroSecondary")}
              </Button>
            </Link>
          </>
        }
        media={
          <div className="relative mx-auto w-full max-w-lg">
            <div className="relative overflow-hidden rounded-3xl border border-border bg-surface p-2 shadow-lift">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-surface-muted">
                <Image
                  src="/images/hero-logistics.jpg"
                  alt="Dhruto logistics operations in Bangladesh"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              </div>
            </div>

            <div className="absolute -bottom-4 left-4 flex items-center gap-3 rounded-2xl border border-border bg-surface/95 px-4 py-3 shadow-lift backdrop-blur-xl">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                <Truck className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-bold text-foreground">{t("floatingStat.value")}</p>
                <p className="text-[11px] text-muted-foreground">{t("floatingStat.label")}</p>
              </div>
            </div>
          </div>
        }
      />

      {/* Story */}
      <Section>
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <SectionHeading
              eyebrow={t("story.eyebrow")}
              title={t("story.title")}
              description={t("story.description")}
            />
          </div>
          <div className="space-y-5">
            {[1, 2, 3].map((n) => (
              <p key={n} className="text-base leading-relaxed text-pretty text-muted-foreground">
                {t(`paragraph${n}`)}
              </p>
            ))}
            <div className="pt-2">
              <StatBand stats={stats} className="lg:grid-cols-2" />
            </div>
          </div>
        </div>
      </Section>

      {/* Mission / approach / vision */}
      <Section muted>
        <SectionHeading
          eyebrow={t("mission.eyebrow")}
          title={t("mission.title")}
          description={t("mission.description")}
          align="center"
        />
        <Reveal className="mt-10">
          <ul className="grid gap-5 md:grid-cols-3">
            {mission.map((item, index) => {
              const Icon = MISSION_ICONS[index] ?? Target;
              return (
                <li
                  key={item.title}
                  className="group relative overflow-hidden rounded-2xl border border-border/60 bg-surface p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lift sm:p-7"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-h3 font-bold text-foreground">{item.title}</h3>
                  <p className="mt-2 text-body leading-relaxed text-pretty text-muted-foreground">
                    {item.description}
                  </p>
                </li>
              );
            })}
          </ul>
        </Reveal>
      </Section>

      {/* Values */}
      <Section>
        <SectionHeading
          eyebrow={t("valuesEyebrow")}
          title={t("valuesTitle")}
          description={t("valuesDescription")}
          align="center"
        />
        <Reveal className="mt-10">
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((value, index) => {
              const Icon = VALUE_ICONS[index] ?? ShieldCheck;
              return (
                <li
                  key={value.title}
                  className="rounded-2xl border border-border/60 bg-surface p-6 shadow-soft transition-colors hover:border-primary/40"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-h4 font-bold text-foreground">{value.title}</h3>
                  <p className="mt-1.5 text-body-sm leading-relaxed text-pretty text-muted-foreground">
                    {value.description}
                  </p>
                </li>
              );
            })}
          </ul>
        </Reveal>
      </Section>

      {/* How we build */}
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
              icon: SHOWCASE_ICONS[index] ?? ShieldCheck,
              image: SHOWCASE_IMAGES[index]?.src
                ? { src: SHOWCASE_IMAGES[index]!.src, alt: SHOWCASE_IMAGES[index]!.alt }
                : undefined,
            }))}
          />
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
