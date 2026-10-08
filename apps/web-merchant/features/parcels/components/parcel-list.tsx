"use client";

import React, { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Button,
  DataTable,
  type ColumnDef,
  type DataTableLabels,
} from "@dhruto/ui";
import { Eye, MapPin, Package, Plus, Printer, RefreshCw, Search, SearchX, User } from "lucide-react";
import { ParcelStatus, type ParcelListItem } from "@dhruto/contracts";
import { Link } from "@/lib/navigation";
import { useRouteBase } from "@/config/route-base";
import { statusConfig } from "@/config/status";
import { StatusBadge } from "@/components/data-display/status-badge";
import { CopyButton } from "@/components/data-display/copy-button";
import { ActiveFilters, type ActiveFilter } from "@/components/active-filters";
import { FilterButton } from "@/components/filters/filter-button";
import { FilterSheet } from "@/components/filters/filter-sheet";
import { FilterTabs } from "@/components/filter-tabs";
import { DebouncedSearchInput } from "@/components/search-input";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { EmptyState, ErrorState, RetryButton } from "@/components/feedback/states";
import { cn } from "@/lib/cn";
import { useFormatters } from "@/lib/format";
import { rememberListUrl } from "@/lib/last-list-url";
import { useParcelsList, type ParcelListFilters } from "../hooks/use-parcels-list";
import { ParcelFilterControls } from "./parcel-filters";
import { ParcelSortSelect } from "./parcel-sort-select";
import { ParcelCard } from "./parcel-card";
import { ParcelCardSkeletonList } from "./parcel-card-skeleton";

/**
 * Quick status lenses. Each maps to exactly one `ParcelStatus` the list
 * endpoint filters on — no client-side grouping, no invented buckets.
 */
const QUICK_TABS: ReadonlyArray<{ value: ParcelStatus | ""; labelKey: string }> = [
  { value: "", labelKey: "all" },
  { value: ParcelStatus.CREATED, labelKey: "filterCreated" },
  { value: ParcelStatus.IN_TRANSIT, labelKey: "filterInTransit" },
  { value: ParcelStatus.OUT_FOR_DELIVERY, labelKey: "filterOutForDelivery" },
  { value: ParcelStatus.DELIVERED, labelKey: "filterDelivered" },
  { value: ParcelStatus.RETURNED_TO_MERCHANT, labelKey: "filterReturned" },
];

export function ParcelList() {
  const t = useTranslations("ParcelList");
  const tStatus = useTranslations("ParcelStatus");
  const tTable = useTranslations("DataTable");
  const { bdt, date, time, number } = useFormatters();
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
    setDateRange,
    clearDateRange,
    resetFilters,
    activeFilterCount,
    sortValue,
    setSortValue,
  } = useParcelsList();

  const createHref = routes.createBooking;
  const totalItems = pagination?.total ?? parcels.length;
  const totalPages = pagination?.totalPages ?? 1;
  const hasActiveFilters = activeFilterCount > 0;
  const hasNoResults = !isLoading && !isError && parcels.length === 0;

  const columns: ColumnDef<ParcelListItem>[] = useMemo(
    () => [
      {
        accessorKey: "trackingCode",
        header: t("tracking"),
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Link
              href={routes.parcel(row.original.id)}
              className="font-mono text-body-sm font-semibold text-primary hover:underline"
            >
              {row.original.trackingCode}
            </Link>
            <CopyButton
              value={row.original.trackingCode}
              label={t("copyTrackingCode")}
              copiedLabel={t("trackingCopied")}
              errorLabel={t("copyFailed")}
            />
          </div>
        ),
      },
      {
        accessorKey: "recipientName",
        header: t("recipient"),
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 font-medium text-foreground">
              <User className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="truncate">{row.original.recipientName}</span>
            </p>
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
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 font-medium text-foreground">
              <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="truncate">
                {row.original.thana}, {row.original.district}
              </span>
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
        cell: ({ row }) => <StatusBadge status={row.original.status} withIcon />,
      },
      {
        accessorKey: "createdAt",
        header: t("date"),
        cell: ({ row }) => (
          <div className="text-caption text-muted-foreground">
            <span className="block whitespace-nowrap">{date(row.original.createdAt)}</span>
            <span className="block whitespace-nowrap">{time(row.original.createdAt)}</span>
          </div>
        ),
      },
      {
        id: "actions",
        header: () => <span className="block text-right">{t("actions")}</span>,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <Link
              href={routes.parcelLabel(row.original.id)}
              aria-label={t("printLabel")}
              title={t("printLabel")}
            >
              <Button variant="ghost" size="icon-sm" aria-label={t("printLabel")}>
                <Printer className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </Link>
            <Link
              href={routes.parcel(row.original.id)}
              aria-label={`${t("view")} ${row.original.trackingCode}`}
            >
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

  /** Translated chrome for the shared table (pagination, empty, error). */
  const tableLabels: DataTableLabels = useMemo(
    () => ({
      emptyMessage: t("emptyTitle"),
      emptyHint: t("noResultsDescription"),
      errorMessage: t("loadErrorDescription"),
      retry: t("retry"),
      clearSearch: t("clearSearch"),
      showingRange: tTable("showingRange", { from: "{from}", to: "{to}", total: "{total}" }),
      perPage: tTable("perPage"),
      pageOf: tTable("pageOf", { page: "{page}", totalPages: "{totalPages}" }),
      previous: tTable("previous"),
      next: tTable("next"),
    }),
    [t, tTable],
  );

  /**
   * Quick tabs plus, when the active status is not one of them (picked from the
   * full status list or a shared URL), a pill for it — so the selected lens is
   * always visible instead of every tab reading as unselected.
   */
  const quickTabOptions = useMemo(() => {
    const options = QUICK_TABS.map((tab) => ({ value: tab.value, label: t(tab.labelKey) }));
    if (filters.status && !QUICK_TABS.some((tab) => tab.value === filters.status)) {
      options.push({
        value: filters.status,
        label: tStatus(statusConfig(filters.status).labelKey),
      });
    }
    return options;
  }, [filters.status, t, tStatus]);

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
      active.push({ key: "from", label: t("filterFrom"), display: filters.from.slice(0, 10) });
    }
    if (filters.to) {
      active.push({ key: "to", label: t("filterTo"), display: filters.to.slice(0, 10) });
    }
    return active;
  }, [filters, t, tStatus]);

  const handleRemoveFilter = useCallback(
    (key: string) => {
      // Every list filter is optional, so "" clears exactly one of them.
      updateFilter(key as keyof ParcelListFilters, "" as ParcelListFilters[keyof ParcelListFilters]);
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

  const handleRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  // Skeleton whenever the first page is still in flight — including while a
  // refetch has emptied the visible set — so the table never flashes its own
  // "no records" row above the page-level empty state.
  const isTableLoading = isLoading || (isFetching && parcels.length === 0);

  const table = (
    <DataTable
      columns={columns}
      data={parcels}
      isLoading={isTableLoading}
      totalItems={totalItems}
      pageCount={totalPages}
      currentPage={page}
      itemsPerPage={limit}
      onPageChange={setPage}
      onLimitChange={handleLimitChange}
      labels={tableLabels}
      formatNumber={number}
    />
  );

  return (
    <div className="w-full space-y-5">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <>
            {createHref ? (
              <Link href={createHref}>
                <Button size="sm" className="h-10 gap-2 text-xs">
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("create")}
                </Button>
              </Link>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isFetching}
              className="h-10 gap-2 text-xs"
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5", isFetching && "animate-spin")}
                aria-hidden="true"
              />
              {t("refresh")}
            </Button>
          </>
        }
      />

      {/* Result context: how many shipments the current view contains. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="text-body-sm text-muted-foreground" aria-live="polite">
          <span className="text-h4 font-bold tabular-nums text-foreground">
            {number(totalItems)}
          </span>{" "}
          {t("countShipments")}
        </p>
        {hasActiveFilters ? (
          <span className="text-caption text-muted-foreground">
            · {t("countFiltered", { count: activeFilterCount })}
          </span>
        ) : null}
      </div>

      {/* Quick status lenses — single status values the API understands. */}
      <FilterTabs
        value={filters.status}
        onValueChange={(value) =>
          updateFilter("status", value as ParcelListFilters["status"])
        }
        options={quickTabOptions}
        label={t("quickFiltersLabel")}
      />

      {/* Search + sort + mobile filter trigger */}
      <div className="space-y-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {/* The hook debounces the URL write, so the field reports every keystroke. */}
          <DebouncedSearchInput
            className="flex-1 sm:max-w-md"
            debounceMs={0}
            slashShortcut
            value={filters.search}
            onChange={(value) => updateFilter("search", value)}
            placeholder={t("searchPlaceholder")}
            ariaLabel={t("searchPlaceholder")}
            clearLabel={t("clearSearch")}
            loading={isFetching}
          />
          <ParcelSortSelect
            idPrefix="desktop"
            className="hidden lg:block"
            value={sortValue}
            onChange={setSortValue}
          />
          <FilterButton
            count={activeFilterCount}
            label={t("filters")}
            onClick={() => setFiltersOpen(true)}
            expanded={filtersOpen}
          />
        </div>
        <p className="text-caption text-muted-foreground">{t("searchHint")}</p>
      </div>

      <ActiveFilters filters={chips} onRemove={handleRemoveFilter} onClearAll={resetFilters} />

      {/* Desktop filters */}
      <div className="hidden rounded-md border border-border bg-surface p-4 lg:block">
        <ParcelFilterControls
          idPrefix="desktop"
          filters={filters}
          updateFilter={updateFilter}
          setDateRange={setDateRange}
          clearDateRange={clearDateRange}
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
          setDateRange={setDateRange}
          clearDateRange={clearDateRange}
          resetFilters={resetFilters}
          activeFilterCount={activeFilterCount}
        />
        <ParcelSortSelect
          idPrefix="mobile"
          value={sortValue}
          onChange={setSortValue}
          className="space-y-1.5"
        />
      </FilterSheet>

      {/* States */}
      {isError ? (
        <div className="rounded-md border border-border bg-surface">
          <ErrorState
            title={t("loadErrorTitle")}
            description={t("loadErrorDescription")}
            action={<RetryButton label={t("retry")} onRetry={handleRefresh} />}
          />
        </div>
      ) : isLoading ? (
        // Skeletons mirror the real table/cards so nothing shifts on arrival.
        <>
          <div className="hidden lg:block">{table}</div>
          <div className="lg:hidden">
            <ParcelCardSkeletonList />
          </div>
        </>
      ) : hasNoResults ? (
        <div className="rounded-md border border-border bg-surface">
          {hasActiveFilters ? (
            <EmptyState
              icon={SearchX}
              title={t("noResultsTitle")}
              description={t("noResultsHint")}
              action={
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {filters.search.trim() ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => updateFilter("search", "")}
                    >
                      <Search className="h-3.5 w-3.5" aria-hidden="true" />
                      {t("clearSearch")}
                    </Button>
                  ) : null}
                  <Button variant="outline" size="sm" onClick={resetFilters}>
                    {t("clearFilters")}
                  </Button>
                </div>
              }
            />
          ) : (
            <EmptyState
              icon={Package}
              title={t("emptyTitle")}
              description={t("emptyDescription")}
              action={
                <div className="flex flex-col items-center gap-2">
                  {createHref ? (
                    <Link href={createHref}>
                      <Button size="sm" className="gap-1.5">
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                        {t("create")}
                      </Button>
                    </Link>
                  ) : null}
                  <p className="text-caption text-muted-foreground">{t("emptyHint")}</p>
                </div>
              }
            />
          )}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block">{table}</div>

          {/* Mobile cards: purpose-built for small screens, never a scrolled table */}
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
