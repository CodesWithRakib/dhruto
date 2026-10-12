import { describe, expect, it } from "vitest";
import { formatStatusLabel } from "../../features/customer/hooks/use-customer-deliveries";
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
});
