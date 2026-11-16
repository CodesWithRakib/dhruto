import { Injectable } from "@nestjs/common";
import { type EntityManager } from "typeorm";
import {
  ChatAuditAction,
  ChatParticipantRole,
  ChatParticipantStatus,
  DomainEventType,
} from "@dhruto/contracts";
import {
  ChatAuditLog,
  ChatConversation,
  ChatParticipant,
  Rider,
} from "../../database/entities/index.js";
import {
  isEligibleParticipant,
  type ChatConversationScope,
  type ChatParcelScope,
} from "../policies/chat-eligibility.policy.js";
import { ChatAuthorizationService } from "./chat-authorization.service.js";
import { ChatAuditService } from "./chat-audit.service.js";
import { ChatEventsService } from "./chat-events.service.js";

/** What caused a reconciliation (stored in audit metadata; never user content). */
export interface MembershipSyncSource {
  /** `parcel_event` = committed logistics domain event; `access` = thread opened. */
  workflow: "parcel_event" | "access";
  sourceEventId: string | null;
  sourceEventType: string | null;
  requestId: string | null;
}

export interface MembershipSyncResult {
  removedUserIds: string[];
  addedUserIds: string[];
}

/** True when `userId`'s latest removal from the conversation was a workflow removal. */
export async function latestRemovalWasWorkflow(
  manager: EntityManager,
  conversationId: string,
  userId: string,
): Promise<boolean> {
  const latest = await manager.getRepository(ChatAuditLog).findOne({
    where: {
      conversationId,
      action: ChatAuditAction.PARTICIPANT_REMOVED,
      targetType: "participant",
      targetId: userId,
    },
    order: { createdAt: "DESC" },
    select: ["id", "actorUserId", "metadata"],
  });
  return (
    latest !== null && latest.actorUserId === null && typeof latest.metadata?.workflow === "string"
  );
}

/**
 * Keeps parcel-thread membership rows consistent with live eligibility
 * (Phase 2 finding: reassigned riders kept an ACTIVE row while access was
 * already denied live).
 *
 *  - ACTIVE members whose (ACTIVE) account is no longer eligible — previous
 *    rider, hub manager of a hub the parcel left, customer after a recipient
 *    phone change — are set REMOVED by the workflow, audited with no actor
 *    and `metadata.workflow`, and a `chat.participant_removed.v1` event lets
 *    the realtime layer revoke their sockets immediately.
 *  - The parcel's CURRENT rider is added (or re-admitted when their last
 *    removal was a workflow removal). A moderator removal is never
 *    overridden, and a voluntary LEFT is respected.
 *  - Accounts that are not ACTIVE are skipped: their access is already denied
 *    live and suspension is not a membership change.
 *
 * Idempotent and state-based (reads current parcel facts), so out-of-order or
 * repeated events converge to the same result. Messages are never touched:
 * history and authorship are preserved. Caller holds the transaction and the
 * conversation row lock.
 */
@Injectable()
export class ChatParcelMembershipService {
  constructor(
    private readonly authz: ChatAuthorizationService,
    private readonly audit: ChatAuditService,
    private readonly events: ChatEventsService,
  ) {}

  async reconcile(
    manager: EntityManager,
    conversation: ChatConversation,
    parcel: ChatParcelScope,
    source: MembershipSyncSource,
  ): Promise<MembershipSyncResult> {
    const scope: ChatConversationScope = {
      type: conversation.type,
      parcelId: conversation.parcelId,
      hubId: conversation.hubId,
      merchantId: conversation.merchantId,
      createdByUserId: conversation.createdByUserId,
    };
    const result: MembershipSyncResult = { removedUserIds: [], addedUserIds: [] };
    const metadata = {
      workflow: source.workflow,
      sourceEventId: source.sourceEventId,
      sourceEventType: source.sourceEventType,
    };

    const active = await manager.getRepository(ChatParticipant).find({
      where: { conversationId: conversation.id, status: ChatParticipantStatus.ACTIVE },
      select: ["id", "userId", "role"],
    });
    const scopes = await this.authz.loadScopesForUsers(
      active.map((p) => p.userId),
      manager,
    );

    for (const participant of active) {
      const actor = scopes.get(participant.userId);
      if (!actor || isEligibleParticipant(actor, scope, parcel)) continue;
      const updated = await manager
        .getRepository(ChatParticipant)
        .update(
          { id: participant.id, status: ChatParticipantStatus.ACTIVE },
          { status: ChatParticipantStatus.REMOVED, leftAt: new Date() },
        );
      if (!updated.affected) continue;
      await this.audit.record(manager, {
        action: ChatAuditAction.PARTICIPANT_REMOVED,
        actorUserId: null,
        actorRole: null,
        conversationId: conversation.id,
        targetType: "participant",
        targetId: participant.userId,
        requestId: source.requestId,
        metadata: { ...metadata, reason: "ineligible", status: ChatParticipantStatus.REMOVED },
      });
      await this.events.appendWorkflow(
        manager,
        source.requestId,
        DomainEventType.CHAT_PARTICIPANT_REMOVED,
        conversation.id,
        {
          userId: participant.userId,
          role: participant.role,
          status: ChatParticipantStatus.REMOVED,
        },
      );
      result.removedUserIds.push(participant.userId);
    }

    const riderUserId = await this.currentRiderUserId(manager, parcel);
    if (
      riderUserId &&
      (await this.admitRider(manager, conversation, scope, parcel, riderUserId, source))
    ) {
      result.addedUserIds.push(riderUserId);
    }
    return result;
  }

  private async currentRiderUserId(
    manager: EntityManager,
    parcel: ChatParcelScope,
  ): Promise<string | null> {
    if (!parcel.currentRiderId) return null;
    const rider = await manager
      .getRepository(Rider)
      .findOne({ where: { id: parcel.currentRiderId }, select: ["id", "userId"] });
    return rider?.userId ?? null;
  }

  /** Adds / re-admits the current rider when eligible. Returns true when membership changed. */
  private async admitRider(
    manager: EntityManager,
    conversation: ChatConversation,
    scope: ChatConversationScope,
    parcel: ChatParcelScope,
    userId: string,
    source: MembershipSyncSource,
  ): Promise<boolean> {
    const actor = (await this.authz.loadScopesForUsers([userId], manager)).get(userId);
    if (!actor || !isEligibleParticipant(actor, scope, parcel)) return false;

    const repo = manager.getRepository(ChatParticipant);
    const existing = await repo.findOne({
      where: { conversationId: conversation.id, userId },
      lock: { mode: "pessimistic_write" },
    });
    let outcome: "inserted" | "reactivated";
    if (!existing) {
      await manager
        .createQueryBuilder()
        .insert()
        .into(ChatParticipant)
        .values({ conversationId: conversation.id, userId, role: ChatParticipantRole.MEMBER })
        .orIgnore()
        .execute();
      outcome = "inserted";
    } else if (
      existing.status === ChatParticipantStatus.REMOVED &&
      (await latestRemovalWasWorkflow(manager, conversation.id, userId))
    ) {
      await repo.update(
        { id: existing.id },
        { status: ChatParticipantStatus.ACTIVE, leftAt: null, role: ChatParticipantRole.MEMBER },
      );
      outcome = "reactivated";
    } else {
      // ACTIVE already, LEFT voluntarily, or removed by a moderator: unchanged.
      return false;
    }

    await this.audit.record(manager, {
      action: ChatAuditAction.PARTICIPANT_ADDED,
      actorUserId: null,
      actorRole: null,
      conversationId: conversation.id,
      targetType: "participant",
      targetId: userId,
      requestId: source.requestId,
      metadata: {
        workflow: source.workflow,
        sourceEventId: source.sourceEventId,
        sourceEventType: source.sourceEventType,
        outcome,
      },
    });
    await this.events.appendWorkflow(
      manager,
      source.requestId,
      DomainEventType.CHAT_PARTICIPANT_ADDED,
      conversation.id,
      { userId, role: ChatParticipantRole.MEMBER },
    );
    return true;
  }
}
