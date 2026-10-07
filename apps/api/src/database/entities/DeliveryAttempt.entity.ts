import { Entity, Column, ManyToOne, JoinColumn, Index } from "typeorm";
import { BaseEntity } from "./Base.entity.js";
import { Parcel } from "./Parcel.entity.js";
import { Rider } from "./Rider.entity.js";
import { DeliveryAttemptOutcome, DeliveryFailureReason } from "@dhruto/contracts";

/**
 * Append-only delivery attempt log.
 *
 * Every real handoff outcome — success or failure — is recorded here and never
 * overwritten. The row doubles as the proof-of-delivery record for successful
 * deliveries (OTP proof: `metadata.otpVerifiedAt`), so OTP verification is not
 * duplicated in a second table.
 */
@Entity("delivery_attempts")
@Index(["parcelId", "attemptNumber"], { unique: true })
@Index(["riderId", "createdAt"])
@Index(["parcelId", "createdAt"])
export class DeliveryAttempt extends BaseEntity {
  @Column({ name: "parcel_id", type: "uuid" })
  parcelId: string;

  @ManyToOne(() => Parcel)
  @JoinColumn({ name: "parcel_id" })
  parcel: Parcel;

  @Column({ name: "rider_id", type: "uuid" })
  riderId: string;

  @ManyToOne(() => Rider)
  @JoinColumn({ name: "rider_id" })
  rider: Rider;

  /** 1-based sequence per parcel, assigned inside the delivery transaction. */
  @Column({ name: "attempt_number", type: "int" })
  attemptNumber: number;

  @Column({ type: "enum", enum: DeliveryAttemptOutcome })
  outcome: DeliveryAttemptOutcome;

  @Column({ name: "failure_reason", type: "enum", enum: DeliveryFailureReason, nullable: true })
  failureReason: DeliveryFailureReason | null;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @Column({ name: "rescheduled_for", type: "timestamptz", nullable: true })
  rescheduledFor: Date | null;

  /** COD collected, OTP proof reference, photo URL — never wallet data. */
  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, unknown> | null;
}
