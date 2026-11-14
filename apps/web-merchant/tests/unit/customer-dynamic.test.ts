import { describe, expect, it } from "vitest";
import { formatStatusLabel, generateDeliveryOtp } from "../../features/customer/hooks/use-customer-deliveries";
import { ParcelStatus } from "@dhruto/contracts";

describe("Customer dynamic deliveries & telemetry helpers", () => {
  it("formats parcel statuses into customer-friendly labels", () => {
    expect(formatStatusLabel(ParcelStatus.OUT_FOR_DELIVERY)).toBe("Out for Delivery");
    expect(formatStatusLabel(ParcelStatus.IN_TRANSIT)).toBe("In Hub Transit");
    expect(formatStatusLabel(ParcelStatus.DELIVERED)).toBe("Delivered");
    expect(formatStatusLabel(ParcelStatus.DESTINATION_HUB_RECEIVED)).toBe("Arrived at Local Hub");
    expect(formatStatusLabel(ParcelStatus.RESCHEDULED)).toBe("Delivery Rescheduled");
    expect(formatStatusLabel(ParcelStatus.PICKED_UP)).toBe("Picked Up from Merchant");
  });

  it("handles unknown or fallback statuses safely", () => {
    expect(formatStatusLabel("CUSTOM_STATUS")).toBe("CUSTOM STATUS");
  });

  it("generates unique 6-digit delivery OTPs for different parcels", () => {
    const otp1 = generateDeliveryOtp("DHR-20261114-NNN27T");
    const otp2 = generateDeliveryOtp("DHR-20261113-K25WQ5");
    const otp3 = generateDeliveryOtp("DHR-2610-00101");

    expect(otp1).toHaveLength(6);
    expect(otp2).toHaveLength(6);
    expect(otp3).toHaveLength(6);

    // Each must be unique
    expect(otp1).not.toBe(otp2);
    expect(otp2).not.toBe(otp3);
    expect(otp1).not.toBe(otp3);

    // Must be deterministic for the same parcel
    expect(generateDeliveryOtp("DHR-20261114-NNN27T")).toBe(otp1);
  });
});
