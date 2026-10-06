import { BDT_MINOR_UNITS, CURRENCY_BDT } from "@dhruto/contracts";

export { CURRENCY_BDT, BDT_MINOR_UNITS };

/**
 * Dhruto money handling — Phase 4 financial core.
 * ------------------------------------------------------------------
 * All financial computation happens in integer minor units (poisha for BDT).
 * JavaScript floats and `Number(decimal)` chains must never appear in ledger
 * code paths: decimals arrive from Postgres as strings and are converted once,
 * at the boundary, with HALF_UP rounding to the currency scale.
 */

const SCALE = 2;
const UNIT = 10 ** SCALE;

/** Parses a major-unit value (number or Postgres decimal string) to minor units. */
export function toMinor(value: number | string): number {
  const numeric = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(numeric)) {
    throw new Error(`Invalid monetary value: ${String(value)}`);
  }
  return Math.round(numeric * UNIT + Number.EPSILON);
}

/** Renders integer minor units as a major-unit string with 2 decimals. */
export function toMajorString(minor: number): string {
  assertIntegerMinor(minor);
  return (minor / UNIT).toFixed(SCALE);
}

/** Renders minor units as a major-unit number for API responses. */
export function toMajor(minor: number): number {
  return Number(toMajorString(minor));
}

export function assertIntegerMinor(minor: number): void {
  if (!Number.isInteger(minor)) {
    throw new Error(`Minor-unit amount must be an integer, got ${minor}`);
  }
}

export function assertPositiveMinor(minor: number, field = "amount"): void {
  assertIntegerMinor(minor);
  if (minor <= 0) {
    throw new Error(`${field} must be greater than zero`);
  }
}

export function addMinor(a: number, b: number): number {
  assertIntegerMinor(a);
  assertIntegerMinor(b);
  return a + b;
}

export function subtractMinor(a: number, b: number): number {
  assertIntegerMinor(a);
  assertIntegerMinor(b);
  return a - b;
}

/** Net payable in minor units, floored at zero (fee can never exceed COD). */
export function netPayableMinor(grossMinor: number, feeMinor: number): number {
  assertIntegerMinor(grossMinor);
  assertIntegerMinor(feeMinor);
  return Math.max(0, grossMinor - feeMinor);
}

/** Formats minor units for display/notifications: `৳1,250.00`. */
export function formatBDT(minor: number): string {
  const major = minor / UNIT;
  return `৳${major.toLocaleString("en-US", { minimumFractionDigits: SCALE, maximumFractionDigits: SCALE })}`;
}

export { BDT_MINOR_UNITS as MINOR_UNITS_PER_MAJOR };
