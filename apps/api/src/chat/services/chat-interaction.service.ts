import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource, QueryFailedError } from "typeorm";
import {
  CHAT_MAX_PINS_PER_CONVERSATION,
  CHAT_MAX_REACTIONS_PER_USER_PER_MESSAGE,
  CHAT_REACTION_MAX_LENGTH,
  ChatAuditAction,
  ChatParticipantCapability,
  DomainEventType,
  type ChatMessageItem,
  type ChatPinItem,
  type ReportChatMessageRequest,
} from "@dhruto/contracts";
import {
  ChatConversation,
  ChatMessage,
  ChatMessageReaction,
  ChatPin,
  ChatReport,
} from "../../database/entities/index.js";
import { chatErrors } from "../chat.errors.js";
import { type ChatRequestContext } from "../chat.context.js";
import { ChatAuthorizationService } from "./chat-authorization.service.js";
import { ChatAuditService } from "./chat-audit.service.js";
import { ChatEventsService } from "./chat-events.service.js";
import { ChatMessageReaderService } from "./chat-message-reader.service.js";
import { ChatMessageService } from "./chat-message.service.js";

/** Emoji / short token: no whitespace, no angle brackets, no control characters. */
const REACTION_PATTERN = /^[^\s<>\p{Cc}]+$/u;

function isDuplicate(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) return false;
  const driverError = error.driverError as { code?: unknown } | undefined;
  return driverError?.code === "23505";
}

/**
 * Reactions, pins and reports. Phase 1 kept "message belongs to this
 * conversation" as a service-level invariant (no composite FK): every method
 * here loads the message and checks `message.conversationId` explicitly.
 */
@Injectable()
export class ChatInteractionService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly authz: ChatAuthorizationService,
    private readonly audit: ChatAuditService,
    private readonly events: ChatEventsService,
    private readonly reader: ChatMessageReaderService,
    private readonly messages: ChatMessageService,
  ) {}

  /* ---------------------------------------------------------------- */
  /* Reactions                                                         */
  /* ---------------------------------------------------------------- */

  async addReaction(
    ctx: ChatRequestContext,
    messageId: string,
    rawReaction: string,
  ): Promise<ChatMessageItem> {
    const reaction = this.normalizeReaction(rawReaction);
    const { message } = await this.messages.loadForMember(ctx, messageId, {
      capability: ChatParticipantCapability.REACT,
      requireWritable: true,
    });
    if (message.deletedAt) throw chatErrors.messageNotFound();

    await this.dataSource.transaction(async (manager) => {
      const mine = await manager
        .getRepository(ChatMessageReaction)
        .count({ where: { messageId, userId: ctx.user.id } });
      if (mine >= CHAT_MAX_REACTIONS_PER_USER_PER_MESSAGE) {
        throw chatErrors.limitExceeded(
          `At most ${CHAT_MAX_REACTIONS_PER_USER_PER_MESSAGE} reactions per message`,
        );
      }
      const inserted = await manager
        .createQueryBuilder()
        .insert()
        .into(ChatMessageReaction)
        .values({ messageId, userId: ctx.user.id, reaction })
        .orIgnore()
        .returning(["id"])
        .execute();
      // `raw` holds RETURNING rows: empty when ON CONFLICT DO NOTHING ignored it.
      if (Array.isArray(inserted.raw) && inserted.raw.length > 0) {
        await this.events.append(
          manager,
          ctx,
          DomainEventType.CHAT_MESSAGE_REACTED,
          message.conversationId,
          {
            messageId,
            userId: ctx.user.id,
            reaction,
            action: "added",
          },
        );
      }
    });
    return this.reader.getMessageItem(message, ctx.user.id);
  }

  async removeReaction(
    ctx: ChatRequestContext,
    messageId: string,
    rawReaction: string,
  ): Promise<ChatMessageItem> {
    const reaction = this.normalizeReaction(rawReaction);
    const { message } = await this.messages.loadForMember(ctx, messageId, {
      capability: ChatParticipantCapability.REACT,
      requireWritable: true,
    });
    await this.dataSource.transaction(async (manager) => {
      const result = await manager
        .getRepository(ChatMessageReaction)
        .delete({ messageId, userId: ctx.user.id, reaction });
      if (result.affected) {
        await this.events.append(
          manager,
          ctx,
          DomainEventType.CHAT_MESSAGE_REACTED,
          message.conversationId,
          {
            messageId,
            userId: ctx.user.id,
            reaction,
            action: "removed",
          },
        );
      }
    });
    return this.reader.getMessageItem(message, ctx.user.id);
  }

  private normalizeReaction(raw: string): string {
    const reaction = raw.trim();
    if (
      reaction.length === 0 ||
      reaction.length > CHAT_REACTION_MAX_LENGTH ||
      !REACTION_PATTERN.test(reaction)
    ) {
      throw chatErrors.limitExceeded("Invalid reaction");
    }
    return reaction;
  }

  /* ---------------------------------------------------------------- */
  /* Pins                                                              */
  /* ---------------------------------------------------------------- */

  async listPins(ctx: ChatRequestContext, conversationId: string): Promise<ChatPinItem[]> {
    await this.authz.requireMember(ctx.user, conversationId);
    const pins = await this.dataSource.getRepository(ChatPin).find({
      where: { conversationId },
      order: { createdAt: "DESC" },
      take: CHAT_MAX_PINS_PER_CONVERSATION,
    });
    return pins.map((p) => ({
      messageId: p.messageId,
      conversationId: p.conversationId,
      pinnedById: p.pinnedByUserId,
      pinnedAt: p.createdAt.toISOString(),
    }));
  }

  async pin(
    ctx: ChatRequestContext,
    conversationId: string,
    messageId: string,
  ): Promise<ChatPinItem[]> {
    const { actor } = await this.authz.requireMember(ctx.user, conversationId, {
      capability: ChatParticipantCapability.PIN_MESSAGE,
      requireWritable: true,
    });
    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(ChatConversation).findOneOrFail({
        where: { id: conversationId },
        lock: { mode: "pessimistic_write" },
      });
      const message = await manager
        .getRepository(ChatMessage)
        .findOne({
          where: { id: messageId, conversationId },
          select: ["id", "deletedAt", "sequence"],
        });
      if (!message || message.deletedAt) throw chatErrors.messageNotFound();
      const count = await manager.getRepository(ChatPin).count({ where: { conversationId } });
      if (count >= CHAT_MAX_PINS_PER_CONVERSATION) {
        throw chatErrors.limitExceeded(`At most ${CHAT_MAX_PINS_PER_CONVERSATION} pinned messages`);
      }
      const inserted = await manager
        .createQueryBuilder()
        .insert()
        .into(ChatPin)
        .values({ conversationId, messageId, pinnedByUserId: ctx.user.id })
        .orIgnore()
        .returning(["id"])
        .execute();
      if (!Array.isArray(inserted.raw) || inserted.raw.length === 0) return; // already pinned: idempotent
      await this.audit.record(manager, {
        action: ChatAuditAction.MESSAGE_PINNED,
        actorUserId: actor.userId,
        actorRole: actor.role,
        conversationId,
        targetType: "message",
        targetId: messageId,
        requestId: ctx.requestId,
        metadata: { sequence: message.sequence },
      });
    });
    return this.listPins(ctx, conversationId);
  }

  async unpin(
    ctx: ChatRequestContext,
    conversationId: string,
    messageId: string,
  ): Promise<ChatPinItem[]> {
    const { actor } = await this.authz.requireMember(ctx.user, conversationId, {
      capability: ChatParticipantCapability.PIN_MESSAGE,
      requireWritable: true,
    });
    await this.dataSource.transaction(async (manager) => {
      const result = await manager.getRepository(ChatPin).delete({ conversationId, messageId });
      if (!result.affected) throw chatErrors.messageNotFound();
      await this.audit.record(manager, {
        action: ChatAuditAction.MESSAGE_UNPINNED,
        actorUserId: actor.userId,
        actorRole: actor.role,
        conversationId,
        targetType: "message",
        targetId: messageId,
        requestId: ctx.requestId,
      });
    });
    return this.listPins(ctx, conversationId);
  }

  /* ---------------------------------------------------------------- */
  /* Reports                                                           */
  /* ---------------------------------------------------------------- */

  /**
   * Any active member may report another member's message (also in closed or
   * locked conversations). One report per user per message (unique index).
   */
  async report(
    ctx: ChatRequestContext,
    messageId: string,
    req: ReportChatMessageRequest,
  ): Promise<{ id: string; status: string }> {
    const { message } = await this.messages.loadForMember(ctx, messageId, {
      capability: ChatParticipantCapability.REPORT_MESSAGE,
    });
    if (message.senderUserId === ctx.user.id)
      throw chatErrors.forbidden("You cannot report your own message");
    try {
      const report = await this.dataSource.getRepository(ChatReport).save(
        this.dataSource.getRepository(ChatReport).create({
          conversationId: message.conversationId,
          messageId,
          reporterUserId: ctx.user.id,
          reason: req.reason,
          details: req.details ?? null,
        }),
      );
      return { id: report.id, status: report.status };
    } catch (error) {
      if (isDuplicate(error)) throw chatErrors.duplicateReport();
      throw error;
    }
  }
}
