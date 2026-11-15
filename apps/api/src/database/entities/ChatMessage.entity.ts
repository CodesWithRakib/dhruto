import { Entity, Column, ManyToOne, JoinColumn, Index, Check } from "typeorm";
import { ChatMessageType, type ChatMessageMetadata } from "@dhruto/contracts";
import { BaseEntity } from "./Base.entity.js";
import { ChatConversation } from "./ChatConversation.entity.js";
import { User } from "./User.entity.js";

/**
 * A persisted chat message.
 *
 * Ordering: `sequence` (BIGINT, unique per conversation) is the only
 * authoritative order — timestamps are informational. The unique index on
 * (conversation_id, sequence) also serves keyset history pagination in both
 * directions (`WHERE conversation_id = $1 AND sequence < $2 ORDER BY sequence
 * DESC LIMIT $3`).
 *
 * Idempotency: (conversation_id, sender_user_id, client_message_id) is unique,
 * so a retried send with the same client id can never create a second row.
 * Human-sent messages must carry a client id; SYSTEM_EVENT messages have no
 * sender and no client id.
 *
 * Deletion is soft: `deleted_at` is set and `content`/`metadata` are cleared
 * by the service so removed content is not retained in the row.
 */
@Entity("chat_messages")
@Index("UQ_chat_messages_conversation_sequence", ["conversationId", "sequence"], { unique: true })
@Index(
  "UQ_chat_messages_conversation_sender_client",
  ["conversationId", "senderUserId", "clientMessageId"],
  { unique: true },
)
@Check("CHK_chat_messages_sequence", `"sequence" > 0`)
@Check(
  "CHK_chat_messages_sender",
  `("type" = 'SYSTEM_EVENT' AND "sender_user_id" IS NULL) OR ("type" <> 'SYSTEM_EVENT' AND "sender_user_id" IS NOT NULL AND "client_message_id" IS NOT NULL)`,
)
@Check("CHK_chat_messages_content_length", `"content" IS NULL OR char_length("content") <= 4000`)
@Check(
  "CHK_chat_messages_text_content",
  `"type" <> 'TEXT' OR "deleted_at" IS NOT NULL OR ("content" IS NOT NULL AND char_length(btrim("content")) > 0)`,
)
@Check(
  "CHK_chat_messages_metadata_object",
  `"metadata" IS NULL OR jsonb_typeof("metadata") = 'object'`,
)
export class ChatMessage extends BaseEntity {
  @Column({ name: "conversation_id", type: "uuid" })
  conversationId: string;

  @ManyToOne(() => ChatConversation, { nullable: false, onDelete: "RESTRICT" })
  @JoinColumn({
    name: "conversation_id",
    foreignKeyConstraintName: "FK_chat_messages_conversation",
  })
  conversation: ChatConversation;

  /** Null only for SYSTEM_EVENT messages. */
  @Column({ name: "sender_user_id", type: "uuid", nullable: true })
  senderUserId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: "RESTRICT" })
  @JoinColumn({ name: "sender_user_id", foreignKeyConstraintName: "FK_chat_messages_sender" })
  sender: User | null;

  /** Client-generated UUID; the send idempotency key. */
  @Column({ name: "client_message_id", type: "uuid", nullable: true })
  clientMessageId: string | null;

  /** BIGINT per-conversation sequence (string in JS to preserve precision). */
  @Column({ type: "bigint" })
  sequence: string;

  @Column({ type: "enum", enum: ChatMessageType })
  type: ChatMessageType;

  @Column({ type: "text", nullable: true })
  content: string | null;

  @Column({ name: "reply_to_message_id", type: "uuid", nullable: true })
  replyToMessageId: string | null;

  @ManyToOne(() => ChatMessage, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({
    name: "reply_to_message_id",
    foreignKeyConstraintName: "FK_chat_messages_reply_to",
  })
  replyTo: ChatMessage | null;

  /** Typed per message type (validated by the contracts schemas before write). */
  @Column({ type: "jsonb", nullable: true })
  metadata: ChatMessageMetadata | null;

  @Column({ name: "edited_at", type: "timestamptz", nullable: true })
  editedAt: Date | null;

  @Column({ name: "deleted_at", type: "timestamptz", nullable: true })
  deletedAt: Date | null;

  /** Sender (self-delete) or moderator; moderator removals are also audited. */
  @Column({ name: "deleted_by_user_id", type: "uuid", nullable: true })
  deletedByUserId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: "RESTRICT" })
  @JoinColumn({
    name: "deleted_by_user_id",
    foreignKeyConstraintName: "FK_chat_messages_deleted_by",
  })
  deletedBy: User | null;
}
