"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { PaginationMeta, ParcelStatus } from "@dhruto/contracts";
import { useGetParcelsQuery, type ParcelListParams } from "../api/parcels.api";

/** Merchant-facing list filters. All of them are applied by the API. */
export interface ParcelListFilters {
  search: string;
  status: ParcelStatus | "";
  district: string;
  thana: string;
  from: string;
  to: string;
}

const EMPTY_FILTERS: ParcelListFilters = {
  search: "",
  status: "",
  district: "",
  thana: "",
  from: "",
  to: "",
};

export const PARCELS_DEFAULT_LIMIT = 20;
const SEARCH_DEBOUNCE_MS = 400;

/** Debounces a fast-changing value (typing) before it reaches the API. */
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

export function useParcelsList() {
  const [filters, setFilters] = useState<ParcelListFilters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PARCELS_DEFAULT_LIMIT);
  const [sort, setSort] = useState<ParcelListParams["sort"]>("createdAt");
  const [order, setOrder] = useState<ParcelListParams["order"]>("DESC");

  const debouncedSearch = useDebouncedValue(filters.search, SEARCH_DEBOUNCE_MS);
  const debouncedDistrict = useDebouncedValue(filters.district, SEARCH_DEBOUNCE_MS);
  const debouncedThana = useDebouncedValue(filters.thana, SEARCH_DEBOUNCE_MS);

  const queryParams = useMemo<ParcelListParams>(
    () => ({
      page,
      limit,
      sort,
      order,
      status: filters.status || undefined,
      search: debouncedSearch.trim() || undefined,
      district: debouncedDistrict.trim() || undefined,
      thana: debouncedThana.trim() || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
    }),
    [
      page,
      limit,
      sort,
      order,
      filters.status,
      filters.from,
      filters.to,
      debouncedSearch,
      debouncedDistrict,
      debouncedThana,
    ],
  );

  const { data, isFetching, isLoading, isError, refetch } = useGetParcelsQuery(queryParams);

  /**
   * Any filter change invalidates the current page offset, so the list returns
   * to page 1 instead of showing an empty page far past the end of the result.
   */
  useEffect(() => {
    setPage(1);
  }, [
    filters.status,
    filters.from,
    filters.to,
    debouncedSearch,
    debouncedDistrict,
    debouncedThana,
  ]);

  const updateFilter = useCallback(
    <K extends keyof ParcelListFilters>(key: K, value: ParcelListFilters[K]) => {
      setFilters((current) => ({ ...current, [key]: value }));
    },
    [],
  );

  const resetFilters = useCallback(() => setFilters(EMPTY_FILTERS), []);

  // The response interceptor flattens list pagination onto `meta` itself
  // (`meta.page`, `meta.limit`, ...), not onto a nested `meta.pagination`.
  const pagination: PaginationMeta | undefined = data?.meta;
  const activeFilterCount = useMemo(
    () =>
      (filters.status ? 1 : 0) +
      (debouncedSearch.trim() ? 1 : 0) +
      (filters.district.trim() ? 1 : 0) +
      (filters.thana.trim() ? 1 : 0) +
      (filters.from ? 1 : 0) +
      (filters.to ? 1 : 0),
    [
      filters.status,
      filters.district,
      filters.thana,
      filters.from,
      filters.to,
      debouncedSearch,
    ],
  );

  return {
    parcels: data?.data ?? [],
    pagination,
    // The first load has no data yet; later page changes keep the previous rows visible.
    isLoading: isLoading || (isFetching && !data),
    isFetching,
    isError,
    refetch,
    page: pagination?.page ?? page,
    limit,
    setLimit,
    setPage,
    sort,
    setSort,
    order,
    setOrder,
    filters,
    updateFilter,
    resetFilters,
    activeFilterCount,
  };
}
