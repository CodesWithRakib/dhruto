"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { Link } from "@/lib/navigation";
import type { ZoneOption } from "./calculator-destination-picker";

interface CalculatorReceiptSlipProps {
  selectedZone: ZoneOption;
  baseDeliveryFee: number;
  extraKg: number;
  extraWeightFee: number;
  codFee: number;
  isFragileBox: boolean;
  packagingFee: number;
  totalDeductions: number;
  netMerchantPayout: number;
  ctaHref: string;
  ctaLabel?: string;
  ctaSubtext?: string;
}

export function CalculatorReceiptSlip({
  selectedZone,
  baseDeliveryFee,
  extraKg,
  extraWeightFee,
  codFee,
  isFragileBox,
  packagingFee,
  totalDeductions,
  netMerchantPayout,
  ctaHref,
  ctaLabel,
  ctaSubtext,
}: CalculatorReceiptSlipProps) {
  const t = useTranslations("Calculator");

  return (
    <div className="prc-receipt rounded-3xl border border-border/80 bg-surface-elevated/95 p-6 shadow-xl backdrop-blur-md">
      {/* Thermal Receipt Barcode & Header */}
      <div className="text-center">
        <div className="tracking-[0.25em] text-[10px] text-muted-foreground select-none">
          |||||||| | |||||||||| | ||||||
        </div>
        <div className="mt-1 font-mono text-[11px] tracking-wider text-muted-foreground">
          {t("slipBarcode")}
        </div>
        <div className="mt-3 text-lg font-bold uppercase tracking-tight text-foreground">
          {t("slipTitle")}
        </div>
        <div className="text-xs text-muted-foreground">
          {t("slipSubtitle")}
        </div>
      </div>

      {/* Itemized Charge Rows */}
      <div className="mt-6 space-y-1">
        <div className="prc-receipt-row">
          <span className="text-muted-foreground">{t("destinationZone")}</span>
          <span className="font-bold text-foreground">{selectedZone.name}</span>
        </div>
        <div className="prc-receipt-row">
          <span className="text-muted-foreground">{t("transitSla")}</span>
          <span className="text-primary font-medium">{selectedZone.sla}</span>
        </div>
        <div className="prc-receipt-row">
          <span className="text-muted-foreground">{t("baseFreight")}</span>
          <span className="font-mono text-foreground">৳{baseDeliveryFee}</span>
        </div>
        <div className="prc-receipt-row">
          <span className="text-muted-foreground">{t("extraWeight", { kg: extraKg })}</span>
          <span className="font-mono text-foreground">৳{extraWeightFee}</span>
        </div>
        <div className="prc-receipt-row">
          <span className="text-muted-foreground">{t("codCollectionFee")}</span>
          <span className="font-mono text-foreground">৳{codFee}</span>
        </div>
        {isFragileBox && (
          <div className="prc-receipt-row">
            <span className="text-muted-foreground">{t("packagingBubble")}</span>
            <span className="font-mono text-foreground">৳{packagingFee}</span>
          </div>
        )}
        <div className="prc-receipt-row text-emerald-500 font-medium">
          <span>{t("fuelSurcharge")}</span>
          <span className="font-mono font-bold">{t("zeroFee")}</span>
        </div>
      </div>

      {/* Total Delivery Fee */}
      <div className="mt-5 border-t border-dashed border-border/80 pt-4 flex items-center justify-between text-sm font-bold">
        <span className="text-muted-foreground">{t("totalLogisticsFee")}</span>
        <span className="font-mono text-primary text-base">৳{totalDeductions}</span>
      </div>

      {/* Net Merchant Settlement Box */}
      <div className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
        <div className="flex items-center justify-between">
          <div className="text-caption font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            {t("netMerchantPayout")}
          </div>
          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-300">
            {t("escrowReconciled")}
          </span>
        </div>
        <div className="mt-2 text-3xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono">
          ৳{netMerchantPayout.toLocaleString()}
        </div>
        <div className="mt-1 text-[11px] text-emerald-700/80 dark:text-emerald-300/80">
          {t("disbursementSchedule")}
        </div>
      </div>

      {/* Action Button */}
      <div className="mt-6">
        <Link
          href={ctaHref}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary-hover hover:scale-[1.02] active:scale-[0.98]"
        >
          <span>{ctaLabel || t("ctaLabel")}</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
        <div className="mt-2.5 text-center text-[11px] text-muted-foreground">
          {ctaSubtext || t("ctaSubtext")}
        </div>
      </div>
    </div>
  );
}
