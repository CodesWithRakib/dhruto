"use client";

/**
 * Remembers the last parcel-list URL (filters, sort, page) so the details
 * Back action returns to the exact operational workspace instead of a
 * reset list. Scoped by list base path so merchant and admin namespaces
 * never leak into each other. sessionStorage only — no cross-session residue.
 */

const STORAGE_KEY = "dhruto:lastParcelListUrl";

interface StoredListUrl {
  base: string;
  search: string;
}

export function rememberListUrl(base: string): void {
  try {
    const payload: StoredListUrl = { base, search: window.location.search };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Storage unavailable (private mode) — details falls back to the list root.
  }
}

export function lastListUrl(base: string, fallback: string): string {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<StoredListUrl>;
    if (parsed.base !== base || typeof parsed.search !== "string") return fallback;
    return parsed.search ? `${base}${parsed.search}` : base;
  } catch {
    return fallback;
  }
}
