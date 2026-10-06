import { describe, expect, it } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { DeliveryZone, type PricingResult } from "@dhruto/contracts";
import messages from "../../messages/en.json";
import { PricingSummary } from "../../features/parcels/components/booking/pricing-summary";

const QUOTE: PricingResult = {
  zone: DeliveryZone.OUTSIDE_DHAKA,
  baseFee: 130,
  weightFee: 25,
  additionalCharge: 0,
  discount: 0,
  codFee: 20,
  totalFee: 175,
  estimatedDays: "72-96 Hours",
};

function renderSummary(props: Partial<React.ComponentProps<typeof PricingSummary>> = {}) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <PricingSummary
        pricing={QUOTE}
        isCalculating={false}
        isError={false}
        codAmount={2000}
        {...props}
      />
    </NextIntlClientProvider>,
  );
}

describe("PricingSummary", () => {
  it("renders every line of the server breakdown", () => {
    renderSummary();

    expect(screen.getByText("Base fee")).toBeDefined();
    expect(screen.getByText("৳130")).toBeDefined();
    expect(screen.getByText("Weight charge")).toBeDefined();
    expect(screen.getByText("৳25")).toBeDefined();
    expect(screen.getByText("COD handling fee")).toBeDefined();
    expect(screen.getByText("৳20")).toBeDefined();
    expect(screen.getByText("৳175")).toBeDefined();
    expect(screen.getByText(/72-96 Hours/)).toBeDefined();
  });

  it("translates the delivery zone and flags cash collection", () => {
    renderSummary();
    expect(screen.getByText("Outside Dhaka")).toBeDefined();
    expect(screen.getByText("Collect cash")).toBeDefined();
  });

  it("marks a prepaid shipment when COD is zero", () => {
    renderSummary({ codAmount: 0 });
    expect(screen.getByText("Prepaid")).toBeDefined();
  });

  it("shows the empty prompt rather than inventing a price", () => {
    renderSummary({ pricing: null });
    expect(screen.queryByText("৳175")).toBeNull();
    expect(
      screen.getByText("Enter the destination and weight to see the delivery charge."),
    ).toBeDefined();
  });

  it("surfaces quote failures instead of a stale price", () => {
    renderSummary({ pricing: null, isError: true });
    expect(
      screen.getByText(
        "We could not calculate the delivery charge. Check the destination and weight.",
      ),
    ).toBeDefined();
  });

  it("shows a discount line only when the API returns one", () => {
    renderSummary({ pricing: { ...QUOTE, discount: 15, totalFee: 160 } });
    expect(screen.getByText("Discount")).toBeDefined();
    expect(screen.getByText("−৳15")).toBeDefined();
  });
});
