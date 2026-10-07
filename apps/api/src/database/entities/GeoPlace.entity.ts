import { Entity, Column, Index } from "typeorm";
import { BaseEntity } from "./Base.entity.js";

/**
 * Canonical geography node: division → district → upazila/thana.
 *
 * Stable `code` values survive dataset updates; `datasetVersion` ties every
 * row to the import that produced it. Lookup aliases live in `address_aliases`
 * plus the embedded `aliases` snapshot for fast matching.
 */
@Entity("geo_places")
@Index(["kind", "parentId"])
@Index(["code"], { unique: true })
@Index(["datasetVersion"])
export class GeoPlace extends BaseEntity {
  @Column({ type: "varchar", length: 16 })
  kind: string;

  /** Stable canonical code, e.g. `BD-DH-DHK`, `BD-RG-PAN-DEB`. */
  @Column({ type: "varchar", length: 64, unique: true })
  code: string;

  @Column({ type: "varchar", length: 128 })
  name: string;

  @Column({ name: "name_bn", type: "varchar", length: 128, nullable: true })
  nameBn: string | null;

  @Column({ name: "parent_id", type: "uuid", nullable: true })
  parentId: string | null;

  /** Division name for district/upazila rows (denormalized for cheap reads). */
  @Column({ type: "varchar", length: 128, nullable: true })
  division: string | null;

  @Column({ type: "varchar", length: 16, nullable: true })
  zone: string | null;

  @Column({ type: "jsonb", default: [] })
  aliases: string[];

  @Column({ name: "postal_codes", type: "jsonb", default: [] })
  postalCodes: string[];

  @Column({ name: "dataset_version", type: "varchar", length: 64 })
  datasetVersion: string;
}
