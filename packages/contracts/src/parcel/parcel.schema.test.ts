import { describe, it, expect } from "vitest";
import {
  BANGLADESH_PHONE_REGEX,
  parcelBookingSchema,
  ParcelStatus,
} from "./parcel.schema.js";

describe("Bangladesh Phone Validation Regex", () => {
  it("should accept valid 11-digit Bangladeshi mobile numbers", () => {
    const validNumbers = [
      "01712345678", // Grameenphone
      "01312345678", // GP Skitto
      "01812345678", // Robi
      "01612345678", // Airtel
      "01912345678", // Banglalink
      "01412345678", // Banglalink
      "01512345678", // Teletalk
    ];

    for (const num of validNumbers) {
      expect(BANGLADESH_PHONE_REGEX.test(num)).toBe(true);
    }
  });

  it("should reject invalid phone numbers", () => {
    const invalidNumbers = [
      "01012345678", // 010 invalid prefix
      "01112345678", // 011 obsolete / invalid
      "01212345678", // 012 invalid prefix
      "0171234567", // 10 digits (too short)
      "017123456789", // 12 digits (too long)
      "+8801712345678", // Canonical expects 11-digit without +88
      "0171234567a", // Non-digits
      "abcd1234567",
    ];

    for (const num of invalidNumbers) {
      expect(BANGLADESH_PHONE_REGEX.test(num)).toBe(false);
    }
  });
});

describe("Parcel Booking Schema", () => {
  const validPayload = {
    recipientName: "Tanvir Ahmed",
    recipientPhone: "01712345678",
    district: "Dhaka",
    thana: "Dhanmondi",
    deliveryAddress: "House 42, Road 7A, Dhanmondi, Dhaka-1209",
    codAmount: 1500,
    weight: 1.5,
  };

  it("should successfully parse and validate a valid parcel booking", () => {
    const parsed = parcelBookingSchema.safeParse(validPayload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.recipientName).toBe("Tanvir Ahmed");
      expect(parsed.data.recipientPhone).toBe("01712345678");
      expect(parsed.data.district).toBe("Dhaka");
      expect(parsed.data.thana).toBe("Dhanmondi");
      expect(parsed.data.codAmount).toBe(1500);
      expect(parsed.data.weight).toBe(1.5);
    }
  });

  it("should coerce string numbers for codAmount and weight", () => {
    const payload = {
      ...validPayload,
      codAmount: "2500",
      weight: "2.5",
    };
    const parsed = parcelBookingSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.codAmount).toBe(2500);
      expect(parsed.data.weight).toBe(2.5);
    }
  });

  it("should fail when recipient phone is invalid", () => {
    const payload = {
      ...validPayload,
      recipientPhone: "01199999999",
    };
    const parsed = parcelBookingSchema.safeParse(payload);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const issue = parsed.error.issues.find((i) => i.path.includes("recipientPhone"));
      expect(issue).toBeDefined();
    }
  });

  it("should reject negative COD amount", () => {
    const payload = {
      ...validPayload,
      codAmount: -100,
    };
    const parsed = parcelBookingSchema.safeParse(payload);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const issue = parsed.error.issues.find((i) => i.path.includes("codAmount"));
      expect(issue).toBeDefined();
      expect(issue?.message).toContain("cannot be negative");
    }
  });

  it("should reject COD exceeding maximum limit", () => {
    const payload = {
      ...validPayload,
      codAmount: 600000,
    };
    const parsed = parcelBookingSchema.safeParse(payload);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const issue = parsed.error.issues.find((i) => i.path.includes("codAmount"));
      expect(issue).toBeDefined();
    }
  });

  it("should reject zero or negative weight", () => {
    const zeroWeight = { ...validPayload, weight: 0 };
    const negativeWeight = { ...validPayload, weight: -2 };

    const parsedZero = parcelBookingSchema.safeParse(zeroWeight);
    expect(parsedZero.success).toBe(false);

    const parsedNegative = parcelBookingSchema.safeParse(negativeWeight);
    expect(parsedNegative.success).toBe(false);
  });

  it("should reject weight exceeding maximum limit of 50 kg", () => {
    const payload = {
      ...validPayload,
      weight: 55,
    };
    const parsed = parcelBookingSchema.safeParse(payload);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const issue = parsed.error.issues.find((i) => i.path.includes("weight"));
      expect(issue).toBeDefined();
    }
  });

  it("should fail when district is missing or empty", () => {
    const missingDistrict = {
      ...validPayload,
      district: "",
    };
    const parsed = parcelBookingSchema.safeParse(missingDistrict);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const issue = parsed.error.issues.find((i) => i.path.includes("district"));
      expect(issue).toBeDefined();
    }
  });

  it("should fail when recipientName is too short", () => {
    const payload = {
      ...validPayload,
      recipientName: "A",
    };
    const parsed = parcelBookingSchema.safeParse(payload);
    expect(parsed.success).toBe(false);
  });

  it("should verify ParcelStatus has CREATED state", () => {
    expect(ParcelStatus.CREATED).toBe("CREATED");
    expect(ParcelStatus.DELIVERED).toBe("DELIVERED");
    expect(ParcelStatus.CASH_VERIFIED).toBe("CASH_VERIFIED");
  });
});
