import { Entity, Column, Index } from "typeorm";
import { BaseEntity } from "./Base.entity.js";

/**
 * Auditable human confirmation of a parse result.
 *
 * The original parse row is preserved; confirmation records who chose what,
 * when, and from which source. Manual corrections store the confirmed
 * structure here — never by overwriting `originalAddress`.
 */
@Entity("address_confirmations")
@Index(["parseId"])
export class AddressConfirmation extends BaseEntity {
  @Column({ name: "parse_id", type: "uuid" })
  parseId: string;

  @Column({ name: "parcel_id", type: "uuid", nullable: true })
  parcelId: string | null;

  @Column({ name: "confirmed_by", type: "uuid" })
  confirmedBy: string;

  @Column({ name: "confirmation_source", type: "varchar", length: 16 })
  confirmationSource: string;

  @Column({ type: "jsonb" })
  structure: Record<string, unknown>;

  @Column({ name: "candidate_index", type: "int", nullable: true })
  candidateIndex: number | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  reason: string | null;
}
