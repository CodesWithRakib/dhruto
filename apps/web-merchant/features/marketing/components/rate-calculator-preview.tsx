"use client";

import React, { useState } from "react";
import {
  Calculator,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Zap,
  ShieldCheck,
  Building2,
  Wallet,
  TrendingUp,
} from "lucide-react";
import { Link } from "@/lib/navigation";

interface ZoneConfig {
  id: string;
  label: string;
  sublabel: string;
  basePrice: number;
  perKgExtra: number;
  sla: string;
  tag: string;
}

const ZONES: ZoneConfig[] = [
  {
    id: "inside_dhaka",
    label: "Inside Dhaka",
    sublabel: "Metro Express",
    basePrice: 60,
    perKgExtra: 15,
    sla: "12-24 Hours",
    tag: "Same Day / Next Day",
  },
  {
    id: "suburbs",
    label: "Dhaka Suburbs",
    sublabel: "Savar, Gazipur, Keraniganj",
    basePrice: 100,
    perKgExtra: 20,
    sla: "24-36 Hours",
    tag: "Direct Line-Haul",
  },
  {
    id: "outside_dhaka",
    label: "Outside Dhaka",
    sublabel: "All 64 Districts Nationwide",
    basePrice: 130,
    perKgExtra: 25,
    sla: "36-48 Hours",
    tag: "Doorstep Delivery",
  },
];

const WEIGHT_PRESETS = [0.5, 1.0, 2.0, 3.0, 5.0];
const COD_PRESETS = [1000, 2500, 5000, 10000, 20000];

export function RateCalculatorPreview() {
  const [selectedZone, setSelectedZone] = useState<ZoneConfig>(ZONES[0]!);
  const [weight, setWeight] = useState(1.0);
  const [codAmount, setCodAmount] = useState(2500);

  // Math calculations
  const extraWeight = Math.max(0, weight - 1.0);
  const extraWeightCharge = Math.ceil(extraWeight) * selectedZone.perKgExtra;
  const deliveryCharge = selectedZone.basePrice + extraWeightCharge;
  const codFee = Math.round(codAmount * 0.01); // 1% COD fee
  const totalDeduction = deliveryCharge + codFee;
  const netSettlement = Math.max(0, codAmount - totalDeduction);
  const payoutRatio = codAmount > 0 ? ((netSettlement / codAmount) * 100).toFixed(1) : "100.0";

  return (
    <section id="calculator" className="relative py-20 sm:py-28 overflow-hidden bg-[var(--soft-bg)]">
      {/* Background radial ambient glow */}
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[800px] rounded-full bg-[radial-gradient(closest-side,rgba(var(--glow-rgb),0.12),transparent)] -z-10"
        aria-hidden="true"
      />

      <div className="dhruto-container relative z-10">
        {/* Section Header with Editorial Serif highlight */}
        <div className="mx-auto max-w-2xl text-center space-y-3 mb-12 sm:mb-16">
          <span className="pill">
            <Calculator className="h-3.5 w-3.5 inline mr-1" />
            Transparent Pricing Matrix
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-[var(--text)] text-balance">
            Instant Delivery Cost &amp; <em className="text-[var(--acc2)] italic font-normal">Payout Estimator</em>
          </h2>
          <p className="text-base sm:text-lg text-[var(--muted-text)] leading-relaxed max-w-xl mx-auto text-pretty">
            Zero hidden deductions, zero advance deposits. Calculate your exact courier delivery fee and next-day net bank disbursement.
          </p>
        </div>

        {/* Calculator Widget Box */}
        <div className="mx-auto max-w-5xl rounded-3xl bg-[var(--bg)] overflow-hidden">
          <div className="grid lg:grid-cols-12">
            {/* Left Controls Column (7 cols) */}
            <div className="p-6 sm:p-10 lg:col-span-7 space-y-8">
              {/* Step 1: Destination Zone */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted-text)]">
                    1. Destination Zone
                  </label>
                  <span className="text-xs font-medium text-[var(--acc2)] flex items-center gap-1">
                    <Zap className="h-3.5 w-3.5" />
                    {selectedZone.sla} SLA
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {ZONES.map((zone) => {
                    const isSelected = selectedZone.id === zone.id;
                    return (
                      <button
                        key={zone.id}
                        type="button"
                        onClick={() => setSelectedZone(zone)}
                        className={`flex flex-col text-left p-4 rounded-2xl transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? "bg-[var(--tint)]"
                            : "bg-[var(--soft)]/50 hover:bg-[var(--soft)]"
                        }`}
                      >
                        <span className="font-bold text-sm text-[var(--text)]">{zone.label}</span>
                        <span className="text-[11px] text-[var(--muted-text)] mt-0.5 line-clamp-1">
                          {zone.sublabel}
                        </span>
                        <div className="mt-3 pt-2 flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-[var(--text)]">
                            ৳{zone.basePrice}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg)] text-[var(--muted-text)] font-medium">
                            1st kg
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Weight Slider + Presets */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted-text)]">
                    2. Parcel Weight
                  </label>
                  <span className="text-sm font-mono font-extrabold text-[var(--text)] px-3 py-1 rounded-full bg-[var(--tint2)] text-[var(--tint-ink)]">
                    {weight.toFixed(1)} kg
                  </span>
                </div>

                {/* Range Slider */}
                <input
                  type="range"
                  min="0.5"
                  max="10"
                  step="0.5"
                  value={weight}
                  onChange={(e) => setWeight(parseFloat(e.target.value))}
                  className="w-full h-2 rounded-lg bg-[var(--line)] accent-[var(--acc2)] cursor-pointer"
                />

                {/* Presets */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {WEIGHT_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setWeight(preset)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        weight === preset
                          ? "bg-[var(--dk)] text-white"
                          : "bg-[var(--soft)]/80 text-[var(--text)] hover:bg-[var(--soft)]"
                      }`}
                    >
                      {preset} kg
                    </button>
                  ))}
                  {weight > 1.0 && (
                    <span className="ml-auto self-center text-xs text-[var(--muted-text)]">
                      +{extraWeight.toFixed(1)} kg (+৳{extraWeightCharge})
                    </span>
                  )}
                </div>
              </div>

              {/* Step 3: Cash on Delivery Amount */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted-text)]">
                    3. Cash on Delivery (COD) Amount
                  </label>
                  <span className="text-xs font-medium text-[var(--muted-text)]">
                    1% flat COD handling fee
                  </span>
                </div>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-[var(--muted-text)] text-lg">
                    ৳
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={codAmount}
                    onChange={(e) => setCodAmount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full pl-9 pr-4 py-3.5 rounded-2xl font-mono text-lg font-bold bg-[var(--soft)] text-[var(--text)] focus:outline-none focus:bg-[var(--bg)] transition-all"
                  />
                </div>

                {/* COD Quick Preset Chips */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {COD_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCodAmount(preset)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        codAmount === preset
                          ? "bg-[var(--dk)] text-white"
                          : "bg-[var(--soft)]/80 text-[var(--text)] hover:bg-[var(--soft)]"
                      }`}
                    >
                      ৳{preset.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Delivery SLA Guarantee Banner */}
              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-[var(--tint)]/50 text-xs text-[var(--tint-ink)] font-medium">
                <ShieldCheck className="h-4 w-4 text-[var(--ink)] shrink-0" />
                <span>
                  Guaranteed SLA: <strong className="font-semibold text-[var(--text)]">{selectedZone.sla}</strong> with 100% Doorstep OTP Verification &amp; Free Return Protection.
                </span>
              </div>
            </div>

            {/* Right Summary Column: High-Contrast Dark Card (5 cols) */}
            <div className="p-6 sm:p-10 lg:col-span-5 bg-[var(--dk)] text-white flex flex-col justify-between space-y-8">
              <div>
                <div className="flex items-center justify-between pb-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-white/80">
                    Net Settlement Breakdown
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-success/20 text-success px-3 py-1 text-xs font-semibold">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Verified Rates
                  </span>
                </div>

                {/* Net Payout Hero Value */}
                <div className="mt-6 p-5 rounded-2xl bg-white/5 text-center space-y-1.5 relative overflow-hidden">
                  <span className="text-xs text-white/80 font-medium uppercase tracking-wider block">
                    Next-Morning Bank / bKash Disbursement
                  </span>
                  <div className="text-4xl sm:text-5xl font-extrabold font-mono tracking-tight text-[var(--acc)]">
                    ৳{netSettlement.toLocaleString()}
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-1 text-xs text-white/80">
                    <TrendingUp className="h-3.5 w-3.5 text-success" />
                    <span>{payoutRatio}% Net Payout Ratio</span>
                  </div>
                </div>

                {/* Itemized Cost Breakdown Table */}
                <div className="mt-6 space-y-3 text-sm">
                  <div className="flex justify-between text-white/85">
                    <span>Base Delivery ({selectedZone.label}):</span>
                    <span className="font-mono font-medium text-white">৳{selectedZone.basePrice}</span>
                  </div>

                  {extraWeightCharge > 0 && (
                    <div className="flex justify-between text-white/85">
                      <span>Extra Weight ({extraWeight.toFixed(1)} kg):</span>
                      <span className="font-mono font-medium text-white">+৳{extraWeightCharge}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-white/85">
                    <span>COD Fee (1% of ৳{codAmount.toLocaleString()}):</span>
                    <span className="font-mono font-medium text-white">+৳{codFee}</span>
                  </div>

                  <div className="flex justify-between text-white/85">
                    <span>RTO &amp; Return Protection:</span>
                    <span className="font-mono font-semibold text-success">FREE (৳0)</span>
                  </div>

                  <div className="pt-3 flex justify-between font-bold text-white text-base">
                    <span>Total Courier Fee:</span>
                    <span className="font-mono text-[var(--acc)]">৳{totalDeduction}</span>
                  </div>
                </div>

                {/* Instant Disbursement Channels */}
                <div className="mt-6 pt-4 space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-white/50 block">
                    Supported Daily Payout Rails:
                  </span>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="px-2.5 py-1 rounded-lg bg-white/10 text-white/90 font-medium inline-flex items-center gap-1">
                      <Building2 className="h-3 w-3 text-[var(--acc)]" />
                      All Commercial Banks (BEFTN/NPSB)
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-white/10 text-white/90 font-medium inline-flex items-center gap-1">
                      <Wallet className="h-3 w-3 text-[var(--acc)]" />
                      bKash / Nagad Instant
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-4">
                <Link
                  href="/register"
                  className="btn-bl w-full py-4 text-center font-bold text-base inline-flex items-center justify-center gap-2 rounded-2xl hover:scale-[1.01] transition-transform"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Ship at This Rate</span>
                  <ArrowRight className="h-4 w-4 ar" />
                </Link>
                <p className="mt-3 text-center text-xs text-white/60">
                  Free merchant signup • Zero advance balance required
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
