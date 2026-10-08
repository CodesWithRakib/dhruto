import React from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  ArrowRight,
  Banknote,
  Calculator,
  Percent,
  Scale,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Button } from "@dhruto/ui";
import { Link } from "@/lib/navigation";
import { PageHero } from "@/features/marketing/components/page-hero";
import { CTASection } from "@/features/marketing/components/blocks";
import { Reveal } from "@/features/marketing/components/reveal";
import { RateCalculatorPreview } from "@/features/marketing/components/rate-calculator-preview";
import {
  FaqList,
  Section,
  SectionHeading,
  type FeatureItem,
} from "@/features/marketing/components/sections";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "How Dhruto pricing works — weight and zone based delivery charges, cash-on-delivery collection and volume merchant rates. Request a quote.",
  alternates: { canonical: "/pricing" },
};

const FACTOR_ICONS = [Scale, TrendingUp, Banknote, Percent];

export default async function PricingPage() {
  const t = await getTranslations("Pricing");
  const items = t.raw("items") as { title: string; description: string }[];
  const included = t.raw("included.items") as string[];
  const rates = t.raw("rates.rows") as { zone: string; upTo1kg: string; perKg: string; sla: string }[];
  const faq = t.raw("faq.items") as { question: string; answer: string }[];

  const factors: FeatureItem[] = items.map((item, index) => ({
    icon: FACTOR_ICONS[index] ?? Percent,
    title: item.title,
    description: item.description,
  }));

  return (
    <>
      <PageHero
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        align="center"
        tone="light"
        badge={
          <span className="inline-flex items-center gap-2 rounded-full border border-success/25 bg-success-soft px-3.5 py-1 text-xs font-semibold text-success-soft-foreground">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            {t("badge")}
          </span>
        }
        actions={
          <>
            <a href="#calculator">
              <Button size="lg" className="h-12 rounded-xl px-6 font-bold">
                <Calculator className="h-4 w-4" aria-hidden="true" />
                {t("heroPrimary")}
              </Button>
            </a>
            <Link href="/contact">
              <Button
                size="lg"
                variant="outline"
                className="h-12 rounded-xl border-border/60 bg-surface/70 px-6 font-semibold"
              >
                {t("heroSecondary")}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </Link>
          </>
        }
      />

      {/* Pricing factors */}
      <Section>
        <SectionHeading
          eyebrow={t("factors.eyebrow")}
          title={t("factors.title")}
          description={t("factors.description")}
          align="center"
        />
        <Reveal>
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {factors.map((factor) => {
              const Icon = factor.icon;
              return (
                <li
                  key={factor.title}
                  className="group rounded-2xl border border-border/60 bg-surface p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lift"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-h4 font-bold text-foreground">{factor.title}</h3>
                  <p className="mt-1.5 text-body-sm leading-relaxed text-pretty text-muted-foreground">
                    {factor.description}
                  </p>
                </li>
              );
            })}
          </ul>
        </Reveal>
      </Section>

      {/* Interactive estimator (shared with the home page) */}
      <RateCalculatorPreview />

      {/* Standard rate card */}
      <Section muted>
        <SectionHeading
          eyebrow={t("rates.eyebrow")}
          title={t("rates.title")}
          description={t("rates.description")}
          align="center"
        />
        <Reveal className="mt-10">
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-surface shadow-soft">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-surface-muted/60">
                    <th className="px-6 py-4 text-caption font-bold uppercase tracking-wider text-muted-foreground">
                      {t("rates.zone")}
                    </th>
                    <th className="px-6 py-4 text-caption font-bold uppercase tracking-wider text-muted-foreground">
                      {t("rates.upTo1kg")}
                    </th>
                    <th className="px-6 py-4 text-caption font-bold uppercase tracking-wider text-muted-foreground">
                      {t("rates.perKg")}
                    </th>
                    <th className="px-6 py-4 text-caption font-bold uppercase tracking-wider text-muted-foreground">
                      {t("rates.sla")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50 text-body">
                  {rates.map((rate, index) => (
                    <tr
                      key={rate.zone}
                      className={cn("transition-colors hover:bg-surface-muted/40", index === 0 && "bg-primary/5")}
                    >
                      <td className="px-6 py-4 font-semibold text-foreground">{rate.zone}</td>
                      <td className="px-6 py-4 font-mono text-foreground tabular-nums">{rate.upTo1kg}</td>
                      <td className="px-6 py-4 font-mono text-muted-foreground tabular-nums">{rate.perKg}</td>
                      <td className="px-6 py-4 text-muted-foreground">{rate.sla}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="border-t border-border/50 bg-surface-muted/30 px-6 py-4 text-caption text-muted-foreground">
              {t("rates.note")}
            </p>
          </div>
        </Reveal>

        <Reveal className="mt-10">
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 sm:p-8">
            <h3 className="flex items-center gap-2 text-h4 font-bold text-foreground">
              <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
              {t("included.title")}
            </h3>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {included.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-body text-foreground/90">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </Section>

      {/* Pricing FAQ */}
      <Section>
        <SectionHeading
          eyebrow={t("faq.eyebrow")}
          title={t("faq.title")}
          description={t("faq.description")}
          align="center"
        />
        <FaqList items={faq} />
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
