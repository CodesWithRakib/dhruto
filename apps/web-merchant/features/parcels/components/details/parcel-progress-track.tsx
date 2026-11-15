"use client";

import React from "react";
import { ParcelStatus } from "@dhruto/contracts";
import { StatusBadge } from "@/components/data-display/status-badge";
import { CopyButton } from "@/components/data-display/copy-button";
import { cn } from "@/lib/cn";

export interface MilestoneItem {
  statuses: ParcelStatus[];
  labelKey: string;
}

interface ParcelProgressTrackProps {
  t: (key: string, values?: Record<string, string | number>) => string;
  tStatus: (key: string) => string;
  trackingCode: string;
  status: ParcelStatus;
  createdAt: string;
  dateTimeStr: string;
  milestones: MilestoneItem[];
  currentStep: number;
  progress: number;
}

export function ParcelProgressTrack({
  t,
  tStatus,
  trackingCode,
  status,
  dateTimeStr,
  milestones,
  currentStep,
  progress,
}: ParcelProgressTrackProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-surface-elevated/90 p-6 sm:p-8 shadow-sm backdrop-blur-md space-y-6">
      {/* Specular highlight border */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      {/* Header bar */}
      <div className="flex flex-col gap-3 pb-2 sm:flex-row sm:items-center sm:justify-between border-b border-border/50">
        <div>
          <span className="text-caption font-bold uppercase tracking-wider text-muted-foreground">
            {t("trackingCode")}
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="font-mono text-h3 sm:text-h2 font-black tracking-tight text-foreground">
              {trackingCode}
            </p>
            <CopyButton
              value={trackingCode}
              label={t("copyTrackingCode")}
              copiedLabel={t("trackingCopied")}
              errorLabel={t("copyFailed")}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={status} withIcon />
          <span className="text-caption font-medium text-muted-foreground">
            {t("createdOn", { date: dateTimeStr })}
          </span>
        </div>
      </div>

      {/* Progress track */}
      <div className="py-2 sm:py-4">
        <ol
          className="relative mx-auto flex max-w-2xl justify-between"
          aria-label={t("orderStatus")}
        >
          <div
            className="absolute top-3.5 -translate-y-1/2 h-1"
            style={{
              left: `${100 / (milestones.length * 2)}%`,
              right: `${100 / (milestones.length * 2)}%`,
            }}
            aria-hidden="true"
          >
            <div className="h-full w-full bg-surface-muted rounded-full" />
            <div
              className="absolute top-0 left-0 h-full bg-primary rounded-full transition-all duration-500 ease-out shadow-sm shadow-primary/30"
              style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
            />
          </div>
          {milestones.map((milestone, index) => {
            const step = index + 1;
            const isPassed = currentStep >= step;
            const isCurrent = currentStep === step;
            return (
              <li
                key={milestone.labelKey}
                className="relative z-10 flex min-w-0 flex-1 flex-col items-center"
                aria-current={isCurrent ? "step" : undefined}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-caption font-bold transition-all duration-300",
                    isPassed
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                      : "bg-surface-muted text-muted-foreground border border-border/80",
                    isCurrent && "ring-4 ring-primary/25 scale-110 shadow-lg shadow-primary/35",
                  )}
                >
                  {step}
                </span>
                <span
                  className={cn(
                    "mt-2.5 max-w-full px-1 text-center text-caption transition-colors",
                    isCurrent
                      ? "font-bold text-primary"
                      : isPassed
                        ? "font-semibold text-foreground"
                        : "text-muted-foreground",
                  )}
                >
                  {tStatus(milestone.labelKey)}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
