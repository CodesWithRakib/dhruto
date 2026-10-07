import { describe, expect, it } from "vitest";
import {
  BagStatus,
  ExceptionStatus,
  ManifestStatus,
  ParcelStatus,
  PayoutStatus,
  ScanOutcome,
  SettlementStatus,
  WalletTransactionType,
} from "@dhruto/contracts";
import {
  BAG_STATUS_TONE,
  EXCEPTION_STATUS_TONE,
  MANIFEST_STATUS_TONE,
  PARCEL_STATUS_CONFIG,
  PAYOUT_STATUS_TONE,
  RIDER_STATUS_TONE,
  SCAN_OUTCOME_TONE,
  SETTLEMENT_STATUS_TONE,
  TONE_CLASSES,
  WALLET_TRANSACTION_TONE,
  resolveTone,
} from "../../config/status";
import { formatBDT, formatDate, formatDateTime, formatNumber, formatTime } from "../../lib/format";

describe("centralized formatters", () => {
  it("formats BDT amounts in both locales", () => {
    expect(formatBDT(1250)).toBe("৳1,250");
    expect(formatBDT(0)).toBe("৳0");
    expect(formatBDT("3000")).toBe("৳3,000");
    // Bangla locale renders Bangla digits with the same taka prefix.
    expect(formatBDT(1250, "bn")).toBe("৳১,২৫০");
  });

  it("keeps sub-taka precision instead of silently rounding", () => {
    expect(formatBDT(12.5)).toBe("৳12.5");
    expect(formatBDT(12.567)).toBe("৳12.57");
  });

  it("never renders NaN for missing money", () => {
    expect(formatBDT(null)).toBe("৳0");
    expect(formatBDT(undefined)).toBe("৳0");
    expect(formatNumber("not-a-number")).toBe("0");
  });

  it("formats dates in Asia/Dhaka and degrades safely on bad input", () => {
    // 2026-10-07T00:30:00Z is 06:30 on 07 Oct in Dhaka (+06:00).
    expect(formatDate("2026-10-07T00:30:00.000Z")).toContain("Oct 7, 2026");
    expect(formatDateTime("2026-10-07T00:30:00.000Z")).toMatch(/Oct 7, 2026/);
    expect(formatTime("2026-10-07T00:30:00.000Z")).not.toContain("2026");
    expect(formatDate(null)).toBe("—");
    expect(formatDate("not-a-date")).toBe("—");
    expect(formatDateTime(undefined)).toBe("—");
  });
});

describe("centralized status tones", () => {
  it("covers every value of each local enum", () => {
    for (const value of Object.values(PayoutStatus)) {
      expect(PAYOUT_STATUS_TONE[value]).toBeTruthy();
    }
    for (const value of Object.values(WalletTransactionType)) {
      expect(WALLET_TRANSACTION_TONE[value]).toBeTruthy();
    }
    expect(Object.keys(BAG_STATUS_TONE)).toHaveLength(Object.values(BagStatus).length);
    expect(Object.keys(EXCEPTION_STATUS_TONE)).toHaveLength(Object.values(ExceptionStatus).length);
    expect(Object.keys(MANIFEST_STATUS_TONE)).toHaveLength(Object.values(ManifestStatus).length);
    expect(Object.keys(SETTLEMENT_STATUS_TONE)).toHaveLength(
      Object.values(SettlementStatus).length,
    );
    expect(Object.keys(SCAN_OUTCOME_TONE)).toHaveLength(Object.values(ScanOutcome).length);
  });

  it("assigns every enum value a tone that has a token class", () => {
    for (const map of [
      PAYOUT_STATUS_TONE,
      WALLET_TRANSACTION_TONE,
      BAG_STATUS_TONE,
      MANIFEST_STATUS_TONE,
      SETTLEMENT_STATUS_TONE,
      SCAN_OUTCOME_TONE,
      EXCEPTION_STATUS_TONE,
      RIDER_STATUS_TONE,
    ]) {
      for (const tone of Object.values(map)) {
        expect(TONE_CLASSES[tone]).toBeTruthy();
      }
    }
  });

  it("gives every parcel status a tone and an icon", () => {
    for (const value of Object.values(ParcelStatus)) {
      const config = PARCEL_STATUS_CONFIG[value];
      expect(config, `missing config for ${value}`).toBeTruthy();
      expect(TONE_CLASSES[config.tone]).toBeTruthy();
    }
  });

  it("falls back to neutral for unknown wire values", () => {
    expect(resolveTone(PAYOUT_STATUS_TONE, "SOMETHING_NEW")).toBe("neutral");
    expect(resolveTone(PAYOUT_STATUS_TONE, PayoutStatus.COMPLETED)).toBe("success");
  });
});
