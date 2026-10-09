"use client";

import React from "react";
import {
  BadgePercent,
  Calculator,
  Clock,
  Layers,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

interface PricingHeroProps {
  badge?: string;
  eyebrow?: string;
  title?: string;
  description?: string;
}

export function PricingHero({
  badge = "No Hidden Surcharges • 100% Auditable Ledger",
  title = "Simple, Transparent Logistics Pricing",
  description = "No arbitrary fuel surcharges, zero statement fees, and automated next-morning COD payouts. Calculate exact delivery charges and net merchant escrow payouts in real time.",
}: PricingHeroProps) {
  const scrollToSection = (id: string) => {
    const el = document.querySelector(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative overflow-hidden bg-[#07090f] pb-20 pt-28 text-white md:pb-28 md:pt-36">
      {/* Background Subtle Star Grid & Deep Emerald/Amber Ambiance */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.22) 1px, transparent 1px)`,
          backgroundSize: "28px 28px",
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-[560px] w-[900px] -translate-x-1/2 rounded-full opacity-30 blur-[130px]"
        style={{
          background: "radial-gradient(ellipse at center, rgba(16, 185, 129, 0.4), rgba(255, 107, 0, 0.2), transparent 70%)",
        }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Top Floating Live Badge */}
        <div className="flex justify-center">
          <div className="prc-hero-badge">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span>{badge}</span>
          </div>
        </div>

        {/* Hero Title & Description */}
        <div className="mx-auto mt-6 max-w-4xl text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            {title ? (
              <>
                {title}{" "}
                <span className="prc-serif text-emerald-400 block sm:inline">Built on Zero-Hidden Math</span>
              </>
            ) : (
              <>
                Logistics Pricing Built on{" "}
                <span className="prc-serif text-emerald-400">Zero-Hidden Math</span>
              </>
            )}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
            {description}
          </p>

          {/* Quick Jump Buttons */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => scrollToSection("#calculator-cockpit")}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all duration-200 hover:scale-[1.02] hover:bg-primary-hover hover:shadow-primary/40 active:scale-[0.98]"
            >
              <Calculator className="h-4 w-4" aria-hidden="true" />
              <span>Launch Live Cost Simulator</span>
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("#merchant-tiers")}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-all duration-200 hover:border-white/30 hover:bg-white/10"
            >
              <Layers className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              <span>Compare Merchant Plans</span>
            </button>
          </div>
        </div>

        {/* 4 Financial Guarantees Strip */}
        <div className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4.5 backdrop-blur-md transition hover:border-white/20">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
              <span>Advance Deposit</span>
            </div>
            <div className="mt-1.5 text-2xl font-extrabold text-white">৳0</div>
            <div className="text-[11px] text-slate-400">Pay strictly per shipment</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4.5 backdrop-blur-md transition hover:border-white/20">
            <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400">
              <Clock className="h-4 w-4" />
              <span>COD Payout Cycle</span>
            </div>
            <div className="mt-1.5 text-2xl font-extrabold text-white">Next Morning</div>
            <div className="text-[11px] text-slate-400">10:00 AM automated bKash/Bank</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4.5 backdrop-blur-md transition hover:border-white/20">
            <div className="flex items-center gap-2 text-xs font-semibold text-primary">
              <BadgePercent className="h-4 w-4" />
              <span>Fuel Surcharge</span>
            </div>
            <div className="mt-1.5 text-2xl font-extrabold text-white">0%</div>
            <div className="text-[11px] text-slate-400">Zero unannounced fee hikes</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4.5 backdrop-blur-md transition hover:border-white/20">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
              <TrendingUp className="h-4 w-4" />
              <span>Volume Discount</span>
            </div>
            <div className="mt-1.5 text-2xl font-extrabold text-white">Up to 25% Off</div>
            <div className="text-[11px] text-slate-400">Auto-applies as you scale</div>
          </div>
        </div>
      </div>
    </section>
  );
}
