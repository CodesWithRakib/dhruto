"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  MoreHorizontal,
} from "lucide-react";
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@dhruto/ui";
import { cn } from "@/lib/cn";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

export interface PaginationProps {
  page: number;
  /**
   * Total page count when the API reports it (offset pagination).
   * Omit for cursor / unknown-total feeds and pass `hasNextPage` instead.
   */
  totalPages?: number;
  /** Total number of items across all pages, if known. */
  totalItems?: number;
  /** Used when `totalPages` is unknown or for keyset feeds. */
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
  onPageChange: (page: number) => void;
  limit?: number;
  onLimitChange?: (limit: number) => void;
  limitOptions?: readonly number[];
  disabled?: boolean;
  className?: string;
  label?: string;

  /** Show numbered page buttons with ellipsis on larger screens (defaults to true). */
  showPageNumbers?: boolean;
  /** Show fast-jump buttons to First and Last page (defaults to false). */
  showFirstLast?: boolean;
  /** Show item range counter "Showing X-Y of Z items" (defaults to true when totalItems is provided). */
  showItemsRange?: boolean;

  /** Keyset cursor pagination integration */
  cursorMode?: boolean;
  nextCursor?: string | null;
  prevCursor?: string | null;
  onNextCursor?: (cursor: string) => void;
  onPrevCursor?: () => void;
  onLoadMore?: () => void;
}

/**
 * Computes the page pill window with ellipsis:
 * E.g., for page 5 of 12: [1, 'ellipsis', 4, 5, 6, 'ellipsis', 12]
 */
function getPaginationRange(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const delta = 1;
  const range: (number | "ellipsis")[] = [];

  const left = Math.max(2, current - delta);
  const right = Math.min(total - 1, current + delta);

  range.push(1);

  if (left > 2) {
    range.push("ellipsis");
  }

  for (let i = left; i <= right; i++) {
    range.push(i);
  }

  if (right < total - 1) {
    range.push("ellipsis");
  }

  range.push(total);
  return range;
}

/**
 * Centralized Enterprise Pagination Component.
 * -------------------------------------------------------------
 * Fully responsive, keyboard accessible, supports:
 * 1. Standard Offset pagination (page numbers, direct jump, first/last)
 * 2. Keyset Cursor pagination (nextCursor/hasMore stream)
 * 3. Range counter ("Showing 1 to 20 of 185 items")
 * 4. Page size limit selector
 */
export function Pagination({
  page,
  totalPages,
  totalItems,
  hasNextPage,
  hasPreviousPage,
  onPageChange,
  limit,
  onLimitChange,
  limitOptions = [10, 20, 50, 100] as const,
  disabled,
  className,
  label,
  showPageNumbers = true,
  showFirstLast = false,
  showItemsRange = true,
  cursorMode = false,
  nextCursor,
  prevCursor,
  onNextCursor,
  onPrevCursor,
  onLoadMore,
}: PaginationProps) {
  const t = useTranslations("Pagination");

  const hasTotal = typeof totalPages === "number" && Number.isFinite(totalPages);
  const safeTotal = hasTotal ? Math.max(1, totalPages!) : undefined;
  const safePage = safeTotal ? Math.min(Math.max(1, page), safeTotal) : Math.max(1, page);

  const canGoBack = hasPreviousPage !== undefined ? hasPreviousPage : safePage > 1;
  const canGoForward = safeTotal ? safePage < safeTotal : hasNextPage === true;

  // Calculate items range (e.g. 1-20 of 100)
  const fromItem = limit ? (safePage - 1) * limit + 1 : undefined;
  const toItem = limit && totalItems ? Math.min(safePage * limit, totalItems) : limit ? safePage * limit : undefined;

  return (
    <nav
      aria-label={label ?? t("label")}
      className={cn(
        "flex flex-col sm:flex-row items-center justify-between gap-3 px-2 py-3",
        className
      )}
    >
      {/* Left side: Items Range & Limit Selector */}
      <div className="flex flex-wrap items-center gap-3 text-caption text-muted-foreground order-2 sm:order-1">
        {showItemsRange && totalItems !== undefined && fromItem !== undefined && toItem !== undefined ? (
          <span className="tabular-nums" aria-live="polite">
            Showing <span className="font-semibold text-foreground">{fromItem}</span> to{" "}
            <span className="font-semibold text-foreground">{toItem}</span> of{" "}
            <span className="font-semibold text-foreground">{totalItems}</span> items
          </span>
        ) : null}

        {limit !== undefined && onLimitChange ? (
          <div className="flex items-center gap-1.5">
            <span id="pagination-per-page">{t("perPage")}</span>
            <Select
              value={String(limit)}
              onValueChange={(value) => onLimitChange(Number(value))}
              disabled={disabled}
            >
              <SelectTrigger
                aria-labelledby="pagination-per-page"
                className="h-8 w-[4.75rem] px-2 py-0 text-caption rounded-lg border-border/80 bg-surface shadow-2xs"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {limitOptions.map((option) => (
                  <SelectItem key={option} value={String(option)} className="py-1 text-caption">
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      {/* Right side: Navigation buttons and Page pills */}
      <div className="flex items-center gap-1.5 order-1 sm:order-2">
        {/* Fast Jump: First Page */}
        {showFirstLast && safeTotal && safeTotal > 2 ? (
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || !canGoBack}
            onClick={() => onPageChange(1)}
            aria-label="First page"
            className="h-8 w-8 p-0 hidden md:flex rounded-lg"
          >
            <ChevronsLeft className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        ) : null}

        {/* Previous Page */}
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || !canGoBack}
          onClick={() => {
            if (cursorMode && prevCursor && onPrevCursor) {
              onPrevCursor();
            } else {
              onPageChange(safePage - 1);
            }
          }}
          aria-label={t("previous")}
          className="h-8 gap-1 text-caption px-2.5 rounded-lg font-medium"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">{t("previous")}</span>
        </Button>

        {/* Numbered Page Pills (Desktop) */}
        {showPageNumbers && safeTotal && safeTotal > 1 ? (
          <div className="hidden md:flex items-center gap-1">
            {getPaginationRange(safePage, safeTotal).map((p, idx) => {
              if (p === "ellipsis") {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    className="flex h-8 w-8 items-center justify-center text-muted-foreground"
                    aria-hidden="true"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </span>
                );
              }

              const isCurrent = p === safePage;
              return (
                <Button
                  key={`page-${p}`}
                  variant={isCurrent ? "default" : "outline"}
                  size="sm"
                  disabled={disabled}
                  onClick={() => onPageChange(p)}
                  aria-current={isCurrent ? "page" : undefined}
                  className={cn(
                    "h-8 min-w-[2rem] px-2 text-caption rounded-lg tabular-nums font-medium",
                    isCurrent && "shadow-xs pointer-events-none"
                  )}
                >
                  {p}
                </Button>
              );
            })}
          </div>
        ) : null}

        {/* Current Page Summary Text (Mobile or simple mode) */}
        <span
          className={cn(
            "text-caption text-muted-foreground px-2 tabular-nums",
            showPageNumbers && safeTotal && safeTotal > 1 && "md:hidden"
          )}
          aria-live="polite"
        >
          {safeTotal
            ? t("pageOf", { page: safePage, totalPages: safeTotal })
            : t("page", { page: safePage })}
        </span>

        {/* Next Page */}
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || !canGoForward}
          onClick={() => {
            if (cursorMode && nextCursor && onNextCursor) {
              onNextCursor(nextCursor);
            } else {
              onPageChange(safePage + 1);
            }
          }}
          aria-label={t("next")}
          className="h-8 gap-1 text-caption px-2.5 rounded-lg font-medium"
        >
          <span className="hidden sm:inline">{t("next")}</span>
          {disabled ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </Button>

        {/* Fast Jump: Last Page */}
        {showFirstLast && safeTotal && safeTotal > 2 ? (
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || !canGoForward}
            onClick={() => onPageChange(safeTotal)}
            aria-label="Last page"
            className="h-8 w-8 p-0 hidden md:flex rounded-lg"
          >
            <ChevronsRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        ) : null}

        {/* Optional Load More button in cursor feeds */}
        {cursorMode && hasNextPage && onLoadMore ? (
          <Button
            variant="secondary"
            size="sm"
            disabled={disabled}
            onClick={onLoadMore}
            className="h-8 gap-1 text-caption ml-2 rounded-lg"
          >
            Load More
          </Button>
        ) : null}
      </div>
    </nav>
  );
}

/**
 * Enterprise React hook for unified pagination and debounced search state.
 * Automatically resets page to 1 whenever search query changes.
 */
export function usePaginationState({
  initialPage = 1,
  initialLimit = 20,
  initialSearch = "",
  debounceMs = 350,
}: {
  initialPage?: number;
  initialLimit?: number;
  initialSearch?: string;
  debounceMs?: number;
} = {}) {
  const [page, setPage] = React.useState(initialPage);
  const [limit, setLimit] = React.useState(initialLimit);
  const [search, setSearch] = React.useState(initialSearch);

  const debouncedSearch = useDebouncedValue(search, debounceMs);

  // Automatically reset to page 1 whenever debounced search query changes
  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const reset = React.useCallback(() => {
    setPage(initialPage);
    setLimit(initialLimit);
    setSearch(initialSearch);
  }, [initialPage, initialLimit, initialSearch]);

  return {
    page,
    setPage,
    limit,
    setLimit,
    search,
    setSearch,
    debouncedSearch,
    reset,
  };
}
