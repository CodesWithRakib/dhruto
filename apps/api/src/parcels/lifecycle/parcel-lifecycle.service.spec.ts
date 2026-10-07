import { describe, it, expect, beforeEach } from "vitest";
import { BadRequestException } from "@nestjs/common";
import { ParcelStatus } from "@dhruto/contracts";
import {
  ALLOWED_PARCEL_TRANSITIONS,
  ORIGIN_HUB_INBOUND_FROM,
  PRE_PICKUP_RIDER_ASSIGNMENT_FROM,
  ParcelLifecycleService,
} from "./parcel-lifecycle.service.js";

describe("ParcelLifecycleService", () => {
  let lifecycle: ParcelLifecycleService;

  beforeEach(() => {
    lifecycle = new ParcelLifecycleService();
  });

  describe("matrix completeness", () => {
    it("defines outgoing transitions for every status", () => {
      for (const status of Object.values(ParcelStatus)) {
        expect(ALLOWED_PARCEL_TRANSITIONS[status]).toBeDefined();
      }
    });

    it("never allows a status to transition to itself", () => {
      for (const status of Object.values(ParcelStatus)) {
        expect(ALLOWED_PARCEL_TRANSITIONS[status]).not.toContain(status);
      }
    });
  });

  describe("birth", () => {
    it("allows only CREATED from a null status", () => {
      expect(lifecycle.canTransition(null, ParcelStatus.CREATED)).toBe(true);
      expect(lifecycle.canTransition(null, ParcelStatus.DELIVERED)).toBe(false);
      expect(lifecycle.canTransition(null, ParcelStatus.CASH_VERIFIED)).toBe(false);
    });
  });

  describe("documented transitions", () => {
    it("allows the happy path from booking to delivery", () => {
      const path = [
        [ParcelStatus.CREATED, ParcelStatus.PICKUP_REQUESTED],
        [ParcelStatus.PICKUP_REQUESTED, ParcelStatus.PICKUP_ASSIGNED],
        [ParcelStatus.PICKUP_ASSIGNED, ParcelStatus.PICKED_UP],
        [ParcelStatus.PICKED_UP, ParcelStatus.ORIGIN_HUB_RECEIVED],
        [ParcelStatus.ORIGIN_HUB_RECEIVED, ParcelStatus.BAGGED],
        [ParcelStatus.BAGGED, ParcelStatus.IN_TRANSIT],
        [ParcelStatus.IN_TRANSIT, ParcelStatus.DESTINATION_HUB_RECEIVED],
        [ParcelStatus.DESTINATION_HUB_RECEIVED, ParcelStatus.ASSIGNED_TO_RIDER],
        [ParcelStatus.ASSIGNED_TO_RIDER, ParcelStatus.OUT_FOR_DELIVERY],
        [ParcelStatus.OUT_FOR_DELIVERY, ParcelStatus.DELIVERED],
        [ParcelStatus.DELIVERED, ParcelStatus.CASH_PENDING],
        [ParcelStatus.CASH_PENDING, ParcelStatus.CASH_VERIFIED],
      ] as const;

      for (const [from, to] of path) {
        expect(lifecycle.canTransition(from, to)).toBe(true);
      }
    });

    it("allows the return-to-merchant path", () => {
      expect(
        lifecycle.canTransition(ParcelStatus.DELIVERY_ATTEMPTED, ParcelStatus.RTO_INITIATED),
      ).toBe(true);
      expect(
        lifecycle.canTransition(ParcelStatus.RTO_INITIATED, ParcelStatus.RETURN_IN_TRANSIT),
      ).toBe(true);
      expect(
        lifecycle.canTransition(ParcelStatus.RETURN_IN_TRANSIT, ParcelStatus.RETURNED_TO_MERCHANT),
      ).toBe(true);
    });
  });

  describe("forbidden transitions", () => {
    it("forbids DELIVERED -> CREATED", () => {
      expect(lifecycle.canTransition(ParcelStatus.DELIVERED, ParcelStatus.CREATED)).toBe(false);
    });

    it("forbids skipping ahead from CREATED to DELIVERED", () => {
      expect(lifecycle.canTransition(ParcelStatus.CREATED, ParcelStatus.DELIVERED)).toBe(false);
      expect(lifecycle.canTransition(ParcelStatus.CREATED, ParcelStatus.IN_TRANSIT)).toBe(false);
    });

    it("forbids moving backwards from CASH_VERIFIED", () => {
      expect(lifecycle.canTransition(ParcelStatus.CASH_VERIFIED, ParcelStatus.CASH_PENDING)).toBe(
        false,
      );
      expect(lifecycle.canTransition(ParcelStatus.CASH_VERIFIED, ParcelStatus.DELIVERED)).toBe(
        false,
      );
    });

    it("forbids any transition out of a terminal state", () => {
      for (const terminal of [
        ParcelStatus.CANCELLED,
        ParcelStatus.RETURNED_TO_MERCHANT,
        ParcelStatus.CASH_VERIFIED,
        ParcelStatus.LOST,
        ParcelStatus.DAMAGED,
      ]) {
        expect(ALLOWED_PARCEL_TRANSITIONS[terminal]).toHaveLength(0);
      }
    });

    it("forbids assigning a rider to an already delivered parcel", () => {
      expect(lifecycle.canTransition(ParcelStatus.DELIVERED, ParcelStatus.ASSIGNED_TO_RIDER)).toBe(
        false,
      );
    });

    it("forbids a no-op transition", () => {
      expect(lifecycle.canTransition(ParcelStatus.CREATED, ParcelStatus.CREATED)).toBe(false);
    });
  });

  describe("Phase 3 pre-pickup assignment shortcut", () => {
    it("permits assignment only from pre-pickup states", () => {
      expect(lifecycle.canTransition(ParcelStatus.CREATED, ParcelStatus.ASSIGNED_TO_RIDER)).toBe(
        true,
      );
      expect(
        lifecycle.canTransition(ParcelStatus.PICKUP_REQUESTED, ParcelStatus.ASSIGNED_TO_RIDER),
      ).toBe(true);
    });

    it("never permits it from a picked-up or later state", () => {
      for (const status of [
        ParcelStatus.PICKED_UP,
        ParcelStatus.IN_TRANSIT,
        ParcelStatus.OUT_FOR_DELIVERY,
        ParcelStatus.DELIVERED,
      ]) {
        expect(lifecycle.canTransition(status, ParcelStatus.ASSIGNED_TO_RIDER)).toBe(false);
      }
    });
  });

  describe("Phase 2 hub inbound exception", () => {
    it("permits ORIGIN_HUB_RECEIVED only from the pre-pickup pipeline states", () => {
      expect(ORIGIN_HUB_INBOUND_FROM).toEqual([
        ParcelStatus.CREATED,
        ParcelStatus.PICKUP_REQUESTED,
        ParcelStatus.PICKUP_ASSIGNED,
        ParcelStatus.PICKED_UP,
      ]);
      for (const from of ORIGIN_HUB_INBOUND_FROM) {
        expect(lifecycle.canTransition(from, ParcelStatus.ORIGIN_HUB_RECEIVED)).toBe(true);
      }
    });

    it("never permits a jump into ORIGIN_HUB_RECEIVED from a post-inbound state", () => {
      for (const status of [
        ParcelStatus.ORIGIN_HUB_RECEIVED,
        ParcelStatus.BAGGED,
        ParcelStatus.IN_TRANSIT,
        ParcelStatus.DESTINATION_HUB_RECEIVED,
        ParcelStatus.DELIVERED,
      ]) {
        expect(lifecycle.canTransition(status, ParcelStatus.ORIGIN_HUB_RECEIVED)).toBe(false);
      }
    });

    it("never permits a jump into ORIGIN_HUB_RECEIVED from a terminal state", () => {
      for (const terminal of [
        ParcelStatus.CANCELLED,
        ParcelStatus.RETURNED_TO_MERCHANT,
        ParcelStatus.CASH_VERIFIED,
        ParcelStatus.LOST,
        ParcelStatus.DAMAGED,
      ]) {
        expect(lifecycle.canTransition(terminal, ParcelStatus.ORIGIN_HUB_RECEIVED)).toBe(false);
      }
    });

    it("keeps both named exceptions narrow and disjoint", () => {
      for (const status of ORIGIN_HUB_INBOUND_FROM) {
        expect(PRE_PICKUP_RIDER_ASSIGNMENT_FROM).not.toContain(ParcelStatus.ORIGIN_HUB_RECEIVED);
        expect(lifecycle.canTransition(status, ParcelStatus.ORIGIN_HUB_RECEIVED)).toBe(true);
      }
    });

    it("rejects the undocumented PICKED_UP -> ASSIGNED_TO_RIDER jump", () => {
      expect(lifecycle.canTransition(ParcelStatus.PICKED_UP, ParcelStatus.ASSIGNED_TO_RIDER)).toBe(
        false,
      );
    });
  });

  describe("assertTransition", () => {
    it("throws a coded 400 for an invalid transition", () => {
      try {
        lifecycle.assertTransition(ParcelStatus.DELIVERED, ParcelStatus.CREATED);
        throw new Error("expected assertTransition to throw");
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const response = (error as BadRequestException).getResponse() as {
          error?: string;
          message?: string;
        };
        expect(response.error).toBe("INVALID_STATUS_TRANSITION");
        expect(response.message).toContain("DELIVERED -> CREATED");
      }
    });

    it("does not throw for a valid transition", () => {
      expect(() =>
        lifecycle.assertTransition(ParcelStatus.CREATED, ParcelStatus.PICKUP_REQUESTED),
      ).not.toThrow();
    });
  });
});
