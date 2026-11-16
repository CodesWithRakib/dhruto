import { Entity, Column, ManyToOne, JoinColumn, Index, Check } from "typeorm";
import { ChatReportReason, ChatReportStatus } from "@dhruto/contracts";
import { BaseEntity } from "./Base.entity.js";
import { ChatConversation } from "./ChatConversation.entity.js";
import { ChatMessage } from "./ChatMessage.entity.js";
import { User } from "./User.entity.js";

/**
 * Abuse/moderation report against a message (or a whole conversation when
 * `message_id` is null). A user can report a given message only once.
 */
@Entity("chat_reports")
@Index("UQ_chat_reports_message_reporter", ["messageId", "reporterUserId"], {
  unique: true,
  where: `"message_id" IS NOT NULL`,
})
@Index("IDX_chat_reports_status_created", ["status", "createdAt"])
@Index("IDX_chat_reports_conversation_status", ["conversationId", "status"])
@Check(
  "CHK_chat_reports_review",
  `"status" IN ('OPEN', 'UNDER_REVIEW') OR ("reviewed_by_user_id" IS NOT NULL AND "reviewed_at" IS NOT NULL)`,
)
@Check("CHK_chat_reports_details_length", `"details" IS NULL OR char_length("details") <= 1000`)
export class ChatReport extends BaseEntity {
  @Column({ name: "conversation_id", type: "uuid" })
  conversationId: string;

  @ManyToOne(() => ChatConversation, { nullable: false, onDelete: "RESTRICT" })
  @JoinColumn({ name: "conversation_id", foreignKeyConstraintName: "FK_chat_reports_conversation" })
  conversation: ChatConversation;

  @Column({ name: "message_id", type: "uuid", nullable: true })
  messageId: string | null;

  @ManyToOne(() => ChatMessage, { nullable: true, onDelete: "RESTRICT" })
  @JoinColumn({ name: "message_id", foreignKeyConstraintName: "FK_chat_reports_message" })
  message: ChatMessage | null;

  @Column({ name: "reporter_user_id", type: "uuid" })
  reporterUserId: string;

  @ManyToOne(() => User, { nullable: false, onDelete: "RESTRICT" })
  @JoinColumn({ name: "reporter_user_id", foreignKeyConstraintName: "FK_chat_reports_reporter" })
  reporter: User;

  @Column({ type: "enum", enum: ChatReportReason })
  reason: ChatReportReason;

  @Column({ type: "text", nullable: true })
  details: string | null;

  @Column({ type: "enum", enum: ChatReportStatus, default: ChatReportStatus.OPEN })
  status: ChatReportStatus;

  @Column({ name: "reviewed_by_user_id", type: "uuid", nullable: true })
  reviewedByUserId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: "RESTRICT" })
  @JoinColumn({
    name: "reviewed_by_user_id",
    foreignKeyConstraintName: "FK_chat_reports_reviewed_by",
  })
  reviewedBy: User | null;

  @Column({ name: "reviewed_at", type: "timestamptz", nullable: true })
  reviewedAt: Date | null;

  @Column({ name: "resolution_note", type: "text", nullable: true })
  resolutionNote: string | null;
}
