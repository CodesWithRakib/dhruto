import { describe, it, expect, beforeAll } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { Providers } from "../../app/providers";
import { BookingForm } from "../../features/parcels/components/booking-form";

describe("BookingForm Component", () => {
  beforeAll(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    });
  });

  it("renders all required booking fields and confirm button", () => {
    render(
      <Providers>
        <BookingForm />
      </Providers>,
    );

    expect(
      screen.getByPlaceholderText("e.g. Tanvir Ahmed"),
    ).toBeDefined();
    expect(
      screen.getByPlaceholderText("01712345678"),
    ).toBeDefined();
    expect(
      screen.getByPlaceholderText("e.g. Dhaka"),
    ).toBeDefined();
    expect(
      screen.getByPlaceholderText("e.g. Dhanmondi"),
    ).toBeDefined();
    expect(
      screen.getByRole("button", { name: /Confirm Booking/i }),
    ).toBeDefined();
  });
});
