import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Parcel, ParcelStatusHistory } from "../entities/index.js";
import { ParcelStatus } from "@dhruto/contracts";
import { SEED_PARCELS } from "./seed-parcels.data.js";
import { SEED_INTELLIGENCE_PARCELS } from "./seed-intelligence.data.js";
import type { CoreSeedContext } from "./seed.types.js";

interface HistoryStep {
  toStatus: ParcelStatus;
  fromStatus: ParcelStatus | null;
  role: string;
  reason: string;
  hoursAgo: number;
}

@Injectable()
export class SeedParcelsService {
  private readonly logger = new Logger(SeedParcelsService.name);

  constructor(
    @InjectRepository(Parcel)
    private readonly parcelRepo: Repository<Parcel>,
    @InjectRepository(ParcelStatusHistory)
    private readonly statusHistoryRepo: Repository<ParcelStatusHistory>,
  ) {}

  async seedParcels(ctx: CoreSeedContext): Promise<{
    parcelMap: Map<string, Parcel>;
    stats: { parcels: number; statusHistories: number };
  }> {
    let parcelCount = 0;
    let historyCount = 0;
    const parcelMap = new Map<string, Parcel>();
    const now = Date.now();

    for (const pData of [...SEED_PARCELS, ...SEED_INTELLIGENCE_PARCELS]) {
      const merchant = ctx.merchantMap.get(pData.merchantEmail);
      if (!merchant) continue;

      const rider = pData.riderEmail ? ctx.riderMap.get(pData.riderEmail) : null;
      const hub = pData.hubCode ? ctx.hubMap.get(pData.hubCode) : null;
      const createdAt = new Date(now - pData.createdAtOffsetHours * 3600 * 1000);

      let parcel = await this.parcelRepo.findOne({ where: { trackingCode: pData.trackingCode } });
      if (!parcel) {
        parcel = this.parcelRepo.create({
          trackingCode: pData.trackingCode,
          merchantId: merchant.id,
          currentRiderId: rider ? rider.id : null,
          currentHubId: hub ? hub.id : null,
          recipientName: pData.recipientName,
          recipientPhone: pData.recipientPhone,
          rawAddress: pData.rawAddress,
          district: pData.district,
          thana: pData.thana,
          normalizedAddress: {
            district: pData.district,
            thana: pData.thana,
            division: "Dhaka",
            formattedAddress: pData.rawAddress,
          },
          weight: pData.weight,
          codAmount: pData.codAmount,
          deliveryFee: pData.deliveryFee,
          status: pData.status,
        });
      } else {
        parcel.merchantId = merchant.id;
        parcel.currentRiderId = rider ? rider.id : null;
        parcel.currentHubId = hub ? hub.id : null;
        parcel.recipientName = pData.recipientName;
        parcel.recipientPhone = pData.recipientPhone;
        parcel.rawAddress = pData.rawAddress;
        parcel.district = pData.district;
        parcel.thana = pData.thana;
        parcel.weight = pData.weight;
        parcel.codAmount = pData.codAmount;
        parcel.deliveryFee = pData.deliveryFee;
        parcel.status = pData.status;
      }
      parcel.createdAt = createdAt;
      await this.parcelRepo.save(parcel);
      parcelMap.set(parcel.trackingCode, parcel);
      parcelCount++;

      // Ensure chronological history events
      const existingHistory = await this.statusHistoryRepo.find({ where: { parcelId: parcel.id } });
      if (existingHistory.length === 0) {
        const historySteps = this.buildChronologicalSteps(pData.status, pData.createdAtOffsetHours);
        for (const step of historySteps) {
          const h = this.statusHistoryRepo.create({
            parcelId: parcel.id,
            fromStatus: step.fromStatus,
            toStatus: step.toStatus,
            eventType: step.fromStatus === null ? "PARCEL_CREATED" : "STATUS_CHANGED",
            actorId: merchant.userId,
            actorRole: step.role,
            description: step.reason,
            metadata: {},
          });
          h.createdAt = new Date(now - step.hoursAgo * 3600 * 1000);
          await this.statusHistoryRepo.save(h);
          historyCount++;
        }
      }
    }

    this.logger.log(
      `✓ Seeded ${parcelCount} parcels and ${historyCount} chronological history records`,
    );

    return { parcelMap, stats: { parcels: parcelCount, statusHistories: historyCount } };
  }

  private buildChronologicalSteps(status: ParcelStatus, offsetHours: number): HistoryStep[] {
    const steps: HistoryStep[] = [
      {
        toStatus: ParcelStatus.CREATED,
        fromStatus: null,
        role: "MERCHANT",
        reason: "Shipment booked via merchant portal",
        hoursAgo: offsetHours,
      },
    ];

    if (status !== ParcelStatus.CREATED && status !== ParcelStatus.CANCELLED) {
      steps.push({
        toStatus: ParcelStatus.ASSIGNED_TO_RIDER,
        fromStatus: ParcelStatus.CREATED,
        role: "HUB_MANAGER",
        reason: "Pickup rider assigned for collection",
        hoursAgo: Math.max(1, offsetHours - 1),
      });
      steps.push({
        toStatus: ParcelStatus.PICKED_UP,
        fromStatus: ParcelStatus.ASSIGNED_TO_RIDER,
        role: "RIDER",
        reason: "Parcel collected from merchant warehouse",
        hoursAgo: Math.max(1, offsetHours - 2),
      });
      steps.push({
        toStatus: ParcelStatus.ORIGIN_HUB_RECEIVED,
        fromStatus: ParcelStatus.PICKED_UP,
        role: "HUB_MANAGER",
        reason: "Inbound scanning completed at sorting hub",
        hoursAgo: Math.max(1, offsetHours - 3),
      });
    }

    if (
      status === ParcelStatus.IN_TRANSIT ||
      status === ParcelStatus.DESTINATION_HUB_RECEIVED ||
      status === ParcelStatus.OUT_FOR_DELIVERY ||
      status === ParcelStatus.DELIVERED
    ) {
      steps.push({
        toStatus: ParcelStatus.IN_TRANSIT,
        fromStatus: ParcelStatus.ORIGIN_HUB_RECEIVED,
        role: "HUB_MANAGER",
        reason: "Consolidated into manifest dispatch vehicle",
        hoursAgo: Math.max(1, offsetHours - 5),
      });
      steps.push({
        toStatus: ParcelStatus.DESTINATION_HUB_RECEIVED,
        fromStatus: ParcelStatus.IN_TRANSIT,
        role: "HUB_MANAGER",
        reason: "Received and verified at local destination hub",
        hoursAgo: Math.max(1, offsetHours - 7),
      });
    }

    if (status === ParcelStatus.OUT_FOR_DELIVERY || status === ParcelStatus.DELIVERED) {
      steps.push({
        toStatus: ParcelStatus.OUT_FOR_DELIVERY,
        fromStatus: ParcelStatus.DESTINATION_HUB_RECEIVED,
        role: "RIDER",
        reason: "Assigned to delivery run with OTP verification",
        hoursAgo: Math.max(1, offsetHours - 9),
      });
    }

    if (status === ParcelStatus.DELIVERED) {
      steps.push({
        toStatus: ParcelStatus.DELIVERED,
        fromStatus: ParcelStatus.OUT_FOR_DELIVERY,
        role: "RIDER",
        reason: "Delivered to recipient. Cash collected.",
        hoursAgo: Math.max(0.5, offsetHours - 10),
      });
    }

    return steps;
  }
}
