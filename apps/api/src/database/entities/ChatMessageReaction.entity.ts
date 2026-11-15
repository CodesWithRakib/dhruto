import { Entity, Column, ManyToOne, JoinColumn, Index, Check } from "typeorm";
import { BaseEntity } from "./Base.entity.js";
import { ChatMessage } from "./ChatMessage.entity.js";
import { User } from "./User.entity.js";

/**
 * One reaction per (message, user, reaction). The unique index also serves
 * "reactions for these message ids" lookups (leading `message_id`).
 */
@Entity("chat_message_reactions")
@Index("UQ_chat_message_reactions_message_user_reaction", ["messageId", "userId", "reaction"], {
  unique: true,
})
@Check("CHK_chat_message_reactions_reaction", `char_length("reaction") BETWEEN 1 AND 32`)
export class ChatMessageReaction extends BaseEntity {
  @Column({ name: "message_id", type: "uuid" })
  messageId: string;

  @ManyToOne(() => ChatMessage, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "message_id", foreignKeyConstraintName: "FK_chat_message_reactions_message" })
  message: ChatMessage;

  @Column({ name: "user_id", type: "uuid" })
  userId: string;

  @ManyToOne(() => User, { nullable: false, onDelete: "RESTRICT" })
  @JoinColumn({ name: "user_id", foreignKeyConstraintName: "FK_chat_message_reactions_user" })
  user: User;

  @Column({ type: "varchar", length: 32 })
  reaction: string;
}
