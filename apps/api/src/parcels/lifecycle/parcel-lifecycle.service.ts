import { BadRequestException, Injectable } from "@nestjs/common";
import { ApiErrorCode, ParcelStatus } from "@dhruto/contracts";

/**
 * Dhruto — parcel state machine.
 * ------------------------------------------------------------------
 * The single source of truth for permitted status transitions, mirroring
 * docs/08-STATE-MACHINE.md §2. Services must route every status change through
 * `assertTransition` so an invalid jump (e.g. DELIVERED → CREATED) can never be
 * persisted by an endpoint.
 *
 * Later phases extend the matrix here (and in the doc) rather than mutating
 * parcel status directly.
 */
/**
 * Explicit, narrow operational shortcut retained for the Phase 3 rider flow
 * while the Phase 2 hub pipeline is not yet live: a freshly created parcel may
 * be assigned to a rider for collection.
 *
 * It is deliberately limited to pre-pickup states and named here so the
 * exception is visible and unit-tested rather than concealed inside a
 * controller. Remove it when hub scanning (Phase 2) lands. It never permits
 * jumps from a post-delivery state (e.g. DELIVERED -> CREATED).
 */
export const PRE_PICKUP_RIDER_ASSIGNMENT_FROM: readonly ParcelStatus[] = [
  ParcelStatus.CREATED,
  ParcelStatus.PICKUP_REQUESTED,
];

export const ALLOWED_PARCEL_TRANSITIONS: Readonly<
  Record<ParcelStatus, readonly ParcelStatus[]>
> = {
  [ParcelStatus.CREATED]: [ParcelStatus.PICKUP_REQUESTED, ParcelStatus.CANCELLED],
  [ParcelStatus.PICKUP_REQUESTED]: [ParcelStatus.PICKUP_ASSIGNED, ParcelStatus.CANCELLED],
  [ParcelStatus.PICKUP_ASSIGNED]: [ParcelStatus.PICKED_UP, ParcelStatus.CANCELLED],
  [ParcelStatus.PICKED_UP]: [ParcelStatus.ORIGIN_HUB_RECEIVED],
  [ParcelStatus.ORIGIN_HUB_RECEIVED]: [ParcelStatus.BAGGED],
  [ParcelStatus.BAGGED]: [ParcelStatus.IN_TRANSIT],
  [ParcelStatus.IN_TRANSIT]: [
    ParcelStatus.DESTINATION_HUB_RECEIVED,
    ParcelStatus.LOST,
    ParcelStatus.DAMAGED,
  ],
  [ParcelStatus.DESTINATION_HUB_RECEIVED]: [ParcelStatus.ASSIGNED_TO_RIDER],
  [ParcelStatus.ASSIGNED_TO_RIDER]: [ParcelStatus.OUT_FOR_DELIVERY],
  [ParcelStatus.OUT_FOR_DELIVERY]: [
    ParcelStatus.DELIVERED,
    ParcelStatus.DELIVERY_ATTEMPTED,
  ],
  [ParcelStatus.DELIVERY_ATTEMPTED]: [
    ParcelStatus.RESCHEDULED,
    ParcelStatus.OUT_FOR_DELIVERY,
    ParcelStatus.RTO_INITIATED,
  ],
  [ParcelStatus.RESCHEDULED]: [ParcelStatus.OUT_FOR_DELIVERY],
  [ParcelStatus.DELIVERED]: [ParcelStatus.CASH_PENDING],
  [ParcelStatus.CASH_PENDING]: [ParcelStatus.CASH_VERIFIED],
  [ParcelStatus.RTO_INITIATED]: [ParcelStatus.RETURN_IN_TRANSIT],
  [ParcelStatus.RETURN_IN_TRANSIT]: [ParcelStatus.RETURNED_TO_MERCHANT],
  [ParcelStatus.CASH_VERIFIED]: [],
  [ParcelStatus.RETURNED_TO_MERCHANT]: [],
  [ParcelStatus.CANCELLED]: [],
  [ParcelStatus.LOST]: [],
  [ParcelStatus.DAMAGED]: [],
};

@Injectable()
export class ParcelLifecycleService {
  /**
   * A parcel may only be born in CREATED. From an existing status, only the
   * documented outgoing transitions are permitted.
   */
  canTransition(from: ParcelStatus | null, to: ParcelStatus): boolean {
    if (from === null) {
      return to === ParcelStatus.CREATED;
    }
    if (from === to) {
      return false;
    }
    if (
      to === ParcelStatus.ASSIGNED_TO_RIDER &&
      PRE_PICKUP_RIDER_ASSIGNMENT_FROM.includes(from)
    ) {
      return true;
    }
    return (ALLOWED_PARCEL_TRANSITIONS[from] ?? []).includes(to);
  }

  /** Throws a 400 with a machine-readable code when a transition is illegal. */
  assertTransition(from: ParcelStatus | null, to: ParcelStatus): void {
    if (!this.canTransition(from, to)) {
      throw new BadRequestException({
        message: `Invalid parcel status transition: ${from ?? "NEW"} -> ${to}`,
        error: ApiErrorCode.INVALID_STATUS_TRANSITION,
      });
    }
  }
}
