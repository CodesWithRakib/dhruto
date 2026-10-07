"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { Badge } from "@dhruto/ui";

export interface ActiveFilter {
  key: string;
  label: string;
  display: string;
}

interface ActiveFiltersProps {
  filters: ActiveFilter[];
  onRemove: (key: string) => void;
  onClearAll: () => void;
}

/**
 * Active filter chips + clear-all. Each chip removes only its own filter;
 * clear-all resets the filter set (pagination resets via query-state util).
 */
export function ActiveFilters({ filters, onRemove, onClearAll }: ActiveFiltersProps) {
  const t = useTranslations("ActiveFilters");
  if (filters.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-live="polite" aria-label={t("label")}>
      {filters.map((filter) => (
        <Badge
          key={filter.key}
          variant="secondary"
          className="gap-1 py-1 pl-2.5 pr-1.5 text-[11px]"
        >
          <span className="font-medium">{filter.label}:</span>
          <span className="max-w-[160px] truncate">{filter.display}</span>
          <button
            type="button"
            onClick={() => onRemove(filter.key)}
            aria-label={t("remove", { label: filter.label })}
            className="rounded-full p-0.5 transition-colors hover:bg-muted-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </button>
        </Badge>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="text-[11px] font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        {t("clearAll")}
      </button>
    </div>
  );
}
