import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource, IsNull, type EntityManager } from "typeorm";
import {
  ChatAuditAction,
  ChatConversationType,
  ChatParticipantRole,
  ChatPermission,
  ChatReportStatus,
  DomainEventType,
  type AdminChatAuditQuery,
  type AdminChatExportQuery,
  type AdminChatMessagesQuery,
  type AdminListChatConversationsQuery,
  type AdminListChatReportsQuery,
  type ChatAdminConversationDetail,
  type ChatAdminConversationItem,
  type ChatAdminConversationPage,
  type ChatAuditLogPage,
  type ChatConversationDetail,
  type ChatInternalNoteItem,
  type ChatMessagePage,
  type ChatReportItem,
  type ChatReportPage,
  type ReviewChatReportRequest,
} from "@dhruto/contracts";
import {
  ChatAuditLog,
  ChatConversation,
  ChatInternalNote,
  ChatReport,
  UserRole,
} from "../../database/entities/index.js";
import { roleHasChatPermission } from "../../common/permissions/chat-permissions.js";
import { chatErrors } from "../chat.errors.js";
import { type ChatRequestContext } from "../chat.context.js";
import { type ChatActorScope } from "../policies/chat-eligibility.policy.js";
import { ChatAuthorizationService } from "./chat-authorization.service.js";
import { ChatAuditService } from "./chat-audit.service.js";
import { ChatEventsService } from "./chat-events.service.js";
import { ChatMessageReaderService } from "./chat-message-reader.service.js";
import { ChatMessageService } from "./chat-message.service.js";
import { ChatConversationService } from "./chat-conversation.service.js";
import { ensureMembership } from "./chat-participant-writer.js";

interface KeysetCursor {
  t: string;
  id: string;
}

interface AdminConversationRow {
  id: string;
  type: ChatConversationType;
  title: string | null;
  status: ChatAdminConversationItem["status"];
  parcel_id: string | null;
  hub_id: string | null;
  merchant_id: string | null;
  last_message_sequence: string;
  last_message_at: Date | null;
  created_at: Date;
  created_at_key: string;
  active_participants: number;
}

/**
 * Staff (`/chat/admin/*`) operations. ADMIN is never implicit: every method
 * checks a specific ChatPermission (role ceiling + hub scope for hub
 * managers), every content read requires a reason, and every privileged read
 * or action writes `chat_audit_logs` inside the same transaction as the read
 * snapshot or the change.
 */
@Injectable()
export class ChatAdminService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly authz: ChatAuthorizationService,
    private readonly audit: ChatAuditService,
    private readonly events: ChatEventsService,
    private readonly reader: ChatMessageReaderService,
    private readonly messages: ChatMessageService,
    private readonly conversations: ChatConversationService,
  ) {}

  /** Global (non-conversation) permission check; 403 because no resource id is probed. */
  private async requirePlatformPermission(
    ctx: ChatRequestContext,
    permission: ChatPermission,
  ): Promise<ChatActorScope> {
    const actor = await this.authz.loadActorScope(ctx.user);
    if (!roleHasChatPermission(actor.role, permission) || actor.role !== UserRole.ADMIN) {
      throw chatErrors.permissionDenied(`Missing chat permission ${permission}`);
    }
    return actor;
  }

  /** Permissions needed to read a conversation via the staff path. */
  private viewPermissions(conversation: ChatConversation, base: ChatPermission): ChatPermission[] {
    return conversation.type === ChatConversationType.INTERNAL_SUPERVISOR
      ? [base, ChatPermission.CONVERSATION_VIEW_RESTRICTED]
      : [base];
  }

  private async requireStaffView(
    ctx: ChatRequestContext,
    conversationId: string,
    base: ChatPermission,
  ) {
    const conversation = await this.dataSource
      .getRepository(ChatConversation)
      .findOne({ where: { id: conversationId } });
    if (!conversation) throw chatErrors.conversationNotFound();
    return this.authz.requireStaff(
      ctx.user,
      conversationId,
      this.viewPermissions(conversation, base),
    );
  }

  private async auditRead(
    manager: EntityManager,
    ctx: ChatRequestContext,
    actor: ChatActorScope,
    action: ChatAuditAction,
    conversationId: string | null,
    reason: string | null,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.audit.record(manager, {
      action,
      actorUserId: actor.userId,
      actorRole: actor.role,
      conversationId,
      targetType: conversationId ? "conversation" : null,
      targetId: conversationId,
      reason,
      requestId: ctx.requestId,
      metadata,
    });
  }

  /* ---------------------------------------------------------------- */
  /* Conversations                                                     */
  /* ---------------------------------------------------------------- */

  async listConversations(
    ctx: ChatRequestContext,
    query: AdminListChatConversationsQuery,
  ): Promise<ChatAdminConversationPage> {
    const actor = await this.requirePlatformPermission(ctx, ChatPermission.CONVERSATION_VIEW_ANY);
    const cursor = query.cursor ? decodeCursor(query.cursor) : null;
    const params: unknown[] = [];
    const where: string[] = [];
    const add = (sql: string, value: unknown) => {
      params.push(value);
      where.push(sql.replace("?", `$${params.length}`));
    };
    if (query.type) add(`c."type" = ?`, query.type);
    if (query.status) add(`c."status" = ?`, query.status);
    if (query.merchantId) add(`c."merchant_id" = ?`, query.merchantId);
    if (query.hubId) add(`c."hub_id" = ?`, query.hubId);
    if (query.parcelId) add(`c."parcel_id" = ?`, query.parcelId);
    if (!roleHasChatPermission(actor.role, ChatPermission.CONVERSATION_VIEW_RESTRICTED)) {
      where.push(`c."type" <> 'INTERNAL_SUPERVISOR'`);
    }
    if (cursor) {
      params.push(cursor.t, cursor.id);
      where.push(
        `(c."createdAt", c."id") < ($${params.length - 1}::timestamptz, $${params.length}::uuid)`,
      );
    }
    params.push(query.limit + 1);

    return this.dataSource.transaction(async (manager) => {
      const rows: AdminConversationRow[] = await manager.query(
        `SELECT c."id", c."type", c."title", c."status", c."parcel_id", c."hub_id", c."merchant_id",
                c."last_message_sequence"::text AS "last_message_sequence", c."last_message_at",
                c."createdAt" AS "created_at", c."createdAt"::text AS "created_at_key",
                (SELECT count(*)::int FROM "chat_participants" p
                  WHERE p."conversation_id" = c."id" AND p."status" = 'ACTIVE') AS "active_participants"
           FROM "chat_conversations" c
          ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
          ORDER BY c."createdAt" DESC, c."id" DESC
          LIMIT $${params.length}`,
        params,
      );
      const hasMore = rows.length > query.limit;
      const page = rows.slice(0, query.limit);
      await this.auditRead(
        manager,
        ctx,
        actor,
        ChatAuditAction.ADMIN_CONVERSATIONS_LISTED,
        null,
        null,
        {
          filters: {
            type: query.type ?? null,
            status: query.status ?? null,
            merchantId: query.merchantId ?? null,
            hubId: query.hubId ?? null,
            parcelId: query.parcelId ?? null,
          },
          count: page.length,
        },
      );
      const last = page[page.length - 1];
      return {
        items: page.map(toAdminItem),
        hasMore,
        nextCursor: hasMore && last ? encodeCursor({ t: last.created_at_key, id: last.id }) : null,
      };
    });
  }

  async viewConversation(
    ctx: ChatRequestContext,
    conversationId: string,
    reason: string,
  ): Promise<ChatAdminConversationDetail> {
    const { actor, conversation } = await this.requireStaffView(
      ctx,
      conversationId,
      ChatPermission.CONVERSATION_VIEW_ANY,
    );
    return this.dataSource.transaction(async (manager) => {
      await this.auditRead(
        manager,
        ctx,
        actor,
        ChatAuditAction.ADMIN_CONVERSATION_VIEWED,
        conversationId,
        reason,
        {
          scope: "detail",
        },
      );
      const participants = await this.reader.activeParticipants(conversationId, manager);
      return {
        ...toAdminItem({
          id: conversation.id,
          type: conversation.type,
          title: conversation.title,
          status: conversation.status,
          parcel_id: conversation.parcelId,
          hub_id: conversation.hubId,
          merchant_id: conversation.merchantId,
          last_message_sequence: conversation.lastMessageSequence,
          last_message_at: conversation.lastMessageAt,
          created_at: conversation.createdAt,
          created_at_key: conversation.createdAt.toISOString(),
          active_participants: participants.length,
        }),
        archivedAt: conversation.archivedAt?.toISOString() ?? null,
        closedAt: conversation.closedAt?.toISOString() ?? null,
        lockedAt: conversation.lockedAt?.toISOString() ?? null,
        participants,
      };
    });
  }

  async viewMessages(
    ctx: ChatRequestContext,
    conversationId: string,
    query: AdminChatMessagesQuery,
  ): Promise<ChatMessagePage> {
    const { actor } = await this.requireStaffView(
      ctx,
      conversationId,
      ChatPermission.CONVERSATION_VIEW_ANY,
    );
    return this.dataSource.transaction(async (manager) => {
      const page = await this.reader.history(conversationId, null, query, manager);
      await this.auditRead(
        manager,
        ctx,
        actor,
        ChatAuditAction.ADMIN_CONVERSATION_VIEWED,
        conversationId,
        query.reason,
        {
          scope: "messages",
          beforeSequence: query.beforeSequence ?? null,
          afterSequence: query.afterSequence ?? null,
          count: page.items.length,
        },
      );
      return page;
    });
  }

  async exportMessages(
    ctx: ChatRequestContext,
    conversationId: string,
    query: AdminChatExportQuery,
  ): Promise<ChatMessagePage> {
    const { actor } = await this.requireStaffView(
      ctx,
      conversationId,
      ChatPermission.CONVERSATION_EXPORT,
    );
    return this.dataSource.transaction(async (manager) => {
      const page = await this.reader.history(
        conversationId,
        null,
        { afterSequence: query.afterSequence ?? "0", limit: query.limit },
        manager,
      );
      await this.auditRead(
        manager,
        ctx,
        actor,
        ChatAuditAction.ADMIN_CONVERSATION_EXPORTED,
        conversationId,
        query.reason,
        {
          afterSequence: query.afterSequence ?? "0",
          count: page.items.length,
        },
      );
      return page;
    });
  }

  /**
   * Visible intervention: the staff member becomes a MODERATOR participant and
   * a SYSTEM_EVENT message announces it, so participants can see staff joined.
   */
  async intervene(
    ctx: ChatRequestContext,
    conversationId: string,
    reason: string,
  ): Promise<ChatConversationDetail> {
    const { actor } = await this.requireStaffView(
      ctx,
      conversationId,
      ChatPermission.CONVERSATION_INTERVENE,
    );
    await this.dataSource.transaction(async (manager) => {
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
        metadata: { membership: outcome },
      });
      if (outcome === "unchanged") return;
      await this.events.append(
        manager,
        ctx,
        DomainEventType.CHAT_PARTICIPANT_ADDED,
        conversationId,
        {
          userId: actor.userId,
          role: ChatParticipantRole.MODERATOR,
        },
      );
      await this.messages.appendSystemMessage(manager, ctx, conversationId, {
        eventKey: "chat.staff_joined",
        params: { role: actor.role },
      });
    });
    return this.conversations.getDetail(ctx, conversationId);
  }

  /* ---------------------------------------------------------------- */
  /* Internal notes (staff only; never on participant endpoints)       */
  /* ---------------------------------------------------------------- */

  async listNotes(
    ctx: ChatRequestContext,
    conversationId: string,
  ): Promise<ChatInternalNoteItem[]> {
    await this.authz.requireStaff(ctx.user, conversationId, [ChatPermission.INTERNAL_NOTE_MANAGE]);
    const notes = await this.dataSource.getRepository(ChatInternalNote).find({
      where: { conversationId, deletedAt: IsNull() },
      order: { createdAt: "DESC" },
      take: 200,
    });
    return notes.map(toNoteItem);
  }

  async createNote(
    ctx: ChatRequestContext,
    conversationId: string,
    body: string,
  ): Promise<ChatInternalNoteItem> {
    const { actor } = await this.authz.requireStaff(ctx.user, conversationId, [
      ChatPermission.INTERNAL_NOTE_MANAGE,
    ]);
    return this.dataSource.transaction(async (manager) => {
      const note = await manager
        .getRepository(ChatInternalNote)
        .save(
          manager
            .getRepository(ChatInternalNote)
            .create({ conversationId, authorUserId: actor.userId, body }),
        );
      await this.audit.record(manager, {
        action: ChatAuditAction.INTERNAL_NOTE_CREATED,
        actorUserId: actor.userId,
        actorRole: actor.role,
        conversationId,
        targetType: "internal_note",
        targetId: note.id,
        requestId: ctx.requestId,
      });
      return toNoteItem(note);
    });
  }

  async deleteNote(
    ctx: ChatRequestContext,
    noteId: string,
  ): Promise<{ id: string; deleted: true }> {
    const note = await this.dataSource
      .getRepository(ChatInternalNote)
      .findOne({ where: { id: noteId } });
    if (!note || note.deletedAt) throw chatErrors.noteNotFound();
    const { actor } = await this.authz.requireStaff(ctx.user, note.conversationId, [
      ChatPermission.INTERNAL_NOTE_MANAGE,
    ]);
    if (note.authorUserId !== actor.userId && actor.role !== UserRole.ADMIN) {
      throw chatErrors.forbidden("Only the author or an admin can delete this note");
    }
    await this.dataSource.transaction(async (manager) => {
      await manager
        .getRepository(ChatInternalNote)
        .update({ id: noteId }, { deletedAt: new Date() });
      await this.audit.record(manager, {
        action: ChatAuditAction.INTERNAL_NOTE_DELETED,
        actorUserId: actor.userId,
        actorRole: actor.role,
        conversationId: note.conversationId,
        targetType: "internal_note",
        targetId: noteId,
        requestId: ctx.requestId,
      });
    });
    return { id: noteId, deleted: true };
  }

  /* ---------------------------------------------------------------- */
  /* Reports                                                           */
  /* ---------------------------------------------------------------- */

  async listReports(
    ctx: ChatRequestContext,
    query: AdminListChatReportsQuery,
  ): Promise<ChatReportPage> {
    await this.requirePlatformPermission(ctx, ChatPermission.REPORT_REVIEW);
    const cursor = query.cursor ? decodeCursor(query.cursor) : null;
    const qb = this.dataSource
      .getRepository(ChatReport)
      .createQueryBuilder("r")
      .addSelect(`r."createdAt"::text`, "created_at_key")
      .orderBy("r.createdAt", "DESC")
      .addOrderBy("r.id", "DESC")
      .limit(query.limit + 1);
    if (query.status) qb.andWhere("r.status = :status", { status: query.status });
    if (cursor) {
      qb.andWhere(`(r."createdAt", r."id") < (:t::timestamptz, :id::uuid)`, {
        t: cursor.t,
        id: cursor.id,
      });
    }
    const { entities, raw } = await qb.getRawAndEntities<{ created_at_key: string }>();
    const hasMore = entities.length > query.limit;
    const page = entities.slice(0, query.limit);
    const lastKey = raw[page.length - 1]?.created_at_key;
    const last = page[page.length - 1];
    return {
      items: page.map(toReportItem),
      hasMore,
      nextCursor: hasMore && last && lastKey ? encodeCursor({ t: lastKey, id: last.id }) : null,
    };
  }

  async reviewReport(
    ctx: ChatRequestContext,
    reportId: string,
    req: ReviewChatReportRequest,
  ): Promise<ChatReportItem> {
    const actor = await this.requirePlatformPermission(ctx, ChatPermission.REPORT_REVIEW);
    return this.dataSource.transaction(async (manager) => {
      const report = await manager
        .getRepository(ChatReport)
        .findOne({ where: { id: reportId }, lock: { mode: "pessimistic_write" } });
      if (!report) throw chatErrors.reportNotFound();
      if (
        report.status === ChatReportStatus.RESOLVED ||
        report.status === ChatReportStatus.DISMISSED
      ) {
        throw chatErrors.invalidTransition(report.status, req.status);
      }
      Object.assign(report, {
        status: req.status,
        reviewedByUserId: actor.userId,
        reviewedAt: new Date(),
        resolutionNote: req.resolutionNote ?? report.resolutionNote,
      });
      await manager.getRepository(ChatReport).save(report);
      if (req.status !== ChatReportStatus.UNDER_REVIEW) {
        await this.audit.record(manager, {
          action: ChatAuditAction.REPORT_RESOLVED,
          actorUserId: actor.userId,
          actorRole: actor.role,
          conversationId: report.conversationId,
          targetType: "report",
          targetId: report.id,
          reason: req.resolutionNote ?? null,
          requestId: ctx.requestId,
          metadata: { status: req.status, messageId: report.messageId },
        });
      }
      return toReportItem(report);
    });
  }

  /* ---------------------------------------------------------------- */
  /* Audit log                                                         */
  /* ---------------------------------------------------------------- */

  async auditLogs(ctx: ChatRequestContext, query: AdminChatAuditQuery): Promise<ChatAuditLogPage> {
    const actor = await this.requirePlatformPermission(ctx, ChatPermission.AUDIT_VIEW);
    const cursor = query.cursor ? decodeCursor(query.cursor) : null;
    return this.dataSource.transaction(async (manager) => {
      const qb = manager
        .getRepository(ChatAuditLog)
        .createQueryBuilder("a")
        .addSelect(`a."createdAt"::text`, "created_at_key")
        .orderBy("a.createdAt", "DESC")
        .addOrderBy("a.id", "DESC")
        .limit(query.limit + 1);
      if (query.conversationId)
        qb.andWhere("a.conversationId = :cid", { cid: query.conversationId });
      if (query.actorUserId) qb.andWhere("a.actorUserId = :aid", { aid: query.actorUserId });
      if (cursor) {
        qb.andWhere(`(a."createdAt", a."id") < (:t::timestamptz, :id::uuid)`, {
          t: cursor.t,
          id: cursor.id,
        });
      }
      const { entities, raw } = await qb.getRawAndEntities<{ created_at_key: string }>();
      const hasMore = entities.length > query.limit;
      const page = entities.slice(0, query.limit);
      await this.auditRead(
        manager,
        ctx,
        actor,
        ChatAuditAction.AUDIT_LOG_VIEWED,
        query.conversationId ?? null,
        null,
        {
          actorUserId: query.actorUserId ?? null,
          count: page.length,
        },
      );
      const lastKey = raw[page.length - 1]?.created_at_key;
      const last = page[page.length - 1];
      return {
        items: page.map((a) => ({
          id: a.id,
          createdAt: a.createdAt.toISOString(),
          actorUserId: a.actorUserId,
          actorRole: a.actorRole,
          action: a.action,
          conversationId: a.conversationId,
          targetType: a.targetType,
          targetId: a.targetId,
          reason: a.reason,
          requestId: a.requestId,
          metadata: a.metadata,
        })),
        hasMore,
        nextCursor: hasMore && last && lastKey ? encodeCursor({ t: lastKey, id: last.id }) : null,
      };
    });
  }
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function encodeCursor(cursor: KeysetCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function decodeCursor(raw: string): KeysetCursor {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "t" in parsed &&
      "id" in parsed &&
      typeof parsed.t === "string" &&
      typeof parsed.id === "string" &&
      !Number.isNaN(Date.parse(parsed.t)) &&
      /^[0-9a-f-]{36}$/i.test(parsed.id)
    ) {
      return { t: parsed.t, id: parsed.id };
    }
  } catch {
    // fall through
  }
  throw chatErrors.cursorInvalid();
}

function toAdminItem(row: AdminConversationRow): ChatAdminConversationItem {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    status: row.status,
    parcelId: row.parcel_id,
    hubId: row.hub_id,
    merchantId: row.merchant_id,
    lastMessageSequence: row.last_message_sequence,
    lastMessageAt: row.last_message_at ? new Date(row.last_message_at).toISOString() : null,
    activeParticipantCount: row.active_participants,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

function toNoteItem(note: ChatInternalNote): ChatInternalNoteItem {
  return {
    id: note.id,
    conversationId: note.conversationId,
    authorId: note.authorUserId,
    body: note.body,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  };
}

function toReportItem(report: ChatReport): ChatReportItem {
  return {
    id: report.id,
    conversationId: report.conversationId,
    messageId: report.messageId,
    reporterId: report.reporterUserId,
    reason: report.reason,
    details: report.details,
    status: report.status,
    reviewedById: report.reviewedByUserId,
    reviewedAt: report.reviewedAt?.toISOString() ?? null,
    resolutionNote: report.resolutionNote,
    createdAt: report.createdAt.toISOString(),
  };
}
