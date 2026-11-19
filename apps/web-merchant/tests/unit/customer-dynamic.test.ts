import { describe, expect, it } from "vitest";
import {
  customerFacingStatus,
  formatStatusLabel,
  mapParcelListItemToDelivery,
} from "../../features/customer/hooks/use-customer-deliveries";
import { ParcelStatus, type ParcelListItem } from "@dhruto/contracts";

describe("Customer dynamic deliveries & telemetry helpers", () => {
  it("formats parcel statuses into customer-friendly labels", () => {
    expect(formatStatusLabel(ParcelStatus.OUT_FOR_DELIVERY)).toBe("Out for Delivery");
    expect(formatStatusLabel(ParcelStatus.IN_TRANSIT)).toBe("In Hub Transit");
    expect(formatStatusLabel(ParcelStatus.DELIVERED)).toBe("Delivered");
    expect(formatStatusLabel(ParcelStatus.DESTINATION_HUB_RECEIVED)).toBe("Arrived at Local Hub");
    expect(formatStatusLabel(ParcelStatus.RESCHEDULED)).toBe("Delivery Rescheduled");
    expect(formatStatusLabel(ParcelStatus.PICKED_UP)).toBe("Picked Up from Merchant");
  });

  // Regression: after handoff parcels move to CASH_PENDING / CASH_VERIFIED;
  // the customer portal treated them as active (OTP, reschedule, wrong counts).
  it("shows internal cash-settlement states as delivered to the recipient", () => {
    expect(customerFacingStatus(ParcelStatus.CASH_PENDING)).toBe(ParcelStatus.DELIVERED);
    expect(customerFacingStatus(ParcelStatus.CASH_VERIFIED)).toBe(ParcelStatus.DELIVERED);
    expect(customerFacingStatus(ParcelStatus.OUT_FOR_DELIVERY)).toBe(ParcelStatus.OUT_FOR_DELIVERY);
    const mapped = mapParcelListItemToDelivery({
      id: "p9",
      trackingCode: "DHR-20261118-AAAAAA",
      status: ParcelStatus.CASH_PENDING,
      codAmount: 1850,
      deliveredAt: "2026-11-18T16:30:00.000Z",
      updatedAt: "2026-11-18T16:31:00.000Z",
    } as unknown as ParcelListItem);
    expect(mapped.status).toBe(ParcelStatus.DELIVERED);
    expect(mapped.isPaid).toBe(true);
    expect(mapped.deliveredAt).toBeDefined();
  });

  it("handles unknown or fallback statuses safely", () => {
    expect(formatStatusLabel("CUSTOM_STATUS")).toBe("CUSTOM STATUS");
  });

  // Regression: the client used to derive an OTP from the tracking code, which never
  // matched the server-issued (random, bcrypt-hashed) OTP the rider verifies against.
  describe("delivery OTP mapping", () => {
    const parcel = {
      id: "p1",
      trackingCode: "DHR-20261114-NNN27T",
      status: ParcelStatus.OUT_FOR_DELIVERY,
      codAmount: 500,
      updatedAt: "2026-11-17T00:00:00.000Z",
    } as unknown as ParcelListItem;

    it("uses the server-issued OTP verbatim", () => {
      expect(mapParcelListItemToDelivery({ ...parcel, deliveryOtp: "482913" }).otp).toBe("482913");
    });

    it("uses API merchant/rider data and never invents rider contact", () => {
      const withRider = mapParcelListItemToDelivery({
        ...parcel,
        merchantName: "Rahim Enterprise BD",
        riderName: "Assigned Rider",
        riderPhone: "01700000009",
      });
      expect(withRider.merchantName).toBe("Rahim Enterprise BD");
      expect(withRider.riderName).toBe("Assigned Rider");
      expect(withRider.riderPhone).toBe("01700000009");
      expect(withRider.isOwned).toBe(true);
      expect(withRider.codAmount).toBe(500);

      const noRider = mapParcelListItemToDelivery({ ...parcel, riderName: null, riderPhone: null });
      expect(noRider.riderName).toBeUndefined();
      expect(noRider.riderPhone).toBeUndefined();
    });

    // Regression: the POD showed "Today" / the last update time instead of the real handoff.
    it("uses the server handoff time for delivered parcels and never invents one", () => {
      const delivered = {
        ...parcel,
        status: ParcelStatus.DELIVERED,
        updatedAt: "2026-11-20T10:00:00.000Z",
      } as ParcelListItem;
      const withTime = mapParcelListItemToDelivery({
        ...delivered,
        deliveredAt: "2026-11-17T08:30:00.000Z",
      });
      expect(withTime.deliveredAt).toContain("17 Nov 2026");
      expect(withTime.deliveredAt).toContain("14:30"); // Asia/Dhaka, UTC+6

      expect(mapParcelListItemToDelivery({ ...delivered, deliveredAt: null }).deliveredAt).toBeUndefined();
      expect(mapParcelListItemToDelivery(parcel).deliveredAt).toBeUndefined();
    });

    it("reflects a saved delivery preference in the ETA and note", () => {
      const d = mapParcelListItemToDelivery({
        ...parcel,
        deliveryPreference: {
          date: "2026-11-19",
          slot: "Afternoon (01:00 PM - 05:00 PM)",
          note: "Call before arrival",
          updatedAt: "2026-11-17T10:00:00.000Z",
        },
      });
      expect(d.eta).toContain("Afternoon (01:00 PM - 05:00 PM)");
      expect(d.deliveryNote).toBe("Call before arrival");
      expect(d.status).toBe(ParcelStatus.OUT_FOR_DELIVERY); // status is never changed client-side
    });

    it("never invents an OTP when the server has not issued one", () => {
      expect(mapParcelListItemToDelivery({ ...parcel, deliveryOtp: null }).otp).toBe("");
      expect(mapParcelListItemToDelivery(parcel).otp).toBe("");
    });
  });
});
