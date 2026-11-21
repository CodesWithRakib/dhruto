"use client";

import React, { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@dhruto/ui";
import { Check, Copy, Radio, Share2 } from "lucide-react";
import { StatusBadge } from "@/components/data-display/status-badge";
import { ParcelStatus } from "@dhruto/contracts";
import {
  getProgressLevel,
  getStatusTheme,
  TRACKING_MILESTONES,
} from "./tracking-utils";

interface TrackingStatusHeroProps {
  trackingCode: string;
  status: ParcelStatus | string;
}

export function TrackingStatusHero({ trackingCode, status }: TrackingStatusHeroProps) {
  const t = useTranslations("Tracking");
  const locale = useLocale();
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  useEffect(() => {
    if (!shared) return;
    const timer = setTimeout(() => setShared(false), 2000);
    return () => clearTimeout(timer);
  }, [shared]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(trackingCode);
      setCopied(true);
    } catch {
      // Clipboard unavailable
    }
  };

  const handleShare = async () => {
    if (typeof window === "undefined") return;
    const shareUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Track Parcel ${trackingCode} — Dhruto Express`,
          text: `Live delivery telemetry for parcel ${trackingCode}`,
          url: shareUrl,
        });
        return;
      } catch {
        // Fallback
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShared(true);
    } catch {
      // No-op
    }
  };

  const currentLevel = getProgressLevel(status);
  const statusTheme = getStatusTheme(status);

  return (
    <div className="track-status-masthead" data-status-type={statusTheme}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="track-status-beacon text-primary" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
              {t("trackingId")}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1.5">
            <h2 className="font-mono text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              {trackingCode}
            </h2>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => void handleCopy()}
              aria-label={t("copyCode")}
              title={t("copyCode")}
              className="h-8 w-8 rounded-lg hover:bg-surface"
            >
              {copied ? (
                <Check className="h-4 w-4 text-success" aria-hidden="true" />
              ) : (
                <Copy className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              )}
            </Button>
            <span className="sr-only" role="status">
              {copied ? t("copied") : ""}
            </span>
          </div>
        </div>

        {/* Status Badge & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleShare()}
            className="h-9 gap-1.5 rounded-lg text-xs font-medium"
          >
            {shared ? (
              <Check className="h-3.5 w-3.5 text-success" />
            ) : (
              <Share2 className="h-3.5 w-3.5" />
            )}
            {shared ? t("copied") : "Share Link"}
          </Button>

          <StatusBadge status={status as ParcelStatus} withIcon className="px-3.5 py-1 text-xs font-semibold" />
        </div>
      </div>

      {/* Kinetic 5-Stage Milestone Progress Bar */}
      <div className="pt-2 sm:pt-3">
        <div className="flex items-center justify-between mb-4 text-xs font-mono uppercase tracking-wider text-muted-foreground">
          <span className="flex items-center gap-2 text-foreground font-semibold">
            <Radio className="h-4 w-4 text-primary animate-pulse" />
            {t("journeyTitle")}
          </span>
          <span className="font-bold text-primary px-2.5 py-0.5 rounded-full bg-primary/10">
            {t("stageOf", { current: currentLevel, total: 5 })}
          </span>
        </div>

        <div className="relative py-2">
          {/* Milestone Track Container */}
          <div
            aria-hidden="true"
            className="absolute top-7 -translate-y-1/2 left-[10%] right-[10%] h-1 pointer-events-none"
          >
            {/* Background Track Line */}
            <div className="h-full w-full bg-border/70 rounded-full" />
            {/* Active Filled Line */}
            <div
              className="absolute top-0 left-0 h-full bg-primary rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${Math.min(100, Math.max(0, ((currentLevel - 1) / 4) * 100))}%`,
              }}
            />
          </div>

          <div className="grid grid-cols-5 relative z-10">
            {TRACKING_MILESTONES.map((m) => {
              const Icon = m.icon;
              const isPassed = currentLevel > m.step;
              const isCurrent = currentLevel === m.step;
              const label = locale === "bn" ? m.titleBn : m.titleEn;

              return (
                <div key={m.step} className="flex flex-col items-center text-center px-1">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300 ${
                      isPassed
                        ? "bg-success text-white"
                        : isCurrent
                          ? "bg-primary text-primary-foreground scale-110"
                          : "bg-surface text-muted-foreground/60"
                    }`}
                  >
                    {isPassed ? (
                      <Check className="h-4 w-4 stroke-[3]" />
                    ) : (
                      <Icon className={`h-4 w-4 ${isCurrent ? "animate-pulse stroke-[2.2]" : "stroke-[1.7]"}`} />
                    )}
                  </div>
                  <span
                    className={`mt-2.5 text-[11px] sm:text-xs tracking-tight transition-colors ${
                      isCurrent
                        ? "text-primary font-bold"
                        : isPassed
                          ? "text-foreground font-semibold"
                          : "text-muted-foreground/80 font-medium"
                    }`}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
