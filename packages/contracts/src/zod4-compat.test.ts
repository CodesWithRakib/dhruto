import { describe, expect, it } from "vitest";
import { parcelBookingSchema } from "./parcel/parcel.schema.js";
import { createSettlementBatchSchema, requestPayoutSchema } from "./finance/finance.schema.js";
import { chatSystemEventMetadataSchema } from "./chat/chat.schema.js";

/**
 * RELEASE-BLOCKER-01 regression tests for the zod 3 → 4 upgrade
 * (GHSA-mrhx-c7xc-m3w5). They pin the behaviour the contracts had under zod 3
 * where zod 4 changed defaults, and the advisory fix itself.
 */

const validBooking = {
  recipientName: "Rahim Uddin",
  recipientPhone: "01712345678",
  district: "Dhaka",
  thana: "Gulshan",
  deliveryAddress: "House 1, Road 2, Gulshan",
  codAmount: 500,
  weight: 1,
};

function messageFor(
  result: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } },
  field: string,
) {
  return result.error?.issues.find((issue) => issue.path.join(".") === field)?.message;
}

describe("zod 4 compatibility of shared contracts", () => {
  it("keeps zod 3 uuid() acceptance: any 8-4-4-4-12 hex id, not only RFC 9562 ids", () => {
    // Seeded/fixture ids such as these were valid under zod 3 `uuid()`;
    // zod 4 `uuid()` would reject them, so contracts use `guid()`.
    for (const id of [
      "11111111-1111-1111-1111-111111111111",
      "a0000000-0000-0000-0000-000000000001",
    ]) {
      expect(
        createSettlementBatchSchema.safeParse({ merchantId: id, settlementIds: [id] }).success,
      ).toBe(true);
    }
    expect(
      createSettlementBatchSchema.safeParse({ merchantId: "not-a-uuid", settlementIds: [] })
        .success,
    ).toBe(false);
  });

  it("keeps the required-field message only for missing fields (former required_error)", () => {
    const { recipientName: _omit, ...missing } = validBooking;
    expect(messageFor(parcelBookingSchema.safeParse(missing), "recipientName")).toBe(
      "Recipient name is required",
    );

    const wrongType = parcelBookingSchema.safeParse({ ...validBooking, recipientName: 42 });
    expect(wrongType.success).toBe(false);
    expect(messageFor(wrongType, "recipientName")).not.toBe("Recipient name is required");
  });

  it("keeps the custom number-type message (former invalid_type_error)", () => {
    expect(
      messageFor(parcelBookingSchema.safeParse({ ...validBooking, codAmount: "abc" }), "codAmount"),
    ).toBe("COD amount must be a number");
    expect(messageFor(requestPayoutSchema.safeParse({ amount: "abc" }), "amount")).toBe(
      "Amount must be a number",
    );
    // Range checks keep their own messages.
    expect(
      messageFor(parcelBookingSchema.safeParse({ ...validBooking, weight: 0 }), "weight"),
    ).toBe("Weight must be positive (greater than 0 kg)");
  });

  it("records keep string keys and value validation", () => {
    expect(
      chatSystemEventMetadataSchema.safeParse({
        eventKey: "parcel.delivered",
        params: { count: 2 },
      }).success,
    ).toBe(true);
    expect(
      chatSystemEventMetadataSchema.safeParse({
        eventKey: "parcel.delivered",
        params: { nested: { a: 1 } },
      }).success,
    ).toBe(false);
  });

  it("rejects an oversized bounded array before validating elements (GHSA-mrhx-c7xc-m3w5)", () => {
    const merchantId = "11111111-1111-1111-1111-111111111111";
    const result = createSettlementBatchSchema.safeParse({
      merchantId,
      settlementIds: Array.from({ length: 200_000 }, () => 0),
    });
    expect(result.success).toBe(false);
    const issues = result.error?.issues ?? [];
    // zod 3.25.76 produced one issue per element (200,001 issues).
    expect(issues.length).toBeLessThan(5);
    expect(issues.some((issue) => issue.code === "too_big")).toBe(true);
  });
});
