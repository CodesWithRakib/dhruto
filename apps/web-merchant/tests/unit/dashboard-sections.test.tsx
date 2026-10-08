import { describe, expect, it } from "vitest";
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { MerchantAnalyticsSummary } from "@dhruto/contracts";
import messages from "../../messages/en.json";
import { NeedsAttention } from "../../features/dashboard/components/needs-attention";
import {
  RecentShipments,
  type ShipmentRow,
} from "../../features/dashboard/components/recent-shipments";
import {
  DeliveryHealth,
  ShipmentKpis,
} from "../../features/dashboard/components/shipment-overview";
import { ShipmentPerformance } from "../../features/dashboard/components/shipment-performance";
import type { DashboardStats } from "../../features/merchants/api/merchants.api";
import type { AttentionItem } from "../../features/dashboard/lib/overview";

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

const STATS: DashboardStats = {
  totalOrders: 128,
  pendingOrders: 6,
  inTransitOrders: 21,
  deliveredOrders: 92,
  returnedOrders: 4,
  totalCodAmount: 250000,
  collectedCodAmount: 180000,
  totalDeliveryFees: 12000,
};

const ANALYTICS: MerchantAnalyticsSummary = {
  period: "30d",
  startDate: "2026-09-09",
  endDate: "2026-10-08",
  kpis: {
    totalOrders: 128,
    deliveredOrders: 92,
    inTransitOrders: 21,
    pendingOrders: 6,
    returnedOrders: 4,
    cancelledOrders: 5,
    deliverySuccessRate: 78,
    rtoRate: 3,
    avgDeliveryHours: 34,
  },
  financials: {
    totalBookedCod: 250000,
    collectedCod: 180000,
    pendingCod: 70000,
    deliveryCharges: 12000,
    netSettledPayouts: 168000,
  },
  statusBreakdown: { DELIVERED: 92 },
  dailyTrends: [
    { date: "2026-10-07", booked: 10, delivered: 8, returned: 1, codCollected: 5000 },
    { date: "2026-10-08", booked: 12, delivered: 9, returned: 0, codCollected: 6000 },
  ],
  topDistricts: [],
};

const ROWS: ShipmentRow[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    trackingCode: "DHR-20261008-4821",
    recipientName: "Tanvir Ahmed",
    district: "Rangpur",
    thana: "Badarganj",
    status: "OUT_FOR_DELIVERY",
    codAmount: 1850,
    createdAt: "2026-10-08T09:00:00.000Z",
  },
];

describe("dashboard overview sections", () => {
  it("renders the five real KPIs", () => {
    renderWithIntl(<ShipmentKpis stats={STATS} isLoading={false} />);

    expect(screen.getByText("128")).toBeDefined();
    expect(screen.getByText("6")).toBeDefined();
    expect(screen.getByText("21")).toBeDefined();
    expect(screen.getByText("92")).toBeDefined();
    expect(screen.getByText("4")).toBeDefined();
  });

  it("hides needs-attention entirely when there is nothing to act on", () => {
    const { container } = renderWithIntl(<NeedsAttention items={[]} isLoading={false} />);

    expect(container.querySelector("ul")).toBeNull();
    expect(screen.queryByText("Needs attention")).toBeNull();
  });

  it("shows attention rows with counts and a COD amount", () => {
    const items: AttentionItem[] = [
      { key: "pending", count: 6 },
      { key: "returned", count: 4 },
      { key: "cod", count: 0, amount: 70000 },
    ];
    renderWithIntl(<NeedsAttention items={items} isLoading={false} />);

    expect(screen.getByText("Needs attention")).toBeDefined();
    expect(screen.getByText("6 parcels have not been picked up yet.")).toBeDefined();
    expect(screen.getByText("4 parcels are being returned to you.")).toBeDefined();
    expect(screen.getByText("৳70,000 has been booked but not yet collected.")).toBeDefined();
  });

  it("renders the empty state when there are no recent shipments", () => {
    renderWithIntl(
      <RecentShipments rows={[]} isLoading={false} isError={false} onRetry={() => {}} />,
    );

    expect(screen.getByText("No shipments yet")).toBeDefined();
  });

  it("renders recent shipment rows with tracking, recipient, destination and COD", () => {
    renderWithIntl(
      <RecentShipments rows={ROWS} isLoading={false} isError={false} onRetry={() => {}} />,
    );

    // Rendered twice: once for the mobile card, once for the desktop row.
    expect(screen.getAllByText("DHR-20261008-4821").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Tanvir Ahmed").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Rangpur, Badarganj").length).toBeGreaterThan(0);
    expect(screen.getAllByText("৳1,850").length).toBeGreaterThan(0);
  });

  it("degrades health metrics to a placeholder when analytics is unavailable", () => {
    renderWithIntl(
      <DeliveryHealth stats={STATS} isLoading={false} isAnalyticsAvailable={false} />,
    );

    expect(screen.getAllByText("—").length).toBe(3);
    expect(screen.getByText("৳70,000")).toBeDefined();
    expect(
      screen.getByText(
        "Some health metrics need the analytics service. They will appear once it responds.",
      ),
    ).toBeDefined();
  });

  it("shows real health metrics when analytics is available", () => {
    renderWithIntl(
      <DeliveryHealth
        stats={STATS}
        analytics={ANALYTICS}
        isLoading={false}
        isAnalyticsAvailable
      />,
    );

    expect(screen.getByText("78%")).toBeDefined();
    expect(screen.getByText("3%")).toBeDefined();
    expect(screen.getByText("34 hrs")).toBeDefined();
    expect(screen.queryByText("—")).toBeNull();
  });

  it("sums the visible series on the performance chart and toggles metric", () => {
    renderWithIntl(
      <ShipmentPerformance
        analytics={ANALYTICS}
        isLoading={false}
        isError={false}
        onRetry={() => {}}
      />,
    );

    // Default metric is delivered: 8 + 9 = 17
    expect(screen.getByText("Total Delivered")).toBeDefined();
    expect(screen.getByText("17")).toBeDefined();
    expect(screen.getByRole("button", { name: "Delivered" }).getAttribute("aria-pressed")).toBe(
      "true",
    );

    // Switching to booked re-sums the other real series: 10 + 12 = 22
    fireEvent.click(screen.getByRole("button", { name: "Booked" }));
    expect(screen.getByText("Total Booked")).toBeDefined();
    expect(screen.getByText("22")).toBeDefined();
    expect(screen.getByRole("button", { name: "Booked" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
  });

  it("shows a recoverable error state for the performance chart", () => {
    renderWithIntl(
      <ShipmentPerformance
        analytics={undefined}
        isLoading={false}
        isError
        onRetry={() => {}}
      />,
    );

    expect(screen.getByText("Activity could not be loaded")).toBeDefined();
    expect(screen.getByRole("button", { name: "Try again" })).toBeDefined();
  });
});
