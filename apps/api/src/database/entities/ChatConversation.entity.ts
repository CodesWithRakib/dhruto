import { Entity, Column, ManyToOne, JoinColumn, Index, Check } from "typeorm";
import { ChatConversationStatus, ChatConversationType } from "@dhruto/contracts";
import { BaseEntity } from "./Base.entity.js";
import { Parcel } from "./Parcel.entity.js";
import { Hub } from "./Hub.entity.js";
import { Merchant } from "./Merchant.entity.js";
import { User } from "./User.entity.js";

/**
 * Communication platform — a conversation (thread).
 *
 * Scope references (parcel / hub / merchant) carry tenant ownership: the
 * platform has no generic tenant id, so authorization derives from these
 * columns plus participant membership. Type-specific scope requirements are
 * enforced by CHECK constraints (mirrors `CHAT_CONVERSATION_SCOPE_REQUIREMENTS`).
 *
 * `lastMessageSequence` is the per-conversation sequence counter: senders
 * increment it with a row-locking UPDATE ... RETURNING inside the message
 * insert transaction, which serializes sequence assignment per conversation.
 * The last-message fields are a denormalized preview for list rendering
 * (no FK back to chat_messages, to avoid a circular dependency).
 */
@Entity("chat_conversations")
@Index("IDX_chat_conversations_type_status_last_message", ["type", "status", "lastMessageAt"])
@Index("IDX_chat_conversations_parcel_type", ["parcelId", "type"], {
  where: `"parcel_id" IS NOT NULL`,
})
@Index("UQ_chat_conversations_parcel_delivery", ["parcelId"], {
  unique: true,
  where: `"type" = 'PARCEL_DELIVERY'`,
})
@Check(
  "CHK_chat_conversations_scope",
  `("type" <> 'PARCEL_DELIVERY' OR ("parcel_id" IS NOT NULL AND "merchant_id" IS NOT NULL)) AND ("type" <> 'HUB_OPERATIONS' OR "hub_id" IS NOT NULL) AND ("type" <> 'MERCHANT_DESK' OR "merchant_id" IS NOT NULL)`,
)
@Check(
  "CHK_chat_conversations_status_timestamps",
  `("status" <> 'ARCHIVED' OR "archived_at" IS NOT NULL) AND ("status" <> 'CLOSED' OR "closed_at" IS NOT NULL) AND ("status" <> 'LOCKED' OR "locked_at" IS NOT NULL)`,
)
@Check("CHK_chat_conversations_sequence", `"last_message_sequence" >= 0`)
export class ChatConversation extends BaseEntity {
  @Column({ type: "enum", enum: ChatConversationType })
  type: ChatConversationType;

  @Column({ type: "varchar", length: 200, nullable: true })
  title: string | null;

  @Column({ type: "enum", enum: ChatConversationStatus, default: ChatConversationStatus.ACTIVE })
  status: ChatConversationStatus;

  @Column({ name: "parcel_id", type: "uuid", nullable: true })
  parcelId: string | null;

  @ManyToOne(() => Parcel, { nullable: true, onDelete: "RESTRICT" })
  @JoinColumn({ name: "parcel_id", foreignKeyConstraintName: "FK_chat_conversations_parcel" })
  parcel: Parcel | null;

  @Column({ name: "hub_id", type: "uuid", nullable: true })
  hubId: string | null;

  @ManyToOne(() => Hub, { nullable: true, onDelete: "RESTRICT" })
  @JoinColumn({ name: "hub_id", foreignKeyConstraintName: "FK_chat_conversations_hub" })
  hub: Hub | null;

  @Column({ name: "merchant_id", type: "uuid", nullable: true })
  merchantId: string | null;

  @ManyToOne(() => Merchant, { nullable: true, onDelete: "RESTRICT" })
  @JoinColumn({ name: "merchant_id", foreignKeyConstraintName: "FK_chat_conversations_merchant" })
  merchant: Merchant | null;

  /** Null when created by the system (e.g. a parcel workflow). */
  @Column({ name: "created_by_user_id", type: "uuid", nullable: true })
  createdByUserId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: "RESTRICT" })
  @JoinColumn({
    name: "created_by_user_id",
    foreignKeyConstraintName: "FK_chat_conversations_created_by",
  })
  createdBy: User | null;

  /** BIGINT sequence counter (string in JS to preserve precision). */
  @Column({ name: "last_message_sequence", type: "bigint", default: "0" })
  lastMessageSequence: string;

  @Column({ name: "last_message_id", type: "uuid", nullable: true })
  lastMessageId: string | null;

  @Column({ name: "last_message_at", type: "timestamptz", nullable: true })
  lastMessageAt: Date | null;

  @Column({ name: "last_message_preview", type: "varchar", length: 280, nullable: true })
  lastMessagePreview: string | null;

  @Column({ name: "archived_at", type: "timestamptz", nullable: true })
  archivedAt: Date | null;

  @Column({ name: "closed_at", type: "timestamptz", nullable: true })
  closedAt: Date | null;

  @Column({ name: "locked_at", type: "timestamptz", nullable: true })
  lockedAt: Date | null;
}
