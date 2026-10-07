import { Entity, Column, Index, Unique } from "typeorm";
import { BaseEntity } from "./Base.entity.js";

/**
 * Runtime alias → canonical place mapping.
 *
 * Seeded from the dataset file; operators can add `common_usage` aliases
 * later. Duplicates are rejected at insert (unique lower-cased alias).
 */
@Entity("address_aliases")
@Unique(["normalizedAlias"])
export class AddressAlias extends BaseEntity {
  @Column({ name: "place_id", type: "uuid" })
  @Index()
  placeId: string;

  @Column({ type: "varchar", length: 128 })
  alias: string;

  @Column({ name: "normalized_alias", type: "varchar", length: 128 })
  normalizedAlias: string;

  @Column({ type: "varchar", length: 8, default: "en" })
  language: string;

  @Column({ name: "alias_type", type: "varchar", length: 32 })
  aliasType: string;

  @Column({ type: "varchar", length: 128, nullable: true })
  source: string | null;
}
