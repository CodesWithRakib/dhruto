"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ParcelStatus } from "@dhruto/contracts";
import type { PaginationMeta } from "@dhruto/contracts";
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

const VALID_SORTS: ReadonlyArray<NonNullable<ParcelListParams["sort"]>> = [
  "createdAt",
  "updatedAt",
  "codAmount",
  "deliveryFee",
];
const VALID_LIMITS = [5, 10, 20, 50];
const VALID_STATUSES = new Set<string>(Object.values(ParcelStatus));

export interface NormalizedListQuery {
  page: number;
  limit: number;
  sort: NonNullable<ParcelListParams["sort"]>;
  order: NonNullable<ParcelListParams["order"]>;
  status: ParcelStatus | "";
}

/**
 * Malformed query strings (?page=-1, ?limit=abc, ?sort=dropTable) must never
 * reach the API. Unknown values fall back to the list defaults, so a pasted
 * or hand-edited URL degrades to page 1 instead of a broken request.
 */
export function normalizeParcelListQuery(input: {
  page: number;
  limit: number;
  sort: string;
  order: string;
  status: string;
}): NormalizedListQuery {
  const page = Number.isFinite(input.page) ? Math.floor(input.page) : 1;
  return {
    page: page >= 1 ? page : 1,
    limit: VALID_LIMITS.includes(input.limit) ? input.limit : PARCELS_DEFAULT_LIMIT,
    sort: (VALID_SORTS as readonly string[]).includes(input.sort)
      ? (input.sort as NonNullable<ParcelListParams["sort"]>)
      : "createdAt",
    order: input.order?.toUpperCase() === "ASC" ? "ASC" : "DESC",
    status: VALID_STATUSES.has(input.status) ? (input.status as ParcelStatus) : "",
  };
}

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

  const rawPage = query.getNumber("page", 1) ?? 1;
  const rawLimit = query.getNumber("limit", PARCELS_DEFAULT_LIMIT) ?? PARCELS_DEFAULT_LIMIT;
  const rawSort = query.getString("sort", "createdAt") ?? "createdAt";
  const rawOrder = query.getString("order", "DESC") ?? "DESC";
  const rawStatus = query.getString("status", "") ?? "";
  const normalized = normalizeParcelListQuery({
    page: rawPage,
    limit: rawLimit,
    sort: rawSort,
    order: rawOrder,
    status: rawStatus,
  });
  const page = normalized.page;
  const limit = normalized.limit;
  const sort = normalized.sort;
  const order = normalized.order;

  const urlFilters = useMemo<ParcelListFilters>(
    () => ({
      search: query.getString("search", "") ?? "",
      status: normalized.status,
      district: query.getString("district", "") ?? "",
      thana: query.getString("thana", "") ?? "",
      from: query.getString("from", "") ?? "",
      to: query.getString("to", "") ?? "",
    }),
    [query, normalized.status],
  );

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
    (next: number) => query.set({ limit: next }),
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
