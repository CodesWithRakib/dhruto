import { Entity, Column, Index } from "typeorm";
import { BaseEntity } from "./Base.entity.js";
import { IntegrationFailureKind, IntegrationFailureStatus } from "@dhruto/contracts";

export { IntegrationFailureKind, IntegrationFailureStatus };

/**
 * Dead-letter record for exhausted integrations (webhook/SMS/email).
 *
 * Written when retries are exhausted or a permanent failure is classified.
 * Payloads are truncated summaries — never secrets. Admin-only replay
 * requeues the referenced delivery idempotently.
 */
@Entity("integration_failures")
@Index(["status", "createdAt"])
@Index(["queue", "status"])
@Index(["jobId"], { unique: true })
export class IntegrationFailure extends BaseEntity {
  @Column({ name: "job_id", type: "varchar", length: 128, unique: true })
  jobId: string;

  @Column({ name: "event_id", type: "uuid", nullable: true })
  eventId: string | null;

  @Column({ type: "varchar", length: 64 })
  queue: string;

  @Column({ type: "enum", enum: IntegrationFailureKind })
  kind: IntegrationFailureKind;

  @Column({ name: "reference_id", type: "varchar", length: 100, nullable: true })
  referenceId: string | null;

  @Column({ name: "merchant_id", type: "uuid", nullable: true })
  merchantId: string | null;

  @Column({ type: "text" })
  reason: string;

  @Column({ type: "int", default: 0 })
  attempts: number;

  @Column({ type: "enum", enum: IntegrationFailureStatus, default: IntegrationFailureStatus.OPEN })
  status: IntegrationFailureStatus;

  @Column({ name: "last_attempt_at", type: "timestamptz", nullable: true })
  lastAttemptAt: Date | null;

  @Column({ name: "resolved_by", type: "uuid", nullable: true })
  resolvedBy: string | null;

  @Column({ name: "resolved_at", type: "timestamptz", nullable: true })
  resolvedAt: Date | null;
}
