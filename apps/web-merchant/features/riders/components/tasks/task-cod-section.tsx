"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Button, Input } from "@dhruto/ui";
import { DollarSign, FileText, CheckCircle2, AlertTriangle, Check } from "lucide-react";
import { useFormatters } from "@/lib/format";

interface TaskCodSectionProps {
  codAmount: number;
  collectedAmount: number | undefined;
  setCollectedAmount: (amount: number | undefined) => void;
  remarks: string;
  setRemarks: (remarks: string) => void;
  isCompleting: boolean;
  onComplete: (event: React.FormEvent) => void;
  onOpenFail: () => void;
}

export function TaskCodSection({
  codAmount,
  collectedAmount,
  setCollectedAmount,
  remarks,
  setRemarks,
  isCompleting,
  onComplete,
  onOpenFail,
}: TaskCodSectionProps) {
  const t = useTranslations("Rider");
  const { bdt } = useFormatters();

  const codMatches =
    codAmount === 0 ||
    (collectedAmount !== undefined && collectedAmount === codAmount);

  return (
    <form onSubmit={onComplete} className="space-y-4 pt-5">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-warning/15 text-warning-soft-foreground">
          <DollarSign className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <h3 className="text-sm font-extrabold text-foreground">
            {t("details.codSectionTitle")}
          </h3>
          <p className="text-xs text-muted-foreground">
            {codAmount > 0
              ? "Collect cash payment before handing over goods"
              : "No cash collection required for this prepaid package"}
          </p>
        </div>
      </div>

      {codAmount > 0 ? (
        <div className="space-y-2">
          <label
            htmlFor="cod-collected"
            className="text-xs font-bold text-foreground"
          >
            {t("details.codCollectedLabel")} *
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-base font-extrabold text-muted-foreground">
              ৳
            </span>
            <Input
              id="cod-collected"
              type="number"
              min={0}
              value={collectedAmount ?? ""}
              onChange={(event) =>
                setCollectedAmount(
                  event.target.value === "" ? undefined : Number(event.target.value),
                )
              }
              className="h-12 rounded-2xl bg-surface-muted/60 pl-8 font-mono text-lg font-black focus:bg-background"
              required
            />
          </div>

          {/* Quick tender amount buttons */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] font-medium text-muted-foreground">Quick set:</span>
            <button
              type="button"
              onClick={() => setCollectedAmount(codAmount)}
              className="rounded-full bg-primary/10 px-3 py-1 font-mono text-xs font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              Exact {bdt(codAmount)}
            </button>
            {[500, 1000, 2000, 5000]
              .filter((amt) => amt >= codAmount && amt !== codAmount)
              .slice(0, 3)
              .map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setCollectedAmount(amt)}
                  className="rounded-full bg-surface-muted/60 px-3 py-1 font-mono text-xs text-muted-foreground hover:bg-surface-muted hover:text-foreground transition-colors"
                >
                  ৳{amt}
                </button>
              ))}
          </div>
          <p
            className={`flex items-center gap-1.5 text-xs ${
              codMatches
                ? "text-success-soft-foreground font-semibold"
                : "text-warning-soft-foreground font-semibold"
            }`}
          >
            {codMatches ? (
              <>
                <Check className="h-3.5 w-3.5 text-success" />
                <span>Exact amount matches COD due.</span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                <span>{t("details.codMustMatch")} ({bdt(codAmount)})</span>
              </>
            )}
          </p>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <label
          htmlFor="delivery-remarks"
          className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground"
        >
          <FileText className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{t("details.remarksLabel")}</span>
        </label>
        <Input
          id="delivery-remarks"
          value={remarks}
          onChange={(event) => setRemarks(event.target.value)}
          placeholder={t("details.remarksPlaceholder")}
          maxLength={500}
          className="h-11 rounded-2xl bg-surface-muted/60 text-sm focus:bg-background"
        />
      </div>

      <div className="flex flex-col gap-3 pt-2 sm:flex-row">
        <Button
          type="submit"
          disabled={isCompleting}
          className="h-12 flex-1 gap-2 rounded-2xl text-sm font-bold"
        >
          <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          {isCompleting ? t("details.completing") : t("details.completeDelivery")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onOpenFail}
          className="h-12 flex-1 gap-2 rounded-2xl bg-warning/15 text-warning-soft-foreground hover:bg-warning/25"
        >
          <AlertTriangle className="h-4 w-4 text-warning" aria-hidden="true" />
          <span>{t("details.failTitle")}</span>
        </Button>
      </div>
    </form>
  );
}
