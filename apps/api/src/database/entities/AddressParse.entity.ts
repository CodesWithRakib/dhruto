import { Entity, Column, Index } from "typeorm";
import { BaseEntity } from "./Base.entity.js";

/**
 * Deterministic address parse record.
 *
 * `originalAddress` is never mutated. `normalizedAddress` + `structured` +
 * `candidates` capture the parser output with `parserVersion`/`datasetVersion`
 * for reproducibility. Result cache keys include both versions.
 */
@Entity("address_parses")
@Index(["parcelId"])
@Index(["normalizedHash"])
@Index(["createdAt"])
export class AddressParse extends BaseEntity {
  @Column({ name: "parcel_id", type: "uuid", nullable: true })
  parcelId: string | null;

  @Column({ name: "original_address", type: "text" })
  originalAddress: string;

  @Column({ name: "normalized_address", type: "text" })
  normalizedAddress: string;

  @Column({ name: "normalized_hash", type: "varchar", length: 64 })
  normalizedHash: string;

  @Column({ type: "jsonb" })
  structured: Record<string, unknown>;

  @Column({ type: "float" })
  confidence: number;

  @Column({ name: "matched_by", type: "varchar", length: 32 })
  matchedBy: string;

  @Column({ name: "has_conflict", type: "boolean", default: false })
  hasConflict: boolean;

  @Column({ name: "conflict_detail", type: "text", nullable: true })
  conflictDetail: string | null;

  @Column({ type: "jsonb", default: [] })
  candidates: Record<string, unknown>[];

  @Column({ name: "parser_version", type: "varchar", length: 64 })
  parserVersion: string;

  @Column({ name: "dataset_version", type: "varchar", length: 64 })
  datasetVersion: string;

  @Column({ type: "varchar", length: 8, default: "EN" })
  language: string;
}
