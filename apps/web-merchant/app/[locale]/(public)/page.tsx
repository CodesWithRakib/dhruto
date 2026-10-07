import React from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ArrowRight, Play } from "lucide-react";
import { Button } from "@dhruto/ui";
import { Link } from "@/lib/navigation";
import { HeroVisual } from "@/features/marketing/components/hero-visual";
import { StatsStrip } from "@/features/marketing/components/stats-strip";
import { ServicesSection } from "@/features/marketing/components/services-section";
import { ActionGrid } from "@/features/marketing/components/action-grid";
import {
  FaqList,
  Section,
  SectionHeading,
  StepFlow,
} from "@/features/marketing/components/sections";

export const metadata: Metadata = {
  title: "Dhruto — আপনার পণ্য, আমাদের দায়িত্ব | Fast • Safe • Reliable",
  description:
    "Dhruto হল বাংলাদেশের ই-কমার্স ও রিটেইল সাপ্লাই চেইনের জন্য একটি আধুনিক লজিস্টিক ও কুরিয়ার সল্যুশন। দ্রুত ডেলিভারি, নির্ভরযোগ্য সেবা, এবং স্মার্ট টেকনোলজির সাথে সবসময় আপনার পাশে।",
  alternates: { canonical: "/" },
};

interface Copy {
  title: string;
  description: string;
}

export default async function HomePage() {
  const t = await getTranslations("Home");

  const steps = (t.raw("how.items") as Copy[]) || [];
  const faq = (t.raw("faq.items") as { question: string; answer: string }[]) || [];

  return (
    <>
      {/* 1 — Hero Section matching design-1.png & design.png */}
      <section className="relative overflow-hidden pt-10 pb-12 sm:pt-16 sm:pb-16 lg:pt-20 lg:pb-20">
        <div className="dhruto-container">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            {/* Left Content */}
            <div className="space-y-6 text-left">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50 px-4 py-1.5 shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
                </span>
                <span className="text-xs sm:text-sm font-semibold text-emerald-800">
                  {t("hero.eyebrow")}
                </span>
              </div>

              {/* Title & Tagline */}
              <div className="space-y-2">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground text-balance leading-[1.15]">
                  {t("hero.title")}
                </h1>
                <p className="text-lg sm:text-xl font-semibold text-muted-foreground tracking-wide">
                  {t("hero.tagline")}
                </p>
              </div>

              {/* Paragraph */}
              <p className="max-w-xl text-base sm:text-lg text-muted-foreground text-pretty leading-relaxed">
                {t("hero.subtitle")}
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link href="/register">
                  <Button size="lg" className="h-12 px-6 rounded-md text-base font-semibold shadow-md">
                    {t("hero.ctaPrimary")}
                    <ArrowRight className="h-4 w-4 ml-1" aria-hidden="true" />
                  </Button>
                </Link>
                <a href="#how-it-works">
                  <Button size="lg" variant="outline" className="h-12 px-6 rounded-md text-base font-medium">
                    <Play className="h-4 w-4 mr-2 fill-current" />
                    {t("hero.ctaSecondary")}
                  </Button>
                </a>
              </div>
            </div>

            {/* Right Graphic */}
            <HeroVisual />
          </div>
        </div>
      </section>

      {/* 2 — Stats Strip */}
      <StatsStrip />

      {/* 3 — Our Services ("আমাদের সেবাসমূহ") */}
      <ServicesSection />

      {/* 4 — Dual Action Grid (Merchant Partnership & Public Tracking) */}
      <ActionGrid />

      {/* 5 — How It Works ("কীভাবে কাজ করে") */}
      {steps.length > 0 && (
        <Section id="how-it-works" className="dhruto-hero-dark">
          <SectionHeading
            eyebrow={t("how.eyebrow")}
            title={t("how.title")}
            description={t("how.description")}
            align="center"
          />
          <StepFlow steps={steps} />
        </Section>
      )}

      {/* 6 — FAQ ("সচরাচর জিজ্ঞাসিত প্রশ্নাবলী") */}
      {faq.length > 0 && (
        <Section muted id="faq">
          <SectionHeading
            eyebrow={t("faq.eyebrow")}
            title={t("faq.title")}
            description={t("faq.description")}
            align="center"
          />
          <FaqList items={faq} />
        </Section>
      )}
    </>
  );
}
