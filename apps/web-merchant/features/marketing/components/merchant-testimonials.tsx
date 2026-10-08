"use client";

import React from "react";
import { Star, ShieldCheck, TrendingUp } from "lucide-react";

interface Testimonial {
  name: string;
  role: string;
  store: string;
  category: string;
  metric: string;
  metricLabel: string;
  quote: string;
  avatarColor: string;
  initials: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    name: "Tanvir Ahmed",
    role: "Founder & CEO",
    store: "TechCart BD",
    category: "Consumer Electronics",
    metric: "-34% RTO",
    metricLabel: "Returned Parcels Drop",
    quote:
      "Dhruto's address verification and buyer delivery score completely changed our unit economics. We ship over 4,000 electronics parcels every month with next to zero transit disputes.",
    avatarColor: "bg-success-soft text-success-soft-foreground",
    initials: "TA",
  },
  {
    name: "Farhana Rahman",
    role: "Managing Director",
    store: "Vastra Lifestyle",
    category: "Fashion & Apparel",
    metric: "100% Next-Day",
    metricLabel: "Automated COD Payout",
    quote:
      "For a growing fashion brand, cash flow is everything. Dhruto's automated next-day bank transfers eliminated our weekly liquidity crunch. Their doorstep delivery inside Dhaka is unbeatable.",
    avatarColor: "bg-primary-soft text-primary-soft-foreground",
    initials: "FR",
  },
  {
    name: "Mahfuzul Alam",
    role: "Logistics Lead",
    store: "DailyMart Online",
    category: "Groceries & FMCG",
    metric: "99.4% SLA",
    metricLabel: "Doorstep On-Time Rate",
    quote:
      "The line-haul network outside Dhaka is what surprised us the most. Even in remote thanas of Sylhet and Barisal, our perishable retail packages arrive within 36 hours in pristine condition.",
    avatarColor: "bg-info-soft text-info-soft-foreground",
    initials: "MA",
  },
];

export function MerchantTestimonials() {
  return (
    <section className="relative py-16 sm:py-24 overflow-hidden">
      <div className="dhruto-container relative z-10">
        {/* Section Heading */}
        <div className="mx-auto max-w-2xl text-center space-y-3 mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Proven Merchant Success</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight text-balance">
            Trusted by 12,000+ Fast-Growing Brands
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground text-pretty max-w-xl mx-auto leading-relaxed">
            See how top e-commerce leaders in Bangladesh scale their deliveries and increase profit margins with Dhruto.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.store}
              className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-border bg-surface p-6 sm:p-8 shadow-lg transition-all duration-300 hover:border-primary/50 hover:shadow-xl hover:-translate-y-1"
            >
              {/* Top ambient highlight */}
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="space-y-4">
                {/* Metric pill & Stars */}
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                    <span>{t.metric}</span>
                    <span className="text-[10px] text-muted-foreground font-normal">({t.metricLabel})</span>
                  </div>

                  <div className="flex items-center gap-0.5 text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-current" />
                    ))}
                  </div>
                </div>

                {/* Quote text */}
                <p className="text-sm sm:text-base text-foreground/90 font-medium leading-relaxed italic">
                  "{t.quote}"
                </p>
              </div>

              {/* Merchant author info */}
              <div className="mt-6 pt-5 border-t border-border/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-bold text-sm ${t.avatarColor} border border-white/10`}
                  >
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground leading-tight">{t.name}</p>
                    <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                      {t.role}, <span className="font-semibold text-foreground/90">{t.store}</span>
                    </p>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Verified
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
