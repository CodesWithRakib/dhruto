import { describe, it, expect } from "vitest";
import {
  toMinor,
  toMajor,
  toMajorString,
  assertIntegerMinor,
  assertPositiveMinor,
  addMinor,
  subtractMinor,
  netPayableMinor,
  formatBDT,
} from "./money.js";

/**
 * Phase 5 (T-FIN-01): minor-canonical money contract. All ledger math runs
 * on integers; decimals convert once at the boundary. These tests lock the
 * round-trip exactness that makes the decimal/minor duality safe.
 */
describe("money minor-canonical contract (T-FIN-01)", () => {
  it("converts decimal inputs to exact minor integers (HALF_UP)", () => {
    expect(toMinor(100)).toBe(10000);
    expect(toMinor("2500.50")).toBe(250050);
    expect(toMinor(0.07)).toBe(7);
    expect(toMinor(1.005)).toBe(101);
    expect(toMinor("46190.00")).toBe(4619000);
  });

  it("rejects non-finite inputs", () => {
    expect(() => toMinor(Number.NaN)).toThrow(/Invalid monetary value/);
    expect(() => toMinor("abc")).toThrow(/Invalid monetary value/);
  });

  it("round-trips minor -> major -> minor exactly", () => {
    for (const minor of [0, 1, 99, 100, 3871000, 999999999]) {
      expect(toMinor(toMajor(minor))).toBe(minor);
    }
    expect(toMajorString(250050)).toBe("2500.50");
  });

  it("enforces integer-positive invariants on ledger inputs", () => {
    expect(() => assertIntegerMinor(10.5)).toThrow(/must be an integer/);
    expect(() => assertPositiveMinor(0)).toThrow(/greater than zero/);
    expect(() => assertPositiveMinor(-5)).toThrow(/greater than zero/);
    expect(addMinor(100, 250)).toBe(350);
    expect(subtractMinor(100, 250)).toBe(-150);
  });

  it("floors net payable at zero (fee never exceeds COD)", () => {
    expect(netPayableMinor(300000, 8000)).toBe(292000);
    expect(netPayableMinor(5000, 8000)).toBe(0);
  });

  it("formats BDT deterministically", () => {
    expect(formatBDT(125000)).toBe("৳1,250.00");
  });
});
