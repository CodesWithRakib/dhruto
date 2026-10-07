import { Entity, Column, ManyToOne, JoinColumn, Index } from "typeorm";
import { BaseEntity } from "./Base.entity.js";
import { Hub } from "./Hub.entity.js";
import { ExceptionStatus, OperationalExceptionType } from "@dhruto/contracts";

/**
 * Operational exception raised by a hub operator.
 *
 * Receiving never silently accepts a mismatch: a missing/unexpected bag or
 * parcel is recorded here and surfaced in the UI so the discrepancy is visible
 * rather than absorbed (spec §39, §41, §42).
 */
@Entity("operational_exceptions")
@Index(["hubId", "status"])
@Index(["status", "createdAt"])
@Index(["parcelId"])
@Index(["manifestId"])
export class OperationalException extends BaseEntity {
  @Column({ name: "hub_id", type: "uuid" })
  hubId: string;

  @ManyToOne(() => Hub)
  @JoinColumn({ name: "hub_id" })
  hub: Hub;

  @Column({ name: "parcel_id", type: "uuid", nullable: true })
  parcelId: string | null;

  @Column({ name: "bag_id", type: "uuid", nullable: true })
  bagId: string | null;

  @Column({ name: "manifest_id", type: "uuid", nullable: true })
  manifestId: string | null;

  @Column({ type: "enum", enum: OperationalExceptionType })
  type: OperationalExceptionType;

  @Column({ type: "enum", enum: ExceptionStatus, default: ExceptionStatus.OPEN })
  status: ExceptionStatus;

  @Column({ type: "text" })
  description: string;

  @Column({ name: "actor_id", type: "uuid", nullable: true })
  actorId: string | null;

  @Column({ name: "resolved_by", type: "uuid", nullable: true })
  resolvedBy: string | null;

  @Column({ name: "resolved_at", type: "timestamptz", nullable: true })
  resolvedAt: Date | null;

  @Column({ name: "resolution_note", type: "text", nullable: true })
  resolutionNote: string | null;
}
