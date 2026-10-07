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
import { Search, X, Loader2, AlertCircle, Inbox, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../lib/utils.js";

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

  return (
    <div
      className={cn(
        "w-full rounded-lg border border-border bg-surface p-4 shadow-sm sm:p-5",
        className,
      )}
    >
      {/* Top Filters & Actions Toolbar */}
      {hasToolbar && (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-full flex-1 flex-col gap-2.5 sm:w-auto sm:flex-row sm:items-center">
            {onSearchChange && (
              <div className="relative w-full sm:w-80">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={search ?? ""}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-8 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <div className="absolute right-2.5 top-1/2 flex -translate-y-1/2 items-center gap-1">
                  {isSearching && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  {search && (
                    <button
                      type="button"
                      onClick={() => onSearchChange("")}
                      className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                      aria-label="Clear search"
                    >
                      <X className="h-3.5 w-3.5" />
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
      <div className="overflow-hidden rounded-md border border-border bg-surface">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-surface-muted/60">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="px-4 py-3 text-caption font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={`skeleton-${index}`} className="animate-pulse">
                    {columns.map((_, colIndex) => (
                      <TableCell key={colIndex} className="px-4 py-3.5">
                        <div
                          className="h-4 rounded bg-surface-muted"
                          style={{
                            width: `${Math.max(40, ((colIndex * 37) % 80) + 30)}%`,
                          }}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-danger">
                      <AlertCircle className="h-6 w-6 opacity-80" />
                      <p className="text-body-sm font-medium">{errorMessage}</p>
                      {onRetry && (
                        <Button variant="outline" size="sm" onClick={onRetry} className="mt-1">
                          Try again
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className="transition-colors hover:bg-surface-muted/50">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="px-4 py-3 text-body-sm text-foreground">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <Inbox className="h-8 w-8 stroke-1 text-muted-foreground/60" />
                      <p className="text-body-sm font-medium">{emptyMessage}</p>
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
        <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <div className="flex flex-wrap items-center gap-2 text-caption text-muted-foreground">
            <span>
              Showing{" "}
              <span className="font-semibold text-foreground">
                {Math.min(effectiveTotalItems, (currentPage - 1) * itemsPerPage + 1)}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-foreground">
                {Math.min(effectiveTotalItems, currentPage * itemsPerPage)}
              </span>{" "}
              of <span className="font-semibold text-foreground">{effectiveTotalItems}</span> items
            </span>
            {onLimitChange && (
              <div className="flex items-center gap-1.5 sm:ml-2">
                <span>Per page:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => onLimitChange(Number(e.target.value))}
                  className="h-7 rounded border border-input bg-background px-1.5 text-caption text-foreground outline-none focus:ring-1 focus:ring-primary"
                >
                  {[5, 10, 20, 50].map((limit) => (
                    <option key={limit} value={limit}>
                      {limit}
                    </option>
                  ))}
                </select>
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
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </Button>
            <span className="px-2 text-caption font-medium text-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages || isLoading}
              onClick={() => onPageChange?.(currentPage + 1)}
              className="h-8 gap-1 px-2.5 text-caption font-medium"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
