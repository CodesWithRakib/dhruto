import { describe, it, expect, beforeEach } from "vitest";
import { ParcelsService } from "./parcels.service.js";
import { ParcelStatus } from "@dhruto/contracts";

describe("ParcelsService", () => {
  let service: ParcelsService;

  beforeEach(() => {
    service = new ParcelsService();
  });

  describe("calculateDeliveryFee", () => {
    it("should calculate base fee of 60 BDT for 1 kg or less", () => {
      expect(service.calculateDeliveryFee(0.5)).toBe(60);
      expect(service.calculateDeliveryFee(1.0)).toBe(60);
    });

    it("should calculate extra 20 BDT per kg for weights exceeding 1 kg", () => {
      // 1.5 kg -> 1 extra kg -> 60 + 20 = 80 BDT
      expect(service.calculateDeliveryFee(1.5)).toBe(80);
      // 2.0 kg -> 1 extra kg -> 60 + 20 = 80 BDT
      expect(service.calculateDeliveryFee(2.0)).toBe(80);
      // 3.0 kg -> 2 extra kg -> 60 + 40 = 100 BDT
      expect(service.calculateDeliveryFee(3.0)).toBe(100);
      // 5.5 kg -> 5 extra kg -> 60 + 100 = 160 BDT
      expect(service.calculateDeliveryFee(5.5)).toBe(160);
    });
  });

  describe("createParcel", () => {
    it("should create parcel with CREATED status and formatted tracking code", async () => {
      const booking = {
        recipientName: "Hasan Mahmud",
        recipientPhone: "01812345678",
        district: "Chittagong",
        thana: "Panchlaish",
        deliveryAddress: "GEC Circle, Nasirabad, Chittagong",
        codAmount: 2500,
        weight: 2.0,
      };

      const result = await service.createParcel(booking);

      expect(result.id).toBeDefined();
      expect(result.trackingCode).toMatch(/^DHR-\d{8}-[A-F0-9]{6}$/);
      expect(result.recipientName).toBe("Hasan Mahmud");
      expect(result.recipientPhone).toBe("01812345678");
      expect(result.status).toBe(ParcelStatus.CREATED);
      expect(result.deliveryFee).toBe(80);
      expect(result.codAmount).toBe(2500);
      expect(result.weight).toBe(2.0);
      expect(result.createdAt).toBeDefined();
    });
  });
});
