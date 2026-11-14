"use client";

import React from "react";
import { Link } from "@/lib/navigation";
import {
  ArrowRight,
  Box,
  Calculator,
  Clock,
  MapPin,
  Minus,
  Plus,
  Scale,
} from "lucide-react";
import { DistrictSelect, ThanaSelect } from "@/components/location/district-thana-picker";

interface ZoneOption {
  id: string;
  name: string;
  sla: string;
  baseRate: number;
  perKg: number;
  highlight: string;
}

const ZONES: ZoneOption[] = [
  {
    id: "dhaka",
    name: "Inside Dhaka Metro",
    sla: "12 to 24 Hours",
    baseRate: 60,
    perKg: 15,
    highlight: "Same-Day & Express Corridors",
  },
  {
    id: "suburbs",
    name: "Greater Dhaka Suburbs",
    sla: "24 to 36 Hours",
    baseRate: 100,
    perKg: 20,
    highlight: "Gazipur, Savar, Narayanganj",
  },
  {
    id: "divisional",
    name: "Divisional Capitals",
    sla: "24 to 48 Hours",
    baseRate: 130,
    perKg: 25,
    highlight: "Chattogram, Sylhet, Rajshahi, etc.",
  },
  {
    id: "remote",
    name: "Nationwide 495+ Thanas",
    sla: "48 to 72 Hours",
    baseRate: 150,
    perKg: 25,
    highlight: "Doorstep delivery to all Upazilas",
  },
];

export interface PricingCalculatorCockpitProps {
  ctaHref?: string;
  ctaLabel?: string;
  ctaSubtext?: string;
  title?: string;
  subtitle?: string;
  compact?: boolean;
  headingTag?: "h1" | "h2";
}

export function PricingCalculatorCockpit({
  ctaHref = "/register",
  ctaLabel = "Book This Delivery Rate",
  ctaSubtext = "Free merchant sign-up • No credit card or deposit needed",
  title = "Real-Time Delivery Cost & Escrow Simulator",
  subtitle = "Adjust destination, package weight, and cash-on-delivery amounts. Watch your itemized thermal receipt and net bank payout update instantaneously.",
  compact = false,
  headingTag = "h1",
}: PricingCalculatorCockpitProps = {}) {
  const [selectedZoneId, setSelectedZoneId] = React.useState<string>("dhaka");
  const [calcDistrict, setCalcDistrict] = React.useState<string>("Dhaka");
  const [calcThana, setCalcThana] = React.useState<string>("");
  const [weightKg, setWeightKg] = React.useState<number>(1.0);
  const [codAmount, setCodAmount] = React.useState<number>(3500);
  const [isFragileBox, setIsFragileBox] = React.useState<boolean>(false);

  // Sync selectedZoneId whenever district or thana changes
  React.useEffect(() => {
    if (!calcDistrict) return;
    const dNorm = calcDistrict.trim().toLowerCase();
    const SUBURB_DISTRICTS = ["gazipur", "narayanganj", "munshiganj", "manikganj", "narsingdi"];
    const DIVISIONAL_DISTRICTS = ["chattogram", "sylhet", "rajshahi", "khulna", "barishal", "rangpur", "mymensingh"];

    if (dNorm === "dhaka") {
      const tNorm = calcThana.trim().toLowerCase();
      if (["savar", "dhamrai", "keraniganj", "nawabganj", "dohar"].includes(tNorm)) {
        setSelectedZoneId("suburbs");
      } else {
        setSelectedZoneId("dhaka");
      }
    } else if (SUBURB_DISTRICTS.includes(dNorm)) {
      setSelectedZoneId("suburbs");
    } else if (DIVISIONAL_DISTRICTS.includes(dNorm)) {
      setSelectedZoneId("divisional");
    } else {
      setSelectedZoneId("remote");
    }
  }, [calcDistrict, calcThana]);

  const selectedZone = ZONES.find((z) => z.id === selectedZoneId) ?? ZONES[0]!;

  // Extra weight calculation (weight above 1kg)
  const extraKg = Math.max(0, Math.ceil(weightKg - 1));
  const extraWeightFee = extraKg * selectedZone.perKg;
  const baseDeliveryFee = selectedZone.baseRate;
  const packagingFee = isFragileBox ? 20 : 0;
  const codFee = codAmount > 0 ? Math.round(codAmount * 0.01) : 0;
  const totalDeductions = baseDeliveryFee + extraWeightFee + packagingFee + codFee;
  const netMerchantPayout = Math.max(0, codAmount - totalDeductions);

  return (
    <section id="calculator-cockpit" className={`relative scroll-mt-24 ${compact ? "py-6" : "py-24"}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
            <Calculator className="h-3.5 w-3.5" aria-hidden="true" />
            <span>INTERACTIVE FREIGHT & ESCROW COCKPIT</span>
          </div>
          {headingTag === "h2" ? (
            <h2 className={`mt-4 font-extrabold tracking-tight text-foreground ${compact ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl"}`}>
              {title}
            </h2>
          ) : (
            <h1 className={`mt-4 font-extrabold tracking-tight text-foreground ${compact ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl"}`}>
              {title}
            </h1>
          )}
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            {subtitle}
          </p>
        </div>

        {/* Cockpit Grid */}
        <div className="mt-16 grid items-start gap-8 lg:grid-cols-12">
          {/* Left Controls Card (7 cols) */}
          <div className="rounded-3xl bg-surface-elevated p-6 sm:p-8 lg:col-span-7">
            {/* 1. Destination Zone Selection */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-3">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  1. Select Delivery Destination (64 Districts)
                </label>
                {calcDistrict && (
                  <span className="text-[11px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-md font-semibold self-start sm:self-auto">
                    Mapped: {selectedZone.name}
                  </span>
                )}
              </div>

              {/* Dynamic District & Thana Cascaded Picker */}
              <div className="mb-3.5 rounded-2xl bg-surface-muted/40 p-3 sm:p-3.5 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                  <MapPin className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  <span>Choose District & Thana for exact rate calculation:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <DistrictSelect
                    value={calcDistrict}
                    onChange={(d) => {
                      setCalcDistrict(d);
                      setCalcThana("");
                    }}
                    placeholder="Search district..."
                    className="h-9 text-xs bg-background/80"
                  />
                  <ThanaSelect
                    districtName={calcDistrict}
                    value={calcThana}
                    onChange={setCalcThana}
                    placeholder="Search thana..."
                    className="h-9 text-xs bg-background/80"
                  />
                </div>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2">
                {ZONES.map((zone) => {
                  const isSelected = selectedZoneId === zone.id;
                  return (
                    <button
                      key={zone.id}
                      type="button"
                      onClick={() => setSelectedZoneId(zone.id)}
                      className={`relative flex flex-col items-start rounded-2xl p-4 text-left transition-all duration-200 ${
                        isSelected
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "bg-surface-muted/60 text-foreground hover:bg-surface-muted"
                      }`}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className={`text-sm font-bold ${isSelected ? "text-primary-foreground" : "text-foreground"}`}>
                          {zone.name}
                        </span>
                        <span
                          className={`rounded-lg px-2.5 py-0.5 font-mono text-xs font-bold ${
                            isSelected ? "bg-white/20 text-white" : "bg-surface-muted text-foreground"
                          }`}
                        >
                          ৳{zone.baseRate}
                        </span>
                      </div>
                      <div className={`mt-2 flex items-center gap-1.5 text-xs ${isSelected ? "text-primary-foreground/90" : "text-muted-foreground"}`}>
                        <Clock className="h-3.5 w-3.5" />
                        <span>{zone.sla}</span>
                      </div>
                      <div className={`mt-1 text-[11px] ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground/80"}`}>
                        {zone.highlight}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Parcel Billable Weight Slider */}
            <div className="mt-8 pt-6 border-t border-surface-muted">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    2. Parcel Billable Weight
                  </label>
                  <p className="text-xs text-muted-foreground">Base rate covers up to 1.0 kg</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setWeightKg((w) => Math.max(0.5, Number((w - 0.5).toFixed(1))))}
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface-muted/80 text-foreground transition hover:bg-surface-muted"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <div className="rounded-xl bg-primary/10 px-3 py-1 font-mono text-sm font-bold text-primary">
                    {weightKg.toFixed(1)} kg
                  </div>
                  <button
                    type="button"
                    onClick={() => setWeightKg((w) => Math.min(10.0, Number((w + 0.5).toFixed(1))))}
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface-muted/80 text-foreground transition hover:bg-surface-muted"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-4">
                <input
                  type="range"
                  min="0.5"
                  max="10.0"
                  step="0.5"
                  value={weightKg}
                  onChange={(e) => setWeightKg(parseFloat(e.target.value))}
                  className="prc-range-slider"
                />
                <div className="mt-2 flex justify-between text-[11px] font-mono text-muted-foreground">
                  <span>0.5 kg</span>
                  <span>2.5 kg</span>
                  <span>5.0 kg</span>
                  <span>7.5 kg</span>
                  <span>10.0 kg</span>
                </div>
              </div>

              {extraKg > 0 && (
                <div className="mt-3 flex items-center gap-2 rounded-2xl bg-primary/10 px-3.5 py-2 text-xs text-foreground">
                  <Scale className="h-3.5 w-3.5 text-primary" />
                  <span>
                    +{extraKg} kg over 1kg @ ৳{selectedZone.perKg}/kg ={" "}
                    <strong className="text-primary font-bold">৳{extraWeightFee} extra weight fee</strong>
                  </span>
                </div>
              )}
            </div>

            {/* 3. Cash-on-Delivery (COD) Amount Slider */}
            <div className="mt-8 pt-6 border-t border-surface-muted">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    3. Cash on Delivery (COD) Amount
                  </label>
                  <p className="text-xs text-muted-foreground">1.0% cash collection & counting fee</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCodAmount((a) => Math.max(0, a - 500))}
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface-muted/80 text-foreground transition hover:bg-surface-muted"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <div className="rounded-xl bg-emerald-500/10 px-3 py-1 font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    ৳{codAmount.toLocaleString()}
                  </div>
                  <button
                    type="button"
                    onClick={() => setCodAmount((a) => Math.min(25000, a + 500))}
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface-muted/80 text-foreground transition hover:bg-surface-muted"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-4">
                <input
                  type="range"
                  min="0"
                  max="25000"
                  step="500"
                  value={codAmount}
                  onChange={(e) => setCodAmount(parseInt(e.target.value, 10))}
                  className="prc-range-slider"
                />
                <div className="mt-2 flex justify-between text-[11px] font-mono text-muted-foreground">
                  <span>৳0 (Prepaid)</span>
                  <span>৳5,000</span>
                  <span>৳10,000</span>
                  <span>৳15,000</span>
                  <span>৳25,000</span>
                </div>
              </div>
            </div>

            {/* 4. Packaging & Fragile Add-on Option */}
            <div className="mt-8 pt-6 border-t border-surface-muted">
              <label className="flex items-center justify-between rounded-2xl bg-surface-muted/60 p-4 cursor-pointer transition hover:bg-surface-muted">
                <div className="flex items-center gap-3">
                  <Box className="h-5 w-5 text-primary" />
                  <div>
                    <div className="text-sm font-bold text-foreground">
                      Reinforced Padded Box / Bubble Security
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Extra protection for fragile electronics or glassware
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-semibold text-foreground">+৳20</span>
                  <input
                    type="checkbox"
                    checked={isFragileBox}
                    onChange={(e) => setIsFragileBox(e.target.checked)}
                    className="h-4 w-4 rounded text-primary focus:ring-primary"
                  />
                </div>
              </label>
            </div>
          </div>

          {/* Right Live Digital Settlement Slip (5 cols) */}
          <div className="lg:col-span-5">
            <div className="prc-receipt">
              {/* Thermal Receipt Barcode & Header */}
              <div className="text-center">
                <div className="tracking-[0.25em] text-[10px] text-muted-foreground">
                  |||||||| | |||||||||| | ||||||
                </div>
                <div className="mt-1 font-mono text-[11px] tracking-wider text-muted-foreground">
                  *DHR-SIMULATOR-2026*
                </div>
                <div className="mt-3 text-lg font-bold uppercase tracking-tight text-foreground">
                  Dhruto Settlement Slip
                </div>
                <div className="text-xs text-muted-foreground">
                  Digital Escrow Breakdown
                </div>
              </div>

              {/* Itemized Charge Rows */}
              <div className="mt-6 space-y-1">
                <div className="prc-receipt-row">
                  <span className="text-muted-foreground">Destination Zone</span>
                  <span className="font-bold text-foreground">{selectedZone.name}</span>
                </div>
                <div className="prc-receipt-row">
                  <span className="text-muted-foreground">Transit SLA</span>
                  <span className="text-primary font-medium">{selectedZone.sla}</span>
                </div>
                <div className="prc-receipt-row">
                  <span className="text-muted-foreground">Base Freight (Up to 1kg)</span>
                  <span className="font-mono text-foreground">৳{baseDeliveryFee}</span>
                </div>
                <div className="prc-receipt-row">
                  <span className="text-muted-foreground">Extra Weight ({extraKg}kg)</span>
                  <span className="font-mono text-foreground">৳{extraWeightFee}</span>
                </div>
                <div className="prc-receipt-row">
                  <span className="text-muted-foreground">COD Collection Fee (1%)</span>
                  <span className="font-mono text-foreground">৳{codFee}</span>
                </div>
                {isFragileBox && (
                  <div className="prc-receipt-row">
                    <span className="text-muted-foreground">Packaging & Bubble</span>
                    <span className="font-mono text-foreground">৳{packagingFee}</span>
                  </div>
                )}
                <div className="prc-receipt-row text-emerald-500">
                  <span>Fuel & Unannounced Surcharge</span>
                  <span className="font-mono font-bold">৳0.00 (Zero)</span>
                </div>
              </div>

              {/* Total Delivery Fee */}
              <div className="mt-5 border-t border-dashed border-border/80 pt-4 flex items-center justify-between text-sm font-bold">
                <span className="text-muted-foreground">Total Logistics Fee:</span>
                <span className="font-mono text-primary text-base">৳{totalDeductions}</span>
              </div>

              {/* Net Merchant Settlement Box */}
              <div className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Net Merchant Payout
                  </div>
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-300">
                    ESCROW RECONCILED
                  </span>
                </div>
                <div className="mt-2 text-3xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono">
                  ৳{netMerchantPayout.toLocaleString()}
                </div>
                <div className="mt-1 text-[11px] text-emerald-700/80 dark:text-emerald-300/80">
                  Disbursed tomorrow by 10:00 AM via bKash, Nagad, or BEFTN Bank Transfer
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-6">
                <Link
                  href={ctaHref}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary-hover hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span>{ctaLabel}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <div className="mt-2.5 text-center text-[11px] text-muted-foreground">
                  {ctaSubtext}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
