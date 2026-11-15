import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import {
  CHAT_GROUP_MAX_PARTICIPANTS,
  ChatAuditAction,
  ChatConversationType,
  ChatParticipantCapability,
  ChatParticipantRole,
  ChatParticipantStatus,
  ChatPermission,
  DomainEventType,
  type AddChatParticipantRequest,
  type ChatParticipantItem,
} from "@dhruto/contracts";
import { ChatConversation, ChatParticipant, type UserRole } from "../../database/entities/index.js";
import { chatErrors } from "../chat.errors.js";
import { type ChatRequestContext } from "../chat.context.js";
import { ChatAuthorizationService } from "./chat-authorization.service.js";
import { ChatAuditService } from "./chat-audit.service.js";
import { ChatEventsService } from "./chat-events.service.js";
import { ChatMessageReaderService } from "./chat-message-reader.service.js";
import { ensureMembership } from "./chat-participant-writer.js";

/**
 * Membership management.
 *
 * Add: participant OWNER/MODERATOR (MANAGE_PARTICIPANTS) or staff with
 * PARTICIPANT_MANAGE (+ reason). Only an OWNER (or staff) may grant
 * MODERATOR; nobody may grant OWNER. DIRECT conversations never grow.
 *
 * Remove: anyone may leave (LEFT). Removing someone else (REMOVED) needs
 * MANAGE_PARTICIPANTS; OWNERs cannot be removed by participants, and only an
 * OWNER may remove a MODERATOR. Every change is audited (membership history,
 * ADR-010) and emitted to the outbox.
 */
@Injectable()
export class ChatParticipantService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly authz: ChatAuthorizationService,
    private readonly audit: ChatAuditService,
    private readonly events: ChatEventsService,
    private readonly reader: ChatMessageReaderService,
  ) {}

  async list(ctx: ChatRequestContext, conversationId: string): Promise<ChatParticipantItem[]> {
    await this.authz.requireMember(ctx.user, conversationId);
    return this.reader.activeParticipants(conversationId);
  }

  async add(
    ctx: ChatRequestContext,
    conversationId: string,
    req: AddChatParticipantRequest,
  ): Promise<ChatParticipantItem[]> {
    const access = await this.authz.resolveAccess(ctx.user, conversationId, {
      capability: ChatParticipantCapability.MANAGE_PARTICIPANTS,
      staffPermission: ChatPermission.PARTICIPANT_MANAGE,
      reason: req.reason,
      requireWritable: true,
    });
    const { conversation, actor, parcel } = access;
    if (conversation.type === ChatConversationType.DIRECT) {
      throw chatErrors.scopeInvalid("Direct conversations cannot have additional participants");
    }
    if (
      req.role === ChatParticipantRole.MODERATOR &&
      access.path === "participant" &&
      access.participant?.role !== ChatParticipantRole.OWNER
    ) {
      throw chatErrors.forbidden("Only the conversation owner can grant the moderator role");
    }
    await this.authz.assertCanBeAdded(actor, conversation, parcel, [req.userId]);

    await this.dataSource.transaction(async (manager) => {
      // Serialize membership changes per conversation (limit check below).
      await manager.getRepository(ChatConversation).findOneOrFail({
        where: { id: conversationId },
        lock: { mode: "pessimistic_write" },
      });
      const activeCount = await manager
        .getRepository(ChatParticipant)
        .count({ where: { conversationId, status: ChatParticipantStatus.ACTIVE } });
      if (activeCount >= CHAT_GROUP_MAX_PARTICIPANTS) {
        throw chatErrors.participantLimit(CHAT_GROUP_MAX_PARTICIPANTS);
      }
      const outcome = await ensureMembership(
        manager,
        conversationId,
        { userId: req.userId, role: req.role },
        { allowRemoved: true },
      );
      if (outcome === "unchanged") return;
      await this.audit.record(manager, {
        action: ChatAuditAction.PARTICIPANT_ADDED,
        actorUserId: actor.userId,
        actorRole: actor.role,
        conversationId,
        targetType: "participant",
        targetId: req.userId,
        reason: access.path === "staff" ? (req.reason ?? null) : null,
        requestId: ctx.requestId,
        metadata: { role: req.role, outcome, path: access.path },
      });
      await this.events.append(
        manager,
        ctx,
        DomainEventType.CHAT_PARTICIPANT_ADDED,
        conversationId,
        {
          userId: req.userId,
          role: req.role,
        },
      );
    });
    return this.reader.activeParticipants(conversationId);
  }

  async remove(
    ctx: ChatRequestContext,
    conversationId: string,
    targetUserId: string,
    reason: string | undefined,
  ): Promise<{ userId: string; status: ChatParticipantStatus }> {
    const isSelf = targetUserId === ctx.user.id;
    if (isSelf) {
      const { actor } = await this.authz.requireMember(ctx.user, conversationId);
      return this.applyRemoval(ctx, conversationId, targetUserId, {
        status: ChatParticipantStatus.LEFT,
        actorUserId: actor.userId,
        actorRole: actor.role,
        reason: null,
        path: "participant",
      });
    }

    const access = await this.authz.resolveAccess(ctx.user, conversationId, {
      capability: ChatParticipantCapability.MANAGE_PARTICIPANTS,
      staffPermission: ChatPermission.PARTICIPANT_MANAGE,
      reason,
    });
    if (access.conversation.type === ChatConversationType.DIRECT && access.path === "participant") {
      throw chatErrors.forbidden("Direct conversation members can only leave themselves");
    }
    const target = await this.dataSource
      .getRepository(ChatParticipant)
      .findOne({ where: { conversationId, userId: targetUserId } });
    if (!target || target.status !== ChatParticipantStatus.ACTIVE)
      throw chatErrors.participantNotFound();
    if (access.path === "participant") {
      const myRole = access.participant?.role;
      if (target.role === ChatParticipantRole.OWNER) {
        throw chatErrors.forbidden("The conversation owner cannot be removed");
      }
      if (target.role === ChatParticipantRole.MODERATOR && myRole !== ChatParticipantRole.OWNER) {
        throw chatErrors.forbidden("Only the owner can remove a moderator");
      }
    }
    return this.applyRemoval(ctx, conversationId, targetUserId, {
      status: ChatParticipantStatus.REMOVED,
      actorUserId: access.actor.userId,
      actorRole: access.actor.role,
      reason: reason ?? null,
      path: access.path,
    });
  }

  private async applyRemoval(
    ctx: ChatRequestContext,
    conversationId: string,
    targetUserId: string,
    input: {
      status: ChatParticipantStatus.LEFT | ChatParticipantStatus.REMOVED;
      actorUserId: string;
      actorRole: UserRole;
      reason: string | null;
      path: "participant" | "staff";
    },
  ): Promise<{ userId: string; status: ChatParticipantStatus }> {
    await this.dataSource.transaction(async (manager) => {
      const result = await manager
        .getRepository(ChatParticipant)
        .update(
          { conversationId, userId: targetUserId, status: ChatParticipantStatus.ACTIVE },
          { status: input.status, leftAt: new Date() },
        );
      if (!result.affected) throw chatErrors.participantNotFound();
      await this.audit.record(manager, {
        action: ChatAuditAction.PARTICIPANT_REMOVED,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        conversationId,
        targetType: "participant",
        targetId: targetUserId,
        reason: input.reason,
        requestId: ctx.requestId,
        metadata: {
          status: input.status,
          path: input.path,
          self: input.status === ChatParticipantStatus.LEFT,
        },
      });
      await this.events.append(
        manager,
        ctx,
        DomainEventType.CHAT_PARTICIPANT_REMOVED,
        conversationId,
        {
          userId: targetUserId,
          status: input.status,
        },
      );
    });
    return { userId: targetUserId, status: input.status };
  }
}
