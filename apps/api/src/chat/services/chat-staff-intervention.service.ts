import { Injectable } from "@nestjs/common";
import { type EntityManager } from "typeorm";
import { ChatAuditAction, ChatParticipantRole, DomainEventType } from "@dhruto/contracts";
import { type ChatRequestContext } from "../chat.context.js";
import { type ChatActorScope } from "../policies/chat-eligibility.policy.js";
import { ChatAuditService } from "./chat-audit.service.js";
import { ChatEventsService } from "./chat-events.service.js";
import { ChatMessageService } from "./chat-message.service.js";
import { ensureMembership, type MembershipOutcome } from "./chat-participant-writer.js";

/**
 * The single write path for a VISIBLE staff intervention: the staff member
 * becomes a MODERATOR participant, an `ADMIN_INTERVENTION` audit row stores
 * the mandatory reason (DB CHECK enforces it), and a SYSTEM_EVENT message
 * tells participants that staff joined.
 *
 * Used by `POST /chat/admin/conversations/:id/intervene` and (Phase 5) by
 * get-or-create when staff open an existing conversation they are not part
 * of — so there is no second, unaudited way for staff to gain history.
 * Callers must have checked the staff permission and hold the transaction.
 */
@Injectable()
export class ChatStaffInterventionService {
  constructor(
    private readonly audit: ChatAuditService,
    private readonly events: ChatEventsService,
    private readonly messages: ChatMessageService,
  ) {}

  async record(
    manager: EntityManager,
    ctx: ChatRequestContext,
    actor: ChatActorScope,
    conversationId: string,
    reason: string,
    metadata: Record<string, string | boolean> = {},
  ): Promise<MembershipOutcome> {
    const outcome = await ensureMembership(
      manager,
      conversationId,
      { userId: actor.userId, role: ChatParticipantRole.MODERATOR },
      { allowRemoved: true },
    );
    await this.audit.record(manager, {
      action: ChatAuditAction.ADMIN_INTERVENTION,
      actorUserId: actor.userId,
      actorRole: actor.role,
      conversationId,
      targetType: "conversation",
      targetId: conversationId,
      reason,
      requestId: ctx.requestId,
      metadata: { membership: outcome, ...metadata },
    });
    if (outcome === "unchanged") return outcome;
    await this.events.append(manager, ctx, DomainEventType.CHAT_PARTICIPANT_ADDED, conversationId, {
      userId: actor.userId,
      role: ChatParticipantRole.MODERATOR,
    });
    await this.messages.appendSystemMessage(manager, ctx, conversationId, {
      eventKey: "chat.staff_joined",
      params: { role: actor.role },
    });
    return outcome;
  }
}
