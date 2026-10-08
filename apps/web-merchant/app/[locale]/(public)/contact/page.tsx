import React from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  ArrowRight,
  Clock,
  Headphones,
  Mail,
  MapPin,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { PageHero } from "@/features/marketing/components/page-hero";
import { CTASection } from "@/features/marketing/components/blocks";
import { ContactForm } from "@/features/marketing/components/contact-form";
import { Reveal } from "@/features/marketing/components/reveal";
import { FaqList, Section, SectionHeading } from "@/features/marketing/components/sections";
import { Link } from "@/lib/navigation";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Talk to the Dhruto team about merchant onboarding, bulk shipping, pricing or support.",
  alternates: { canonical: "/contact" },
};

const SUPPORT_EMAIL = "support@dhruto.com";

export default async function ContactPage() {
  const t = await getTranslations("Contact");
  const tf = await getTranslations("Faq");
  const faq = (tf.raw("items") as { question: string; answer: string }[]).slice(0, 4);

  const channels = [
    {
      icon: Mail,
      title: t("email.title"),
      value: SUPPORT_EMAIL,
      detail: t("email.detail"),
      href: `mailto:${SUPPORT_EMAIL}`,
    },
    {
      icon: Clock,
      title: t("hours.title"),
      value: t("hours.value"),
      detail: t("hours.detail"),
    },
    {
      icon: MapPin,
      title: t("office.title"),
      value: t("office.value"),
      detail: t("office.detail"),
    },
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
            <Headphones className="h-3.5 w-3.5" aria-hidden="true" />
            {t("badge")}
          </span>
        }
      />

      {/* Contact channels */}
      <Section className="pt-4 sm:pt-8">
        <ul className="grid gap-4 sm:grid-cols-3">
          {channels.map((channel) => {
            const Icon = channel.icon;
            const body = (
              <>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h2 className="mt-4 text-h4 font-bold text-foreground">{channel.title}</h2>
                <p className="mt-1 text-body font-semibold text-foreground">{channel.value}</p>
                <p className="mt-1 text-body-sm leading-relaxed text-pretty text-muted-foreground">
                  {channel.detail}
                </p>
              </>
            );

            return (
              <li
                key={channel.title}
                className="group rounded-2xl border border-border/60 bg-surface p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lift"
              >
                {channel.href ? (
                  <a href={channel.href} className="block">
                    {body}
                  </a>
                ) : (
                  body
                )}
              </li>
            );
          })}
        </ul>
      </Section>

      {/* Form + support panel */}
      <Section muted className="pt-0 sm:pt-0">
        <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:gap-12">
          <Reveal>
            <ContactForm />
          </Reveal>

          <Reveal delay={80}>
            <aside className="space-y-4">
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6">
                <h2 className="text-h4 font-bold text-foreground">{t("support.responseTitle")}</h2>
                <p className="mt-1 text-2xl font-extrabold text-primary">
                  {t("support.responseValue")}
                </p>
                <p className="mt-1 text-body-sm text-pretty text-muted-foreground">
                  {t("support.responseDetail")}
                </p>
              </div>

              <div className="rounded-2xl border border-border/60 bg-surface p-6 shadow-soft">
                <h2 className="text-h4 font-bold text-foreground">{t("support.portalTitle")}</h2>
                <p className="mt-1.5 text-body-sm leading-relaxed text-pretty text-muted-foreground">
                  {t("support.portalDetail")}
                </p>
                <p className="mt-4 text-caption text-muted-foreground">{t("note")}</p>
              </div>

              <div className="rounded-2xl border border-border/60 bg-surface p-6 shadow-soft">
                <h2 className="flex items-center gap-2 text-h4 font-bold text-foreground">
                  <MessageCircle className="h-4 w-4 text-primary" aria-hidden="true" />
                  {t("support.quickTitle")}
                </h2>
                <ul className="mt-3 space-y-2 text-body-sm">
                  <li>
                    <Link
                      href="/track"
                      className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-primary"
                    >
                      {t("support.quickTrack")}
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/pricing"
                      className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-primary"
                    >
                      {t("support.quickPricing")}
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/faq"
                      className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-primary"
                    >
                      {t("support.quickFaq")}
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </li>
                </ul>
              </div>
            </aside>
          </Reveal>
        </div>
      </Section>

      {/* Quick answers */}
      <Section>
        <SectionHeading
          eyebrow={tf("eyebrow")}
          title={t("help.title")}
          description={t("help.description")}
          align="center"
        />
        <FaqList items={faq} />
      </Section>

      <CTASection
        eyebrow={t("cta.eyebrow")}
        title={t("cta.title")}
        description={t("cta.description")}
        primary={{ href: "/register", label: t("cta.primary"), icon: Sparkles }}
        secondary={{ href: "/faq", label: t("cta.secondary") }}
        note={t("cta.note")}
      />
    </>
  );
}
