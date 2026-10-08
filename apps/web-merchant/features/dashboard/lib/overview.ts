import type { DashboardStats } from "@/features/merchants/api/merchants.api";

/**
 * Pure derivations for the merchant dashboard overview.
 *
 * Kept free of React and translations so the numbers the UI shows can be unit
 * tested directly, and so the overview never invents a metric: every value here
 * is computed from fields the dashboard API actually returns.
 */

export type AttentionKey = "pending" | "returned" | "cod";

export interface AttentionItem {
  key: AttentionKey;
  /** Parcel count for parcel-related items (0 for the COD item). */
  count: number;
  /** Pending COD amount in BDT, present only for the `cod` item. */
  amount?: number;
}

/** COD that has been booked but not yet collected. Never negative. */
export function pendingCodAmount(stats: DashboardStats): number {
  return Math.max(0, stats.totalCodAmount - stats.collectedCodAmount);
}

/**
 * Things a merchant should act on, derived from real stats. Items with a zero
 * count are omitted so the section only appears when there is something to do.
 */
export function buildAttentionItems(stats: DashboardStats): AttentionItem[] {
  const items: AttentionItem[] = [];

  if (stats.pendingOrders > 0) {
    items.push({ key: "pending", count: stats.pendingOrders });
  }
  if (stats.returnedOrders > 0) {
    items.push({ key: "returned", count: stats.returnedOrders });
  }

  const pendingCod = pendingCodAmount(stats);
  if (pendingCod > 0) {
    items.push({ key: "cod", count: 0, amount: pendingCod });
  }

  return items;
}

/** A merchant with no parcels at all gets the onboarding empty state. */
export function hasOverviewData(stats: DashboardStats): boolean {
  return stats.totalOrders > 0;
}

export interface TrendDatum {
  label: string;
  value: number;
}

/** `YYYY-MM-DD` → `MM-DD`, used only for compact chart axis labels. */
export function labelFromIso(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  return iso.slice(5);
}

/**
 * Map an analytics daily series to chart points, keeping only the last
 * `maxPoints` days so the axis stays readable on small screens.
 */
export function buildTrendData(
  points: Array<{ date: string; booked: number; delivered: number }>,
  field: "booked" | "delivered",
  maxPoints = 30,
): TrendDatum[] {
  return points.slice(-maxPoints).map((point) => ({
    label: labelFromIso(point.date),
    value: point[field],
  }));
}
