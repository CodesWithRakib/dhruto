import { Injectable } from "@nestjs/common";
import {
  DeliveryZone,
  type PricingCalculation,
  type PricingResult,
} from "@dhruto/contracts";

const SUBURB_THANAS = new Set([
  "savar",
  "dhamrai",
  "keraniganj",
  "nawabganj",
  "dohar",
]);

const SUBURB_DISTRICTS = new Set(["gazipur", "narayanganj"]);

@Injectable()
export class PricingService {
  /**
   * Resolves delivery zone based on destination district and thana.
   */
  resolveZone(district: string, thana?: string): DeliveryZone {
    const cleanDistrict = (district || "").trim().toLowerCase();
    const cleanThana = (thana || "").trim().toLowerCase();

    if (cleanDistrict === "dhaka") {
      if (cleanThana && SUBURB_THANAS.has(cleanThana)) {
        return DeliveryZone.DHAKA_SUBURBS;
      }
      return DeliveryZone.INSIDE_DHAKA;
    }

    if (SUBURB_DISTRICTS.has(cleanDistrict)) {
      return DeliveryZone.DHAKA_SUBURBS;
    }

    return DeliveryZone.OUTSIDE_DHAKA;
  }

  /**
   * Calculates detailed delivery pricing breakdown.
   */
  calculate(calc: PricingCalculation): PricingResult {
    const zone = this.resolveZone(calc.district, calc.thana);
    const weight = Number(calc.weight) || 1;
    const codAmount = Number(calc.codAmount) || 0;

    let baseFee = 60;
    let extraKgRate = 20;
    let codRate = 0; // 0%
    let estimatedDays = "24-48 Hours";

    if (zone === DeliveryZone.DHAKA_SUBURBS) {
      baseFee = 100;
      extraKgRate = 20;
      codRate = 0.01; // 1%
      estimatedDays = "48 Hours";
    } else if (zone === DeliveryZone.OUTSIDE_DHAKA) {
      baseFee = 130;
      extraKgRate = 25;
      codRate = 0.01; // 1%
      estimatedDays = "72-96 Hours";
    }

    // Weight fee for extra kilograms beyond 1kg
    const extraKg = Math.max(0, Math.ceil(weight - 1));
    const weightFee = extraKg * extraKgRate;

    // COD fee
    const codFee = Math.round(codAmount * codRate);

    const totalFee = baseFee + weightFee + codFee;

    return {
      zone,
      baseFee,
      weightFee,
      codFee,
      totalFee,
      estimatedDays,
    };
  }
}
