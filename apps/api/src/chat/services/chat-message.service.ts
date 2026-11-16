import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource, In, IsNull, QueryFailedError, type EntityManager } from "typeorm";
import {
  CHAT_MESSAGE_PREVIEW_MAX_LENGTH,
  ChatAttachmentScanStatus,
  ChatAttachmentStatus,
  ChatAuditAction,
  ChatMessageType,
  ChatParticipantCapability,
  ChatPermission,
  DomainEventType,
  isConversationWritable,
  type ChatMessageItem,
  type ChatMessageMetadata,
  type ChatMessagePage,
  type ListChatMessagesQuery,
  type ChatSystemEventMetadata,
  type SendChatMessageRequest,
} from "@dhruto/contracts";
import {
  ChatAttachment,
  ChatConversation,
  ChatMessage,
  ChatMessageEdit,
} from "../../database/entities/index.js";
import { chatErrors } from "../chat.errors.js";
import { CHAT_EDIT_WINDOW_SECONDS } from "../chat.config.js";
import { type ChatRequestContext } from "../chat.context.js";
import { ChatAuthorizationService, type ChatMemberAccess } from "./chat-authorization.service.js";
import { ChatAuditService } from "./chat-audit.service.js";
import { ChatEventsService } from "./chat-events.service.js";
import { ChatMessageReaderService } from "./chat-message-reader.service.js";

export interface SendMessageResult {
  message: ChatMessageItem;
  /** True when an earlier request with the same clientMessageId already persisted it. */
  replayed: boolean;
}

const IDEMPOTENCY_CONSTRAINT = "UQ_chat_messages_conversation_sender_client";

const PREVIEW_LABELS: Readonly<Record<ChatMessageType, string>> = {
  [ChatMessageType.TEXT]: "",
  [ChatMessageType.IMAGE]: "[Image]",
  [ChatMessageType.FILE]: "[File]",
  [ChatMessageType.LOCATION]: "[Location]",
  [ChatMessageType.VOICE]: "[Voice message]",
  [ChatMessageType.SYSTEM_EVENT]: "[System]",
  [ChatMessageType.QUICK_ACTION]: "[Quick action]",
};

/** Types whose text body may be edited (captions for media/location/actions). */
const EDITABLE_TYPES: ReadonlySet<ChatMessageType> = new Set([
  ChatMessageType.TEXT,
  ChatMessageType.IMAGE,
  ChatMessageType.FILE,
  ChatMessageType.LOCATION,
  ChatMessageType.QUICK_ACTION,
]);

export function buildPreview(type: ChatMessageType, content: string | null): string {
  const text = content?.trim();
  const preview = text && text.length > 0 ? text : PREVIEW_LABELS[type];
  return preview.slice(0, CHAT_MESSAGE_PREVIEW_MAX_LENGTH);
}

function isUniqueViolation(error: unknown, constraint: string): boolean {
  if (!(error instanceof QueryFailedError)) return false;
  const driverError = error.driverError as { code?: unknown; constraint?: unknown } | undefined;
  return driverError?.code === "23505" && driverError.constraint === constraint;
}

/**
 * Message writes. Ordering + idempotency follow ADR-002/003 exactly:
 *
 *   BEGIN
 *     authorize (membership + live eligibility + SEND capability)
 *     look up (conversation, sender, clientMessageId)  -> replay if found
 *     SELECT conversation ... FOR UPDATE              -> serializes senders
 *     re-check the idempotency key under the lock     -> concurrent retry
 *     validate reply target + attachments (locked)
 *     sequence = last_message_sequence + 1
 *     INSERT message; link attachments; update conversation head
 *     advance sender's own read/delivered cursors
 *     INSERT event_outbox row (same transaction)
 *   COMMIT
 *
 * A replay never touches the counter. If two identical sends still collide
 * (e.g. a lock-free path in future), the unique index rejects the second
 * insert, its transaction (sequence bump + outbox row) rolls back, and the
 * canonical row is returned.
 */
@Injectable()
export class ChatMessageService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly authz: ChatAuthorizationService,
    private readonly audit: ChatAuditService,
    private readonly events: ChatEventsService,
    private readonly reader: ChatMessageReaderService,
  ) {}

  /* ---------------------------------------------------------------- */
  /* Send                                                              */
  /* ---------------------------------------------------------------- */

  async send(
    ctx: ChatRequestContext,
    conversationId: string,
    req: SendChatMessageRequest,
  ): Promise<SendMessageResult> {
    try {
      return await this.dataSource.transaction((manager) =>
        this.sendInTransaction(manager, ctx, conversationId, req),
      );
    } catch (error) {
      if (!isUniqueViolation(error, IDEMPOTENCY_CONSTRAINT)) throw error;
      const existing = await this.findByClientId(
        this.dataSource.manager,
        conversationId,
        ctx.user.id,
        req.clientMessageId,
      );
      if (!existing) throw error;
      return { message: await this.reader.getMessageItem(existing, ctx.user.id), replayed: true };
    }
  }

  private async sendInTransaction(
    manager: EntityManager,
    ctx: ChatRequestContext,
    conversationId: string,
    req: SendChatMessageRequest,
  ): Promise<SendMessageResult> {
    await this.authz.requireMember(
      ctx.user,
      conversationId,
      { capability: ChatParticipantCapability.SEND_MESSAGE, requireWritable: true },
      manager,
    );

    const before = await this.findByClientId(
      manager,
      conversationId,
      ctx.user.id,
      req.clientMessageId,
    );
    if (before)
      return {
        message: await this.reader.getMessageItem(before, ctx.user.id, manager),
        replayed: true,
      };

    const conversation = await this.lockConversation(manager, conversationId);
    if (!isConversationWritable(conversation.status))
      throw chatErrors.notWritable(conversation.status);

    const raced = await this.findByClientId(
      manager,
      conversationId,
      ctx.user.id,
      req.clientMessageId,
    );
    if (raced)
      return {
        message: await this.reader.getMessageItem(raced, ctx.user.id, manager),
        replayed: true,
      };

    if (req.replyToMessageId)
      await this.assertReplyTarget(manager, conversationId, req.replyToMessageId);
    const attachmentIds = "attachmentIds" in req ? req.attachmentIds : [];
    await this.assertAttachments(manager, conversationId, ctx.user.id, req.type, attachmentIds);

    const content = "content" in req && req.content !== undefined ? req.content : null;
    const metadata: ChatMessageMetadata | null = "metadata" in req ? req.metadata : null;

    const message = await this.insertAtNextSequence(manager, conversation, {
      senderUserId: ctx.user.id,
      clientMessageId: req.clientMessageId,
      type: req.type,
      content,
      metadata,
      replyToMessageId: req.replyToMessageId ?? null,
    });

    if (attachmentIds.length > 0) {
      await manager
        .getRepository(ChatAttachment)
        .update({ id: In(attachmentIds) }, { messageId: message.id });
    }
    // The sender has read everything up to their own message.
    await manager.query(
      `UPDATE "chat_participants"
          SET "last_read_sequence" = GREATEST("last_read_sequence", $3::bigint),
              "last_delivered_sequence" = GREATEST("last_delivered_sequence", $3::bigint),
              "updatedAt" = now()
        WHERE "conversation_id" = $1 AND "user_id" = $2`,
      [conversationId, ctx.user.id, message.sequence],
    );
    await this.events.append(manager, ctx, DomainEventType.CHAT_MESSAGE_CREATED, conversationId, {
      messageId: message.id,
      sequence: message.sequence,
      senderId: ctx.user.id,
      type: message.type,
      clientMessageId: req.clientMessageId,
    });
    return {
      message: await this.reader.getMessageItem(message, ctx.user.id, manager),
      replayed: false,
    };
  }

  /**
   * Server-generated SYSTEM_EVENT message (e.g. staff intervention notice).
   * Caller supplies the transaction; sequence allocation uses the same lock.
   */
  async appendSystemMessage(
    manager: EntityManager,
    ctx: ChatRequestContext,
    conversationId: string,
    metadata: ChatSystemEventMetadata,
  ): Promise<ChatMessage> {
    const conversation = await this.lockConversation(manager, conversationId);
    const message = await this.insertAtNextSequence(manager, conversation, {
      senderUserId: null,
      clientMessageId: null,
      type: ChatMessageType.SYSTEM_EVENT,
      content: null,
      metadata,
      replyToMessageId: null,
    });
    await this.events.append(manager, ctx, DomainEventType.CHAT_MESSAGE_CREATED, conversationId, {
      messageId: message.id,
      sequence: message.sequence,
      senderId: null,
      type: message.type,
    });
    return message;
  }

  /**
   * Workflow SYSTEM_EVENT message (Phase 5 logistics), idempotent per source
   * domain event: `sourceEventId` is stored as the message's
   * `client_message_id` and checked under the conversation row lock, so an
   * outbox retry of the same event never posts a second message. (The unique
   * (conversation, sender, client id) index cannot dedupe here because
   * system messages have a NULL sender.) Returns null when already posted.
   */
  async appendWorkflowSystemMessage(
    manager: EntityManager,
    conversationId: string,
    metadata: ChatSystemEventMetadata,
    source: { sourceEventId: string; requestId: string | null },
  ): Promise<ChatMessage | null> {
    const conversation = await this.lockConversation(manager, conversationId);
    const existing = await manager.getRepository(ChatMessage).findOne({
      where: {
        conversationId,
        senderUserId: IsNull(),
        clientMessageId: source.sourceEventId,
        type: ChatMessageType.SYSTEM_EVENT,
      },
      select: ["id"],
    });
    if (existing) return null;
    const message = await this.insertAtNextSequence(manager, conversation, {
      senderUserId: null,
      clientMessageId: source.sourceEventId,
      type: ChatMessageType.SYSTEM_EVENT,
      content: null,
      metadata,
      replyToMessageId: null,
    });
    await this.events.appendWorkflow(
      manager,
      source.requestId,
      DomainEventType.CHAT_MESSAGE_CREATED,
      conversationId,
      { messageId: message.id, sequence: message.sequence, senderId: null, type: message.type },
    );
    return message;
  }

  private async lockConversation(
    manager: EntityManager,
    conversationId: string,
  ): Promise<ChatConversation> {
    const conversation = await manager.getRepository(ChatConversation).findOne({
      where: { id: conversationId },
      lock: { mode: "pessimistic_write" },
    });
    if (!conversation) throw chatErrors.conversationNotFound();
    return conversation;
  }

  /** Allocates `last_message_sequence + 1` (row lock held) and inserts the message. */
  private async insertAtNextSequence(
    manager: EntityManager,
    conversation: ChatConversation,
    fields: Pick<
      ChatMessage,
      "senderUserId" | "clientMessageId" | "type" | "content" | "metadata" | "replyToMessageId"
    >,
  ): Promise<ChatMessage> {
    const sequence = (BigInt(conversation.lastMessageSequence) + 1n).toString();
    const repo = manager.getRepository(ChatMessage);
    const message = await repo.save(
      repo.create({ ...fields, conversationId: conversation.id, sequence }),
    );
    await manager.getRepository(ChatConversation).update(
      { id: conversation.id },
      {
        lastMessageSequence: sequence,
        lastMessageId: message.id,
        lastMessageAt: message.createdAt,
        lastMessagePreview: buildPreview(message.type, message.content),
      },
    );
    conversation.lastMessageSequence = sequence;
    return message;
  }

  private findByClientId(
    manager: EntityManager,
    conversationId: string,
    senderUserId: string,
    clientMessageId: string,
  ): Promise<ChatMessage | null> {
    return manager
      .getRepository(ChatMessage)
      .findOne({ where: { conversationId, senderUserId, clientMessageId } });
  }

  /** Service-level invariant: replies stay inside their conversation. */
  private async assertReplyTarget(
    manager: EntityManager,
    conversationId: string,
    replyToMessageId: string,
  ): Promise<void> {
    const target = await manager
      .getRepository(ChatMessage)
      .findOne({ where: { id: replyToMessageId, conversationId }, select: ["id"] });
    if (!target) throw chatErrors.replyInvalid();
  }

  /**
   * Attachment references must be the sender's own verified uploads in this
   * conversation, not yet linked to another message, and match the message
   * type. Rows are locked so one upload can never be attached twice.
   */
  private async assertAttachments(
    manager: EntityManager,
    conversationId: string,
    senderUserId: string,
    type: ChatMessageType,
    attachmentIds: readonly string[],
  ): Promise<void> {
    if (attachmentIds.length === 0) return;
    const rows = await manager.getRepository(ChatAttachment).find({
      where: { id: In([...attachmentIds]) },
      lock: { mode: "pessimistic_write" },
    });
    if (rows.length !== attachmentIds.length)
      throw chatErrors.attachmentInvalid("Unknown attachment reference");
    for (const a of rows) {
      if (a.conversationId !== conversationId || a.uploaderUserId !== senderUserId) {
        throw chatErrors.attachmentInvalid("Unknown attachment reference");
      }
      if (a.status !== ChatAttachmentStatus.UPLOADED)
        throw chatErrors.attachmentInvalid("Attachment is not uploaded");
      if (a.messageId !== null)
        throw chatErrors.attachmentInvalid("Attachment is already used by another message");
      // Phase 7: a file the malware scan already blocked can never be sent.
      // (PENDING may be sent; recipients see it only once the scan is CLEAN.)
      if (
        a.scanStatus === ChatAttachmentScanStatus.INFECTED ||
        a.scanStatus === ChatAttachmentScanStatus.FAILED
      ) {
        throw chatErrors.attachmentInvalid("Attachment is blocked for security reasons");
      }
      if (type === ChatMessageType.IMAGE && !a.mimeType.startsWith("image/")) {
        throw chatErrors.attachmentInvalid("Image messages require image attachments");
      }
      if (type === ChatMessageType.VOICE && !a.mimeType.startsWith("audio/")) {
        throw chatErrors.attachmentInvalid("Voice messages require an audio attachment");
      }
    }
  }

  /* ---------------------------------------------------------------- */
  /* Read                                                              */
  /* ---------------------------------------------------------------- */

  /** Loads a message and requires membership of its conversation (404 otherwise). */
  async loadForMember(
    ctx: ChatRequestContext,
    messageId: string,
    options: { capability?: ChatParticipantCapability; requireWritable?: boolean } = {},
  ): Promise<{ message: ChatMessage; access: ChatMemberAccess }> {
    const message = await this.dataSource
      .getRepository(ChatMessage)
      .findOne({ where: { id: messageId } });
    if (!message) throw chatErrors.messageNotFound();
    try {
      const access = await this.authz.requireMember(ctx.user, message.conversationId, options);
      return { message, access };
    } catch (error) {
      if (error instanceof NotFoundException) throw chatErrors.messageNotFound();
      throw error;
    }
  }

  /** Keyset history for an active, eligible member. Never loads full history. */
  async history(
    ctx: ChatRequestContext,
    conversationId: string,
    query: ListChatMessagesQuery,
  ): Promise<ChatMessagePage> {
    await this.authz.requireMember(ctx.user, conversationId);
    return this.reader.history(conversationId, ctx.user.id, query);
  }

  async get(ctx: ChatRequestContext, messageId: string): Promise<ChatMessageItem> {
    const { message } = await this.loadForMember(ctx, messageId);
    return this.reader.getMessageItem(message, ctx.user.id);
  }

  /* ---------------------------------------------------------------- */
  /* Edit / delete / moderate                                          */
  /* ---------------------------------------------------------------- */

  async edit(
    ctx: ChatRequestContext,
    messageId: string,
    content: string,
  ): Promise<ChatMessageItem> {
    const { message } = await this.loadForMember(ctx, messageId, {
      capability: ChatParticipantCapability.EDIT_OWN_MESSAGE,
      requireWritable: true,
    });
    if (message.senderUserId !== ctx.user.id)
      throw chatErrors.forbidden("You can only edit your own messages");
    this.assertEditable(message);
    if (message.content === content) return this.reader.getMessageItem(message, ctx.user.id);

    const updated = await this.dataSource.transaction(async (manager) => {
      const locked = await manager
        .getRepository(ChatMessage)
        .findOneOrFail({ where: { id: messageId }, lock: { mode: "pessimistic_write" } });
      this.assertEditable(locked);
      await manager.getRepository(ChatMessageEdit).insert({
        messageId,
        editorUserId: ctx.user.id,
        previousContent: locked.content ?? "",
      });
      const editedAt = new Date();
      await manager.getRepository(ChatMessage).update({ id: messageId }, { content, editedAt });
      await this.refreshPreviewIfHead(
        manager,
        locked.conversationId,
        messageId,
        buildPreview(locked.type, content),
      );
      await this.events.append(
        manager,
        ctx,
        DomainEventType.CHAT_MESSAGE_EDITED,
        locked.conversationId,
        {
          messageId,
          sequence: locked.sequence,
        },
      );
      return Object.assign(locked, { content, editedAt });
    });
    return this.reader.getMessageItem(updated, ctx.user.id);
  }

  private assertEditable(message: ChatMessage): void {
    if (message.deletedAt) throw chatErrors.notEditable("Deleted messages cannot be edited");
    if (
      !EDITABLE_TYPES.has(message.type) ||
      (message.type !== ChatMessageType.TEXT && message.content === null)
    ) {
      throw chatErrors.notEditable(`${message.type} messages without text cannot be edited`);
    }
    const ageSeconds = (Date.now() - message.createdAt.getTime()) / 1000;
    if (CHAT_EDIT_WINDOW_SECONDS === 0 || ageSeconds > CHAT_EDIT_WINDOW_SECONDS) {
      throw chatErrors.editWindowExpired();
    }
  }

  /** Sender soft-delete of their own message. Idempotent. */
  async deleteOwn(ctx: ChatRequestContext, messageId: string): Promise<ChatMessageItem> {
    const { message } = await this.loadForMember(ctx, messageId, {
      capability: ChatParticipantCapability.DELETE_OWN_MESSAGE,
      requireWritable: true,
    });
    if (message.senderUserId !== ctx.user.id) {
      throw chatErrors.forbidden("You can only delete your own messages");
    }
    const deleted = await this.softDelete(ctx, messageId, {
      moderated: false,
      reason: null,
      path: "participant",
    });
    return this.reader.getMessageItem(deleted, ctx.user.id);
  }

  /**
   * Moderator removal: participant with REMOVE_ANY_MESSAGE, or staff with
   * scoped MESSAGE_MODERATE. Always justified and audited; allowed in any
   * conversation status (moderating a LOCKED conversation is the point).
   */
  async removeByModerator(
    ctx: ChatRequestContext,
    messageId: string,
    reason: string,
  ): Promise<ChatMessageItem> {
    const message = await this.dataSource
      .getRepository(ChatMessage)
      .findOne({ where: { id: messageId } });
    if (!message) throw chatErrors.messageNotFound();
    let path: "participant" | "staff";
    try {
      const access = await this.authz.resolveAccess(ctx.user, message.conversationId, {
        capability: ChatParticipantCapability.REMOVE_ANY_MESSAGE,
        staffPermission: ChatPermission.MESSAGE_MODERATE,
        reason,
      });
      path = access.path;
    } catch (error) {
      if (error instanceof NotFoundException) throw chatErrors.messageNotFound();
      throw error;
    }
    const deleted = await this.softDelete(ctx, messageId, { moderated: true, reason, path });
    return this.reader.getMessageItem(deleted, ctx.user.id);
  }

  /**
   * Soft delete. The visible row loses its content/metadata; the last content
   * is preserved in `chat_message_edits` (moderator-only) so deletion cannot
   * destroy evidence for an open report. Sequence history is untouched.
   */
  private async softDelete(
    ctx: ChatRequestContext,
    messageId: string,
    input: { moderated: boolean; reason: string | null; path: "participant" | "staff" },
  ): Promise<ChatMessage> {
    return this.dataSource.transaction(async (manager) => {
      const locked = await manager
        .getRepository(ChatMessage)
        .findOneOrFail({ where: { id: messageId }, lock: { mode: "pessimistic_write" } });
      if (locked.deletedAt) return locked;

      if (locked.content !== null) {
        await manager.getRepository(ChatMessageEdit).insert({
          messageId,
          editorUserId: ctx.user.id,
          previousContent: locked.content,
        });
      }
      const deletedAt = new Date();
      await manager
        .getRepository(ChatMessage)
        .update(
          { id: messageId },
          { deletedAt, deletedByUserId: ctx.user.id, content: null, metadata: null },
        );
      await this.refreshPreviewIfHead(manager, locked.conversationId, messageId, null);
      if (input.moderated) {
        const actor = await this.authz.loadActorScope(ctx.user, manager);
        await this.audit.record(manager, {
          action: ChatAuditAction.MESSAGE_REMOVED_BY_MODERATOR,
          actorUserId: actor.userId,
          actorRole: actor.role,
          conversationId: locked.conversationId,
          targetType: "message",
          targetId: messageId,
          reason: input.reason,
          requestId: ctx.requestId,
          metadata: { sequence: locked.sequence, path: input.path, senderId: locked.senderUserId },
        });
      }
      await this.events.append(
        manager,
        ctx,
        DomainEventType.CHAT_MESSAGE_DELETED,
        locked.conversationId,
        {
          messageId,
          sequence: locked.sequence,
          moderated: input.moderated,
        },
      );
      return Object.assign(locked, {
        deletedAt,
        deletedByUserId: ctx.user.id,
        content: null,
        metadata: null,
      });
    });
  }

  private async refreshPreviewIfHead(
    manager: EntityManager,
    conversationId: string,
    messageId: string,
    preview: string | null,
  ): Promise<void> {
    await manager
      .getRepository(ChatConversation)
      .update({ id: conversationId, lastMessageId: messageId }, { lastMessagePreview: preview });
  }
}
