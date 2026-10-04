import { describe, it, expect, beforeEach } from "vitest";
import { ParcelsService } from "./parcels.service.js";
import { ParcelStatus } from "@dhruto/contracts";
import { PricingService } from "../pricing/pricing.service.js";

describe("ParcelsService", () => {
  let service: ParcelsService;
  let pricingService: PricingService;

  const mockParcelRepo: any = {
    create: (data: any) => ({
      ...data,
      id: "test-id",
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    save: (data: any) => Promise.resolve(data),
    find: () => Promise.resolve([]),
    findOne: (opts: any) => {
      if (opts?.where?.trackingCode === "DHR-20261004-TEST01") {
        return Promise.resolve({
          id: "test-id",
          trackingCode: "DHR-20261004-TEST01",
          recipientName: "Test Recipient",
          recipientPhone: "01712345678",
          rawAddress: "123 Test Street",
          normalizedAddress: { district: "Dhaka", thana: "Dhanmondi" },
          weight: 1.5,
          codAmount: 1000,
          deliveryFee: 80,
          status: ParcelStatus.CREATED,
          createdAt: new Date(),
          updatedAt: new Date(),
          merchant: { businessName: "Test Merchant", contactPhone: "01700000000", pickupAddress: "Warehouse" },
        });
      }
      return Promise.resolve(null);
    },
  };

  const mockHistoryRepo: any = {
    create: (data: any) => data,
    save: (data: any) => Promise.resolve(data),
    find: () =>
      Promise.resolve([
        {
          id: "hist-1",
          parcelId: "test-id",
          fromStatus: null,
          toStatus: ParcelStatus.CREATED,
          changedByRole: "MERCHANT",
          reason: "Booking created",
          createdAt: new Date(),
        },
      ]),
  };

  const mockMerchantRepo: any = {
    findOne: () =>
      Promise.resolve({
        id: "merchant-id",
        userId: "user-id",
        businessName: "Test Merchant",
      }),
    create: (data: any) => data,
    save: (data: any) => Promise.resolve(data),
  };

  const mockAssignmentRepo: any = {
    create: (data: any) => data,
    save: (data: any) => Promise.resolve(data),
  };

  const mockRiderRepo: any = {
    findOne: () => Promise.resolve({ id: "rider-id", userId: "rider-user-id" }),
  };

  const mockHubRepo: any = {
    findOne: () => Promise.resolve({ id: "hub-1", name: "Dhaka Central Sorting Hub" }),
  };

  const mockIdempotencyService: any = {
    checkKey: () => Promise.resolve({ isDuplicate: false }),
    saveKey: () => Promise.resolve(),
  };

  beforeEach(() => {
    pricingService = new PricingService();
    service = new ParcelsService(
      mockParcelRepo,
      mockHistoryRepo,
      mockMerchantRepo,
      mockAssignmentRepo,
      mockRiderRepo,
      mockHubRepo,
      pricingService,
      mockIdempotencyService,
    );
  });

  describe("createParcel", () => {
    it("should create parcel with CREATED status, dynamic pricing, and canonical tracking code", async () => {
      const booking = {
        recipientName: "Hasan Mahmud",
        recipientPhone: "01812345678",
        district: "Dhaka",
        thana: "Dhanmondi",
        deliveryAddress: "GEC Circle, Nasirabad, Chittagong",
        codAmount: 0,
        weight: 1.0,
      };

      const result = await service.createParcel(booking);

      expect(result.id).toBeDefined();
      expect(result.trackingCode).toMatch(/^DHR-\d{8}-[A-F0-9]{6}$/);
      expect(result.recipientName).toBe("Hasan Mahmud");
      expect(result.recipientPhone).toBe("01812345678");
      expect(result.status).toBe(ParcelStatus.CREATED);
      expect(result.deliveryFee).toBe(60); // Inside Dhaka 1kg base fee
      expect(result.codAmount).toBe(0);
      expect(result.createdAt).toBeDefined();
    });

    it("should calculate outside Dhaka fees properly", async () => {
      const booking = {
        recipientName: "Fatima Begum",
        recipientPhone: "01712345678",
        district: "Chittagong",
        thana: "Panchlaish",
        deliveryAddress: "Nasirabad, Chittagong",
        codAmount: 2000,
        weight: 2.0, // base 130 + 1 extra kg (25) + 1% COD (20) = 175
      };

      const result = await service.createParcel(booking);
      expect(result.deliveryFee).toBe(175);
    });
  });

  describe("getTracking", () => {
    it("should return public-safe tracking with masked phone and timeline", async () => {
      const result = await service.getTracking("DHR-20261004-TEST01");

      expect(result.trackingCode).toBe("DHR-20261004-TEST01");
      expect(result.recipientPhoneMasked).toBe("017****5678");
      expect(result.status).toBe(ParcelStatus.CREATED);
      expect(result.timeline).toHaveLength(1);
      expect(result.timeline[0]?.labelEn).toBe("Booking Created");
      expect(result.timeline[0]?.labelBn).toBe("বুকিং সম্পন্ন হয়েছে");
    });
  });

  describe("getShippingLabel", () => {
    it("should return shipping label data with SVG barcode", async () => {
      const label = await service.getShippingLabel("DHR-20261004-TEST01");

      expect(label.trackingCode).toBe("DHR-20261004-TEST01");
      expect(label.barcodeSvg).toContain("<svg");
      expect(label.barcodeSvg).toContain("DHR-20261004-TEST01");
      expect(label.recipientName).toBe("Test Recipient");
      expect(label.merchantName).toBe("Test Merchant");
      expect(label.routingHub).toBe("Dhaka Central Sorting Hub");
    });
  });
});
