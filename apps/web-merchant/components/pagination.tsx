"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@dhruto/ui";
import { cn } from "@/lib/cn";

export interface PaginationProps {
  page: number;
  /**
   * Total page count when the API reports it (offset pagination). Omit it for
   * cursor/unknown-total feeds and pass `hasNextPage` instead — the control then
   * shows the current page without inventing a total.
   */
  totalPages?: number;
  /** Used only when `totalPages` is unknown. */
  hasNextPage?: boolean;
  onPageChange: (page: number) => void;
  limit?: number;
  onLimitChange?: (limit: number) => void;
  limitOptions?: readonly number[];
  disabled?: boolean;
  className?: string;
  label?: string;
}

/**
 * Shared pagination: previous/next, page position, optional page size.
 * Mobile-safe (wraps, no horizontal overflow), keyboard accessible, and honest
 * about whether a total is known. Supports both offset and cursor strategies.
 */
export function Pagination({
  page,
  totalPages,
  hasNextPage,
  onPageChange,
  limit,
  onLimitChange,
  limitOptions = [10, 20, 50] as const,
  disabled,
  className,
  label,
}: PaginationProps) {
  const t = useTranslations("Pagination");
  const hasTotal = typeof totalPages === "number";
  const safeTotal = hasTotal ? Math.max(1, totalPages) : undefined;
  const safePage = safeTotal ? Math.min(Math.max(1, page), safeTotal) : Math.max(1, page);
  const canGoBack = safePage > 1;
  const canGoForward = safeTotal ? safePage < safeTotal : hasNextPage === true;

  return (
    <nav
      aria-label={label ?? t("label")}
      className={cn("flex flex-wrap items-center justify-center gap-2", className)}
    >
      <Button
        variant="outline"
        size="sm"
        disabled={disabled || !canGoBack}
        onClick={() => onPageChange(safePage - 1)}
        aria-label={t("previous")}
        className="h-8 gap-1 text-caption"
      >
        <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="hidden sm:inline">{t("previous")}</span>
      </Button>

      <span className="text-caption text-muted-foreground" aria-live="polite">
        {safeTotal
          ? t("pageOf", { page: safePage, totalPages: safeTotal })
          : t("page", { page: safePage })}
      </span>

      <Button
        variant="outline"
        size="sm"
        disabled={disabled || !canGoForward}
        onClick={() => onPageChange(safePage + 1)}
        aria-label={t("next")}
        className="h-8 gap-1 text-caption"
      >
        <span className="hidden sm:inline">{t("next")}</span>
        {disabled ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        )}
      </Button>

      {limit !== undefined && onLimitChange ? (
        <div className="flex items-center gap-1.5 text-caption text-muted-foreground">
          <span id="pagination-per-page">{t("perPage")}</span>
          <Select
            value={String(limit)}
            onValueChange={(value) => onLimitChange(Number(value))}
            disabled={disabled}
          >
            <SelectTrigger
              aria-labelledby="pagination-per-page"
              className="h-8 w-[4.5rem] px-2 py-0 text-caption"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {limitOptions.map((option) => (
                <SelectItem key={option} value={String(option)} className="py-1.5 text-caption">
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
    </nav>
  );
}
