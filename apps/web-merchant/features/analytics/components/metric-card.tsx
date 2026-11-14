"use client";

import * as React from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { KpiValue } from "@dhruto/contracts";

interface MetricCardProps {
  label: string;
  kpi: KpiValue | null | undefined;
  format?: (v: number) => string;
  invertTrend?: boolean;
  hint?: string;
}

/**
 * KPI card: current value, previous-period delta, trend. Distinguishes
 * no-data (no eligible records) from zero.
 */
export function MetricCard({ label, kpi, format, invertTrend, hint }: MetricCardProps) {
  const fmt = format ?? ((v: number) => v.toLocaleString());
  if (!kpi || kpi.noData) {
    return (
      <div className="rounded-3xl bg-surface-elevated p-5 space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-2xl font-black text-muted-foreground">—</p>
        <p className="text-[11px] text-muted-foreground">No data for selected period</p>
      </div>
    );
  }
  const good =
    kpi.changePct === null
      ? null
      : (kpi.changePct >= 0 && !invertTrend) || (kpi.changePct <= 0 && invertTrend);
  return (
    <div className="rounded-3xl bg-surface-elevated p-5 space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-2xl font-black tracking-tight text-foreground">{kpi.value !== null ? fmt(kpi.value) : "—"}</p>
      <p className="flex items-center gap-1 text-[11px]" aria-live="polite">
        {kpi.trend === "up" ? (
          <ArrowUpRight className="h-3 w-3 text-success" aria-hidden="true" />
        ) : kpi.trend === "down" ? (
          <ArrowDownRight className="h-3 w-3 text-danger" aria-hidden="true" />
        ) : (
          <Minus className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
        )}
        <span
          className={
            good === null ? "text-muted-foreground" : good ? "text-success font-semibold" : "text-danger font-semibold"
          }
        >
          {kpi.changePct !== null ? `${kpi.changePct > 0 ? "+" : ""}${kpi.changePct}%` : "—"}
        </span>
        <span className="text-muted-foreground">vs previous period</span>
      </p>
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
