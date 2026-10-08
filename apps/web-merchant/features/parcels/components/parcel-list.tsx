"use client";

import React, { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTable,
  type ColumnDef,
} from "@dhruto/ui";
import { Eye, Hash, Plus, Printer } from "lucide-react";
import type { ParcelListItem } from "@dhruto/contracts";
import { Link } from "@/lib/navigation";
import { useRouteBase } from "@/config/route-base";
import { statusConfig } from "@/config/status";
import { StatusBadge } from "@/components/data-display/status-badge";
import { ActiveFilters, type ActiveFilter } from "@/components/active-filters";
import { FilterButton } from "@/components/filters/filter-button";
import { FilterSheet } from "@/components/filters/filter-sheet";
import { DebouncedSearchInput } from "@/components/search-input";
import { Pagination } from "@/components/pagination";
import { EmptyState, ErrorState, LoadingState, RetryButton } from "@/components/feedback/states";
import { useFormatters } from "@/lib/format";
import { rememberListUrl } from "@/lib/last-list-url";
import { useParcelsList } from "../hooks/use-parcels-list";
import { ParcelFilterControls } from "./parcel-filters";
import { ParcelCard } from "./parcel-card";

export function ParcelList() {
  const t = useTranslations("ParcelList");
  const tStatus = useTranslations("ParcelStatus");
  const { bdt, date, time } = useFormatters();
  const routes = useRouteBase();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const {
    parcels,
    pagination,
    isLoading,
    isFetching,
    isError,
    refetch,
    page,
    limit,
    setLimit,
    setPage,
    filters,
    updateFilter,
    resetFilters,
    activeFilterCount,
  } = useParcelsList();

  const createHref = routes.createBooking;
  const totalItems = pagination?.total ?? parcels.length;
  const totalPages = pagination?.totalPages ?? 1;

  const columns: ColumnDef<ParcelListItem>[] = useMemo(
    () => [
      {
        accessorKey: "trackingCode",
        header: t("tracking"),
        cell: ({ row }) => (
          <Link
            href={routes.parcel(row.original.id)}
            className="flex items-center gap-1.5 font-mono font-semibold text-primary hover:underline"
          >
            <Hash className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            {row.original.trackingCode}
          </Link>
        ),
      },
      {
        accessorKey: "recipientName",
        header: t("recipient"),
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-foreground">{row.original.recipientName}</p>
            <p className="mt-0.5 font-mono text-caption text-muted-foreground">
              {row.original.recipientPhone}
            </p>
          </div>
        ),
      },
      {
        id: "destination",
        header: t("address"),
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-foreground">
              {row.original.thana}, {row.original.district}
            </p>
            <p
              className="mt-0.5 max-w-[220px] truncate text-caption text-muted-foreground"
              title={row.original.deliveryAddress}
            >
              {row.original.deliveryAddress}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "codAmount",
        header: t("cod"),
        cell: ({ row }) => (
          <div>
            <p className="font-semibold tabular-nums text-foreground">
              {bdt(row.original.codAmount)}
            </p>
            <p className="mt-0.5 text-caption text-muted-foreground">
              {t("fee")} {bdt(row.original.deliveryFee)}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: t("status"),
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "createdAt",
        header: t("date"),
        cell: ({ row }) => (
          <div className="text-caption text-muted-foreground">
            <span>{date(row.original.createdAt)}</span>
            <br />
            <span>{time(row.original.createdAt)}</span>
          </div>
        ),
      },
      {
        id: "actions",
        header: () => <span className="block text-right">{t("actions")}</span>,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1.5">
            <Link
              href={routes.parcelLabel(row.original.id)}
              aria-label={t("printLabel")}
              title={t("printLabel")}
            >
              <Button variant="ghost" size="icon-sm" aria-label={t("printLabel")}>
                <Printer className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </Link>
            <Link href={routes.parcel(row.original.id)}>
              <Button variant="outline" size="sm" className="gap-1">
                <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                {t("view")}
              </Button>
            </Link>
          </div>
        ),
      },
    ],
    [bdt, date, time, t, routes],
  );

  /** Chips mirror the URL, so clearing one only removes that filter. */
  const chips: ActiveFilter[] = useMemo(() => {
    const active: ActiveFilter[] = [];
    if (filters.search.trim()) {
      active.push({ key: "search", label: t("searchPlaceholder"), display: filters.search.trim() });
    }
    if (filters.status) {
      active.push({
        key: "status",
        label: t("status"),
        display: tStatus(statusConfig(filters.status).labelKey),
      });
    }
    if (filters.district.trim()) {
      active.push({
        key: "district",
        label: t("filterDistrict"),
        display: filters.district.trim(),
      });
    }
    if (filters.thana.trim()) {
      active.push({ key: "thana", label: t("filterThana"), display: filters.thana.trim() });
    }
    if (filters.from) {
      active.push({ key: "from", label: t("filterFrom"), display: filters.from });
    }
    if (filters.to) {
      active.push({ key: "to", label: t("filterTo"), display: filters.to });
    }
    return active;
  }, [filters, t, tStatus]);

  const handleRemoveFilter = useCallback(
    (key: string) => {
      // Every list filter is optional, so "" clears exactly one of them.
      updateFilter(key as "status", "");
    },
    [updateFilter],
  );

  const handleLimitChange = useCallback(
    (nextLimit: number) => {
      // setLimit already returns to page 1 in a single navigation.
      setLimit(nextLimit);
    },
    [setLimit],
  );

  // Remember this workspace so details → Back restores filters and page.
  const listBase = routes.parcels;
  React.useEffect(() => {
    rememberListUrl(listBase);
  });

  const hasNoResults = !isLoading && !isError && parcels.length === 0;

  return (
    <div className="w-full space-y-4">
      <Card>
        <CardHeader className="flex flex-col items-start justify-between gap-4 border-b border-border sm:flex-row sm:items-center">
          <div>
            <CardTitle className="text-h3">{t("title")}</CardTitle>
            <CardDescription className="mt-1">{t("description")}</CardDescription>
          </div>
          {createHref ? (
            <Link href={createHref}>
              <Button className="gap-2">
                <Plus className="h-4 w-4" aria-hidden="true" />
                {t("create")}
              </Button>
            </Link>
          ) : null}
        </CardHeader>
      </Card>

      {/* Search + mobile filter trigger */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {/* The hook debounces the URL write, so the field reports every keystroke. */}
        <DebouncedSearchInput
          className="flex-1 sm:max-w-none"
          debounceMs={0}
          slashShortcut
          value={filters.search}
          onChange={(value) => updateFilter("search", value)}
          placeholder={t("searchPlaceholder")}
          ariaLabel={t("searchPlaceholder")}
          loading={isFetching}
        />

        <FilterButton
          count={activeFilterCount}
          label={t("filters")}
          onClick={() => setFiltersOpen(true)}
          expanded={filtersOpen}
        />
      </div>

      <ActiveFilters filters={chips} onRemove={handleRemoveFilter} onClearAll={resetFilters} />

      {/* Desktop filters */}
      <div className="hidden rounded-md border border-border bg-surface p-4 lg:block">
        <ParcelFilterControls
          idPrefix="desktop"
          filters={filters}
          updateFilter={updateFilter}
          resetFilters={resetFilters}
          activeFilterCount={activeFilterCount}
        />
      </div>

      {/* Mobile filter sheet */}
      <FilterSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        title={t("filters")}
        activeFilters={chips}
        onRemoveFilter={handleRemoveFilter}
        onClearAll={resetFilters}
        applyLabel={t("applyFilters")}
        clearLabel={t("clearFilters")}
      >
        <ParcelFilterControls
          idPrefix="mobile"
          stacked
          filters={filters}
          updateFilter={updateFilter}
          resetFilters={resetFilters}
          activeFilterCount={activeFilterCount}
        />
      </FilterSheet>

      {/* States */}
      {isError ? (
        <div className="rounded-md border border-border bg-surface">
          <ErrorState
            title={t("loadErrorTitle")}
            description={t("loadErrorDescription")}
            action={<RetryButton label={t("retry")} onRetry={() => void refetch()} />}
          />
        </div>
      ) : isLoading ? (
        <div className="rounded-md border border-border bg-surface">
          <LoadingState title={t("loading")} />
        </div>
      ) : hasNoResults ? (
        <div className="rounded-md border border-border bg-surface">
          <EmptyState
            title={activeFilterCount > 0 ? t("noResultsTitle") : t("emptyTitle")}
            description={activeFilterCount > 0 ? t("noResultsDescription") : t("emptyDescription")}
            action={
              activeFilterCount > 0 ? (
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  {t("clearFilters")}
                </Button>
              ) : createHref ? (
                <Link href={createHref}>
                  <Button size="sm" className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    {t("create")}
                  </Button>
                </Link>
              ) : undefined
            }
          />
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block">
            <DataTable
              columns={columns}
              data={parcels}
              isLoading={isFetching && parcels.length === 0}
              totalItems={totalItems}
              pageCount={totalPages}
              currentPage={page}
              itemsPerPage={limit}
              onPageChange={setPage}
              onLimitChange={handleLimitChange}
              emptyMessage={t("emptyTitle")}
            />
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden">
            <ul className="space-y-3">
              {parcels.map((parcel) => (
                <ParcelCard key={parcel.id} parcel={parcel} />
              ))}
            </ul>
          </div>

          {/* Mobile pager: shared control, cursor-safe when the total is unknown */}
          <Pagination
            className="lg:hidden"
            page={page}
            totalPages={pagination ? totalPages : undefined}
            hasNextPage={parcels.length >= limit}
            onPageChange={setPage}
            disabled={isFetching}
            label={t("paginationLabel")}
          />
        </>
      )}
    </div>
  );
}
