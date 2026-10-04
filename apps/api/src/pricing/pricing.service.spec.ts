import { describe, it, expect, beforeEach } from "vitest";
import { PricingService } from "./pricing.service.js";
import { DeliveryZone } from "@dhruto/contracts";

describe("PricingService", () => {
  let service: PricingService;

  beforeEach(() => {
    service = new PricingService();
  });

  describe("resolveZone", () => {
    it("should resolve INSIDE_DHAKA for central Dhaka thanas", () => {
      expect(service.resolveZone("Dhaka", "Dhanmondi")).toBe(DeliveryZone.INSIDE_DHAKA);
      expect(service.resolveZone("Dhaka", "Gulshan")).toBe(DeliveryZone.INSIDE_DHAKA);
      expect(service.resolveZone("Dhaka", "Mirpur")).toBe(DeliveryZone.INSIDE_DHAKA);
    });

    it("should resolve DHAKA_SUBURBS for Savar, Gazipur, and Narayanganj", () => {
      expect(service.resolveZone("Dhaka", "Savar")).toBe(DeliveryZone.DHAKA_SUBURBS);
      expect(service.resolveZone("Dhaka", "Keraniganj")).toBe(DeliveryZone.DHAKA_SUBURBS);
      expect(service.resolveZone("Gazipur")).toBe(DeliveryZone.DHAKA_SUBURBS);
      expect(service.resolveZone("Narayanganj")).toBe(DeliveryZone.DHAKA_SUBURBS);
    });

    it("should resolve OUTSIDE_DHAKA for other districts", () => {
      expect(service.resolveZone("Chittagong")).toBe(DeliveryZone.OUTSIDE_DHAKA);
      expect(service.resolveZone("Sylhet")).toBe(DeliveryZone.OUTSIDE_DHAKA);
      expect(service.resolveZone("Rajshahi")).toBe(DeliveryZone.OUTSIDE_DHAKA);
    });
  });

  describe("calculate", () => {
    it("should calculate inside Dhaka pricing correctly", () => {
      const result = service.calculate({
        district: "Dhaka",
        thana: "Mohammadpur",
        weight: 1.0,
        codAmount: 500,
      });

      expect(result.zone).toBe(DeliveryZone.INSIDE_DHAKA);
      expect(result.baseFee).toBe(60);
      expect(result.weightFee).toBe(0);
      expect(result.codFee).toBe(0);
      expect(result.totalFee).toBe(60);
      expect(result.estimatedDays).toBe("24-48 Hours");
    });

    it("should add weight fees for weights above 1kg inside Dhaka", () => {
      const result = service.calculate({
        district: "Dhaka",
        thana: "Mohammadpur",
        weight: 2.5, // 2 extra kg -> 2 * 20 = 40
        codAmount: 0,
      });

      expect(result.baseFee).toBe(60);
      expect(result.weightFee).toBe(40);
      expect(result.totalFee).toBe(100);
    });

    it("should calculate outside Dhaka fees with 1% COD charge", () => {
      const result = service.calculate({
        district: "Khulna",
        thana: "Sonadanga",
        weight: 1.5, // 1 extra kg -> 1 * 25 = 25
        codAmount: 2000, // 1% of 2000 = 20
      });

      expect(result.zone).toBe(DeliveryZone.OUTSIDE_DHAKA);
      expect(result.baseFee).toBe(130);
      expect(result.weightFee).toBe(25);
      expect(result.codFee).toBe(20);
      expect(result.totalFee).toBe(175);
      expect(result.estimatedDays).toBe("72-96 Hours");
    });
  });
});
