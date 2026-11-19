import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import {
  ApiErrorCode,
  DELIVERED_PARCEL_STATUSES,
  DELIVERY_PREFERENCE_MAX_DAYS_AHEAD,
  ParcelStatus,
  type ParcelSummary,
} from "@dhruto/contracts";
import { Parcel, ParcelStatusHistory } from "../../database/entities/index.js";
import { ParcelsService, type ParcelAccessScope } from "../parcels.service.js";
import { type DeliveryPreferenceDto } from "../dto/delivery-preference.dto.js";

/** Parcels that are finished or heading back to the merchant accept no preference. */
const CLOSED_STATUSES: ReadonlySet<ParcelStatus> = new Set([
  ...DELIVERED_PARCEL_STATUSES,
  ParcelStatus.LOST,
  ParcelStatus.DAMAGED,
  ParcelStatus.CANCELLED,
  ParcelStatus.RTO_INITIATED,
  ParcelStatus.RETURN_IN_TRANSIT,
  ParcelStatus.RETURNED_TO_MERCHANT,
]);

const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000; // Asia/Dhaka is UTC+6, no DST.
const DAY_MS = 24 * 60 * 60 * 1000;

/** YYYY-MM-DD for "now + days" on the Asia/Dhaka calendar. */
function dhakaDate(now: number, days = 0): string {
  return new Date(now + DHAKA_OFFSET_MS + days * DAY_MS).toISOString().slice(0, 10);
}

export type DeliveryPreference = NonNullable<ParcelSummary["deliveryPreference"]>;

/**
 * Recipient delivery preferences (customer portal "Reschedule").
 *
 * Records a preferred day / slot / doorstep instruction for hub and rider
 * planning. It deliberately does NOT change `status`: the state machine only
 * allows RESCHEDULED after a failed attempt (docs/08-STATE-MACHINE.md).
 * Each update is appended to the parcel history so merchants and hubs see it.
 */
@Injectable()
export class DeliveryPreferenceService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly parcelsService: ParcelsService,
  ) {}

  async setPreference(
    idOrCode: string,
    dto: DeliveryPreferenceDto,
    scope: ParcelAccessScope,
  ): Promise<DeliveryPreference> {
    // Ownership first (404 for parcels the caller cannot see).
    const accessible = await this.parcelsService.findAccessibleParcel(idOrCode, scope);
    this.assertDateInRange(dto.date);

    return this.dataSource.transaction(async (manager) => {
      // Lock the row so a concurrent status change cannot slip past the check.
      const parcel = await manager.getRepository(Parcel).findOne({
        where: { id: accessible.id },
        lock: { mode: "pessimistic_write" },
      });
      if (!parcel || CLOSED_STATUSES.has(parcel.status)) {
        throw new ConflictException({
          message: `Delivery preferences cannot be changed once a parcel is ${parcel?.status ?? "closed"}.`,
          error: ApiErrorCode.INVALID_STATUS_TRANSITION,
        });
      }

      const updatedAt = new Date();
      parcel.preferredDeliveryDate = dto.date;
      parcel.preferredDeliverySlot = dto.slot;
      parcel.customerDeliveryNote = dto.note?.trim() || null;
      parcel.deliveryPreferenceUpdatedAt = updatedAt;
      await manager.save(parcel);

      await manager.save(
        manager.create(ParcelStatusHistory, {
          parcelId: parcel.id,
          fromStatus: parcel.status,
          toStatus: parcel.status,
          eventType: "DELIVERY_PREFERENCE_UPDATED",
          actorId: scope.userId,
          actorRole: scope.isAdmin ? "ADMIN" : "CUSTOMER",
          description: `Recipient prefers delivery on ${dto.date} (${dto.slot})`,
          metadata: { date: dto.date, slot: dto.slot, note: parcel.customerDeliveryNote },
        }),
      );

      return {
        date: parcel.preferredDeliveryDate,
        slot: parcel.preferredDeliverySlot,
        note: parcel.customerDeliveryNote,
        updatedAt: updatedAt.toISOString(),
      };
    });
  }

  private assertDateInRange(date: string): void {
    const now = Date.now();
    const earliest = dhakaDate(now);
    const latest = dhakaDate(now, DELIVERY_PREFERENCE_MAX_DAYS_AHEAD);
    // ISO dates compare correctly as strings; Date.parse rejects e.g. 2026-02-31.
    const valid =
      !Number.isNaN(Date.parse(`${date}T00:00:00Z`)) &&
      new Date(`${date}T00:00:00Z`).toISOString().startsWith(date);
    if (!valid || date < earliest || date > latest) {
      throw new BadRequestException({
        message: `Preferred date must be between ${earliest} and ${latest}.`,
        error: ApiErrorCode.VALIDATION_ERROR,
      });
    }
  }
}
