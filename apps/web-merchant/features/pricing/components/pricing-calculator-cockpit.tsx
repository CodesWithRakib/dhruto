"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Calculator } from "lucide-react";
import {
  CalculatorDestinationPicker,
  type ZoneOption,
} from "./calculator/calculator-destination-picker";
import { CalculatorParametersCard } from "./calculator/calculator-parameters-card";
import { CalculatorReceiptSlip } from "./calculator/calculator-receipt-slip";
import { useParcelPricing } from "@/features/parcels/hooks/use-parcel-pricing";
import { useAppSelector } from "@/store/hooks";

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
  ctaLabel,
  ctaSubtext,
  title,
  subtitle,
  compact = false,
  headingTag = "h1",
}: PricingCalculatorCockpitProps = {}) {
  const t = useTranslations("Calculator");
  const displayTitle = title ?? t("title");
  const displaySubtitle = subtitle ?? t("subtitle");
  const displayCtaLabel = ctaLabel ?? t("ctaLabel");
  const displayCtaSubtext = ctaSubtext ?? t("ctaSubtext");

  const [selectedZoneId, setSelectedZoneId] = useState<string>("dhaka");
  const [calcDistrict, setCalcDistrict] = useState<string>("Dhaka");
  const [calcThana, setCalcThana] = useState<string>("");
  const [weightKg, setWeightKg] = useState<number>(1.0);
  const [codAmount, setCodAmount] = useState<number>(3500);
  const [isFragileBox, setIsFragileBox] = useState<boolean>(false);

  useEffect(() => {
    if (!calcDistrict) return;
    const dNorm = calcDistrict.trim().toLowerCase();
    const SUBURB_DISTRICTS = ["gazipur", "narayanganj", "munshiganj", "manikganj", "narsingdi"];
    const DIVISIONAL_DISTRICTS = [
      "chattogram",
      "sylhet",
      "rajshahi",
      "khulna",
      "barishal",
      "rangpur",
      "mymensingh",
    ];

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

  // Merchants/admins use the authenticated endpoint (higher per-user limit);
  // anonymous visitors and other roles get the public quote (same formula).
  const role = useAppSelector((state) => state.auth.user?.role);
  const canUseMerchantPricing = role === "MERCHANT" || role === "ADMIN";

  // Dynamic live rate calculation via authoritative API
  const { pricing } = useParcelPricing({
    usePublicQuote: !canUseMerchantPricing,
    district: calcDistrict,
    thana: calcThana,
    weight: weightKg,
    codAmount,
    enabled: Boolean(calcDistrict),
  });

  const extraKg = Math.max(0, Math.ceil(weightKg - 1));
  const baseDeliveryFee = pricing?.baseFee ?? selectedZone.baseRate;
  const extraWeightFee = pricing?.weightFee ?? extraKg * selectedZone.perKg;
  const packagingFee = isFragileBox ? 20 : 0;
  const codFee = pricing?.codFee ?? (codAmount > 0 ? Math.round(codAmount * 0.01) : 0);
  const totalDeductions =
    (pricing ? pricing.totalFee : baseDeliveryFee + extraWeightFee + codFee) + packagingFee;
  const netMerchantPayout = Math.max(0, codAmount - totalDeductions);

  return (
    <section
      id="calculator-cockpit"
      className={`relative scroll-mt-24 ${compact ? "py-4" : "py-16"}`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="mx-auto max-w-3xl text-center space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-caption font-semibold text-primary backdrop-blur-md">
            <Calculator className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t("eyebrow")}</span>
          </div>
          {headingTag === "h2" ? (
            <h2
              className={`font-bold tracking-tight text-foreground ${compact ? "text-display-xs sm:text-display-sm" : "text-display-sm sm:text-display-md"}`}
            >
              {displayTitle}
            </h2>
          ) : (
            <h1
              className={`font-bold tracking-tight text-foreground ${compact ? "text-display-xs sm:text-display-sm" : "text-display-sm sm:text-display-md"}`}
            >
              {displayTitle}
            </h1>
          )}
          <p className="mx-auto max-w-xl text-body-sm sm:text-body-md text-muted-foreground">
            {displaySubtitle}
          </p>
        </div>

        {/* Cockpit Grid */}
        <div className="mt-12 grid items-start gap-8 lg:grid-cols-12">
          {/* Left Controls Bento Card (7 cols) */}
          <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-surface-elevated/90 p-6 sm:p-8 shadow-xl backdrop-blur-md lg:col-span-7">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

            <CalculatorDestinationPicker
              zones={ZONES}
              selectedZoneId={selectedZoneId}
              onSelectZone={setSelectedZoneId}
              calcDistrict={calcDistrict}
              onDistrictChange={setCalcDistrict}
              calcThana={calcThana}
              onThanaChange={setCalcThana}
              selectedZone={selectedZone}
            />

            <CalculatorParametersCard
              weightKg={weightKg}
              onWeightChange={setWeightKg}
              codAmount={codAmount}
              onCodChange={setCodAmount}
              isFragileBox={isFragileBox}
              onFragileBoxChange={setIsFragileBox}
              extraKg={extraKg}
              extraWeightFee={extraWeightFee}
              selectedZone={selectedZone}
            />
          </div>

          {/* Right Live Digital Settlement Slip (5 cols) */}
          <div className="lg:col-span-5">
            <CalculatorReceiptSlip
              selectedZone={selectedZone}
              baseDeliveryFee={baseDeliveryFee}
              extraKg={extraKg}
              extraWeightFee={extraWeightFee}
              codFee={codFee}
              isFragileBox={isFragileBox}
              packagingFee={packagingFee}
              totalDeductions={totalDeductions}
              netMerchantPayout={netMerchantPayout}
              ctaHref={ctaHref}
              ctaLabel={displayCtaLabel}
              ctaSubtext={displayCtaSubtext}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
