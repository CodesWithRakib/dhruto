import { describe, it, expect } from "vitest";
import {
  CHAT_LOGISTICS_EVENT_KEYS,
  DeliveryFailureReason,
  DomainEventType,
} from "@dhruto/contracts";
import { logisticsSystemMessage } from "./chat-logistics.mapping.js";

const base = {
  parcelId: "55555555-5555-4555-8555-555555555555",
  merchantId: "33333333-3333-4333-8333-333333333333",
  trackingCode: "DX-1234ABCD",
  recipientName: "Secret Recipient",
  recipientPhone: "01812345678",
  riderId: "66666666-6666-4666-8666-666666666666",
  codCollected: 1500,
  deliveryAddress: "House 1, Road 2",
};

describe("logistics system-message mapping", () => {
  it("maps each supported lifecycle event to its key with the tracking code only", () => {
    const cases: Array<[DomainEventType, Record<string, unknown>, string]> = [
      [
        DomainEventType.PARCEL_ASSIGNED,
        { reassigned: false },
        CHAT_LOGISTICS_EVENT_KEYS.RIDER_ASSIGNED,
      ],
      [
        DomainEventType.PARCEL_ASSIGNED,
        { reassigned: true },
        CHAT_LOGISTICS_EVENT_KEYS.RIDER_REASSIGNED,
      ],
      [DomainEventType.PARCEL_OUT_FOR_DELIVERY, {}, CHAT_LOGISTICS_EVENT_KEYS.OUT_FOR_DELIVERY],
      [DomainEventType.PARCEL_DELIVERED, {}, CHAT_LOGISTICS_EVENT_KEYS.DELIVERED],
      [DomainEventType.PARCEL_RETURNED, {}, CHAT_LOGISTICS_EVENT_KEYS.RETURNED],
    ];
    for (const [type, extra, key] of cases) {
      expect(logisticsSystemMessage(type, { ...base, ...extra })).toEqual({
        eventKey: key,
        params: { trackingCode: "DX-1234ABCD" },
      });
    }
  });

  it("never copies names, phones, addresses, COD or ids into the message", () => {
    const message = logisticsSystemMessage(DomainEventType.PARCEL_DELIVERED, base);
    const serialized = JSON.stringify(message);
    for (const secret of [
      "Secret Recipient",
      "01812345678",
      "House 1",
      "1500",
      base.riderId,
      base.merchantId,
    ]) {
      expect(serialized).not.toContain(secret);
    }
  });

  it("failures carry only an allow-listed reason code and a valid reschedule date", () => {
    expect(
      logisticsSystemMessage(DomainEventType.PARCEL_FAILED, {
        ...base,
        reason: DeliveryFailureReason.CUSTOMER_UNAVAILABLE,
        rescheduledFor: "2026-11-16T10:00:00.000Z",
      }),
    ).toEqual({
      eventKey: CHAT_LOGISTICS_EVENT_KEYS.DELIVERY_FAILED,
      params: {
        trackingCode: "DX-1234ABCD",
        reason: DeliveryFailureReason.CUSTOMER_UNAVAILABLE,
        rescheduledFor: "2026-11-16T10:00:00.000Z",
      },
    });
    expect(
      logisticsSystemMessage(DomainEventType.PARCEL_FAILED, {
        ...base,
        reason: "customer was rude, call 017...",
        rescheduledFor: "not-a-date",
      }),
    ).toEqual({
      eventKey: CHAT_LOGISTICS_EVENT_KEYS.DELIVERY_FAILED,
      params: { trackingCode: "DX-1234ABCD" },
    });
  });

  it("drops a malformed tracking code and ignores non-logistics events", () => {
    expect(
      logisticsSystemMessage(DomainEventType.PARCEL_DELIVERED, { trackingCode: "<script>" }),
    ).toEqual({
      eventKey: CHAT_LOGISTICS_EVENT_KEYS.DELIVERED,
    });
    expect(logisticsSystemMessage(DomainEventType.PARCEL_CREATED, base)).toBeNull();
    expect(logisticsSystemMessage(DomainEventType.CHAT_MESSAGE_CREATED, base)).toBeNull();
    expect(logisticsSystemMessage(DomainEventType.PAYOUT_REQUESTED, base)).toBeNull();
  });
});
