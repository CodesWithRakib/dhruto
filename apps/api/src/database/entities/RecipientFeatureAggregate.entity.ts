import { Entity, Column, Index, Unique } from "typeorm";
import { BaseEntity } from "./Base.entity.js";

/**
 * Point-in-time recipient feature aggregate.
 *
 * One row per (`phoneHash`, `merchantId` NULL = platform scope). `merchantId`
 * set = merchant-specific scope. Recomputed from parcels + delivery attempts +
 * cash ledgers with `asOf` cutoff — feature queries only use rows with
 * `createdAt <= asOf` so predictions never leak future information.
 *
 * Phone numbers are stored as HMAC hashes only (see phone-hash util).
 */
@Entity("recipient_feature_aggregates")
@Unique(["phoneHash", "merchantId"])
@Index(["phoneHash"])
@Index(["computedAt"])
export class RecipientFeatureAggregate extends BaseEntity {
  @Column({ name: "phone_hash", type: "varchar", length: 128 })
  phoneHash: string;

  @Column({ name: "merchant_id", type: "uuid", nullable: true })
  merchantId: string | null;

  @Column({ type: "varchar", length: 16 })
  scope: "PLATFORM" | "MERCHANT";

  @Column({ name: "as_of", type: "timestamptz" })
  asOf: Date;

  @Column({ name: "total_orders", type: "int", default: 0 })
  totalOrders: number;

  @Column({ name: "delivered_orders", type: "int", default: 0 })
  deliveredOrders: number;

  @Column({ name: "returned_orders", type: "int", default: 0 })
  returnedOrders: number;

  @Column({ name: "failed_attempts", type: "int", default: 0 })
  failedAttempts: number;

  @Column({ name: "recent_failed_deliveries", type: "int", default: 0 })
  recentFailedDeliveries: number;

  @Column({ name: "cod_collected_minor", type: "bigint", default: 0 })
  codCollectedMinor: number;

  @Column({ name: "cod_failed_minor", type: "bigint", default: 0 })
  codFailedMinor: number;

  @Column({ name: "recent_order_count", type: "int", default: 0 })
  recentOrderCount: number;

  @Column({ name: "address_confidence", type: "float", nullable: true })
  addressConfidence: number | null;

  @Column({ name: "feature_version", type: "varchar", length: 32 })
  featureVersion: string;

  @Column({ name: "computed_at", type: "timestamptz" })
  computedAt: Date;
}
