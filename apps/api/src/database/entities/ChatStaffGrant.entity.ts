import { Entity, Column, ManyToOne, JoinColumn, Index, Check } from "typeorm";
import { BaseEntity } from "./Base.entity.js";
import { User } from "./User.entity.js";

/**
 * Explicit per-user grant of a grant-required chat permission (Phase 7,
 * `CHAT_GRANT_REQUIRED_PERMISSIONS`). Effective permission = role ceiling
 * AND an active (not revoked, not expired) grant. Rows are written only by
 * the operator CLI (`chat-staff-grants-cli`), never through HTTP, so an
 * admin cannot grant themselves. Revocation keeps the row (history); every
 * change is also written to `chat_audit_logs` (STAFF_GRANT_CHANGED).
 */
@Entity("chat_staff_grants")
@Index("UQ_chat_staff_grants_active", ["userId", "permission"], {
  unique: true,
  where: `"revoked_at" IS NULL`,
})
@Check(
  "CHK_chat_staff_grants_permission",
  `"permission" IN ('chat.attachment.restricted_access', 'chat.attachment.quarantine_manage', 'chat.retention.manage')`,
)
@Check("CHK_chat_staff_grants_reason", `char_length(btrim("reason")) BETWEEN 10 AND 500`)
@Check(
  "CHK_chat_staff_grants_revoked",
  `"revoked_at" IS NULL OR ("revoked_by" IS NOT NULL AND "revoke_reason" IS NOT NULL)`,
)
export class ChatStaffGrant extends BaseEntity {
  @Column({ name: "user_id", type: "uuid" })
  userId: string;

  @ManyToOne(() => User, { nullable: false, onDelete: "RESTRICT" })
  @JoinColumn({ name: "user_id", foreignKeyConstraintName: "FK_chat_staff_grants_user" })
  user: User;

  @Column({ type: "varchar", length: 64 })
  permission: string;

  @Column({ type: "text" })
  reason: string;

  /** Operator label supplied to the CLI (no credentials). */
  @Column({ name: "granted_by", type: "varchar", length: 120 })
  grantedBy: string;

  @Column({ name: "expires_at", type: "timestamptz", nullable: true })
  expiresAt: Date | null;

  @Column({ name: "revoked_at", type: "timestamptz", nullable: true })
  revokedAt: Date | null;

  @Column({ name: "revoked_by", type: "varchar", length: 120, nullable: true })
  revokedBy: string | null;

  @Column({ name: "revoke_reason", type: "text", nullable: true })
  revokeReason: string | null;
}
