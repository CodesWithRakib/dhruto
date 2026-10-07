import { Entity, Column, Index } from "typeorm";
import { BaseEntity } from "./Base.entity.js";

/**
 * Records the outcome of an idempotent command.
 *
 * The unique (key, scope) index is the database-level guarantee that a repeated
 * command is never executed twice. A row is inserted as an in-flight claim
 * (statusCode/response null) inside the same transaction that performs the
 * command, then completed with the serialized response before commit.
 */
@Entity("idempotency_records")
@Index(["key", "scope"], { unique: true })
export class IdempotencyRecord extends BaseEntity {
  @Column({ type: "varchar", length: 128 })
  key: string;

  @Column({ type: "varchar", length: 64, default: "DEFAULT" })
  scope: string;

  @Column({ name: "user_id", type: "uuid", nullable: true })
  userId: string | null;

  /** SHA-256 of the canonical request payload, used to detect key reuse. */
  @Column({ name: "request_hash", type: "varchar", length: 64, nullable: true })
  requestHash: string | null;

  /** Null while the command is still in flight. */
  @Column({ name: "status_code", type: "int", nullable: true })
  statusCode: number | null;

  /** Serialized response envelope, replayed on duplicate requests. */
  @Column({ type: "jsonb", nullable: true })
  response: Record<string, unknown> | null;

  @Column({ name: "completed_at", type: "timestamptz", nullable: true })
  completedAt: Date | null;

  @Column({ name: "expires_at", type: "timestamptz", nullable: true })
  expiresAt: Date | null;
}
