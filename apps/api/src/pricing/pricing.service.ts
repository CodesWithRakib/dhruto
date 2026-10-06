import { Injectable, Logger } from "@nestjs/common";
import {
  DeliveryZone,
  type PricingCalculation,
  type PricingResult,
} from "@dhruto/contracts";
import {
  DHAKA_SUBURB_DISTRICTS,
  DHAKA_SUBURB_THANAS,
  INCLUDED_WEIGHT_CENTIS,
  PAISA_PER_BDT,
  PRICING_RULES_VERSION,
  ZONE_RATES,
} from "./pricing.rules.js";

/**
 * Authoritative delivery pricing engine.
 *
 * Delivery fees are computed in integer paisa so financial amounts never pass
 * through binary floating-point arithmetic (docs/04-DATABASE-DESIGN.md §4).
 * The frontend never computes a fee — it renders whatever this service returns.
 */
@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);

  /** Converts a BDT amount to integer paisa, deterministically. */
  static toPaisa(amount: number | string): number {
    const parsed = typeof amount === "number" ? amount : Number(amount);
    if (!Number.isFinite(parsed)) {
      return 0;
    }
    return Math.round(parsed * PAISA_PER_BDT);
  }

  /** Converts integer paisa back to a 2-decimal BDT number. */
  static toBdt(paisa: number): number {
    return Math.round(paisa) / PAISA_PER_BDT;
  }

  /**
   * Resolves the delivery zone from the destination district and thana.
   * Zone resolution is part of the pricing domain, not of any controller.
   */
  resolveZone(district: string, thana?: string): DeliveryZone {
    const cleanDistrict = (district || "").trim().toLowerCase();
    const cleanThana = (thana || "").trim().toLowerCase();

    if (cleanDistrict === "dhaka") {
      if (cleanThana && DHAKA_SUBURB_THANAS.has(cleanThana)) {
        return DeliveryZone.DHAKA_SUBURBS;
      }
      return DeliveryZone.INSIDE_DHAKA;
    }

    if (DHAKA_SUBURB_DISTRICTS.has(cleanDistrict)) {
      return DeliveryZone.DHAKA_SUBURBS;
    }

    return DeliveryZone.OUTSIDE_DHAKA;
  }

  /**
   * Calculates a full delivery-fee breakdown.
   *
   * - `weightFee`: extra (rounded-up) kilograms beyond the included 1 kg.
   * - `codFee`: percentage of the COD amount, in basis points.
   * - `additionalCharge` / `discount`: explicit extension points (0 in Phase 1).
   */
  calculate(calc: PricingCalculation): PricingResult {
    const zone = this.resolveZone(calc.district, calc.thana);
    const rate = ZONE_RATES[zone];

    const weightCentis = Math.max(
      1,
      Math.round(Number(calc.weight) * 100),
    );
    const codPaisa = Math.max(0, PricingService.toPaisa(calc.codAmount));

    // Additional kilograms are charged for each *started* kilogram.
    const extraKg = Math.max(
      0,
      Math.ceil(weightCentis / 100) - Math.ceil(INCLUDED_WEIGHT_CENTIS / 100),
    );
    const weightFeePaisa = extraKg * rate.extraKgRatePaisa;

    // Integer basis-point math: (codPaisa * bps) / 10000, rounded to the paisa.
    const codFeePaisa = Math.round((codPaisa * rate.codRateBps) / 10_000);

    const additionalChargePaisa = 0;
    const discountPaisa = 0;

    const totalPaisa =
      rate.baseFeePaisa +
      weightFeePaisa +
      additionalChargePaisa +
      codFeePaisa -
      discountPaisa;

    this.logger.debug(
      `Pricing v${PRICING_RULES_VERSION}: zone=${zone} weightCentis=${weightCentis} ` +
        `codPaisa=${codPaisa} totalPaisa=${totalPaisa}`,
    );

    return {
      zone,
      baseFee: PricingService.toBdt(rate.baseFeePaisa),
      weightFee: PricingService.toBdt(weightFeePaisa),
      additionalCharge: PricingService.toBdt(additionalChargePaisa),
      discount: PricingService.toBdt(discountPaisa),
      codFee: PricingService.toBdt(codFeePaisa),
      totalFee: PricingService.toBdt(totalPaisa),
      estimatedDays: rate.estimatedDays,
    };
  }
}
