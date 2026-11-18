"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, TrendingDown } from "lucide-react";

interface VolumeTier {
  minParcels: number;
  label: string;
  badge: string;
  dhakaRate: number;
  nationwideRate: number;
  codPercent: number;
  savingsMultiplier: number;
}

const VOLUME_TIERS: VolumeTier[] = [
  {
    minParcels: 100,
    label: "Starter Merchant",
    badge: "100 - 300 / mo",
    dhakaRate: 60,
    nationwideRate: 130,
    codPercent: 1.0,
    savingsMultiplier: 5,
  },
  {
    minParcels: 500,
    label: "Emerging Brand",
    badge: "300 - 1,000 / mo",
    dhakaRate: 55,
    nationwideRate: 122,
    codPercent: 0.85,
    savingsMultiplier: 12,
  },
  {
    minParcels: 2000,
    label: "Scale Operator",
    badge: "1,000 - 5,000 / mo",
    dhakaRate: 50,
    nationwideRate: 112,
    codPercent: 0.65,
    savingsMultiplier: 18,
  },
  {
    minParcels: 8000,
    label: "Enterprise 3PL",
    badge: "5,000+ / mo",
    dhakaRate: 44,
    nationwideRate: 98,
    codPercent: 0.5,
    savingsMultiplier: 24,
  },
];

export function PricingVolumeCurve() {
  const [monthlyParcels, setMonthlyParcels] = React.useState<number>(1200);

  // Find active tier
  let activeTier = VOLUME_TIERS[0]!;
  for (const tier of VOLUME_TIERS) {
    if (monthlyParcels >= tier.minParcels) {
      activeTier = tier;
    }
  }

  // Calculate estimated monthly savings vs market standard (where market is ~৳70 Dhaka, 1.5% COD)
  const legacyCostPerParcel = 70 + (2500 * 0.015); // assumed avg parcel ৳2500
  const dhrutoCostPerParcel = activeTier.dhakaRate + (2500 * (activeTier.codPercent / 100));
  const estimatedMonthlySavings = Math.round(monthlyParcels * (legacyCostPerParcel - dhrutoCostPerParcel));

  return (
    <section className="relative py-24 bg-muted/20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
            <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />
            <span>DYNAMIC VOLUME CURVE</span>
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            As Your Parcel Volume Multiplies, Your Cost Drops
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            Drag the monthly volume slider below to reveal automated volume discounts across intra-city drops, nationwide line-haul, and COD escrow fees.
          </p>
        </div>

        {/* Volume Simulator Card */}
        <div className="mt-16 overflow-hidden rounded-3xl bg-surface p-6 sm:p-10">
          {/* Slider Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Your Monthly Outbound Parcel Volume
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-mono text-4xl font-extrabold text-foreground">
                  {monthlyParcels.toLocaleString()}
                </span>
                <span className="text-sm font-semibold text-muted-foreground">shipments / month</span>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 rounded-2xl bg-primary/10 px-4 py-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                Current Tier:
              </span>
              <span className="text-sm font-extrabold text-foreground">
                {activeTier.label} ({activeTier.badge})
              </span>
            </div>
          </div>

          {/* Range Slider */}
          <div className="mt-8">
            <input
              type="range"
              min="100"
              max="10000"
              step="100"
              value={monthlyParcels}
              onChange={(e) => setMonthlyParcels(parseInt(e.target.value, 10))}
              className="prc-range-slider"
            />
            <div className="mt-3 flex justify-between text-xs font-mono text-muted-foreground">
              <span>100 parcels</span>
              <span>2,500</span>
              <span>5,000</span>
              <span>7,500</span>
              <span>10,000+ parcels/mo</span>
            </div>
          </div>

          {/* 3 Live Metric Badges */}
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-muted/20 p-5">
              <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                <span>Dhaka Metro Rate</span>
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                  12-24h SLA
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="font-mono text-3xl font-extrabold text-foreground">
                  ৳{activeTier.dhakaRate}
                </span>
                <span className="text-xs text-muted-foreground">/ parcel</span>
              </div>
              <div className="mt-1 text-[11px] text-success">
                Reduced from published ৳60 rate
              </div>
            </div>

            <div className="rounded-2xl bg-muted/20 p-5">
              <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                <span>Nationwide 64 Districts</span>
                <span className="rounded bg-info/10 px-1.5 py-0.5 text-[10px] text-info">
                  48-72h SLA
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="font-mono text-3xl font-extrabold text-foreground">
                  ৳{activeTier.nationwideRate}
                </span>
                <span className="text-xs text-muted-foreground">/ parcel</span>
              </div>
              <div className="mt-1 text-[11px] text-success">
                Reduced from published ৳130 rate
              </div>
            </div>

            <div className="rounded-2xl bg-muted/20 p-5">
              <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                <span>COD Handling Fee</span>
                <span className="rounded bg-success/10 px-1.5 py-0.5 text-[10px] text-success">
                  Next-Day Payout
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="font-mono text-3xl font-extrabold text-foreground">
                  {activeTier.codPercent}%
                </span>
                <span className="text-xs text-muted-foreground">per collection</span>
              </div>
              <div className="mt-1 text-[11px] text-success">
                Half of traditional courier rates (1.5-2%)
              </div>
            </div>
          </div>

          {/* Big Monthly Estimated Savings Banner */}
          <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-2xl bg-success/10 p-6 sm:flex-row sm:items-center">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-success">
                Your Estimated Monthly Merchant Savings
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-mono text-3xl font-extrabold text-success">
                  ৳{estimatedMonthlySavings.toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground">
                  saved each month compared to standard courier charges
                </span>
              </div>
            </div>

            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-xs font-bold text-white transition hover:bg-primary-hover hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Lock In Custom Volume SLA</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
