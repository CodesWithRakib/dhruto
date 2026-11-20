import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import {
  ApiErrorCode,
  DomainEventType,
  HubPermission,
  ParcelStatus,
  type AssignPickupRequest,
  type ConfirmPickupRequest,
  type PickupRequestGroup,
} from "@dhruto/contracts";
import { Parcel, ParcelStatusHistory, Rider } from "../../database/entities/index.js";
import { OPERABLE_RIDER_STATUSES } from "../../database/entities/Rider.entity.js";
import { OutboxService } from "../../integrations/outbox.service.js";
import { ParcelLifecycleService } from "../../parcels/lifecycle/parcel-lifecycle.service.js";
import type { AuthenticatedUser } from "../../auth/jwt/jwt.interface.js";
import { HubAuthorizationService } from "../hub-authorization.service.js";

const PENDING_PICKUP = [ParcelStatus.PICKUP_REQUESTED, ParcelStatus.PICKUP_ASSIGNED];
const norm = (v: string | null | undefined) => (v ?? "").trim().toLowerCase();

/**
 * First-mile pickup leg: merchant pickup requests are routed to the hub that
 * serves the merchant's pickup district; hub staff assign a pickup rider; the
 * rider confirms collection (PICKED_UP); the hub inbound scan takes it on.
 */
@Injectable()
export class PickupService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly authz: HubAuthorizationService,
    private readonly lifecycle: ParcelLifecycleService,
    private readonly outbox: OutboxService,
    @InjectRepository(Parcel) private readonly parcelRepo: Repository<Parcel>,
    @InjectRepository(Rider) private readonly riderRepo: Repository<Rider>,
  ) {}

  /** Pending pickups for merchants located in this hub's district, grouped per merchant. */
  async listRequests(user: AuthenticatedUser, hubIdOrCode: string): Promise<PickupRequestGroup[]> {
    const hub = await this.authz.assertHubAccess(user, hubIdOrCode, HubPermission.VIEW, {
      requireActive: false,
    });
    if (!hub.district) return [];
    const parcels = await this.parcelRepo
      .createQueryBuilder("p")
      .innerJoinAndSelect("p.merchant", "m")
      .leftJoinAndSelect("p.currentRider", "r")
      .leftJoinAndSelect("r.user", "ru")
      .where("p.status IN (:...statuses)", { statuses: PENDING_PICKUP })
      .andWhere("LOWER(TRIM(m.pickup_district)) = :district", { district: norm(hub.district) })
      .orderBy("p.updatedAt", "ASC")
      .take(500)
      .getMany();
    return groupByMerchant(parcels);
  }

  async assignRider(user: AuthenticatedUser, hubIdOrCode: string, dto: AssignPickupRequest) {
    const hub = await this.authz.assertHubAccess(user, hubIdOrCode, HubPermission.SCAN);
    const rider = await this.riderRepo.findOne({ where: { id: dto.riderId }, relations: ["user"] });
    if (!rider) {
      throw new NotFoundException({ message: "Rider not found", error: ApiErrorCode.RIDER_NOT_FOUND });
    }
    if (rider.hubId !== hub.id) {
      throw new ForbiddenException({
        message: "Rider does not operate from this hub",
        error: ApiErrorCode.RIDER_WRONG_HUB,
      });
    }
    if (!OPERABLE_RIDER_STATUSES.includes(rider.status)) {
      throw new ForbiddenException({
        message: `Rider is ${rider.status} and cannot receive new assignments`,
        error: ApiErrorCode.RIDER_INACTIVE,
      });
    }

    return this.dataSource.transaction(async (manager) => {
      const parcels = await manager
        .getRepository(Parcel)
        .createQueryBuilder("p")
        .innerJoinAndSelect("p.merchant", "m")
        .setLock("pessimistic_write", undefined, ["p"])
        .where("p.id IN (:...ids)", { ids: dto.parcelIds })
        .getMany();
      if (parcels.length !== new Set(dto.parcelIds).size) {
        throw new NotFoundException({ message: "Some parcels were not found", error: ApiErrorCode.PARCEL_NOT_FOUND });
      }
      for (const parcel of parcels) {
        if (!PENDING_PICKUP.includes(parcel.status)) {
          throw new ConflictException({
            message: `Parcel ${parcel.trackingCode} is ${parcel.status}; only requested pickups can be assigned.`,
            error: ApiErrorCode.INVALID_STATUS_TRANSITION,
          });
        }
        if (norm(parcel.merchant.pickupDistrict) !== norm(hub.district)) {
          throw new ForbiddenException({
            message: `Parcel ${parcel.trackingCode} is picked up by another hub`,
            error: ApiErrorCode.FORBIDDEN,
          });
        }
      }
      const label = riderLabel(rider);
      for (const parcel of parcels) {
        const fromStatus = parcel.status;
        if (fromStatus === ParcelStatus.PICKUP_REQUESTED) {
          this.lifecycle.assertTransition(fromStatus, ParcelStatus.PICKUP_ASSIGNED);
        }
        parcel.status = ParcelStatus.PICKUP_ASSIGNED;
        parcel.currentRiderId = rider.id;
        await manager.getRepository(Parcel).save(parcel);
        await manager.getRepository(ParcelStatusHistory).save(
          manager.getRepository(ParcelStatusHistory).create({
            parcelId: parcel.id,
            fromStatus,
            toStatus: ParcelStatus.PICKUP_ASSIGNED,
            eventType: fromStatus === ParcelStatus.PICKUP_ASSIGNED ? "PICKUP_REASSIGNED" : "STATUS_CHANGED",
            actorId: user.id,
            actorRole: user.role,
            description: `Pickup assigned to ${label}`,
            metadata: { riderId: rider.id, hubId: hub.id },
          }),
        );
      }
      // One notification per merchant visit: the rider gets the job, the
      // merchant learns who is coming. Assignments are validated per merchant
      // above, so grouping here only splits multi-merchant batches.
      const byMerchant = new Map<string, Parcel[]>();
      for (const parcel of parcels) {
        byMerchant.set(parcel.merchantId, [...(byMerchant.get(parcel.merchantId) ?? []), parcel]);
      }
      for (const [merchantId, visit] of byMerchant) {
        await this.outbox.append(manager, {
          eventType: DomainEventType.PARCEL_PICKUP_ASSIGNED,
          aggregateType: "parcel",
          aggregateId: visit[0]!.id,
          actorId: user.id,
          payload: {
            parcelIds: visit.map((p) => p.id),
            trackingCode: visit[0]!.trackingCode,
            merchantId,
            merchantName: visit[0]!.merchant.businessName,
            riderId: rider.id,
            riderName: label,
            hubId: hub.id,
            parcelCount: visit.length,
          },
        });
      }
      return { assigned: parcels.length, riderId: rider.id, riderName: label };
    });
  }

  /** The authenticated rider's assigned pickups, grouped per merchant. */
  async listForRider(user: AuthenticatedUser): Promise<PickupRequestGroup[]> {
    const rider = await this.riderFor(user);
    const parcels = await this.parcelRepo.find({
      where: { currentRiderId: rider.id, status: ParcelStatus.PICKUP_ASSIGNED },
      relations: ["merchant"],
      order: { updatedAt: "ASC" },
      take: 300,
    });
    return groupByMerchant(parcels);
  }

  /** Rider confirms the parcels were physically collected from the merchant. */
  async confirmPickup(user: AuthenticatedUser, dto: ConfirmPickupRequest) {
    const rider = await this.riderFor(user);
    return this.dataSource.transaction(async (manager) => {
      // Lock only parcel rows (FOR UPDATE cannot target the outer-joined side).
      const parcels = await manager
        .getRepository(Parcel)
        .createQueryBuilder("p")
        .innerJoinAndSelect("p.merchant", "m")
        .setLock("pessimistic_write", undefined, ["p"])
        .where("p.id IN (:...ids)", { ids: dto.parcelIds })
        .getMany();
      if (parcels.length !== new Set(dto.parcelIds).size) {
        throw new NotFoundException({ message: "Some parcels were not found", error: ApiErrorCode.PARCEL_NOT_FOUND });
      }
      for (const parcel of parcels) {
        if (parcel.currentRiderId !== rider.id || parcel.status !== ParcelStatus.PICKUP_ASSIGNED) {
          throw new BadRequestException({
            message: `Parcel ${parcel.trackingCode} is not an assigned pickup for you`,
            error: ApiErrorCode.INVALID_STATUS_TRANSITION,
          });
        }
      }
      for (const parcel of parcels) {
        this.lifecycle.assertTransition(parcel.status, ParcelStatus.PICKED_UP);
        parcel.status = ParcelStatus.PICKED_UP;
        await manager.getRepository(Parcel).save(parcel);
        await manager.getRepository(ParcelStatusHistory).save(
          manager.getRepository(ParcelStatusHistory).create({
            parcelId: parcel.id,
            fromStatus: ParcelStatus.PICKUP_ASSIGNED,
            toStatus: ParcelStatus.PICKED_UP,
            eventType: "STATUS_CHANGED",
            actorId: user.id,
            actorRole: user.role,
            description: `Picked up from ${parcel.merchant.businessName} by ${riderLabel(rider)}`,
            metadata: { riderId: rider.id },
          }),
        );
        // Merchant in-app notification + parcel.picked_up webhook, committed
        // atomically with the status change (transactional outbox).
        await this.outbox.append(manager, {
          eventType: DomainEventType.PARCEL_PICKED_UP,
          aggregateType: "parcel",
          aggregateId: parcel.id,
          actorId: user.id,
          payload: {
            parcelId: parcel.id,
            trackingCode: parcel.trackingCode,
            merchantId: parcel.merchantId,
            recipientName: parcel.recipientName,
            recipientPhone: parcel.recipientPhone,
            merchantName: parcel.merchant.businessName,
            riderId: rider.id,
          },
        });
      }
      return { pickedUp: parcels.length };
    });
  }

  private async riderFor(user: AuthenticatedUser): Promise<Rider> {
    const rider = await this.riderRepo.findOne({ where: { userId: user.id }, relations: ["user"] });
    if (!rider) {
      throw new ForbiddenException({ message: "Rider profile not found", error: ApiErrorCode.FORBIDDEN });
    }
    return rider;
  }
}

function riderLabel(rider: Rider): string {
  const name = rider.user?.name?.trim() || "rider";
  return rider.riderCode ? `${name} (${rider.riderCode})` : name;
}

function groupByMerchant(parcels: Parcel[]): PickupRequestGroup[] {
  const groups = new Map<string, PickupRequestGroup>();
  for (const p of parcels) {
    let g = groups.get(p.merchantId);
    if (!g) {
      g = {
        merchantId: p.merchantId,
        merchantName: p.merchant.businessName,
        contactPhone: p.merchant.contactPhone,
        pickupAddress: p.merchant.pickupAddress,
        pickupThana: p.merchant.pickupThana ?? null,
        assignedRiderId: null,
        assignedRiderName: null,
        parcels: [],
      };
      groups.set(p.merchantId, g);
    }
    g.parcels.push({
      id: p.id,
      trackingCode: p.trackingCode,
      status: p.status,
      weightKg: Number(p.weight),
      parcelDescription: p.parcelDescription ?? null,
      pickupInstructions: p.pickupInstructions ?? null,
      requestedAt: p.updatedAt.toISOString(),
    });
  }
  for (const g of groups.values()) {
    const ids = new Set(parcels.filter((p) => p.merchantId === g.merchantId).map((p) => (p.status === ParcelStatus.PICKUP_ASSIGNED ? p.currentRiderId : null)));
    if (ids.size === 1) {
      const only = [...ids][0] ?? null;
      const sample = parcels.find((p) => p.merchantId === g.merchantId && p.currentRiderId === only);
      g.assignedRiderId = only;
      g.assignedRiderName = only && sample?.currentRider ? riderLabel(sample.currentRider) : null;
    }
  }
  return [...groups.values()];
}
