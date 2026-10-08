import { describe, expect, it } from "vitest";
import { buildDateRange } from "../../features/parcels/lib/date-range";
import {
  PARCEL_SORT_OPTIONS,
  sortValueFromQuery,
} from "../../features/parcels/hooks/use-parcels-list";

describe("shipment date-range presets", () => {
  // Fixed "now": 8 Oct 2026, 14:30 local. Presets must be derived from the
  // local calendar day, not from UTC, so an operator in Dhaka gets whole days.
  const now = new Date(2026, 9, 8, 14, 30, 0, 0);
  const startOfDay = new Date(2026, 9, 8, 0, 0, 0, 0).toISOString();
  const endOfDay = new Date(2026, 9, 8, 23, 59, 59, 999).toISOString();

  it("treats 'today' as the whole local day", () => {
    expect(buildDateRange("today", now)).toEqual({ from: startOfDay, to: endOfDay });
  });

  it("reaches back 7 days inclusive of today", () => {
    const { from, to } = buildDateRange("last7", now);
    expect(from).toBe(new Date(2026, 9, 2, 0, 0, 0, 0).toISOString());
    expect(to).toBe(endOfDay);
  });

  it("reaches back 30 days inclusive of today", () => {
    const { from } = buildDateRange("last30", now);
    expect(from).toBe(new Date(2026, 8, 9, 0, 0, 0, 0).toISOString());
  });

  it("always emits ISO instants the API can filter on", () => {
    for (const preset of ["today", "last7", "last30"] as const) {
      const { from, to } = buildDateRange(preset, now);
      expect(Number.isNaN(Date.parse(from))).toBe(false);
      expect(Number.isNaN(Date.parse(to))).toBe(false);
      expect(new Date(from).getTime()).toBeLessThanOrEqual(new Date(to).getTime());
    }
  });
});

describe("shipment sort options", () => {
  it("maps every UI option to a real sort/order pair", () => {
    const allowedSorts = ["createdAt", "updatedAt", "codAmount", "deliveryFee"];
    const values = new Set<string>();
    for (const option of PARCEL_SORT_OPTIONS) {
      expect(allowedSorts).toContain(option.sort);
      expect(["ASC", "DESC"]).toContain(option.order);
      expect(values.has(option.value)).toBe(false);
      values.add(option.value);
    }
    expect(values.size).toBe(PARCEL_SORT_OPTIONS.length);
  });

  it("round-trips each option from the URL back into the select", () => {
    for (const option of PARCEL_SORT_OPTIONS) {
      expect(sortValueFromQuery(option.sort, option.order)).toBe(option.value);
    }
  });

  it("falls back to newest-first for an unrepresentable combination", () => {
    // deliveryFee sorting is API-supported but has no UI option yet.
    expect(sortValueFromQuery("deliveryFee", "DESC")).toBe("newest");
    expect(sortValueFromQuery("createdAt", "ASC")).toBe("oldest");
  });
});
