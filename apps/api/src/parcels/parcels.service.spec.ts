import { describe, it, expect, beforeEach } from "vitest";
import { NotFoundException } from "@nestjs/common";
import { ParcelStatus } from "@dhruto/contracts";
import { ParcelsService } from "./parcels.service.js";
import { ParcelLifecycleService } from "./lifecycle/parcel-lifecycle.service.js";
import { TrackingCodeService } from "./services/tracking-code.service.js";
import { PricingService } from "../pricing/pricing.service.js";
import { UserRole } from "../database/entities/User.entity.js";
import { type AuthenticatedUser } from "../auth/jwt/jwt.interface.js";

const MERCHANT_A = "11111111-1111-1111-1111-111111111111";
const MERCHANT_B = "22222222-2222-2222-2222-222222222222";

/** A parcel that belongs to Merchant B. */
const PARCEL_OF_B = {
  id: "33333333-3333-3333-3333-333333333333",
  trackingCode: "DHR-20260101-ABC234",
  merchantId: MERCHANT_B,
  recipientName: "Rafiqul Islam",
  recipientPhone: "01712345678",
  parcelDescription: null,
  rawAddress: "House 12, Road 5, Dhanmondi, Dhaka",
  district: "Dhaka",
  thana: "Dhanmondi",
  normalizedAddress: { zone: "INSIDE_DHAKA" },
  weight: 1.5,
  codAmount: 1500,
  deliveryFee: 60,
  status: ParcelStatus.CREATED,
  currentHubId: null,
  currentHub: null,
  currentRider: null,
  merchant: {
    id: MERCHANT_B,
    businessName: "Merchant B Traders",
    contactPhone: "01700000012",
    pickupAddress: "Warehouse B",
  },
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

function buildService(parcel: unknown, history: unknown[] = []) {
  const parcelRepo = {
    findOne: () => Promise.resolve(parcel),
    exists: () => Promise.resolve(false),
  };
  const historyRepo = {
    find: () => Promise.resolve(history),
  };
  const merchantRepo = {
    findOne: (options: { where: { id?: string; userId?: string } }) => {
      if (options.where.id === MERCHANT_A || options.where.userId === "user-a") {
        return Promise.resolve({ id: MERCHANT_A, userId: "user-a" });
      }
      return Promise.resolve(null);
    },
  };

  return new ParcelsService(
    parcelRepo as never,
    historyRepo as never,
    merchantRepo as never,
    {} as never,
    {} as never,
    {} as never,
    new PricingService(),
    { find: () => Promise.resolve(null) } as never,
    new ParcelLifecycleService(),
    new TrackingCodeService(),
  );
}

const merchantA: AuthenticatedUser = {
  id: "user-a",
  email: "a@example.com",
  phone: "01700000011",
  role: UserRole.MERCHANT,
  merchantId: MERCHANT_A,
};

const admin: AuthenticatedUser = {
  id: "admin-user",
  email: "admin@dhruto.com",
  phone: "01700000001",
  role: UserRole.ADMIN,
  merchantId: null,
};

describe("ParcelsService — tenant isolation", () => {
  let service: ParcelsService;

  beforeEach(() => {
    service = buildService(PARCEL_OF_B);
  });

  it("resolves an unscoped scope for platform admins", async () => {
    const scope = await service.resolveScope(admin);
    expect(scope.isAdmin).toBe(true);
    expect(scope.merchantId).toBeUndefined();
  });

  it("resolves the merchant scope from the authenticated token", async () => {
    const scope = await service.resolveScope(merchantA);
    expect(scope.isAdmin).toBe(false);
    expect(scope.merchantId).toBe(MERCHANT_A);
  });

  it("hides another merchant's parcel rather than confirming it exists", async () => {
    const scope = await service.resolveScope(merchantA);
    await expect(
      service.getParcelById(PARCEL_OF_B.id, scope),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("lets the platform admin read any parcel", async () => {
    const scope = await service.resolveScope(admin);
    const details = await service.getParcelById(PARCEL_OF_B.id, scope);
    expect(details.id).toBe(PARCEL_OF_B.id);
    expect(details.merchantId).toBe(MERCHANT_B);
  });

  it("hides another merchant's shipping label", async () => {
    const scope = await service.resolveScope(merchantA);
    await expect(
      service.getShippingLabel(PARCEL_OF_B.id, scope),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("hides another merchant's history", async () => {
    const scope = await service.resolveScope(merchantA);
    await expect(
      service.getParcelHistory(PARCEL_OF_B.id, scope),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe("ParcelsService — public tracking payload", () => {
  it("masks the recipient phone and never exposes merchant or financial data", async () => {
    const service = buildService(PARCEL_OF_B, [
      {
        id: "44444444-4444-4444-4444-444444444444",
        parcelId: PARCEL_OF_B.id,
        fromStatus: null,
        toStatus: ParcelStatus.CREATED,
        eventType: "PARCEL_CREATED",
        actorRole: "MERCHANT",
        description: "Initial booking created",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]);

    const tracking = await service.getTracking("dhr-20260101-abc234");
    const serialized = JSON.stringify(tracking);

    expect(tracking.trackingCode).toBe(PARCEL_OF_B.trackingCode);
    expect(tracking.recipientPhoneMasked).toBe("017****5678");
    expect(tracking.timeline).toHaveLength(1);
    expect(tracking.timeline[0]?.labelEn).toBe("Booking Created");
    expect(tracking.timeline[0]?.labelBn).toBe("বুকিং সম্পন্ন হয়েছে");

    // Forbidden leakage checks (docs/10-SECURITY.md §6).
    expect(serialized).not.toContain(MERCHANT_B);
    expect(serialized).not.toContain("Merchant B Traders");
    expect(serialized).not.toContain("1500");
    expect(serialized).not.toContain("deliveryFee");
    expect(serialized).not.toContain("01712345678");
  });
});

describe("ParcelsService — tracking code generation", () => {
  it("generates a canonical, unambiguous tracking code", () => {
    const code = new TrackingCodeService().generate(
      new Date("2026-01-01T00:00:00.000Z"),
    );
    expect(code).toMatch(/^DHR-20260101-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/);
  });
});
