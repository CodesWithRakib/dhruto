/**
 * Date-range presets for the shipment list.
 *
 * Pure and injectable (`now`) so the boundaries can be unit tested without
 * freezing the clock. Boundaries are local midnight → local end-of-day, which
 * matches the `from`/`to` date inputs, and are converted to the ISO instants
 * the API expects (`createdAt >= from`, `createdAt <= to`).
 */

export type DateRangePreset = "today" | "last7" | "last30";

/** Days *before* today that each preset reaches back to (inclusive of today). */
const PRESET_SPAN_DAYS: Record<DateRangePreset, number> = {
  today: 0,
  last7: 6,
  last30: 29,
};

export interface DateRangeValue {
  from: string;
  to: string;
}

export function buildDateRange(preset: DateRangePreset, now: Date = new Date()): DateRangeValue {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const from = new Date(startOfToday);
  from.setDate(from.getDate() - PRESET_SPAN_DAYS[preset]);

  const to = new Date(startOfToday);
  to.setHours(23, 59, 59, 999);

  return { from: from.toISOString(), to: to.toISOString() };
}
