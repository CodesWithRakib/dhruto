import { describe, it, expect } from "vitest";
import { DomainEventPublisher } from "./domain-event-publisher.service.js";
import {
  ParcelCreatedEvent,
  ParcelAssignedEvent,
  ParcelDeliveredEvent,
} from "../domain/parcel.events.js";
import {
  PayoutRequestedEvent,
  CashVerifiedEvent,
} from "../domain/finance.events.js";

/**
 * Phase 3 (F-OBS-01/T-OBS-01): the outbox relay resolves recipients from
 * `payload.merchantId`. Every published event must carry it, regardless of
 * what individual call sites put in the payload.
 */
describe("DomainEventPublisher relay contract (T-OBS-01)", () => {
  async function capturedPayload(event: Parameters<DomainEventPublisher["publish"]>[1]) {
    let captured: Record<string, unknown> = {};
    const outbox = {
      append: async (_m: unknown, input: { payload: Record<string, unknown> }) => {
        captured = input.payload;
        return { id: "outbox-1" };
      },
    };
    const publisher = new DomainEventPublisher(
      { emit: () => true } as never,
      outbox as never,
    );
    await publisher.publish({} as never, event);
    return captured;
  }

  it("backfills merchantId when the call site omits it", async () => {
    const payload = await capturedPayload(
      new ParcelCreatedEvent(
        { aggregateId: "parcel-1", merchantId: "merchant-1" },
        {
          trackingCode: "DHR-1",
          recipientName: "R",
          recipientPhone: "01712345678",
          deliveryAddress: "addr",
          codAmount: 100,
          weight: 1,
          deliveryFee: 60,
        },
      ),
    );
    expect(payload.merchantId).toBe("merchant-1");
    expect(payload.trackingCode).toBe("DHR-1");
  });

  it("never clobbers an explicit payload merchantId", async () => {
    const payload = await capturedPayload(
      new ParcelAssignedEvent(
        { aggregateId: "parcel-1", merchantId: "meta-merchant" },
        {
          parcelId: "parcel-1",
          trackingCode: "DHR-1",
          merchantId: "explicit-merchant",
          riderId: "rider-1",
        },
      ),
    );
    expect(payload.merchantId).toBe("explicit-merchant");
  });

  it("covers delivered, payout, and cash event shapes", async () => {
    const delivered = await capturedPayload(
      new ParcelDeliveredEvent(
        { aggregateId: "p", merchantId: "m" },
        { trackingCode: "DHR-1", riderId: "r", codCollected: 0, parcelId: "p" },
      ),
    );
    expect(delivered.merchantId).toBe("m");

    const payout = await capturedPayload(
      new PayoutRequestedEvent(
        { aggregateId: "po", merchantId: "m2" },
        { payoutId: "po", amountPaisa: 100, paymentMethod: "BKASH" },
      ),
    );
    expect(payout.merchantId).toBe("m2");

    const cash = await capturedPayload(
      new CashVerifiedEvent(
        { aggregateId: "l", merchantId: "m3" },
        { handInId: "l", verifiedAmount: 100 },
      ),
    );
    expect(cash.merchantId).toBe("m3");
  });
});
