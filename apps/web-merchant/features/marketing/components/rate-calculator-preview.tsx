"use client";

import React, { useState } from "react";
import { Calculator, ArrowRight, CheckCircle2, Sparkles, Zap } from "lucide-react";
import { Button, Input } from "@dhruto/ui";
import { Link } from "@/lib/navigation";

interface ZoneConfig {
  id: string;
  label: string;
  sublabel: string;
  basePrice: number;
  perKgExtra: number;
  sla: string;
}

const ZONES: ZoneConfig[] = [
  {
    id: "inside_dhaka",
    label: "Inside Dhaka",
    sublabel: "Metro Express",
    basePrice: 60,
    perKgExtra: 15,
    sla: "12-24 Hours",
  },
  {
    id: "suburbs",
    label: "Dhaka Suburbs",
    sublabel: "Savar, Gazipur, Keraniganj",
    basePrice: 100,
    perKgExtra: 20,
    sla: "24-36 Hours",
  },
  {
    id: "outside_dhaka",
    label: "Outside Dhaka",
    sublabel: "All 64 Districts",
    basePrice: 130,
    perKgExtra: 25,
    sla: "36-48 Hours",
  },
];

const WEIGHT_OPTIONS = [
  { label: "0.5 kg", value: 0.5 },
  { label: "1.0 kg", value: 1.0 },
  { label: "2.0 kg", value: 2.0 },
  { label: "3.0 kg", value: 3.0 },
  { label: "5.0 kg", value: 5.0 },
];

export function RateCalculatorPreview() {
  const [selectedZone, setSelectedZone] = useState<ZoneConfig>(ZONES[0]!);
  const [weight, setWeight] = useState(1.0);
  const [codAmount, setCodAmount] = useState(2500);

  // Calculations
  const extraWeight = Math.max(0, weight - 1.0);
  const extraWeightCharge = Math.ceil(extraWeight) * selectedZone.perKgExtra;
  const deliveryCharge = selectedZone.basePrice + extraWeightCharge;
  const codFee = Math.round(codAmount * 0.01); // 1% COD fee
  const totalDeduction = deliveryCharge + codFee;
  const netSettlement = Math.max(0, codAmount - totalDeduction);

  return (
    <section id="calculator" className="relative py-16 sm:py-24 overflow-hidden">
      {/* Background ambient lighting */}
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[700px] rounded-full bg-primary/8 blur-[140px] -z-10"
        aria-hidden="true"
      />

      <div className="dhruto-container relative z-10">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center space-y-3 mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary">
            <Calculator className="h-3.5 w-3.5" />
            <span>Transparent Pricing Matrix</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight text-balance">
            Instant Delivery Cost & Payout Estimator
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground text-pretty max-w-xl mx-auto leading-relaxed">
            No hidden charges, no surprise fees. Calculate your exact courier deduction and next-day net bank disbursement.
          </p>
        </div>

        {/* Calculator Widget Box */}
        <div className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-border bg-surface shadow-xl">
          <div className="grid lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-border">
            {/* Left Controls Column (7 cols) */}
            <div className="p-6 sm:p-8 lg:col-span-7 space-y-6">
              {/* Step 1: Destination Zone */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  1. Delivery Destination
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {ZONES.map((zone) => {
                    const isSelected = selectedZone.id === zone.id;
                    return (
                      <button
                        key={zone.id}
                        type="button"
                        onClick={() => setSelectedZone(zone)}
                        className={`flex flex-col text-left p-3.5 rounded-2xl border transition-all duration-200 ${
                          isSelected
                            ? "border-primary bg-primary/10 shadow-sm"
                            : "border-border/60 bg-surface/50 hover:bg-surface-muted/60 hover:border-border"
                        }`}
                      >
                        <span className="font-bold text-sm text-foreground">{zone.label}</span>
                        <span className="text-[11px] text-muted-foreground mt-0.5">{zone.sublabel}</span>
                        <span className="text-xs font-mono font-bold text-primary mt-2">
                          ৳{zone.basePrice} base
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Weight Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    2. Parcel Weight
                  </label>
                  <span className="text-xs font-mono font-bold text-primary">{weight} kg</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {WEIGHT_OPTIONS.map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setWeight(opt.value)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        weight === opt.value
                          ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                          : "border border-border/60 bg-surface/50 text-foreground hover:bg-surface-muted"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 3: Cash on Delivery Amount */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    3. Cash on Delivery (COD) Amount
                  </label>
                  <span className="text-xs text-muted-foreground">1% flat COD fee</span>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-muted-foreground text-sm">
                    ৳
                  </span>
                  <Input
                    type="number"
                    min={0}
                    step={100}
                    value={codAmount}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCodAmount(Number(e.target.value) || 0)
                    }
                    className="pl-9 h-13 rounded-2xl font-mono text-base font-bold bg-surface/70 border-border/60"
                  />
                </div>
              </div>

              {/* SLA & Guarantee Note */}
              <div className="flex items-center gap-3 p-3 rounded-2xl border border-primary/20 bg-primary/5 text-xs text-foreground/90 font-medium">
                <Zap className="h-4 w-4 text-primary shrink-0" />
                <span>
                  Expected Delivery SLA: <strong className="text-primary">{selectedZone.sla}</strong> with guaranteed doorstep delivery.
                </span>
              </div>
            </div>

            {/* Right Summary Column (5 cols) */}
            <div className="p-6 sm:p-8 lg:col-span-5 bg-surface-muted/50 flex flex-col justify-between space-y-6">
              <div>
                <div className="flex items-center justify-between border-b border-border/40 pb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Cost Breakdown
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-0.5 text-[11px] font-bold text-success-soft-foreground">
                    <CheckCircle2 className="h-3 w-3" />
                    Verified Rates
                  </span>
                </div>

                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Base Shipping:</span>
                    <span className="font-mono font-semibold text-foreground">৳{selectedZone.basePrice}</span>
                  </div>

                  {extraWeightCharge > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Extra Weight ({extraWeight.toFixed(1)}kg):</span>
                      <span className="font-mono font-semibold text-foreground">+৳{extraWeightCharge}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-muted-foreground">
                    <span>COD Fee (1%):</span>
                    <span className="font-mono font-semibold text-foreground">+৳{codFee}</span>
                  </div>

                  <div className="flex justify-between text-muted-foreground">
                    <span>RTO & Return Protection:</span>
                    <span className="font-mono font-semibold text-emerald-400">FREE</span>
                  </div>

                  <div className="pt-3 border-t border-border/40 flex justify-between font-bold text-foreground">
                    <span>Total Courier Fee:</span>
                    <span className="font-mono text-base text-primary">৳{totalDeduction}</span>
                  </div>
                </div>

                {/* Net Merchant Payout Highlight Card */}
                <div className="mt-6 p-4 rounded-2xl border border-primary/30 bg-primary/10 text-center space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Next-Day Net Bank Settlement</p>
                  <p className="text-3xl font-extrabold font-mono text-primary">৳{netSettlement.toLocaleString()}</p>
                  <p className="text-[11px] text-muted-foreground">Automated transfer via BEFTN / bKash / Nagad</p>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <Link href="/register" className="block">
                  <Button size="lg" className="w-full h-13 rounded-2xl font-bold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 transition-all inline-flex items-center justify-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    <span>Ship at This Rate</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <p className="mt-2 text-center text-[11px] text-muted-foreground">
                  Free registration • No advance deposit required
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
