import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  FEATURE_VERSION,
  ParcelStatus,
  type RecipientFeatureSnapshot,
} from "@dhruto/contracts";
import { Parcel } from "../../database/entities/Parcel.entity.js";
import { DeliveryAttempt } from "../../database/entities/DeliveryAttempt.entity.js";
import { CashLedger } from "../../database/entities/CashLedger.entity.js";

const DELIVERED_STATUSES: ParcelStatus[] = [
  ParcelStatus.DELIVERED,
  ParcelStatus.CASH_PENDING,
  ParcelStatus.CASH_VERIFIED,
];

const RETURNED_STATUSES: ParcelStatus[] = [
  ParcelStatus.RTO_INITIATED,
  ParcelStatus.RETURN_IN_TRANSIT,
  ParcelStatus.RETURNED_TO_MERCHANT,
  ParcelStatus.CANCELLED,
];

export interface FeatureBuildInput {
  phoneHash: string;
  /** Canonical phone for LIKE matching (digits only tail). */
  phoneTail: string;
  merchantId?: string | null;
  scope: "PLATFORM" | "MERCHANT";
  /** Only rows with createdAt <= asOf are used (no future leakage). */
  asOf: Date;
  recentDays?: number;
  addressConfidence?: number | null;
}

/**
 * Recipient feature aggregation with explicit as-of cutoffs.
 *
 * Every query is bounded by `createdAt <= asOf`, so a prediction made at T
 * can only ever see history that existed at T. Uses real tables: parcels
 * (outcomes + COD), delivery_attempts (failed handoffs), cash_ledgers
 * (verified vs expected cash).
 */
@Injectable()
export class RecipientFeaturesService {
  constructor(
    @InjectRepository(Parcel)
    private readonly parcelRepo: Repository<Parcel>,
    @InjectRepository(DeliveryAttempt)
    private readonly attemptRepo: Repository<DeliveryAttempt>,
    @InjectRepository(CashLedger)
    private readonly ledgerRepo: Repository<CashLedger>,
  ) {}

  async build(input: FeatureBuildInput): Promise<RecipientFeatureSnapshot> {
    const recentDays = input.recentDays ?? 30;
    const recentCutoff = new Date(input.asOf.getTime() - recentDays * 24 * 3600 * 1000);

    const parcelQb = this.parcelRepo
      .createQueryBuilder("p")
      .where("p.recipient_phone LIKE :phone", { phone: `%${input.phoneTail}%` })
      .andWhere("p.createdAt <= :asOf", { asOf: input.asOf });
    if (input.scope === "MERCHANT" && input.merchantId) {
      parcelQb.andWhere("p.merchant_id = :merchantId", { merchantId: input.merchantId });
    }
    const parcels = await parcelQb.getMany();

    const delivered = parcels.filter((p) => DELIVERED_STATUSES.includes(p.status)).length;
    const returned = parcels.filter((p) => RETURNED_STATUSES.includes(p.status)).length;

    const parcelIds = parcels.map((p) => p.id);
    let failedAttempts = 0;
    if (parcelIds.length > 0) {
      failedAttempts = await this.attemptRepo
        .createQueryBuilder("a")
        .where("a.parcel_id IN (:...ids)", { ids: parcelIds })
        .andWhere("a.outcome = :outcome", { outcome: "FAILED" })
        .andWhere("a.createdAt <= :asOf", { asOf: input.asOf })
        .getCount();
    }

    let codCollectedMinor = 0;
    let codFailedMinor = 0;
    if (parcelIds.length > 0) {
      const ledgers = await this.ledgerRepo
        .createQueryBuilder("l")
        .where("l.parcel_id IN (:...ids)", { ids: parcelIds })
        .andWhere("l.createdAt <= :asOf", { asOf: input.asOf })
        .getMany();
      for (const ledger of ledgers) {
        const parcel = parcels.find((p) => p.id === ledger.parcelId);
        const expected = parcel ? Math.round(Number(parcel.codAmount) * 100) : 0;
        const verified = ledger.verifiedAmount != null ? Number(ledger.verifiedAmount) : Number(ledger.amount);
        if (DELIVERED_STATUSES.includes(parcel?.status as ParcelStatus)) {
          codCollectedMinor += Number.isFinite(verified) ? verified : 0;
        } else if (RETURNED_STATUSES.includes(parcel?.status as ParcelStatus)) {
          codFailedMinor += Number.isFinite(expected) ? expected : 0;
        }
      }
    }

    const recentFailedDeliveries = parcels.filter(
      (p) =>
        RETURNED_STATUSES.includes(p.status) &&
        p.createdAt >= recentCutoff &&
        p.createdAt <= input.asOf,
    ).length;
    const recentOrderCount = parcels.filter(
      (p) => p.createdAt >= recentCutoff && p.createdAt <= input.asOf,
    ).length;

    return {
      phoneHash: input.phoneHash,
      merchantId: input.scope === "MERCHANT" ? (input.merchantId ?? null) : null,
      scope: input.scope,
      asOf: input.asOf.toISOString(),
      totalOrders: parcels.length,
      deliveredOrders: delivered,
      returnedOrders: returned,
      failedAttempts,
      recentFailedDeliveries,
      codCollectedMinor,
      codFailedMinor,
      recentOrderCount,
      addressConfidence: input.addressConfidence ?? null,
      featureVersion: FEATURE_VERSION,
    };
  }
}
