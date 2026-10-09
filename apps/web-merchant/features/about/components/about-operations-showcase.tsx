"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Building2, Truck, Check, Wallet } from "lucide-react";
import { SectionHeading } from "@/features/marketing/components/sections";

const SHOWCASE_TABS = [
  {
    id: "hubs",
    title: "Sorting Belts & Cross-Dock Hubs",
    eyebrow: "Physical Infrastructure",
    icon: Building2,
    badge: "24,000 sq.ft Hubs",
    image: "/images/merchant-hub.jpg",
    alt: "Dhruto automated central sorting hub facility in Dhaka",
    heading: "Nationwide by Design, Not by Patchwork",
    description:
      "Urban and regional fulfillment run on the same central hub network. Parcels arriving from merchants are weighed, measured, laser-scanned, and routed to dedicated division line-haul chutes within 24 minutes.",
    bullets: [
      "Sorting hubs operating in all 8 divisions with automated cross-docking",
      "Daily scheduled heavy line-haul between Dhaka mega-hubs and all 64 districts",
      "Doorstep delivery extending deep into all 495 thanas nationwide",
    ],
    metric: "24 Mins",
    metricLabel: "Average cross-dock dwell time at sorting belt",
  },
  {
    id: "finance",
    title: "Transparent COD Escrow Ledger",
    eyebrow: "Financial Infrastructure",
    icon: Wallet,
    badge: "Next-Day Payout",
    image: "/images/dashboard-banner.jpg",
    alt: "Dhruto merchant financial dashboard and COD reconciliation",
    heading: "Every Taka of COD is Traceable and Guaranteed",
    description:
      "Cash on Delivery is the lifeblood of Bangladesh e-commerce. Dhruto reconciles every collected note into an immutable digital ledger, eliminating courier black holes and releasing payouts straight to your bank or MFS account.",
    bullets: [
      "Automated cash-in verification at rider hub return",
      "Instant settlement into merchant wallet, bKash, Nagad, or BEFTN bank transfer",
      "Full audit trail with one-click Excel and PDF reconciliation statements",
    ],
    metric: "Next Morning",
    metricLabel: "Automated payout straight into your accounts",
  },
  {
    id: "riders",
    title: "Smart Rider Fleet & Doorstep Protocol",
    eyebrow: "Last-Mile Infrastructure",
    icon: Truck,
    badge: "4,200+ Couriers",
    image: "/images/auth-courier.jpg",
    alt: "Dhruto smart delivery rider equipped with mobile scanner app",
    heading: "Technology Engineered for the People Moving Parcels",
    description:
      "Our field application is mobile-first, bilingual, and offline-tolerant. Riders receive optimized route manifests, masked recipient contacts for privacy, and secure delivery confirmation via 4-digit SMS OTP.",
    bullets: [
      "Secure 4-digit SMS OTP handover preventing false delivery attempts",
      "Masked customer contact numbers to safeguard recipient privacy",
      "High-contrast interface engineered for harsh sunlight and monsoon delivery",
    ],
    metric: "99.2%",
    metricLabel: "Doorstep delivery success on first attempt in Metro",
  },
];

export function AboutOperationsShowcase() {
  const t = useTranslations("About");
  const [activeTabId, setActiveTabId] = useState("hubs");

  const currentTab = (SHOWCASE_TABS.find((tab) => tab.id === activeTabId) ?? SHOWCASE_TABS[0])!;

  return (
    <section className="py-20 sm:py-28 bg-background relative overflow-hidden" id="infrastructure">
      <div className="dhruto-container relative z-10 max-w-6xl">
        <SectionHeading
          eyebrow={t("showcase.eyebrow")}
          title={t("showcase.title")}
          description={t("showcase.description")}
          align="center"
        />

        {/* Interactive Tab Selector Buttons */}
        <div className="mt-12 max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-2 p-1.5 rounded-2xl border border-border/70 bg-surface-muted/50 backdrop-blur-sm">
          {SHOWCASE_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.id === activeTabId;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTabId(tab.id)}
                className={`flex items-center justify-center sm:justify-start gap-2.5 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 ${
                  isActive
                    ? "bg-surface text-primary shadow-sm border border-border/80"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface/50"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                <span className="truncate">{tab.title.split("&")[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Showcase Screen */}
        <div className="mt-8 about-showcase-frame p-6 sm:p-10">
          <div className="grid gap-10 lg:grid-cols-12 items-center">
            {/* Left Content Column */}
            <div className="lg:col-span-6 space-y-6">
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-xs font-semibold text-primary">
                  {currentTab.eyebrow}
                </span>
                <span className="text-xs font-mono text-muted-foreground">• {currentTab.badge}</span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight leading-snug">
                {currentTab.heading}
              </h3>

              <p className="text-sm sm:text-base leading-relaxed text-muted-foreground text-pretty">
                {currentTab.description}
              </p>

              {/* Bullet Points */}
              <div className="space-y-3 pt-2">
                {currentTab.bullets.map((bullet, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/15 text-success mt-0.5">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-sm text-foreground/90 font-medium leading-relaxed">
                      {bullet}
                    </span>
                  </div>
                ))}
              </div>

              {/* Metric Card */}
              <div className="mt-6 pt-5 border-t border-border/60 flex items-center gap-4">
                <div className="font-mono text-2xl font-black text-primary">
                  {currentTab.metric}
                </div>
                <div className="text-xs text-muted-foreground font-medium max-w-xs">
                  {currentTab.metricLabel}
                </div>
              </div>
            </div>

            {/* Right Photographic Visual Column */}
            <div className="lg:col-span-6">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-border/70 shadow-xl bg-surface-muted">
                <Image
                  src={currentTab.image}
                  alt={currentTab.alt}
                  fill
                  sizes="(max-width: 1024px) 100vw, 550px"
                  className="object-cover object-center transition-all duration-700 hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                {/* Floating Corner Overlay */}
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-xl border border-white/20 bg-black/60 px-4 py-2.5 backdrop-blur-md">
                  <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                    OPERATIONAL FACILITY
                  </span>
                  <span className="font-mono text-xs text-success font-semibold flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                    LIVE OPS
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
