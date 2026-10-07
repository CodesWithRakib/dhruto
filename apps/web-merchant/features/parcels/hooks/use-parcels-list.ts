"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { PaginationMeta, ParcelStatus } from "@dhruto/contracts";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useQueryState } from "@/hooks/use-query-state";
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

/**
 * Free-text filters: the field keeps a local copy so typing stays responsive,
 * and only the settled value is written to the URL, so the API sees one
 * request per pause instead of one per keystroke.
 */
const TEXT_KEYS = ["search", "district", "thana"] as const;

const FILTER_KEYS: string[] = ["search", "status", "district", "thana", "from", "to"];

type TextKey = (typeof TEXT_KEYS)[number];

function isTextKey(key: keyof ParcelListFilters): key is TextKey {
  return (TEXT_KEYS as readonly string[]).includes(key);
}

/**
 * Parcel list state lives in the URL: filters, sort and pagination survive a
 * reload, the back button and a shared link. The API is the only thing that
 * filters — the client never re-filters a page locally.
 */
export function useParcelsList() {
  const query = useQueryState();

  const urlFilters = useMemo<ParcelListFilters>(
    () => ({
      search: query.getString("search", "") ?? "",
      status: (query.getString("status", "") ?? "") as ParcelStatus | "",
      district: query.getString("district", "") ?? "",
      thana: query.getString("thana", "") ?? "",
      from: query.getString("from", "") ?? "",
      to: query.getString("to", "") ?? "",
    }),
    [query],
  );

  const page = query.getNumber("page", 1) ?? 1;
  const limit = query.getNumber("limit", PARCELS_DEFAULT_LIMIT) ?? PARCELS_DEFAULT_LIMIT;
  const sort = (query.getString("sort", "createdAt") ?? "createdAt") as NonNullable<
    ParcelListParams["sort"]
  >;
  const order = (query.getString("order", "DESC") ?? "DESC") as NonNullable<
    ParcelListParams["order"]
  >;

  const [search, setSearch] = useState(urlFilters.search);
  const [district, setDistrict] = useState(urlFilters.district);
  const [thana, setThana] = useState(urlFilters.thana);

  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);
  const debouncedDistrict = useDebouncedValue(district, SEARCH_DEBOUNCE_MS);
  const debouncedThana = useDebouncedValue(thana, SEARCH_DEBOUNCE_MS);

  // Adopt URL changes that did not come from this field (back/forward,
  // "clear filters", a pasted link) without fighting the in-flight text.
  useEffect(() => {
    setSearch((current) => (current.trim() === urlFilters.search ? current : urlFilters.search));
  }, [urlFilters.search]);
  useEffect(() => {
    setDistrict((current) =>
      current.trim() === urlFilters.district ? current : urlFilters.district,
    );
  }, [urlFilters.district]);
  useEffect(() => {
    setThana((current) => (current.trim() === urlFilters.thana ? current : urlFilters.thana));
  }, [urlFilters.thana]);

  // Commit settled text to the URL. `set` drops `page`/`cursor`, so every
  // filter change returns to the first page instead of an empty tail page.
  useEffect(() => {
    const next: Record<string, string | null> = {};
    if (debouncedSearch.trim() !== urlFilters.search) next.search = debouncedSearch.trim() || null;
    if (debouncedDistrict.trim() !== urlFilters.district)
      next.district = debouncedDistrict.trim() || null;
    if (debouncedThana.trim() !== urlFilters.thana) next.thana = debouncedThana.trim() || null;
    if (Object.keys(next).length > 0) query.set(next);
  }, [
    debouncedSearch,
    debouncedDistrict,
    debouncedThana,
    urlFilters.search,
    urlFilters.district,
    urlFilters.thana,
    query,
  ]);

  const queryParams = useMemo<ParcelListParams>(
    () => ({
      page,
      limit,
      sort,
      order,
      status: urlFilters.status || undefined,
      search: debouncedSearch.trim() || undefined,
      district: debouncedDistrict.trim() || undefined,
      thana: debouncedThana.trim() || undefined,
      from: urlFilters.from || undefined,
      to: urlFilters.to || undefined,
    }),
    [
      page,
      limit,
      sort,
      order,
      urlFilters.status,
      urlFilters.from,
      urlFilters.to,
      debouncedSearch,
      debouncedDistrict,
      debouncedThana,
    ],
  );

  const { data, isFetching, isLoading, isError, refetch } = useGetParcelsQuery(queryParams);

  const updateFilter = useCallback(
    <K extends keyof ParcelListFilters>(key: K, value: ParcelListFilters[K]) => {
      if (isTextKey(key)) {
        const text = String(value);
        if (key === "search") setSearch(text);
        if (key === "district") setDistrict(text);
        if (key === "thana") setThana(text);
        return;
      }
      query.set({ [key]: value === "" ? null : String(value) });
    },
    [query],
  );

  const resetFilters = useCallback(() => {
    setSearch("");
    setDistrict("");
    setThana("");
    query.reset([...FILTER_KEYS]);
  }, [query]);

  const setPage = useCallback(
    (next: number) => query.set({ page: next }, { resetPageKeys: [] }),
    [query],
  );

  const setLimit = useCallback(
    (next: number) => query.set({ limit: next }, { resetPageKeys: [] }),
    [query],
  );

  const setSort = useCallback(
    (next: NonNullable<ParcelListParams["sort"]>) =>
      query.set({ sort: next }, { resetPageKeys: [] }),
    [query],
  );

  const setOrder = useCallback(
    (next: NonNullable<ParcelListParams["order"]>) =>
      query.set({ order: next }, { resetPageKeys: [] }),
    [query],
  );

  // The response interceptor flattens list pagination onto `meta` itself
  // (`meta.page`, `meta.limit`, ...), not onto a nested `meta.pagination`.
  const pagination: PaginationMeta | undefined = data?.meta;

  const filters: ParcelListFilters = useMemo(
    () => ({
      search,
      status: urlFilters.status,
      district,
      thana,
      from: urlFilters.from,
      to: urlFilters.to,
    }),
    [search, urlFilters, district, thana],
  );

  const activeFilterCount = useMemo(
    () =>
      (filters.status ? 1 : 0) +
      (debouncedSearch.trim() ? 1 : 0) +
      (debouncedDistrict.trim() ? 1 : 0) +
      (debouncedThana.trim() ? 1 : 0) +
      (filters.from ? 1 : 0) +
      (filters.to ? 1 : 0),
    [filters.status, filters.from, filters.to, debouncedSearch, debouncedDistrict, debouncedThana],
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
    emptyFilters: EMPTY_FILTERS,
  };
}
