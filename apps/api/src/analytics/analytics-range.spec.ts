import { describe, it, expect } from "vitest";
import { AnalyticsRangeService } from "./analytics-range.service.js";
import { AnalyticsMetricsService } from "./analytics-metrics.service.js";

describe("analytics date ranges (Asia/Dhaka, correct comparisons)", () => {
  const service = new AnalyticsRangeService();
  const now = new Date("2026-10-07T10:00:00Z"); // 16:00 Dhaka

  it("resolves 30d with an equal previous period", () => {
    const range = service.resolve({ preset: "30d" }, now);
    const duration = new Date(range.to).getTime() - new Date(range.from).getTime();
    const prev = new Date(range.previousTo).getTime() - new Date(range.previousFrom).getTime();
    expect(duration).toBe(prev);
    expect(range.timezone).toBe("Asia/Dhaka");
    expect(range.granularity).toBe("day");
  });

  it("resolves today as a single Dhaka day", () => {
    const range = service.resolve({ preset: "today" }, now);
    const hours = (new Date(range.to).getTime() - new Date(range.from).getTime()) / 3600000;
    expect(hours).toBeGreaterThan(23);
    expect(hours).toBeLessThan(25);
    expect(range.granularity).toBe("hour");
  });

  it("rejects custom without from/to and from > to", () => {
    expect(() => service.resolve({ preset: "custom" }, now)).toThrow();
    expect(() =>
      service.resolve(
        { preset: "custom", from: "2026-02-01T00:00:00+06:00", to: "2026-01-01T00:00:00+06:00" },
        now,
      ),
    ).toThrow();
  });

  it("rejects ranges beyond the 366-day maximum", () => {
    expect(() =>
      service.resolve(
        { preset: "custom", from: "2020-01-01T00:00:00+06:00", to: "2026-10-01T00:00:00+06:00" },
        now,
      ),
    ).toThrow();
  });

  it("uses week granularity for long ranges and month for yearly", () => {
    expect(service.resolve({ preset: "90d" }, now).granularity).toBe("week");
    expect(
      service.resolve(
        { preset: "custom", from: "2025-10-01T00:00:00+06:00", to: "2026-10-01T00:00:00+06:00" },
        now,
      ).granularity,
    ).toBe("month");
  });

  it("day boundaries respect Dhaka midnight, not UTC", () => {
    // 2026-10-07T10:00Z = 16:00 Dhaka → end of Dhaka day is 17:59:59.999Z.
    const range = service.resolve({ preset: "today" }, now);
    expect(range.to).toBe("2026-10-07T17:59:59.999Z");
  });
});

describe("centralized metric math", () => {
  const metrics = new AnalyticsMetricsService(
    {} as never, {} as never, {} as never, {} as never, {} as never,
    {} as never, {} as never, {} as never,
    new AnalyticsRangeService(),
  );

  it("rates return null on empty eligible sets (no-data, not 0%)", () => {
    expect(metrics.rate(0, 0)).toBeNull();
    expect(metrics.eligible(0, 0, 0, 0)).toBe(0);
  });

  it("computes success and RTO rates per the catalog", () => {
    // 6 delivered, 2 RTO, 1 failed, 1 cancelled → eligible 10.
    expect(metrics.rate(6, 10)).toBe(60);
    expect(metrics.rate(2, 10)).toBe(20);
  });

  it("percentiles expose the long tail", () => {
    const sorted = [1, 2, 3, 4, 5, 6, 7, 8, 9, 100];
    expect(metrics.percentile(sorted, 50)).toBe(5);
    expect(metrics.percentile(sorted, 90)).toBe(9);
    expect(metrics.percentile([], 95)).toBeNull();
  });
});
