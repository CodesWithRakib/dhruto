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
    <div className="relative overflow-hidden rounded-3xl bg-card/90 backdrop-blur-md">
      {/* Specular top highlight */}

      <div className="flex items-center justify-between px-5 py-4">
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
        <ul>
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
                    ? "bg-success/15 text-success-soft-foreground"
                    : scan.outcome === "DUPLICATE"
                      ? "bg-surface-muted text-muted-foreground"
                      : "bg-danger/15 text-danger-soft-foreground"
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
