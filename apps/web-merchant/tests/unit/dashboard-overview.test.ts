import { describe, expect, it } from "vitest";
import type { DashboardStats } from "../../features/merchants/api/merchants.api";
import {
  buildAttentionItems,
  buildTrendData,
  hasOverviewData,
  labelFromIso,
  pendingCodAmount,
} from "../../features/dashboard/lib/overview";

const emptyStats: DashboardStats = {
  totalOrders: 0,
  pendingOrders: 0,
  inTransitOrders: 0,
  deliveredOrders: 0,
  returnedOrders: 0,
  totalCodAmount: 0,
  collectedCodAmount: 0,
  totalDeliveryFees: 0,
};

describe("dashboard overview derivations", () => {
  it("reports no overview data for a merchant with no parcels", () => {
    expect(hasOverviewData(emptyStats)).toBe(false);
    expect(hasOverviewData({ ...emptyStats, totalOrders: 1 })).toBe(true);
  });

  it("never returns a negative pending COD amount", () => {
    expect(pendingCodAmount({ ...emptyStats, totalCodAmount: 1000, collectedCodAmount: 400 })).toBe(600);
    // A settlement can outrun the booked total in edge cases — clamp to 0.
    expect(pendingCodAmount({ ...emptyStats, totalCodAmount: 100, collectedCodAmount: 500 })).toBe(0);
  });

  it("hides attention items that have nothing to act on", () => {
    expect(buildAttentionItems(emptyStats)).toEqual([]);
  });

  it("builds attention items in a stable order from real fields", () => {
    const items = buildAttentionItems({
      ...emptyStats,
      totalOrders: 20,
      pendingOrders: 3,
      returnedOrders: 2,
      totalCodAmount: 5000,
      collectedCodAmount: 2000,
    });

    expect(items).toEqual([
      { key: "pending", count: 3 },
      { key: "returned", count: 2 },
      { key: "cod", count: 0, amount: 3000 },
    ]);
  });

  it("includes only the items with a positive value", () => {
    expect(buildAttentionItems({ ...emptyStats, pendingOrders: 5 })).toEqual([
      { key: "pending", count: 5 },
    ]);
    expect(buildAttentionItems({ ...emptyStats, returnedOrders: 1 })).toEqual([
      { key: "returned", count: 1 },
    ]);
    expect(
      buildAttentionItems({ ...emptyStats, totalCodAmount: 900, collectedCodAmount: 900 }),
    ).toEqual([]);
  });

  it("formats ISO dates into compact axis labels", () => {
    expect(labelFromIso("2026-10-08")).toBe("10-08");
    expect(labelFromIso("not-a-date")).toBe("not-a-date");
  });

  it("maps a daily series to chart points for the requested field", () => {
    const points = [
      { date: "2026-10-06", booked: 10, delivered: 6 },
      { date: "2026-10-07", booked: 12, delivered: 9 },
    ];

    expect(buildTrendData(points, "delivered")).toEqual([
      { label: "10-06", value: 6 },
      { label: "10-07", value: 9 },
    ]);
    expect(buildTrendData(points, "booked")).toEqual([
      { label: "10-06", value: 10 },
      { label: "10-07", value: 12 },
    ]);
  });

  it("keeps only the most recent points when the series is long", () => {
    const points = Array.from({ length: 40 }, (_, index) => ({
      date: `2026-09-${String((index % 30) + 1).padStart(2, "0")}`,
      booked: index,
      delivered: index * 2,
    }));

    const series = buildTrendData(points, "delivered", 30);
    expect(series).toHaveLength(30);
    expect(series[0]?.value).toBe(points[10]!.delivered);
    expect(series[series.length - 1]?.value).toBe(points[39]!.delivered);
  });
});
