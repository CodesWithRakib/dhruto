"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export interface FilterTabOption<T extends string> {
  value: T;
  label: string;
}

export interface FilterTabsProps<T extends string> {
  value: T;
  onValueChange: (value: T) => void;
  options: readonly FilterTabOption<T>[];
  /** Accessible name for the group, e.g. "Transaction type". */
  label: string;
  className?: string;
}

/**
 * Segmented control for small, mutually-exclusive filter sets (status, type,
 * period). One implementation replaces the hand-rolled pill buttons that were
 * duplicated across list pages, and it stays scrollable instead of overflowing
 * on narrow screens.
 *
 * Implemented as an `aria-pressed` toggle group rather than a tablist because
 * it filters the dataset below it instead of switching panels.
 */
export function FilterTabs<T extends string>({
  value,
  onValueChange,
  options,
  label,
  className,
}: FilterTabsProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "flex w-full max-w-full items-center gap-1 overflow-x-auto rounded-lg border border-border bg-surface-muted p-1 sm:w-fit",
        className,
      )}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onValueChange(option.value)}
            className={cn(
              "whitespace-nowrap rounded-md px-3 py-1.5 text-caption font-semibold transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
              isActive
                ? "bg-surface text-foreground "
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
