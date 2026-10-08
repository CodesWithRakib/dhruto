"use client";

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  PaginationState,
} from "@tanstack/react-table";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./table.js";
import { Button } from "./button.js";
import { Search, X, Loader2, AlertCircle, ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select.js";
import { cn } from "../lib/utils.js";

/**
 * Translated copy for the table's own chrome. Every entry is optional so
 * existing callers keep the built-in English defaults, while locale-aware
 * pages can render the whole table (pagination, empty, error) in Bangla.
 *
 * `showingRange` supports `{from}`, `{to}` and `{total}` placeholders, and
 * `pageOf` supports `{page}` and `{totalPages}`.
 */
export interface DataTableLabels {
  emptyMessage?: string;
  emptyHint?: string;
  errorMessage?: string;
  retry?: string;
  clearSearch?: string;
  showingRange?: string;
  perPage?: string;
  pageOf?: string;
  previous?: string;
  next?: string;
}

/** Replaces `{placeholder}` tokens without pulling in an i18n dependency. */
function fill(template: string, values: Record<string, number | string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  pageCount?: number;
  pagination?: PaginationState;
  onPaginationChange?: React.Dispatch<React.SetStateAction<PaginationState>>;
  totalItems?: number;
  currentPage?: number;
  itemsPerPage?: number;
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  emptyMessage?: string;
  errorMessage?: string;
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  isSearching?: boolean;
  filterSlot?: React.ReactNode;
  actionSlot?: React.ReactNode;
  /** Translated table chrome. Unset entries fall back to English defaults. */
  labels?: DataTableLabels;
  /**
   * Localizes the numbers interpolated into `labels` (Bangla numerals, digit
   * grouping). The table stays locale-agnostic: callers pass the same
   * formatter their app already uses for amounts and counts.
   */
  formatNumber?: (value: number) => string;
  className?: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  pageCount = 1,
  pagination,
  onPaginationChange,
  totalItems,
  currentPage = 1,
  itemsPerPage = 10,
  onPageChange,
  onLimitChange,
  isLoading = false,
  isError = false,
  onRetry,
  emptyMessage = "No records found",
  errorMessage = "Failed to load records",
  search,
  onSearchChange,
  searchPlaceholder = "Search...",
  isSearching = false,
  filterSlot,
  actionSlot,
  labels,
  formatNumber,
  className,
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    pageCount: pageCount > 0 ? pageCount : 1,
    state: {
      pagination: pagination ?? { pageIndex: currentPage - 1, pageSize: itemsPerPage },
    },
    onPaginationChange,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  });

  const hasToolbar = Boolean(onSearchChange || filterSlot || actionSlot);
  const effectiveTotalItems = totalItems ?? data.length;
  const totalPages = Math.max(1, pageCount || Math.ceil(effectiveTotalItems / itemsPerPage));

  // `labels` wins over the props/defaults so callers can localize every string
  // the table owns without replacing the component.
  const errorText = labels?.errorMessage ?? errorMessage;
  const emptyText = labels?.emptyMessage ?? emptyMessage;
  const num = (value: number): number | string =>
    formatNumber ? formatNumber(value) : value;

  return (
    <div
      className={cn(
        "dhruto-animate-in w-full rounded-xl border border-border/70 bg-surface shadow-soft",
        className,
      )}
    >
      {/* Top Filters & Actions Toolbar */}
      {hasToolbar && (
        <div className="flex flex-col gap-3 border-b border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex w-full flex-1 flex-col gap-2.5 sm:w-auto sm:flex-row sm:items-center">
            {onSearchChange && (
              <div className="relative w-full sm:w-80">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <input
                  type="search"
                  value={search ?? ""}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                  className="h-10 w-full rounded-lg border border-input bg-surface pl-9 pr-9 text-body-sm text-foreground transition-colors placeholder:text-muted-foreground hover:border-muted-foreground/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/25 [&::-webkit-search-cancel-button]:hidden"
                />
                <div className="absolute right-2.5 top-1/2 flex -translate-y-1/2 items-center gap-1">
                  {isSearching && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />
                  )}
                  {search && (
                    <button
                      type="button"
                      onClick={() => onSearchChange("")}
                      className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                      aria-label={labels?.clearSearch ?? "Clear search"}
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {filterSlot}
          </div>

          {actionSlot && (
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
              {actionSlot}
            </div>
          )}
        </div>
      )}

      {/* Inner Table Container */}
      <div className="overflow-hidden bg-surface sm:rounded-b-none">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="dhruto-table-header border-b border-border/70">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="border-b-0 hover:bg-transparent">
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="whitespace-nowrap px-4 py-3 text-caption font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody className="divide-y divide-border/60">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={`skeleton-${index}`} className="hover:bg-transparent">
                    {columns.map((_, colIndex) => (
                      <TableCell key={colIndex} className="px-4 py-3.5">
                        <div
                          className="dhruto-skeleton h-4 rounded-md"
                          style={{
                            width: `${Math.max(40, ((colIndex * 37) % 80) + 30)}%`,
                          }}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={columns.length} className="h-36 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-danger-soft text-danger-soft-foreground">
                        <AlertCircle className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <p className="text-body-sm font-medium text-foreground">{errorText}</p>
                      {onRetry && (
                        <Button variant="outline" size="sm" onClick={onRetry} className="mt-1">
                          {labels?.retry ?? "Try again"}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className="dhruto-animate-in hover:bg-surface-muted/50">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="whitespace-nowrap px-4 py-3 text-table text-foreground">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={columns.length} className="h-48 px-4 py-10 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center justify-center gap-2.5">
                      <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-surface-muted text-muted-foreground">
                        <Inbox className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <p className="text-body-sm font-semibold text-foreground">{emptyText}</p>
                      <p className="text-caption text-muted-foreground">
                        {labels?.emptyHint ?? "Try adjusting your filters or check back later."}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination Bar */}
      {effectiveTotalItems > 0 && (
        <div className="flex flex-col items-center justify-between gap-3 border-t border-border/60 px-4 py-3 sm:flex-row sm:px-5">
          <div className="flex flex-wrap items-center justify-center gap-2 text-caption text-muted-foreground">
            <span aria-live="polite" className="tabular-nums">
              {fill(labels?.showingRange ?? "Showing {from} to {to} of {total} items", {
                from: num(Math.min(effectiveTotalItems, (currentPage - 1) * itemsPerPage + 1)),
                to: num(Math.min(effectiveTotalItems, currentPage * itemsPerPage)),
                total: num(effectiveTotalItems),
              })}
            </span>
            {onLimitChange && (
              <div className="flex items-center gap-1.5 sm:ml-2">
                <span>{labels?.perPage ?? "Per page:"}</span>
                <Select
                  value={String(itemsPerPage)}
                  onValueChange={(val) => onLimitChange(Number(val))}
                >
                  <SelectTrigger className="h-7 w-[70px] border-input bg-surface px-2 text-caption focus:ring-2 focus:ring-ring/25">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 10, 20, 50].map((limit) => (
                      <SelectItem key={limit} value={String(limit)} className="text-caption">
                        {limit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1 || isLoading}
              onClick={() => onPageChange?.(currentPage - 1)}
              className="h-8 gap-1 px-2.5 text-caption font-medium"
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
              {labels?.previous ?? "Previous"}
            </Button>
            <span className="min-w-24 px-2 text-center text-caption font-medium tabular-nums text-foreground" aria-live="polite">
              {fill(labels?.pageOf ?? "Page {page} of {totalPages}", {
                page: num(currentPage),
                totalPages: num(totalPages),
              })}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages || isLoading}
              onClick={() => onPageChange?.(currentPage + 1)}
              className="h-8 gap-1 px-2.5 text-caption font-medium"
            >
              {labels?.next ?? "Next"}
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
