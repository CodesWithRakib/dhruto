"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Button } from "@dhruto/ui";

export const PRESETS = ["7d", "30d", "90d", "today", "yesterday", "month", "custom"] as const;
export type Preset = (typeof PRESETS)[number];

export interface FilterState {
  preset: string;
  from?: string;
  to?: string;
}

interface FilterBarProps {
  value: FilterState;
  onChange: (next: FilterState) => void;
}

/**
 * Date-range filter bar with URL-synced presets + custom range.
 * Presets map 1:1 to the backend date-filter contract.
 */
export function FilterBar({ value, onChange }: FilterBarProps) {
  const t = useTranslations("AnalyticsFilters");
  const [from, setFrom] = React.useState(value.from ?? "");
  const [to, setTo] = React.useState(value.to ?? "");

  React.useEffect(() => {
    setFrom(value.from ?? "");
    setTo(value.to ?? "");
  }, [value.from, value.to]);

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t("rangeLabel")}>
      {PRESETS.filter((p) => p !== "custom").map((p) => (
        <Button
          key={p}
          variant={value.preset === p ? "default" : "outline"}
          size="sm"
          className="h-8 text-xs"
          aria-pressed={value.preset === p}
          onClick={() => onChange({ preset: p })}
        >
          {t(`preset_${p}`)}
        </Button>
      ))}
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <input
          type="date"
          value={from}
          max={to || undefined}
          onChange={(e) => setFrom(e.target.value)}
          aria-label={t("fromLabel")}
          className="h-8 min-w-0 max-w-[150px] flex-1 rounded-lg border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <span className="shrink-0 text-xs text-muted-foreground">→</span>
        <input
          type="date"
          value={to}
          min={from || undefined}
          onChange={(e) => setTo(e.target.value)}
          aria-label={t("toLabel")}
          className="h-8 min-w-0 max-w-[150px] flex-1 rounded-lg border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <Button
          variant={value.preset === "custom" ? "default" : "outline"}
          size="sm"
          className="h-8 text-xs"
          disabled={!from || !to}
          onClick={() => onChange({ preset: "custom", from, to })}
        >
          {t("apply")}
        </Button>
      </div>
    </div>
  );
}

/** Parses URL search params into filter state (validated, defaults 30d). */
export function filterFromSearch(params: URLSearchParams): FilterState {
  const preset = params.get("preset") ?? "30d";
  if (!PRESETS.includes(preset as Preset)) return { preset: "30d" };
  if (preset === "custom") {
    const from = params.get("from") ?? undefined;
    const to = params.get("to") ?? undefined;
    if (!from || !to) return { preset: "30d" };
    return { preset, from, to };
  }
  return { preset };
}

/** Serializes filter state back to URL search params. */
export function filterToSearch(filter: FilterState): string {
  const params = new URLSearchParams();
  params.set("preset", filter.preset);
  if (filter.preset === "custom") {
    if (filter.from) params.set("from", filter.from);
    if (filter.to) params.set("to", filter.to);
  }
  return params.toString();
}

/** Converts filter state to API params (custom dates → Dhaka-offset datetimes). */
export function filterToApiParams(filter: FilterState): Record<string, string> {
  if (filter.preset === "custom" && filter.from && filter.to) {
    return {
      preset: "custom",
      from: new Date(`${filter.from}T00:00:00+06:00`).toISOString(),
      to: new Date(`${filter.to}T23:59:59+06:00`).toISOString(),
    };
  }
  return { preset: filter.preset };
}
