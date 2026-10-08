import React from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ArrowRight, Calculator, Headphones, LifeBuoy, PackageSearch, Truck } from "lucide-react";
import { PageHero } from "@/features/marketing/components/page-hero";
import { CTASection } from "@/features/marketing/components/blocks";
import { FaqExplorer } from "@/features/marketing/components/faq-explorer";
import { Reveal } from "@/features/marketing/components/reveal";
import { Section, SectionHeading } from "@/features/marketing/components/sections";
import { Link } from "@/lib/navigation";

export const metadata: Metadata = {
  title: "Help & FAQ",
  description:
    "Answers about parcel booking, cash-on-delivery, tracking, delivery timelines and COD settlement with Dhruto.",
  alternates: { canonical: "/faq" },
};

const TOPIC_ICONS = [Truck, Calculator, PackageSearch, Headphones];

export default async function FaqPage() {
  const t = await getTranslations("Faq");
  const items = t.raw("items") as { question: string; answer: string }[];
  const topics = [
    { href: "/services", icon: TOPIC_ICONS[0], title: t("topics.servicesTitle"), description: t("topics.servicesDesc") },
    { href: "/pricing", icon: TOPIC_ICONS[1], title: t("topics.pricingTitle"), description: t("topics.pricingDesc") },
    { href: "/track", icon: TOPIC_ICONS[2], title: t("topics.trackingTitle"), description: t("topics.trackingDesc") },
    { href: "/contact", icon: TOPIC_ICONS[3], title: t("topics.contactTitle"), description: t("topics.contactDesc") },
  ];

  return (
    <>
      <PageHero
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        align="center"
        tone="light"
        badge={
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
            <LifeBuoy className="h-3.5 w-3.5" aria-hidden="true" />
            {t("badge")}
          </span>
        }
      />

      <Section className="pt-4 sm:pt-8">
        <Reveal>
          <FaqExplorer items={items} />
        </Reveal>
      </Section>

      <Section muted>
        <SectionHeading
          eyebrow={t("topics.eyebrow")}
          title={t("topics.title")}
          description={t("topics.description")}
          align="center"
        />
        <Reveal className="mt-10">
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {topics.map((topic) => {
              const Icon = topic.icon ?? Headphones;
              return (
                <li key={topic.href}>
                  <Link
                    href={topic.href}
                    className="group flex h-full flex-col rounded-2xl border border-border/60 bg-surface p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lift"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <h3 className="mt-4 text-h4 font-bold text-foreground">{topic.title}</h3>
                    <p className="mt-1.5 flex-1 text-body-sm leading-relaxed text-pretty text-muted-foreground">
                      {topic.description}
                    </p>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
                      {t("topics.open")}
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </span>
                  </Link>
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
        primary={{ href: "/register", label: t("cta.primary"), icon: Truck }}
        secondary={{ href: "/contact", label: t("cta.secondary") }}
        note={t("cta.note")}
      />
    </>
  );
}
