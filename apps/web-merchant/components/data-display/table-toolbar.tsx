"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { DebouncedSearchInput } from "@/components/search-input";

export interface TableToolbarProps {
  /** Search wiring — omit to render a toolbar without search. */
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  searchLabel?: string;
  searching?: boolean;
  /** Desktop inline controls (selects, date inputs, tabs). */
  filters?: React.ReactNode;
  /** Right-aligned actions (create button, export, column toggle). */
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Composable list toolbar. Desktop: search + inline filters + actions in one
 * row. Mobile: search full-width, filters/actions wrap below. Pair with
 * FilterButton + FilterSheet for the mobile drawer pattern and ActiveFilters
 * for the chip row beneath.
 */
export function TableToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  searchLabel,
  searching,
  filters,
  actions,
  className,
}: TableToolbarProps) {
  return (
    <div className={cn("flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center", className)}>
      {onSearchChange !== undefined ? (
        <DebouncedSearchInput
          className="w-full sm:w-80"
          value={searchValue ?? ""}
          onChange={onSearchChange}
          placeholder={searchPlaceholder}
          ariaLabel={searchLabel ?? searchPlaceholder}
          loading={searching}
        />
      ) : null}
      {filters ? (
        <div className="flex flex-wrap items-center gap-2">{filters}</div>
      ) : null}
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">{actions}</div>
      ) : null}
    </div>
  );
}
