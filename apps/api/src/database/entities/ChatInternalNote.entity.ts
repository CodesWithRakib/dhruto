import { Entity, Column, ManyToOne, JoinColumn, Index, Check } from "typeorm";
import { BaseEntity } from "./Base.entity.js";
import { ChatConversation } from "./ChatConversation.entity.js";
import { User } from "./User.entity.js";

/**
 * Private staff note attached to a conversation.
 *
 * Stored in its own table — never in `chat_messages` — so no message query,
 * history page, socket fan-out or unread computation can accidentally include
 * a note. Access requires `ChatPermission.INTERNAL_NOTE_MANAGE`; participant
 * membership alone never grants it.
 */
@Entity("chat_internal_notes")
@Index("IDX_chat_internal_notes_conversation_created", ["conversationId", "createdAt"])
@Check("CHK_chat_internal_notes_body", `char_length(btrim("body")) BETWEEN 1 AND 4000`)
export class ChatInternalNote extends BaseEntity {
  @Column({ name: "conversation_id", type: "uuid" })
  conversationId: string;

  @ManyToOne(() => ChatConversation, { nullable: false, onDelete: "RESTRICT" })
  @JoinColumn({
    name: "conversation_id",
    foreignKeyConstraintName: "FK_chat_internal_notes_conversation",
  })
  conversation: ChatConversation;

  @Column({ name: "author_user_id", type: "uuid" })
  authorUserId: string;

  @ManyToOne(() => User, { nullable: false, onDelete: "RESTRICT" })
  @JoinColumn({ name: "author_user_id", foreignKeyConstraintName: "FK_chat_internal_notes_author" })
  author: User;

  @Column({ type: "text" })
  body: string;

  @Column({ name: "deleted_at", type: "timestamptz", nullable: true })
  deletedAt: Date | null;
}
