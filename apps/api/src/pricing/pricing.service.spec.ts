import { describe, it, expect, beforeEach } from "vitest";
import { DeliveryZone } from "@dhruto/contracts";
import { PricingService } from "./pricing.service.js";

describe("PricingService", () => {
  let service: PricingService;

  beforeEach(() => {
    service = new PricingService();
  });

  describe("resolveZone", () => {
    it("resolves INSIDE_DHAKA for metro Dhaka thanas", () => {
      expect(service.resolveZone("Dhaka", "Dhanmondi")).toBe(DeliveryZone.INSIDE_DHAKA);
      expect(service.resolveZone("Dhaka", "Gulshan")).toBe(DeliveryZone.INSIDE_DHAKA);
      expect(service.resolveZone("Dhaka", "Mirpur")).toBe(DeliveryZone.INSIDE_DHAKA);
      expect(service.resolveZone("dhaka")).toBe(DeliveryZone.INSIDE_DHAKA);
    });

    it("resolves DHAKA_SUBURBS for Savar, Keraniganj, Gazipur and Narayanganj", () => {
      expect(service.resolveZone("Dhaka", "Savar")).toBe(DeliveryZone.DHAKA_SUBURBS);
      expect(service.resolveZone("Dhaka", "Keraniganj")).toBe(DeliveryZone.DHAKA_SUBURBS);
      expect(service.resolveZone("Gazipur")).toBe(DeliveryZone.DHAKA_SUBURBS);
      expect(service.resolveZone("Narayanganj")).toBe(DeliveryZone.DHAKA_SUBURBS);
    });

    it("resolves OUTSIDE_DHAKA for other districts", () => {
      expect(service.resolveZone("Chittagong")).toBe(DeliveryZone.OUTSIDE_DHAKA);
      expect(service.resolveZone("Sylhet")).toBe(DeliveryZone.OUTSIDE_DHAKA);
      expect(service.resolveZone("Khulna", "Sonadanga")).toBe(DeliveryZone.OUTSIDE_DHAKA);
    });

    it("is case- and whitespace-insensitive", () => {
      expect(service.resolveZone("  DHAKA ", "  SAVAR ")).toBe(DeliveryZone.DHAKA_SUBURBS);
    });
  });

  describe("calculate — inside Dhaka", () => {
    it("charges only the base fee at the included 1 kg", () => {
      const result = service.calculate({
        district: "Dhaka",
        thana: "Mohammadpur",
        weight: 1,
        codAmount: 500,
      });

      expect(result.zone).toBe(DeliveryZone.INSIDE_DHAKA);
      expect(result.baseFee).toBe(60);
      expect(result.weightFee).toBe(0);
      expect(result.codFee).toBe(0);
      expect(result.additionalCharge).toBe(0);
      expect(result.discount).toBe(0);
      expect(result.totalFee).toBe(60);
      expect(result.estimatedDays).toBe("24-48 Hours");
    });

    it("charges nothing extra at the exact 1.00 kg boundary", () => {
      const result = service.calculate({
        district: "Dhaka",
        thana: "Uttara",
        weight: 1.0,
        codAmount: 0,
      });
      expect(result.weightFee).toBe(0);
      expect(result.totalFee).toBe(60);
    });

    it("charges one extra kg just above the boundary", () => {
      const result = service.calculate({
        district: "Dhaka",
        thana: "Uttara",
        weight: 1.01,
        codAmount: 0,
      });
      expect(result.weightFee).toBe(20);
      expect(result.totalFee).toBe(80);
    });

    it("rounds started kilograms up", () => {
      const onePointOne = service.calculate({
        district: "Dhaka",
        thana: "Uttara",
        weight: 1.1,
        codAmount: 0,
      });
      expect(onePointOne.weightFee).toBe(20);

      const twoPointFive = service.calculate({
        district: "Dhaka",
        thana: "Uttara",
        weight: 2.5,
        codAmount: 0,
      });
      expect(twoPointFive.weightFee).toBe(40);
      expect(twoPointFive.totalFee).toBe(100);
    });
  });

  describe("calculate — outside Dhaka", () => {
    it("applies base, weight and 1% COD fees", () => {
      const result = service.calculate({
        district: "Khulna",
        thana: "Sonadanga",
        weight: 1.5,
        codAmount: 2000,
      });

      expect(result.zone).toBe(DeliveryZone.OUTSIDE_DHAKA);
      expect(result.baseFee).toBe(130);
      expect(result.weightFee).toBe(25);
      expect(result.codFee).toBe(20);
      expect(result.totalFee).toBe(175);
      expect(result.estimatedDays).toBe("72-96 Hours");
    });

    it("charges no COD fee when the parcel is prepaid", () => {
      const result = service.calculate({
        district: "Sylhet",
        thana: "Sylhet Sadar",
        weight: 2,
        codAmount: 0,
      });
      expect(result.codFee).toBe(0);
      expect(result.totalFee).toBe(130 + 25);
    });

    it("rounds the COD fee to the nearest paisa for large amounts", () => {
      const result = service.calculate({
        district: "Rajshahi",
        thana: "Boalia",
        weight: 1,
        codAmount: 99999,
      });
      // 1% of 99,999 BDT = 999.99 BDT
      expect(result.codFee).toBe(999.99);
      expect(result.totalFee).toBe(130 + 999.99);
    });
  });

  describe("calculate — suburbs", () => {
    it("applies the suburban base fee and 1% COD fee", () => {
      const result = service.calculate({
        district: "Gazipur",
        thana: "Tongi",
        weight: 1,
        codAmount: 1000,
      });
      expect(result.zone).toBe(DeliveryZone.DHAKA_SUBURBS);
      expect(result.baseFee).toBe(100);
      expect(result.codFee).toBe(10);
      expect(result.totalFee).toBe(110);
    });
  });

  describe("monetary precision", () => {
    it("returns exactly 2 decimal places for every component", () => {
      const result = service.calculate({
        district: "Khulna",
        thana: "Sonadanga",
        weight: 3.33,
        codAmount: 12345.67,
      });

      for (const value of [
        result.baseFee,
        result.weightFee,
        result.codFee,
        result.additionalCharge,
        result.discount,
        result.totalFee,
      ]) {
        expect(Number.isInteger(Math.round(value * 100))).toBe(true);
        expect(Math.abs(value * 100 - Math.round(value * 100))).toBeLessThan(1e-6);
      }
    });

    it("never returns a fractional paisa (integer minor-unit arithmetic)", () => {
      // 0.1% style fractions are impossible because COD rates are basis points.
      const result = service.calculate({
        district: "Dhaka",
        thana: "Banani",
        weight: 1.7,
        codAmount: 333.33,
      });
      expect(Number.isInteger(Math.round(result.codFee * 100))).toBe(true);
      expect(Number.isInteger(Math.round(result.totalFee * 100))).toBe(true);
    });
  });

  describe("input sanitisation", () => {
    it("treats a negative COD amount as zero", () => {
      const result = service.calculate({
        district: "Dhaka",
        thana: "Banani",
        weight: 1,
        codAmount: -500,
      });
      expect(result.codFee).toBe(0);
      expect(result.totalFee).toBe(60);
    });

    it("treats a zero/negative weight as the minimum 1 kg", () => {
      const zero = service.calculate({
        district: "Dhaka",
        thana: "Banani",
        weight: 0,
        codAmount: 0,
      });
      expect(zero.totalFee).toBe(60);
    });
  });

  describe("paisa conversion helpers", () => {
    it("converts BDT <-> paisa deterministically", () => {
      expect(PricingService.toPaisa(60)).toBe(6000);
      expect(PricingService.toPaisa(123.45)).toBe(12345);
      expect(PricingService.toBdt(12345)).toBe(123.45);
      expect(PricingService.toPaisa("2500")).toBe(250000);
    });
  });
});
