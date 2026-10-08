import React from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ArrowRight, Play, Sparkles, Headphones, Zap } from "lucide-react";
import { Button } from "@dhruto/ui";
import { Link } from "@/lib/navigation";
import { HeroVisual } from "@/features/marketing/components/hero-visual";
import { StatsStrip } from "@/features/marketing/components/stats-strip";
import { ServicesSection } from "@/features/marketing/components/services-section";
import { ActionGrid } from "@/features/marketing/components/action-grid";
import { RateCalculatorPreview } from "@/features/marketing/components/rate-calculator-preview";
import { CoverageExplorer } from "@/features/marketing/components/coverage-explorer";
import { ComparisonSection } from "@/features/marketing/components/comparison-section";
import { MerchantTestimonials } from "@/features/marketing/components/merchant-testimonials";
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
      {/* 1 — Hero Section with Ambient Spotlight */}
      <section className="relative overflow-hidden pt-8 pb-16 sm:pt-14 sm:pb-20 lg:pt-16 lg:pb-24">
        {/* Top center subtle radial spotlight */}
        <div
          className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-[400px] w-[600px] rounded-full bg-primary/10 blur-[130px] -z-10"
          aria-hidden="true"
        />

        <div className="dhruto-container relative z-10">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14 xl:gap-20">
            {/* Left Content */}
            <div className="space-y-6 sm:space-y-8 text-left">
              {/* Eyebrow Badge */}
              <div className="inline-flex items-center gap-2.5 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
                <span className="text-xs sm:text-sm font-semibold text-primary">
                  {t("hero.eyebrow")}
                </span>
              </div>

              {/* Title & Tagline */}
              <div className="space-y-3">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black text-foreground text-balance leading-[1.12]">
                  {t("hero.title")}
                </h1>
                <div className="inline-block rounded-xl border border-primary/20 bg-primary/5 px-4 py-1.5 text-base sm:text-lg font-bold text-primary">
                  {t("hero.tagline")}
                </div>
              </div>

              {/* Subtitle */}
              <p className="max-w-xl text-base sm:text-lg text-muted-foreground text-pretty leading-relaxed">
                {t("hero.subtitle")}
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link href="/register">
                  <Button size="lg" className="h-14 px-8 rounded-2xl text-base font-bold shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/40 hover:-translate-y-0.5 transition-all">
                    <Sparkles className="h-4 w-4 mr-2" />
                    {t("hero.ctaPrimary")}
                    <ArrowRight className="h-4 w-4 ml-1.5" aria-hidden="true" />
                  </Button>
                </Link>
                <a href="#how-it-works">
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-14 px-7 rounded-2xl text-base font-semibold border-border/60 bg-surface/50 hover:bg-surface/90 hover:border-primary/40 backdrop-blur-md transition-all"
                  >
                    <Play className="h-4 w-4 mr-2 fill-current" />
                    {t("hero.ctaSecondary")}
                  </Button>
                </a>
              </div>

              {/* Social Proof Trust Strip */}
              <div className="flex flex-wrap items-center gap-4 border-t border-border/30 pt-4">
                <div className="flex -space-x-2 overflow-hidden" aria-hidden="true">
                  <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-success-soft text-xs font-bold text-success-soft-foreground ring-2 ring-background">
                    D
                  </div>
                  <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-info-soft text-xs font-bold text-info-soft-foreground ring-2 ring-background">
                    K
                  </div>
                  <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary-soft-foreground ring-2 ring-background">
                    R
                  </div>
                  <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-warning-soft text-xs font-bold text-warning-soft-foreground ring-2 ring-background">
                    S
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">{t("hero.trust")}</div>
              </div>
            </div>

            {/* Right Graphic Showcase */}
            <HeroVisual />
          </div>
        </div>
      </section>

      {/* 2 — Live Stats Strip */}
      <StatsStrip />

      {/* 3 — Interactive Cost & Payout Calculator Preview */}
      <RateCalculatorPreview />

      {/* 4 — Our Services Bento Grid ("আমাদের সেবাসমূহ") */}
      <ServicesSection />

      {/* 5 — Nationwide 64 Districts Line-Haul Hub Explorer */}
      <CoverageExplorer />

      {/* 6 — Dual Action Grid (Merchant Partnership & Public Tracking) */}
      <ActionGrid />

      {/* 7 — Traditional Couriers vs Dhruto Operating System */}
      <ComparisonSection />

      {/* 8 — How It Works ("কীভাবে কাজ করে") */}
      {steps.length > 0 && (
        <Section id="how-it-works">
          <SectionHeading
            eyebrow={t("how.eyebrow")}
            title={t("how.title")}
            description={t("how.description")}
            align="center"
          />
          <StepFlow steps={steps} />
        </Section>
      )}

      {/* 9 — Merchant Testimonials & Verified Case Studies */}
      <MerchantTestimonials />

      {/* 10 — FAQ ("সচরাচর জিজ্ঞাসিত প্রশ্নাবলী") */}
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

      {/* 11 — Pre-Footer Bottom CTA Banner */}
      <section className="relative py-16 sm:py-24 overflow-hidden">
        <div className="dhruto-container relative z-10">
          <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-b from-surface/90 via-surface/70 to-surface/90 p-8 sm:p-14 lg:p-16 backdrop-blur-2xl shadow-2xl text-center">
            {/* Background Glow Aura */}
            <div
              className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-[300px] w-[500px] rounded-full bg-primary/20 blur-[100px]"
              aria-hidden="true"
            />

            <div className="relative z-10 mx-auto max-w-3xl space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary">
                <Zap className="h-3.5 w-3.5" />
                <span>{t("finalCta.badge")}</span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight text-balance">
                {t("finalCta.title")}
              </h2>

              <p className="text-base sm:text-lg text-muted-foreground text-pretty max-w-xl mx-auto leading-relaxed">
                {t("finalCta.description")}
              </p>

              <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
                <Link href="/register">
                  <Button size="lg" className="h-14 px-8 rounded-2xl text-base font-bold shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/45 transition-all">
                    <Sparkles className="h-4 w-4 mr-2" />
                    {t("finalCta.primary")}
                    <ArrowRight className="h-4 w-4 ml-1.5" />
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-14 px-7 rounded-2xl text-base font-semibold border-border/60 bg-surface/50 hover:bg-surface/80 transition-all"
                  >
                    <Headphones className="h-4 w-4 mr-2" />
                    {t("finalCta.secondary")}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
