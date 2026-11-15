import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  Check,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from "typeorm";
import { ChatAuditAction } from "@dhruto/contracts";
import { User, UserRole } from "./User.entity.js";

/**
 * Append-only audit trail for privileged and lifecycle chat actions.
 *
 * Deliberately separate from `chat_messages` so audit records are never
 * rendered as conversation content. It does not extend `BaseEntity`: rows are
 * immutable, so there is no `updatedAt`, and a database trigger
 * (`TRG_chat_audit_logs_immutable`, created by the migration) rejects UPDATE.
 *
 * Target ids (`conversation_id`, `target_id`) intentionally have no foreign
 * keys: the audit record must outlive any future purge of the audited rows.
 * `actor_role` snapshots the actor's platform role at the time of the action
 * and reuses the existing `users_role_enum` type (no duplicate role enum).
 */
@Entity("chat_audit_logs")
@Index("IDX_chat_audit_logs_conversation_created", ["conversationId", "createdAt"], {
  where: `"conversation_id" IS NOT NULL`,
})
@Index("IDX_chat_audit_logs_actor_created", ["actorUserId", "createdAt"], {
  where: `"actor_user_id" IS NOT NULL`,
})
@Check(
  "CHK_chat_audit_logs_admin_reason",
  `"action" NOT IN ('ADMIN_CONVERSATION_VIEWED', 'ADMIN_INTERVENTION') OR ("reason" IS NOT NULL AND char_length(btrim("reason")) > 0)`,
)
@Check(
  "CHK_chat_audit_logs_metadata_object",
  `"metadata" IS NULL OR jsonb_typeof("metadata") = 'object'`,
)
export class ChatAuditLog {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  /** Null for system-initiated actions. */
  @Column({ name: "actor_user_id", type: "uuid", nullable: true })
  actorUserId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: "RESTRICT" })
  @JoinColumn({ name: "actor_user_id", foreignKeyConstraintName: "FK_chat_audit_logs_actor" })
  actor: User | null;

  @Column({
    name: "actor_role",
    type: "enum",
    enum: UserRole,
    enumName: "users_role_enum",
    nullable: true,
  })
  actorRole: UserRole | null;

  @Column({ type: "enum", enum: ChatAuditAction })
  action: ChatAuditAction;

  @Column({ name: "conversation_id", type: "uuid", nullable: true })
  conversationId: string | null;

  /** e.g. `message`, `participant`, `internal_note`, `report`, `attachment`. */
  @Column({ name: "target_type", type: "varchar", length: 32, nullable: true })
  targetType: string | null;

  @Column({ name: "target_id", type: "uuid", nullable: true })
  targetId: string | null;

  /** Mandatory justification for admin access/intervention (CHECK enforced). */
  @Column({ type: "text", nullable: true })
  reason: string | null;

  @Column({ name: "request_id", type: "varchar", length: 128, nullable: true })
  requestId: string | null;

  /** Secret-free, PII-minimal context (e.g. `{ from: "ACTIVE", to: "LOCKED" }`). */
  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, unknown> | null;
}
