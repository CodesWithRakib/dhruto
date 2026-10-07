import { Entity, Column, Index } from "typeorm";
import { BaseEntity } from "./Base.entity.js";

/**
 * Report export request with filter snapshot for reproducibility.
 *
 * Small exports generate inline; large ones are queued (BullMQ) and the user
 * is notified on completion. Content is stored server-side (never public),
 * expires automatically, and enforces the same RBAC/tenant scope as the API.
 * Idempotent per idempotency key: worker retries never duplicate reports.
 */
@Entity("report_exports")
@Index(["requestedBy", "createdAt"])
@Index(["status", "expiresAt"])
export class ReportExport extends BaseEntity {
  @Column({ type: "varchar", length: 16 })
  dataset: string;

  @Column({ type: "varchar", length: 8, default: "csv" })
  format: string;

  @Column({ type: "varchar", length: 16, default: "PENDING" })
  status: string;

  @Column({ name: "idempotency_key", type: "varchar", length: 128, nullable: true, unique: true })
  idempotencyKey: string | null;

  @Column({ type: "jsonb" })
  filters: Record<string, unknown>;

  @Column({ name: "tenant_id", type: "uuid", nullable: true })
  tenantId: string | null;

  @Column({ name: "requested_by", type: "uuid" })
  requestedBy: string;

  @Column({ name: "row_count", type: "int", nullable: true })
  rowCount: number | null;

  /** Base64-encoded file content (CSV text or XLSX binary). */
  @Column({ type: "text", nullable: true })
  content: string | null;

  @Column({ name: "file_name", type: "varchar", length: 255, nullable: true })
  fileName: string | null;

  @Column({ name: "failure_reason", type: "varchar", length: 500, nullable: true })
  failureReason: string | null;

  @Column({ name: "expires_at", type: "timestamptz", nullable: true })
  expiresAt: Date | null;

  @Column({ name: "ready_at", type: "timestamptz", nullable: true })
  readyAt: Date | null;
}
