import { Entity, Column, Index } from "typeorm";
import { BaseEntity } from "./Base.entity.js";

/**
 * Advisory operational recommendation.
 *
 * Advisory by default — acting on it never mutates parcel/finance state by
 * itself. Overrides (proceed/hold with reason + actor) are audited here.
 */
@Entity("intelligence_recommendations")
@Index(["parcelId"])
@Index(["status"])
export class IntelligenceRecommendation extends BaseEntity {
  @Column({ name: "parcel_id", type: "uuid" })
  parcelId: string;

  @Column({ name: "prediction_id", type: "uuid", nullable: true })
  predictionId: string | null;

  @Column({ type: "varchar", length: 32 })
  action: string;

  @Column({ type: "jsonb", default: [] })
  reasons: Record<string, unknown>[];

  @Column({ type: "varchar", length: 16, default: "ACTIVE" })
  status: string;

  @Column({ name: "overridden_by", type: "uuid", nullable: true })
  overriddenBy: string | null;

  @Column({ name: "overridden_at", type: "timestamptz", nullable: true })
  overriddenAt: Date | null;

  @Column({ name: "override_reason", type: "varchar", length: 500, nullable: true })
  overrideReason: string | null;

  @Column({ name: "override_decision", type: "varchar", length: 16, nullable: true })
  overrideDecision: string | null;
}
