import { Entity, Column, ManyToOne, JoinColumn, Index, Check } from "typeorm";
import {
  ChatNotificationLevel,
  ChatParticipantRole,
  ChatParticipantStatus,
} from "@dhruto/contracts";
import { BaseEntity } from "./Base.entity.js";
import { ChatConversation } from "./ChatConversation.entity.js";
import { User } from "./User.entity.js";

/**
 * Conversation membership. Exactly one row per (conversation, user): leaving
 * and rejoining flips `status` instead of inserting a duplicate, so a user can
 * never hold two memberships in the same conversation and their read cursor
 * survives a rejoin. Membership history is recorded in `chat_audit_logs`.
 *
 * Read/delivery state is a pair of per-participant cursors (BIGINT message
 * sequences) — no per-message receipt rows. Unread count is
 * `conversation.last_message_sequence - last_read_sequence`.
 */
@Entity("chat_participants")
@Index("UQ_chat_participants_conversation_user", ["conversationId", "userId"], { unique: true })
@Index("IDX_chat_participants_user_active", ["userId", "conversationId"], {
  where: `"status" = 'ACTIVE'`,
})
@Check(
  "CHK_chat_participants_cursors",
  `"last_read_sequence" >= 0 AND "last_delivered_sequence" >= "last_read_sequence"`,
)
@Check(
  "CHK_chat_participants_left_at",
  `("status" = 'ACTIVE' AND "left_at" IS NULL) OR ("status" <> 'ACTIVE' AND "left_at" IS NOT NULL)`,
)
export class ChatParticipant extends BaseEntity {
  @Column({ name: "conversation_id", type: "uuid" })
  conversationId: string;

  @ManyToOne(() => ChatConversation, { nullable: false, onDelete: "RESTRICT" })
  @JoinColumn({
    name: "conversation_id",
    foreignKeyConstraintName: "FK_chat_participants_conversation",
  })
  conversation: ChatConversation;

  @Column({ name: "user_id", type: "uuid" })
  userId: string;

  @ManyToOne(() => User, { nullable: false, onDelete: "RESTRICT" })
  @JoinColumn({ name: "user_id", foreignKeyConstraintName: "FK_chat_participants_user" })
  user: User;

  @Column({ type: "enum", enum: ChatParticipantRole, default: ChatParticipantRole.MEMBER })
  role: ChatParticipantRole;

  @Column({ type: "enum", enum: ChatParticipantStatus, default: ChatParticipantStatus.ACTIVE })
  status: ChatParticipantStatus;

  @Column({ name: "joined_at", type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })
  joinedAt: Date;

  @Column({ name: "left_at", type: "timestamptz", nullable: true })
  leftAt: Date | null;

  @Column({ name: "last_read_sequence", type: "bigint", default: "0" })
  lastReadSequence: string;

  @Column({ name: "last_delivered_sequence", type: "bigint", default: "0" })
  lastDeliveredSequence: string;

  @Column({ name: "is_muted", type: "boolean", default: false })
  isMuted: boolean;

  /** Null with `isMuted = true` means muted indefinitely. */
  @Column({ name: "muted_until", type: "timestamptz", nullable: true })
  mutedUntil: Date | null;

  @Column({
    name: "notification_level",
    type: "enum",
    enum: ChatNotificationLevel,
    default: ChatNotificationLevel.ALL,
  })
  notificationLevel: ChatNotificationLevel;
}
