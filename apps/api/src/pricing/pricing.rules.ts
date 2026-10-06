import { DeliveryZone } from "@dhruto/contracts";

/**
 * Dhruto — centralized delivery pricing rules.
 * ------------------------------------------------------------------
 * All rates live here. Controllers and other services must never hard-code a
 * fee; they call PricingService, which reads this table. Later phases can back
 * these values with the `pricing_rules` / `pricing_rule_items` tables without
 * changing the pricing contract.
 *
 * Money: every rate is expressed in *paisa* (minor units, 1 BDT = 100 paisa).
 * Arithmetic happens on integers only; values are converted to BDT at the edge.
 */

export const PAISA_PER_BDT = 100;

/** Version tag surfaced in pricing logs so a quote can be traced to its rules. */
export const PRICING_RULES_VERSION = "2026.1";

export interface ZoneRate {
  /** Flat fee covering the first included kilogram. */
  baseFeePaisa: number;
  /** Fee per additional (rounded-up) kilogram beyond the included weight. */
  extraKgRatePaisa: number;
  /** COD handling fee in basis points (100 bps = 1%). */
  codRateBps: number;
  estimatedDays: string;
}

/** Weight included in the base fee, in hundredths of a kilogram (1.00 kg). */
export const INCLUDED_WEIGHT_CENTIS = 100;

export const ZONE_RATES: Record<DeliveryZone, ZoneRate> = {
  [DeliveryZone.INSIDE_DHAKA]: {
    baseFeePaisa: 60 * PAISA_PER_BDT,
    extraKgRatePaisa: 20 * PAISA_PER_BDT,
    codRateBps: 0,
    estimatedDays: "24-48 Hours",
  },
  [DeliveryZone.DHAKA_SUBURBS]: {
    baseFeePaisa: 100 * PAISA_PER_BDT,
    extraKgRatePaisa: 20 * PAISA_PER_BDT,
    codRateBps: 100,
    estimatedDays: "48 Hours",
  },
  [DeliveryZone.OUTSIDE_DHAKA]: {
    baseFeePaisa: 130 * PAISA_PER_BDT,
    extraKgRatePaisa: 25 * PAISA_PER_BDT,
    codRateBps: 100,
    estimatedDays: "72-96 Hours",
  },
};

/** Thanas of Dhaka district treated as suburban rather than metro. */
export const DHAKA_SUBURB_THANAS = new Set([
  "savar",
  "dhamrai",
  "keraniganj",
  "nawabganj",
  "dohar",
]);

/** Districts adjacent to Dhaka billed at the suburban rate. */
export const DHAKA_SUBURB_DISTRICTS = new Set(["gazipur", "narayanganj"]);
