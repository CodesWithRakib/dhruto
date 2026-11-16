"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Box, Minus, Plus, Scale } from "lucide-react";
import type { ZoneOption } from "./calculator-destination-picker";

interface CalculatorParametersCardProps {
  weightKg: number;
  onWeightChange: (weight: number) => void;
  codAmount: number;
  onCodChange: (cod: number) => void;
  isFragileBox: boolean;
  onFragileBoxChange: (fragile: boolean) => void;
  extraKg: number;
  extraWeightFee: number;
  selectedZone: ZoneOption;
}

export function CalculatorParametersCard({
  weightKg,
  onWeightChange,
  codAmount,
  onCodChange,
  isFragileBox,
  onFragileBoxChange,
  extraKg,
  extraWeightFee,
  selectedZone,
}: CalculatorParametersCardProps) {
  const t = useTranslations("Calculator");

  return (
    <>
      {/* 2. Parcel Billable Weight Slider */}
      <div className="mt-8 pt-6 border-t border-border/60">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-caption font-bold uppercase tracking-wider text-muted-foreground">
              {t("stepWeight")}
            </label>
            <p className="text-caption text-muted-foreground">{t("baseCovers")}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onWeightChange(Math.max(0.5, Number((weightKg - 0.5).toFixed(1))))}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface-muted/80 text-foreground transition hover:bg-surface-muted"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <div className="rounded-xl bg-primary/10 border border-primary/20 px-3 py-1 font-mono text-sm font-bold text-primary">
              {weightKg.toFixed(1)} kg
            </div>
            <button
              type="button"
              onClick={() => onWeightChange(Math.min(10.0, Number((weightKg + 0.5).toFixed(1))))}
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
            onChange={(e) => onWeightChange(parseFloat(e.target.value))}
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
          <div className="mt-3 flex items-center gap-2 rounded-2xl bg-primary/10 border border-primary/20 px-3.5 py-2 text-xs text-foreground">
            <Scale className="h-3.5 w-3.5 text-primary" />
            <span>
              {t("extraWeightNote", { extraKg, rate: selectedZone.perKg, fee: extraWeightFee })}
            </span>
          </div>
        )}
      </div>

      {/* 3. Cash-on-Delivery (COD) Amount Slider */}
      <div className="mt-8 pt-6 border-t border-border/60">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-caption font-bold uppercase tracking-wider text-muted-foreground">
              {t("stepCod")}
            </label>
            <p className="text-caption text-muted-foreground">{t("codNote")}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onCodChange(Math.max(0, codAmount - 500))}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface-muted/80 text-foreground transition hover:bg-surface-muted"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
              ৳{codAmount.toLocaleString()}
            </div>
            <button
              type="button"
              onClick={() => onCodChange(Math.min(25000, codAmount + 500))}
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
            onChange={(e) => onCodChange(parseInt(e.target.value, 10))}
            className="prc-range-slider"
          />
          <div className="mt-2 flex justify-between text-[11px] font-mono text-muted-foreground">
            <span>{t("prepaid")}</span>
            <span>৳5,000</span>
            <span>৳10,000</span>
            <span>৳15,000</span>
            <span>৳25,000</span>
          </div>
        </div>
      </div>

      {/* 4. Packaging & Fragile Add-on Option */}
      <div className="mt-8 pt-6 border-t border-border/60">
        <label className="flex items-center justify-between rounded-2xl border border-border/70 bg-surface-muted/60 p-4 cursor-pointer transition hover:bg-surface-muted">
          <div className="flex items-center gap-3">
            <Box className="h-5 w-5 text-primary" />
            <div>
              <div className="text-sm font-bold text-foreground">
                {t("fragileTitle")}
              </div>
              <div className="text-caption text-muted-foreground">
                {t("fragileDesc")}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-semibold text-foreground">+৳20</span>
            <input
              type="checkbox"
              checked={isFragileBox}
              onChange={(e) => onFragileBoxChange(e.target.checked)}
              className="h-4 w-4 rounded text-primary focus:ring-primary"
            />
          </div>
        </label>
      </div>
    </>
  );
}
