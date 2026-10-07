import { Entity, Column, Index } from "typeorm";
import { BaseEntity } from "./Base.entity.js";

/**
 * Reproducible risk score snapshot.
 *
 * Historical scores are never recomputed in place — each evaluation inserts a
 * new row with its feature snapshot, scoring version and timestamp.
 */
@Entity("recipient_risk_snapshots")
@Index(["phoneHash", "scoredAt"])
@Index(["merchantId"])
export class RecipientRiskSnapshot extends BaseEntity {
  @Column({ name: "phone_hash", type: "varchar", length: 128 })
  phoneHash: string;

  @Column({ name: "merchant_id", type: "uuid", nullable: true })
  merchantId: string | null;

  @Column({ type: "varchar", length: 16 })
  scope: "PLATFORM" | "MERCHANT";

  @Column({ name: "risk_score", type: "int" })
  riskScore: number;

  @Column({ type: "varchar", length: 16 })
  level: string;

  @Column({ type: "jsonb", default: [] })
  reasons: Record<string, unknown>[];

  @Column({ name: "risk_confidence", type: "varchar", length: 8 })
  riskConfidence: string;

  @Column({ name: "scoring_version", type: "varchar", length: 64 })
  scoringVersion: string;

  @Column({ type: "jsonb" })
  features: Record<string, unknown>;

  @Column({ name: "scored_at", type: "timestamptz" })
  scoredAt: Date;
}
