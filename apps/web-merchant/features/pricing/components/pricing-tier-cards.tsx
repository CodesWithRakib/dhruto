"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Check, Layers, Sparkles } from "lucide-react";

interface PricingPlan {
  id: string;
  name: string;
  tagline: string;
  monthlyFee: string;
  monthlyFeeNote: string;
  featured?: boolean;
  volumeBadge: string;
  dhakaRate: string;
  nationwideRate: string;
  codFee: string;
  features: string[];
  ctaLabel: string;
  ctaHref: string;
}

const PRICING_PLANS: PricingPlan[] = [
  {
    id: "starter",
    name: "Starter Merchant",
    tagline: "Ideal for boutique shops, emerging e-commerce, and test shipments.",
    monthlyFee: "৳0",
    monthlyFeeNote: "Pay strictly per parcel moved",
    volumeBadge: "1 to 200 Shipments / mo",
    dhakaRate: "৳60",
    nationwideRate: "৳130",
    codFee: "1.0% flat",
    features: [
      "Doorstep pickup anywhere in Dhaka",
      "Next-morning COD payout to bKash/Bank",
      "Zero registration or platform deposit",
      "Public bilingual tracking link with SMS",
      "Web dashboard & bulk CSV induction",
      "Standard email & chat ticketing",
    ],
    ctaLabel: "Create Free Account",
    ctaHref: "/register",
  },
  {
    id: "growth",
    name: "Growth Brand",
    tagline: "Designed for established Facebook pages, Shopify stores & active retailers.",
    monthlyFee: "Volume Rates",
    monthlyFeeNote: "Auto-qualifies at 200+ parcels/mo",
    featured: true,
    volumeBadge: "200 to 2,000 Shipments / mo",
    dhakaRate: "৳52",
    nationwideRate: "৳118",
    codFee: "0.75%",
    features: [
      "All Starter features included",
      "Up to 15% discount on base freight rates",
      "Guaranteed 10:00 AM bank settlement",
      "Dedicated WhatsApp Account Manager",
      "Priority Cross-Dock Sorting Belt lane",
      "Free reverse pickup on customer exchanges",
      "Automated WooCommerce & Shopify plugin",
    ],
    ctaLabel: "Claim Growth Pricing",
    ctaHref: "/register",
  },
  {
    id: "enterprise",
    name: "Enterprise & 3PL",
    tagline: "For national retail chains, FMCG distribution & high-volume dark stores.",
    monthlyFee: "Custom Contract",
    monthlyFeeNote: "Bespoke SLA with penalty guarantees",
    volumeBadge: "2,000+ Shipments / mo",
    dhakaRate: "From ৳44",
    nationwideRate: "From ৳98",
    codFee: "0.5% or flat",
    features: [
      "All Growth features included",
      "Lowest per-parcel freight rates in Bangladesh",
      "Dedicated nightly line-haul truck allocation",
      "Full REST API & HMAC webhook integration",
      "Custom thermal 4x6 label branding",
      "24/7 dedicated telephone dispatch desk",
      "Tailored credit terms and weekly invoicing",
    ],
    ctaLabel: "Consult Enterprise Team",
    ctaHref: "/contact",
  },
];

export function PricingTierCards() {
  return (
    <section id="merchant-tiers" className="relative scroll-mt-24 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
            <Layers className="h-3.5 w-3.5" aria-hidden="true" />
            <span>TRANSPARENT MERCHANT PLANS</span>
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Choose the Tier Tailored to Your Shipping Velocity
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            No mandatory recurring subscriptions. Pay for the shipments you move, with automatic rate discounts kicking in as your volume grows.
          </p>
        </div>

        {/* 3 Tier Cards Grid */}
        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {PRICING_PLANS.map((plan) => {
            return (
              <div
                key={plan.id}
                className={`prc-tier-card ${plan.featured ? "featured" : ""}`}
              >
                {/* Featured Badge */}
                {plan.featured && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1 text-xs font-extrabold uppercase tracking-wider text-white">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>MOST POPULAR CHOICE</span>
                    </span>
                  </div>
                )}

                {/* Plan Header */}
                <div>
                  <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">
                    {plan.volumeBadge}
                  </span>
                  <h3 className="mt-4 text-2xl font-bold tracking-tight text-foreground">
                    {plan.name}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {plan.tagline}
                  </p>
                </div>

                {/* Pricing Block */}
                <div className="mt-6 py-5">
                  <div className="flex items-baseline gap-1">
                    <span className="font-mono text-3xl font-extrabold text-foreground">
                      {plan.monthlyFee}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {plan.monthlyFeeNote}
                  </div>

                  {/* Rates Quick Table */}
                  <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-muted/40 p-2.5 text-center text-xs">
                    <div>
                      <div className="text-[10px] text-muted-foreground">Dhaka Metro</div>
                      <div className="font-mono font-bold text-foreground">{plan.dhakaRate}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">Nationwide</div>
                      <div className="font-mono font-bold text-foreground">{plan.nationwideRate}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">COD Fee</div>
                      <div className="font-mono font-bold text-success">{plan.codFee}</div>
                    </div>
                  </div>
                </div>

                {/* Features List */}
                <ul className="mt-6 flex-1 space-y-3 text-xs text-foreground/90">
                  {plan.features.map((feat, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="flex h-4 w-4 flex-none items-center justify-center rounded-full bg-primary/20 text-primary mt-0.5">
                        <Check className="h-2.5 w-2.5 stroke-[3]" />
                      </span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                {/* Action CTA */}
                <div className="mt-8 pt-4">
                  <Link
                    href={plan.ctaHref}
                    className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all ${
                      plan.featured
                        ? "bg-primary text-white hover:bg-primary-hover hover:scale-[1.02] active:scale-[0.98]"
                        : "bg-surface text-foreground hover:bg-muted"
                    }`}
                  >
                    <span>{plan.ctaLabel}</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
