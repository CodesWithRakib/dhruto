import { Injectable, Logger, Optional } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import {
  ChatAuditAction,
  ChatConversationType,
  ChatEscalationStatus,
  ChatPermission,
  NotificationChannel,
  NotificationType,
  canTransitionEscalation,
  escalationNoteRequired,
  type ChatEscalationDetail,
  type ChatEscalationHistoryItem,
  type ChatEscalationState,
  type UpdateChatEscalationRequest,
} from "@dhruto/contracts";
import { ChatConversation, User, UserRole, UserStatus } from "../../database/entities/index.js";
import { NotificationsService } from "../../notifications/notifications.service.js";
import { chatErrors } from "../chat.errors.js";
import { type ChatRequestContext } from "../chat.context.js";
import { actorHoldsChatPermission } from "../policies/chat-eligibility.policy.js";
import { ChatAuditService } from "./chat-audit.service.js";
import { ChatAuthorizationService } from "./chat-authorization.service.js";

const HISTORY_LIMIT = 100;

interface HistoryRow {
  id: string;
  createdAt: Date;
  actor_user_id: string | null;
  actor_name: string | null;
  reason: string | null;
  metadata: Record<string, unknown> | null;
}

/**
 * Phase 7 escalation workflow (policy: `PHASE-7-ESCALATION-POLICY.md`).
 *
 * The current state lives on `chat_conversations.escalation_*`; the history
 * is the append-only audit log (`ESCALATION_CHANGED`), written in the same
 * transaction under a row lock, so state and history cannot diverge.
 * Escalation never changes the conversation lifecycle status, membership or
 * any parcel. Participants never see escalation state (no outbox event).
 */
@Injectable()
export class ChatEscalationService {
  private readonly logger = new Logger(ChatEscalationService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly authz: ChatAuthorizationService,
    private readonly audit: ChatAuditService,
    @Optional() private readonly notifications?: NotificationsService,
  ) {}

  private permissionsFor(conversation: ChatConversation, base: ChatPermission): ChatPermission[] {
    return conversation.type === ChatConversationType.INTERNAL_SUPERVISOR
      ? [base, ChatPermission.CONVERSATION_VIEW_RESTRICTED]
      : [base];
  }

  private async requireAccess(
    ctx: ChatRequestContext,
    conversationId: string,
    base: ChatPermission,
  ) {
    const conversation = await this.dataSource
      .getRepository(ChatConversation)
      .findOne({ where: { id: conversationId } });
    if (!conversation) throw chatErrors.conversationNotFound();
    const access = await this.authz.requireStaff(
      ctx.user,
      conversationId,
      this.permissionsFor(conversation, base),
    );
    // Escalations are platform operations (ADMIN only, never hub-scoped).
    if (access.actor.role !== UserRole.ADMIN) throw chatErrors.conversationNotFound();
    return access;
  }

  async get(ctx: ChatRequestContext, conversationId: string): Promise<ChatEscalationDetail> {
    const { conversation } = await this.requireAccess(
      ctx,
      conversationId,
      ChatPermission.CONVERSATION_VIEW_ANY,
    );
    const [assignee, rows] = await Promise.all([
      conversation.escalationAssigneeUserId
        ? this.dataSource.getRepository(User).findOne({
            where: { id: conversation.escalationAssigneeUserId },
            select: ["id", "name"],
          })
        : Promise.resolve(null),
      this.dataSource.query(
        `SELECT a."id", a."createdAt", a."actor_user_id", u."name" AS "actor_name", a."reason", a."metadata"
           FROM "chat_audit_logs" a
           LEFT JOIN "users" u ON u."id" = a."actor_user_id"
          WHERE a."conversation_id" = $1 AND a."action" = 'ESCALATION_CHANGED'
          ORDER BY a."createdAt" DESC, a."id" DESC
          LIMIT ${HISTORY_LIMIT}`,
        [conversationId],
      ) as Promise<HistoryRow[]>,
    ]);
    return {
      current: toState(conversation, assignee?.name ?? null),
      history: rows.map(toHistoryItem),
    };
  }

  async update(
    ctx: ChatRequestContext,
    conversationId: string,
    req: UpdateChatEscalationRequest,
  ): Promise<ChatEscalationDetail> {
    const { actor } = await this.requireAccess(
      ctx,
      conversationId,
      ChatPermission.ESCALATION_MANAGE,
    );
    if (req.assigneeUserId) await this.assertAssignable(req.assigneeUserId);

    const outcome = await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(ChatConversation);
      const conversation = await repo.findOne({
        where: { id: conversationId },
        lock: { mode: "pessimistic_write" },
      });
      if (!conversation) throw chatErrors.conversationNotFound();

      const from = conversation.escalationStatus;
      const previousAssignee = conversation.escalationAssigneeUserId;
      const nextAssignee = req.assigneeUserId === undefined ? previousAssignee : req.assigneeUserId;
      const statusChanged = from !== req.status;
      const assigneeChanged = nextAssignee !== previousAssignee;
      const noteChanged = req.note !== undefined && req.note !== conversation.escalationNote;

      // Idempotent retry: the requested state is already recorded.
      if (!statusChanged && !assigneeChanged && !noteChanged) {
        return { changed: false as const };
      }
      if (statusChanged && !canTransitionEscalation(from, req.status)) {
        throw chatErrors.escalationInvalid(
          `Cannot change escalation from ${from ?? "NONE"} to ${req.status}`,
        );
      }
      if (!statusChanged && from === null) {
        throw chatErrors.escalationInvalid("The conversation is not escalated");
      }
      if (statusChanged && escalationNoteRequired(req.status) && !req.note) {
        throw chatErrors.reasonRequired();
      }

      const now = new Date();
      conversation.escalationStatus = req.status;
      conversation.escalationNote = req.note ?? conversation.escalationNote;
      conversation.escalationAssigneeUserId = nextAssignee;
      conversation.escalationUpdatedAt = now;
      conversation.escalationUpdatedByUserId = actor.userId;
      // Partial update: never touch lifecycle/sequence columns from here.
      await repo.update(
        { id: conversationId },
        {
          escalationStatus: conversation.escalationStatus,
          escalationNote: conversation.escalationNote,
          escalationAssigneeUserId: conversation.escalationAssigneeUserId,
          escalationUpdatedAt: now,
          escalationUpdatedByUserId: actor.userId,
        },
      );
      await this.audit.record(manager, {
        action: ChatAuditAction.ESCALATION_CHANGED,
        actorUserId: actor.userId,
        actorRole: actor.role,
        conversationId,
        targetType: "conversation",
        targetId: conversationId,
        reason: req.note ?? null,
        requestId: ctx.requestId,
        metadata: {
          from,
          to: req.status,
          assigneeUserId: nextAssignee,
          previousAssigneeUserId: previousAssignee,
        },
      });
      return { changed: true as const, assigneeChanged, nextAssignee };
    });

    if (
      outcome.changed &&
      outcome.assigneeChanged &&
      outcome.nextAssignee &&
      outcome.nextAssignee !== actor.userId
    ) {
      await this.notifyAssignee(outcome.nextAssignee, conversationId, req.status);
    }
    return this.get(ctx, conversationId);
  }

  /** Assignees must be ACTIVE admins who can manage escalations. */
  private async assertAssignable(userId: string): Promise<void> {
    const user = await this.dataSource
      .getRepository(User)
      .findOne({ where: { id: userId }, select: ["id", "role", "status"] });
    if (!user || user.status !== UserStatus.ACTIVE || user.role !== UserRole.ADMIN) {
      throw chatErrors.escalationInvalid("The assignee must be an active admin");
    }
    const scope = await this.authz.loadActorScopeById(user.id).catch(() => null);
    if (!scope || !actorHoldsChatPermission(scope, ChatPermission.ESCALATION_MANAGE)) {
      throw chatErrors.escalationInvalid("The assignee cannot manage escalations");
    }
  }

  /**
   * One in-app notification to the new assignee (never per message, never to
   * participants). Best effort after commit: a notification failure must not
   * undo an audited escalation change. Contains no conversation content.
   */
  private async notifyAssignee(
    userId: string,
    conversationId: string,
    status: ChatEscalationStatus,
  ): Promise<void> {
    if (!this.notifications) return;
    try {
      await this.notifications.createNotification({
        userId,
        channel: NotificationChannel.IN_APP,
        type: NotificationType.SYSTEM,
        title: "Conversation escalation assigned",
        message: "A conversation escalation was assigned to you in the Communication Center.",
        metadata: { kind: "chat_escalation_assigned", conversationId, status },
      });
    } catch (error) {
      this.logger.warn(
        `chat.escalation.notify_failed conversation=${conversationId} error=${error instanceof Error ? error.name : "unknown"}`,
      );
    }
  }
}

function toState(conversation: ChatConversation, assigneeName: string | null): ChatEscalationState {
  return {
    conversationId: conversation.id,
    status: conversation.escalationStatus,
    note: conversation.escalationNote,
    assigneeUserId: conversation.escalationAssigneeUserId,
    assigneeName,
    updatedAt: conversation.escalationUpdatedAt?.toISOString() ?? null,
    updatedByUserId: conversation.escalationUpdatedByUserId,
  };
}

function asEscalation(value: unknown): ChatEscalationStatus | null {
  return Object.values(ChatEscalationStatus).find((status) => status === value) ?? null;
}

function toHistoryItem(row: HistoryRow): ChatEscalationHistoryItem {
  const meta = row.metadata ?? {};
  const assignee = meta.assigneeUserId;
  return {
    id: row.id,
    createdAt: new Date(row.createdAt).toISOString(),
    actorUserId: row.actor_user_id,
    actorName: row.actor_name,
    from: asEscalation(meta.from),
    to: asEscalation(meta.to),
    assigneeUserId: typeof assignee === "string" ? assignee : null,
    note: row.reason,
  };
}
