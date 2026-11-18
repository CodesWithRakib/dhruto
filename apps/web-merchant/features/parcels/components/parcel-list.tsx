"use client";

import React, { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { DataTable, type DataTableLabels } from "@dhruto/ui";
import { ParcelStatus } from "@dhruto/contracts";
import { useRouteBase } from "@/config/route-base";
import { statusConfig } from "@/config/status";
import { ActiveFilters, type ActiveFilter } from "@/components/active-filters";
import { FilterButton } from "@/components/filters/filter-button";
import { FilterSheet } from "@/components/filters/filter-sheet";
import { FilterTabs } from "@/components/filter-tabs";
import { DebouncedSearchInput } from "@/components/search-input";
import { Pagination } from "@/components/pagination";
import { useFormatters } from "@/lib/format";
import { rememberListUrl } from "@/lib/last-list-url";
import { useQueryState } from "@/hooks/use-query-state";
import { useParcelsList, type ParcelListFilters } from "../hooks/use-parcels-list";
import { ParcelFilterControls } from "./parcel-filters";
import { ParcelSortSelect } from "./parcel-sort-select";
import { ParcelCard } from "./parcel-card";
import { ParcelCardSkeletonList } from "./parcel-card-skeleton";
import { BulkImportDialog } from "./bulk-import-dialog";
import { buildParcelListColumns } from "./list/parcel-list-columns";
import { ParcelListHeader } from "./list/parcel-list-header";
import { ParcelListEmptyStates } from "./list/parcel-list-empty-states";

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
  const query = useQueryState();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(
    () => query.getString("action") === "bulk" || query.getString("mode") === "bulk",
  );

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

  const columns = useMemo(
    () => buildParcelListColumns({ t, bdt, date, time, routes }),
    [bdt, date, time, t, routes],
  );

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
      active.push({ key: "district", label: t("filterDistrict"), display: filters.district.trim() });
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
      updateFilter(key as keyof ParcelListFilters, "" as ParcelListFilters[keyof ParcelListFilters]);
    },
    [updateFilter],
  );

  const handleLimitChange = useCallback(
    (nextLimit: number) => {
      setLimit(nextLimit);
    },
    [setLimit],
  );

  const listBase = routes.parcels;
  React.useEffect(() => {
    rememberListUrl(listBase);
  });

  const handleRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  const isTableLoading = isLoading || (isFetching && parcels.length === 0);

  const table = (
    <div className="relative overflow-hidden rounded-3xl bg-surface-elevated/85 backdrop-blur-md">
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
    </div>
  );

  return (
    <div className="w-full space-y-5">
      {bulkOpen ? <BulkImportDialog open onOpenChange={setBulkOpen} /> : null}

      <ParcelListHeader
        t={t}
        createHref={createHref}
        returnsHref={routes.returns}
        onBulkOpen={() => setBulkOpen(true)}
        onRefresh={handleRefresh}
        isFetching={isFetching}
        totalItems={totalItems}
        activeFilterCount={activeFilterCount}
        formatNumber={number}
      />

      {/* Quick status lenses */}
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
      <div className="hidden rounded-3xl bg-surface-elevated/90 p-5 backdrop-blur-md lg:block">
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

      {/* Main Content States */}
      {isError || hasNoResults ? (
        <ParcelListEmptyStates
          t={t}
          isError={isError}
          hasActiveFilters={hasActiveFilters}
          searchQuery={filters.search}
          createHref={createHref}
          onRefresh={handleRefresh}
          onClearSearch={() => updateFilter("search", "")}
          onResetFilters={resetFilters}
        />
      ) : isLoading ? (
        <>
          <div className="hidden lg:block">{table}</div>
          <div className="lg:hidden">
            <ParcelCardSkeletonList />
          </div>
        </>
      ) : (
        <>
          <div className="hidden lg:block">{table}</div>
          <div className="lg:hidden">
            <ul className="space-y-3">
              {parcels.map((parcel) => (
                <ParcelCard key={parcel.id} parcel={parcel} />
              ))}
            </ul>
          </div>
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
