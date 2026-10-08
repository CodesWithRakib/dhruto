import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { ParcelStatus, type ParcelListItem } from "@dhruto/contracts";
import messages from "../../messages/en.json";
import { ParcelList } from "../../features/parcels/components/parcel-list";

/**
 * The list is driven by `useParcelsList`, which owns RTK Query + the URL.
 * Stubbing that hook keeps this test about the page's presentation contract:
 * what an operator sees for rows, no data, no matches, and a failed request.
 */
const harness = vi.hoisted(() => ({
  state: {} as Record<string, unknown>,
}));

vi.mock("../../features/parcels/hooks/use-parcels-list", async () => {
  const actual =
    await vi.importActual<typeof import("../../features/parcels/hooks/use-parcels-list")>(
      "../../features/parcels/hooks/use-parcels-list",
    );
  return { ...actual, useParcelsList: () => harness.state };
});

const BASE_FILTERS = {
  search: "",
  status: "",
  district: "",
  thana: "",
  from: "",
  to: "",
};

function setState(overrides: Record<string, unknown> = {}) {
  harness.state = {
    parcels: [],
    pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch: vi.fn(),
    page: 1,
    limit: 20,
    setLimit: vi.fn(),
    setPage: vi.fn(),
    filters: BASE_FILTERS,
    updateFilter: vi.fn(),
    setDateRange: vi.fn(),
    clearDateRange: vi.fn(),
    resetFilters: vi.fn(),
    activeFilterCount: 0,
    sortValue: "newest",
    setSortValue: vi.fn(),
    ...overrides,
  };
}

const PARCEL: ParcelListItem = {
  id: "11111111-1111-4111-8111-111111111111",
  trackingCode: "DHR-20261008-4821",
  recipientName: "Tanvir Ahmed",
  recipientPhone: "01712345678",
  district: "Dinajpur",
  thana: "Rangpur",
  deliveryAddress: "House 12, Road 5",
  parcelDescription: null,
  codAmount: 1850,
  weight: 1.5,
  deliveryFee: 100,
  status: ParcelStatus.OUT_FOR_DELIVERY,
  createdAt: "2026-10-08T10:00:00.000Z",
  updatedAt: "2026-10-08T10:00:00.000Z",
};

function renderList() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <ParcelList />
    </NextIntlClientProvider>,
  );
}

describe("ParcelList", () => {
  beforeEach(() => {
    setState();
  });

  it("renders a shipment row with tracking, destination, status and COD", () => {
    setState({ parcels: [PARCEL], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } });
    renderList();

    // Tracking code appears in the desktop table and the mobile card.
    expect(screen.getAllByText("DHR-20261008-4821").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Tanvir Ahmed").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Rangpur, Dinajpur").length).toBeGreaterThan(0);
    expect(screen.getAllByText("৳1,850").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Out for delivery").length).toBeGreaterThan(0);
  });

  it("links rows to details and to the printable label", () => {
    setState({ parcels: [PARCEL], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } });
    renderList();

    const hrefs = screen.getAllByRole("link").map((link) => link.getAttribute("href"));
    expect(hrefs).toContain("/merchant/parcels/11111111-1111-4111-8111-111111111111");
    expect(hrefs).toContain("/merchant/parcels/11111111-1111-4111-8111-111111111111/label");
  });

  it("shows the onboarding empty state when the merchant has no shipments", () => {
    renderList();

    expect(screen.getByText("No parcels yet")).toBeDefined();
    expect(screen.getByText("Confirmed bookings appear here with live status updates.")).toBeDefined();
    expect(screen.queryByText("No parcels match your filters")).toBeNull();
  });

  it("shows a different empty state when filters exclude everything", () => {
    setState({
      filters: { ...BASE_FILTERS, search: "DHR-999" },
      activeFilterCount: 1,
    });
    renderList();

    expect(screen.getByText("No parcels match your filters")).toBeDefined();
    // "Clear filters" also lives in the filter toolbar, so more than one is fine.
    expect(screen.getAllByRole("button", { name: "Clear filters" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Clear filters" })[0]).toBeDefined();
    // Searching should also offer to clear just the search term (the input's
    // own clear control shares the name, so both are expected).
    expect(screen.getAllByRole("button", { name: "Clear search" }).length).toBeGreaterThan(0);
    expect(screen.queryByText("No parcels yet")).toBeNull();
  });

  it("shows the active status as a pressed quick tab even outside the quick set", () => {
    setState({
      filters: { ...BASE_FILTERS, status: ParcelStatus.LOST },
      activeFilterCount: 1,
    });
    renderList();

    const pressed = screen
      .getAllByRole("button")
      .filter((button) => button.getAttribute("aria-pressed") === "true");
    expect(pressed.map((button) => button.textContent)).toEqual(["Lost"]);
  });

  it("marks All as pressed when no status filter is set", () => {
    renderList();

    const pressed = screen
      .getAllByRole("button")
      .filter((button) => button.getAttribute("aria-pressed") === "true");
    expect(pressed.map((button) => button.textContent)).toEqual(["All statuses"]);
  });

  it("keeps the page usable when the list request fails", () => {
    setState({ isError: true });
    renderList();

    expect(screen.getByRole("alert")).toBeDefined();
    expect(screen.getByText("Could not load your parcels")).toBeDefined();
    expect(screen.getByRole("button", { name: /Try again/ })).toBeDefined();
    // Search/filters survive a failed request.
    expect(screen.getByRole("search")).toBeDefined();
  });

  it("shows skeletons — not a spinner or an empty state — while the first page loads", () => {
    setState({ isLoading: true, isFetching: true });
    renderList();

    expect(screen.getByText("My Parcels")).toBeDefined();
    expect(screen.queryByText("No parcels yet")).toBeNull();
    expect(screen.queryByText("No parcels match your filters")).toBeNull();
    // The mobile card skeletons plus the table's own row skeletons both render.
    expect(document.querySelectorAll(".dhruto-skeleton").length).toBeGreaterThan(5);
  });
});
