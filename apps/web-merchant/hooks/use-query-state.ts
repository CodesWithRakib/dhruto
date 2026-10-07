"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/lib/navigation";

/**
 * Centralized typed URL query-state utility.
 *
 * Read/write/delete/reset params without scattering URLSearchParams logic.
 * Supports strings, numbers, booleans and string arrays with defaults, and
 * always preserves unrelated params. Designed for list pages:
 * search/filter/sort changes reset `page` to 1 via `resetPageKeys`.
 *
 * All mutators are referentially stable and always operate on the latest URL
 * (via ref), so they are safe to capture in callbacks and effects.
 */

export type QueryParamValue = string | number | boolean | readonly string[] | null | undefined;

export interface QueryStateApi {
  getString: (key: string, fallback?: string) => string | undefined;
  getNumber: (key: string, fallback?: number) => number | undefined;
  getBoolean: (key: string, fallback?: boolean) => boolean | undefined;
  getArray: (key: string) => string[];
  set: (patch: Record<string, QueryParamValue>, opts?: { resetPageKeys?: string[] }) => void;
  remove: (...keys: string[]) => void;
  reset: (keys: string[]) => void;
  raw: URLSearchParams;
}

const DEFAULT_PAGE_KEYS = ["page", "cursor"];

function readString(params: URLSearchParams, key: string, fallback?: string): string | undefined {
  const value = params.get(key);
  return value === null || value === "" ? fallback : value;
}

export function useQueryState(): QueryStateApi {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Always-fresh references: mutators below never go stale, even when
  // captured once in a useCallback/useEffect with empty deps.
  const live = React.useRef({ pathname, searchParams, router });
  live.current = { pathname, searchParams, router };

  const apply = React.useCallback((next: URLSearchParams) => {
    const { pathname: path, router: nav } = live.current;
    const query = next.toString();
    nav.replace(`${path}${query ? `?${query}` : ""}`, { scroll: false });
  }, []);

  const set = React.useCallback(
    (patch: Record<string, QueryParamValue>, opts?: { resetPageKeys?: string[] }): void => {
      const next = new URLSearchParams(live.current.searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        next.delete(key);
        if (value === null || value === undefined || value === "") continue;
        if (Array.isArray(value)) {
          if (value.length === 0) continue;
          next.set(key, value.join(","));
        } else {
          next.set(key, String(value));
        }
      }
      for (const pageKey of opts?.resetPageKeys ?? DEFAULT_PAGE_KEYS) {
        next.delete(pageKey);
      }
      apply(next);
    },
    [apply],
  );

  const remove = React.useCallback(
    (...keys: string[]): void => {
      const next = new URLSearchParams(live.current.searchParams.toString());
      for (const key of keys) next.delete(key);
      apply(next);
    },
    [apply],
  );

  const reset = React.useCallback(
    (keys: string[]): void => {
      const next = new URLSearchParams(live.current.searchParams.toString());
      for (const key of keys) next.delete(key);
      apply(next);
    },
    [apply],
  );

  const raw = React.useMemo(() => new URLSearchParams(searchParams.toString()), [searchParams]);

  return React.useMemo<QueryStateApi>(
    () => ({
      getString: (key, fallback) => readString(raw, key, fallback),
      getNumber: (key, fallback) => {
        const value = readString(raw, key);
        if (value === undefined) return fallback;
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
      },
      getBoolean: (key, fallback) => {
        const value = readString(raw, key);
        if (value === undefined) return fallback;
        if (value === "true" || value === "1") return true;
        if (value === "false" || value === "0") return false;
        return fallback;
      },
      getArray: (key) => {
        const multi = raw.getAll(key);
        if (multi.length > 1) return multi;
        const single = raw.get(key);
        if (!single) return [];
        return single
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      },
      set,
      remove,
      reset,
      raw,
    }),
    [raw, set, remove, reset],
  );
}
