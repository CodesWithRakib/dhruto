import { Entity, Column, ManyToOne, JoinColumn, Index } from "typeorm";
import { BaseEntity } from "./Base.entity.js";
import { ChatMessage } from "./ChatMessage.entity.js";
import { User } from "./User.entity.js";

/**
 * Edit history: the content a message had BEFORE each edit. The current
 * content stays on `chat_messages`. Visible to moderators only.
 */
@Entity("chat_message_edits")
@Index("IDX_chat_message_edits_message_created", ["messageId", "createdAt"])
export class ChatMessageEdit extends BaseEntity {
  @Column({ name: "message_id", type: "uuid" })
  messageId: string;

  @ManyToOne(() => ChatMessage, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "message_id", foreignKeyConstraintName: "FK_chat_message_edits_message" })
  message: ChatMessage;

  @Column({ name: "editor_user_id", type: "uuid" })
  editorUserId: string;

  @ManyToOne(() => User, { nullable: false, onDelete: "RESTRICT" })
  @JoinColumn({ name: "editor_user_id", foreignKeyConstraintName: "FK_chat_message_edits_editor" })
  editor: User;

  @Column({ name: "previous_content", type: "text" })
  previousContent: string;
}
