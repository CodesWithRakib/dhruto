"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/navigation";
import { HUB_ROUTES } from "@/config/routes";
import { useFormatters } from "@/lib/format";
import type { ParcelScanItem } from "@dhruto/contracts";

interface HubRecentScansCardProps {
  recentScans: ParcelScanItem[];
}

export function HubRecentScansCard({ recentScans }: HubRecentScansCardProps) {
  const t = useTranslations("Hub");
  const { time: fmtTime } = useFormatters();

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/90 backdrop-blur-md shadow-sm">
      {/* Specular top highlight */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent"
        aria-hidden="true"
      />

      <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {t("dashboard.recentScans")}
        </h2>
        <Link
          href={HUB_ROUTES.scanner}
          className="text-xs font-bold text-primary hover:underline"
        >
          {t("dashboard.viewAll")}
        </Link>
      </div>

      {recentScans.length === 0 ? (
        <p className="px-4 py-10 text-center text-xs text-muted-foreground">
          {t("dashboard.noRecentScans")}
        </p>
      ) : (
        <ul className="divide-y divide-border/20">
          {recentScans.slice(0, 8).map((scan) => (
            <li
              key={scan.id}
              className="flex flex-wrap items-center gap-3 px-5 py-3 text-xs transition-colors hover:bg-surface-muted/30"
            >
              <span className="font-mono text-xs font-bold text-foreground">
                {scan.trackingCode ?? scan.bagCode ?? "—"}
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                  scan.outcome === "APPLIED"
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                    : scan.outcome === "DUPLICATE"
                      ? "bg-surface-muted text-muted-foreground"
                      : "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                }`}
              >
                {scan.scanType.replace(/_/g, " ")} · {scan.outcome}
              </span>
              <span className="ml-auto font-mono text-[11px] tabular-nums text-muted-foreground">
                {fmtTime(scan.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
