"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { useFormatters } from "@/lib/format";
import type { ParcelScanItem } from "@dhruto/contracts";
import type { ScanAttempt } from "./scanner-input-card";

interface ScannerHistoryCardsProps {
  hubName: string;
  attempts: ScanAttempt[];
  hubLog: ParcelScanItem[];
}

export function ScannerHistoryCards({ hubName, attempts, hubLog }: ScannerHistoryCardsProps) {
  const t = useTranslations("Hub");
  const { time: fmtTime } = useFormatters();

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Session history */}
      <div className="relative rounded-3xl bg-card/90 backdrop-blur-md p-6 space-y-4">
        {/* Specular top highlight */}

        <div>
          <h3 className="text-base font-bold text-foreground">
            {t("scanner.history")}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">{t("scanner.historyHint")}</p>
        </div>
        <div>
          {attempts.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">
              {t("scanner.emptyHistory")}
            </p>
          ) : (
            <div className="space-y-2">
              {attempts.map((attempt) => (
                <div
                  key={attempt.key}
                  className="flex flex-wrap items-center gap-2.5 rounded-2xl bg-surface-muted/50 px-4 py-3 text-xs transition-colors hover:bg-surface-muted/80"
                >
                  <span className="font-mono font-bold text-foreground">{attempt.barcode}</span>
                  {attempt.result ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-success-soft text-success">
                      {attempt.result.outcome}
                    </span>
                  ) : null}
                  <span className="ml-auto font-mono text-[11px] text-muted-foreground">
                    {fmtTime(attempt.at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Hub scan log */}
      {hubLog.length > 0 ? (
        <div className="relative rounded-3xl bg-card/90 backdrop-blur-md p-6 space-y-4">
          {/* Specular top highlight */}

          <div>
            <h3 className="text-base font-bold text-foreground">
              {hubName} — Scan Activity
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">Live immutable scan event log</p>
          </div>
          <div>
            <div className="space-y-2">
              {hubLog.slice(0, 8).map((scan) => (
                <div
                  key={scan.id}
                  className="flex flex-wrap items-center gap-2.5 rounded-2xl bg-surface-muted/50 px-4 py-3 text-xs transition-colors hover:bg-surface-muted/80"
                >
                  <span className="font-mono font-bold text-foreground">
                    {scan.trackingCode ?? scan.bagCode ?? "—"}
                  </span>
                  <span className="rounded-md bg-surface-muted px-2 py-0.5 font-mono text-[11px] font-semibold text-primary">
                    {scan.scanType}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-success-soft text-success">
                    {scan.outcome}
                  </span>
                  <span className="ml-auto font-mono text-[11px] tabular-nums text-muted-foreground">
                    {fmtTime(scan.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
