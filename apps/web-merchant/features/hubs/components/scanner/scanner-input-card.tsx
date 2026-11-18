"use client";

import React, { forwardRef } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, CheckCircle2, Scan } from "lucide-react";
import { Button, Input } from "@dhruto/ui";
import { Link } from "@/lib/navigation";
import { HUB_ROUTES } from "@/config/routes";
import { HubScanType, ScanOutcome, type HubScanResult } from "@dhruto/contracts";

export interface ScanAttempt {
  key: string;
  result: HubScanResult | null;
  error: string | null;
  barcode: string;
  at: string;
}

interface ScannerInputCardProps {
  hubName: string;
  scanType: HubScanType;
  barcode: string;
  setBarcode: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  lastAttempt: ScanAttempt | null;
}

export const ScannerInputCard = forwardRef<HTMLInputElement, ScannerInputCardProps>(
  function ScannerInputCard(
    { hubName, scanType, barcode, setBarcode, onSubmit, isLoading, lastAttempt },
    ref
  ) {
    const t = useTranslations("Hub");

    return (
      <div className="relative rounded-3xl bg-card/90 backdrop-blur-md p-6 space-y-5">
        {/* Specular top highlight */}

        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="flex items-center gap-2 text-base sm:text-lg font-bold text-foreground">
              <Scan className="h-5 w-5 text-primary" aria-hidden="true" />
              {t("scanner.title")} — {hubName}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("scanner.subtitle", { hub: hubName })}
            </p>
          </div>
          <span className="inline-flex items-center rounded-xl bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            {scanType.replace(/_/g, " ")}
          </span>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Scan
              className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              ref={ref}
              id="hub-scanner-input"
              type="text"
              autoComplete="off"
              autoCapitalize="characters"
              placeholder={t("scanner.barcodePlaceholder")}
              aria-label={t("scanner.barcodeLabel")}
              value={barcode}
              onChange={(event) => setBarcode(event.target.value)}
              disabled={isLoading}
              className="h-12 rounded-2xl bg-surface-muted/60 pl-11 font-mono text-base uppercase tracking-wider placeholder:normal-case placeholder:font-sans placeholder:tracking-normal placeholder:font-normal placeholder:text-sm placeholder:text-muted-foreground"
              autoFocus
            />
          </div>
          <Button
            type="submit"
            size="lg"
            disabled={isLoading || !barcode.trim()}
            className="h-12 rounded-2xl px-8 font-bold"
          >
            {isLoading ? t("scanner.processing") : t("scanner.processScan")}
          </Button>
        </form>

        {/* Last result: icon + text, never color alone */}
        {lastAttempt?.result ? (
          <div
            role="status"
            className={
              lastAttempt.result.outcome === ScanOutcome.APPLIED
                ? "flex items-start gap-3 rounded-2xl bg-success-soft p-4 text-success"
                : "flex items-start gap-3 rounded-2xl bg-warning-soft p-4 text-warning"
            }
          >
            {lastAttempt.result.outcome === ScanOutcome.APPLIED ? (
              <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-success" aria-hidden="true" />
            ) : (
              <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-warning" aria-hidden="true" />
            )}
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-sm font-bold">{lastAttempt.result.barcode}</p>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-white/20">
                  {lastAttempt.result.outcome === ScanOutcome.APPLIED
                    ? lastAttempt.result.currentStatus
                    : t("scanner.duplicateTitle")}
                </span>
              </div>
              <p className="text-xs font-medium">{lastAttempt.result.message}</p>
              {lastAttempt.result.reasonCode ? (
                <p className="font-mono text-[11px]">({lastAttempt.result.reasonCode})</p>
              ) : null}
            </div>
          </div>
        ) : null}

        {lastAttempt?.error ? (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl bg-danger-soft p-4 text-danger"
          >
            <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-danger" aria-hidden="true" />
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-sm font-bold">{lastAttempt.barcode}</p>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-danger-soft text-danger">
                  {t("scanner.errorTitle")}
                </span>
              </div>
              <p className="text-xs font-medium">{lastAttempt.error}</p>
              <Link href={HUB_ROUTES.parcels} className="text-xs font-semibold underline">
                {t("scanner.lookupFallback")}
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    );
  }
);
