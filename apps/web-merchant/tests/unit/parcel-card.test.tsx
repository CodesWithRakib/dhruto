import { describe, expect, it } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { ParcelStatus, type ParcelListItem } from "@dhruto/contracts";
import messages from "../../messages/en.json";
import { ParcelCard } from "../../features/parcels/components/parcel-card";

const PARCEL: ParcelListItem = {
  id: "11111111-1111-4111-8111-111111111111",
  trackingCode: "DHR-20261004-ABC123",
  recipientName: "Tanvir Ahmed",
  recipientPhone: "01712345678",
  district: "Dhaka",
  thana: "Dhanmondi",
  deliveryAddress: "House 12, Road 5",
  parcelDescription: null,
  codAmount: 1500,
  weight: 1.5,
  deliveryFee: 100,
  status: ParcelStatus.CREATED,
  createdAt: "2026-10-04T10:00:00.000Z",
  updatedAt: "2026-10-04T10:00:00.000Z",
};

describe("ParcelCard", () => {
  it("shows the tracking code, recipient, destination and money", () => {
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <ParcelCard parcel={PARCEL} />
      </NextIntlClientProvider>,
    );

    expect(screen.getByText("DHR-20261004-ABC123")).toBeDefined();
    expect(screen.getByText("Tanvir Ahmed")).toBeDefined();
    expect(screen.getByText("01712345678")).toBeDefined();
    expect(screen.getByText("Dhanmondi, Dhaka")).toBeDefined();
    expect(screen.getByText("৳1,500")).toBeDefined();
    expect(screen.getByText("৳100")).toBeDefined();
    // Status comes from the shared badge/config, not a local mapping.
    expect(screen.getByText("Created")).toBeDefined();
  });

  it("links to the parcel details and its label", () => {
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <ParcelCard parcel={PARCEL} />
      </NextIntlClientProvider>,
    );

    const hrefs = screen.getAllByRole("link").map((link) => link.getAttribute("href"));
    expect(hrefs).toContain(`/merchant/parcels/${PARCEL.id}`);
    expect(hrefs).toContain(`/merchant/parcels/${PARCEL.id}/label`);
  });
});
