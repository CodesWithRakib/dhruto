"use client";

import * as React from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card } from "@dhruto/ui";
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
      <Card className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold text-muted-foreground">—</p>
        <p className="text-[11px] text-muted-foreground">No data for selected period</p>
      </Card>
    );
  }
  const good = kpi.changePct === null
    ? null
    : (kpi.changePct >= 0 && !invertTrend) || (kpi.changePct <= 0 && invertTrend);
  return (
    <Card className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{kpi.value !== null ? fmt(kpi.value) : "—"}</p>
      <p className="mt-1 flex items-center gap-1 text-[11px]" aria-live="polite">
        {kpi.trend === "up" ? (
          <ArrowUpRight className="h-3 w-3 text-success" aria-hidden="true" />
        ) : kpi.trend === "down" ? (
          <ArrowDownRight className="h-3 w-3 text-danger" aria-hidden="true" />
        ) : (
          <Minus className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
        )}
        <span className={good === null ? "text-muted-foreground" : good ? "text-success" : "text-danger"}>
          {kpi.changePct !== null ? `${kpi.changePct > 0 ? "+" : ""}${kpi.changePct}%` : "—"}
        </span>
        <span className="text-muted-foreground">vs previous period</span>
      </p>
      {hint ? <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p> : null}
    </Card>
  );
}
