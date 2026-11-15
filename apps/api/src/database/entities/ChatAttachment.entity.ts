import { Entity, Column, ManyToOne, JoinColumn, Index, Check } from "typeorm";
import { ChatAttachmentStatus } from "@dhruto/contracts";
import { BaseEntity } from "./Base.entity.js";
import { ChatConversation } from "./ChatConversation.entity.js";
import { ChatMessage } from "./ChatMessage.entity.js";
import { User } from "./User.entity.js";

/**
 * Attachment metadata only — file bytes live in object storage under
 * `storage_key` and are never stored in PostgreSQL. A row is reserved
 * (PENDING) before upload, verified (UPLOADED) after size/checksum checks,
 * and linked to a message when that message is sent (`message_id` null until
 * then). `storage_key` is internal and must never be returned to clients.
 */
@Entity("chat_attachments")
@Index("UQ_chat_attachments_storage_key", ["storageKey"], { unique: true })
@Index("IDX_chat_attachments_message", ["messageId"], { where: `"message_id" IS NOT NULL` })
@Check("CHK_chat_attachments_size", `"size_bytes" > 0`)
@Check("CHK_chat_attachments_checksum", `"checksum_sha256" ~ '^[a-f0-9]{64}$'`)
@Check("CHK_chat_attachments_uploaded_at", `"status" <> 'UPLOADED' OR "uploaded_at" IS NOT NULL`)
export class ChatAttachment extends BaseEntity {
  @Column({ name: "conversation_id", type: "uuid" })
  conversationId: string;

  @ManyToOne(() => ChatConversation, { nullable: false, onDelete: "RESTRICT" })
  @JoinColumn({
    name: "conversation_id",
    foreignKeyConstraintName: "FK_chat_attachments_conversation",
  })
  conversation: ChatConversation;

  @Column({ name: "message_id", type: "uuid", nullable: true })
  messageId: string | null;

  @ManyToOne(() => ChatMessage, { nullable: true, onDelete: "RESTRICT" })
  @JoinColumn({ name: "message_id", foreignKeyConstraintName: "FK_chat_attachments_message" })
  message: ChatMessage | null;

  @Column({ name: "uploader_user_id", type: "uuid" })
  uploaderUserId: string;

  @ManyToOne(() => User, { nullable: false, onDelete: "RESTRICT" })
  @JoinColumn({
    name: "uploader_user_id",
    foreignKeyConstraintName: "FK_chat_attachments_uploader",
  })
  uploader: User;

  @Column({ name: "storage_key", type: "varchar", length: 512 })
  storageKey: string;

  @Column({ name: "original_filename", type: "varchar", length: 255 })
  originalFilename: string;

  @Column({ name: "mime_type", type: "varchar", length: 100 })
  mimeType: string;

  @Column({ name: "size_bytes", type: "integer" })
  sizeBytes: number;

  @Column({ name: "checksum_sha256", type: "char", length: 64 })
  checksumSha256: string;

  @Column({ type: "enum", enum: ChatAttachmentStatus, default: ChatAttachmentStatus.PENDING })
  status: ChatAttachmentStatus;

  @Column({ name: "uploaded_at", type: "timestamptz", nullable: true })
  uploadedAt: Date | null;
}
