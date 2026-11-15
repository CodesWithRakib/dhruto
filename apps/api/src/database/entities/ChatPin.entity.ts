import { Entity, Column, ManyToOne, JoinColumn, Index } from "typeorm";
import { BaseEntity } from "./Base.entity.js";
import { ChatConversation } from "./ChatConversation.entity.js";
import { ChatMessage } from "./ChatMessage.entity.js";
import { User } from "./User.entity.js";

/**
 * A pinned message. A message can be pinned at most once. The service must
 * verify `message.conversation_id = conversation_id` before inserting (kept
 * out of the schema to avoid an extra composite unique index on the hot
 * `chat_messages` table).
 */
@Entity("chat_pins")
@Index("UQ_chat_pins_message", ["messageId"], { unique: true })
@Index("IDX_chat_pins_conversation_created", ["conversationId", "createdAt"])
export class ChatPin extends BaseEntity {
  @Column({ name: "conversation_id", type: "uuid" })
  conversationId: string;

  @ManyToOne(() => ChatConversation, { nullable: false, onDelete: "RESTRICT" })
  @JoinColumn({ name: "conversation_id", foreignKeyConstraintName: "FK_chat_pins_conversation" })
  conversation: ChatConversation;

  @Column({ name: "message_id", type: "uuid" })
  messageId: string;

  @ManyToOne(() => ChatMessage, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "message_id", foreignKeyConstraintName: "FK_chat_pins_message" })
  message: ChatMessage;

  @Column({ name: "pinned_by_user_id", type: "uuid" })
  pinnedByUserId: string;

  @ManyToOne(() => User, { nullable: false, onDelete: "RESTRICT" })
  @JoinColumn({ name: "pinned_by_user_id", foreignKeyConstraintName: "FK_chat_pins_pinned_by" })
  pinnedBy: User;
}
