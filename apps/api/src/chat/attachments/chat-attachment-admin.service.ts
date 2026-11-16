import { Inject, Injectable, Logger } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource, In, type EntityManager } from "typeorm";
import {
  ChatAttachmentScanStatus,
  ChatAttachmentStatus,
  ChatAuditAction,
  ChatConversationType,
  ChatPermission,
  chatAttachmentKind,
  isChatAttachmentMimeType,
  type AdminChatAttachmentDecisionRequest,
  type AdminChatAttachmentQueueQuery,
  type ChatAdminAttachmentItem,
  type ChatAdminAttachmentPage,
  type ChatAttachmentDownload,
  type ChatRetentionStatus,
} from "@dhruto/contracts";
import { ChatAttachment, ChatConversation, ChatMessage } from "../../database/entities/index.js";
import { chatErrors } from "../chat.errors.js";
import { type ChatRequestContext } from "../chat.context.js";
import { type ChatActorScope } from "../policies/chat-eligibility.policy.js";
import { ChatAuditService } from "../services/chat-audit.service.js";
import { ChatAuthorizationService } from "../services/chat-authorization.service.js";
import { loadChatAttachmentTunables, type ChatAttachmentTunables } from "./attachment.config.js";
import { ChatAttachmentCleanupService } from "./chat-attachment-cleanup.service.js";
import {
  ChatAttachmentScanService,
  INTEGRITY_SCAN_ERRORS,
} from "./chat-attachment-scan.service.js";
import { ChatStorageHolder } from "./chat-attachment.service.js";
import { CHAT_OBJECT_STORAGE } from "./object-storage.port.js";

interface KeysetCursor {
  t: string;
  id: string;
}

const CONVERSATION_ATTACHMENTS_LIMIT = 200;

/**
 * Staff attachment operations (Phase 7). Every operation is gated by an
 * explicit permission and audited; restricted ones need an explicit GRANT:
 *
 *  - per-conversation metadata: `CONVERSATION_VIEW_ANY` + reason (same as a
 *    staff conversation view; audited as ADMIN_CONVERSATION_VIEWED);
 *  - quarantine queue (blocked/pending metadata): `ATTACHMENT_RESTRICTED_ACCESS` (grant);
 *  - staff content download (any scan state): `ATTACHMENT_RESTRICTED_ACCESS`
 *    (grant) + reason, always `Content-Disposition: attachment`;
 *  - release / rescan: `ATTACHMENT_QUARANTINE_MANAGE` (grant) + reason;
 *  - retention status: `RETENTION_MANAGE` (grant).
 *
 * Responses never contain storage keys; presigned URLs are returned only by
 * the download endpoint and are never logged or audited.
 */
@Injectable()
export class ChatAttachmentAdminService {
  private readonly logger = new Logger(ChatAttachmentAdminService.name);
  private readonly tunables: ChatAttachmentTunables;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly authz: ChatAuthorizationService,
    private readonly audit: ChatAuditService,
    private readonly scan: ChatAttachmentScanService,
    private readonly cleanup: ChatAttachmentCleanupService,
    @Inject(CHAT_OBJECT_STORAGE) private readonly holder: ChatStorageHolder,
  ) {
    this.tunables = loadChatAttachmentTunables();
  }

  /** Conversation-scoped staff access to an attachment; 404 when not permitted (no leak). */
  private async requireAttachmentStaff(
    ctx: ChatRequestContext,
    attachmentId: string,
    permission: ChatPermission,
  ): Promise<{ actor: ChatActorScope; row: ChatAttachment }> {
    const row = await this.dataSource.getRepository(ChatAttachment).findOneBy({ id: attachmentId });
    if (!row) throw chatErrors.attachmentNotFound();
    const conversation = await this.dataSource
      .getRepository(ChatConversation)
      .findOne({ where: { id: row.conversationId }, select: ["id", "type"] });
    const permissions =
      conversation?.type === ChatConversationType.INTERNAL_SUPERVISOR
        ? [permission, ChatPermission.CONVERSATION_VIEW_RESTRICTED]
        : [permission];
    try {
      const { actor } = await this.authz.requireStaff(ctx.user, row.conversationId, permissions);
      return { actor, row };
    } catch {
      throw chatErrors.attachmentNotFound();
    }
  }

  private async record(
    manager: EntityManager,
    ctx: ChatRequestContext,
    actor: ChatActorScope,
    action: ChatAuditAction,
    row: Pick<ChatAttachment, "id" | "conversationId"> | null,
    reason: string | null,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.audit.record(manager, {
      action,
      actorUserId: actor.userId,
      actorRole: actor.role,
      conversationId: row?.conversationId ?? null,
      targetType: row ? "attachment" : null,
      targetId: row?.id ?? null,
      reason,
      requestId: ctx.requestId,
      metadata,
    });
  }

  /* ---------------------------------------------------------------- */

  async listForConversation(
    ctx: ChatRequestContext,
    conversationId: string,
    reason: string,
  ): Promise<ChatAdminAttachmentItem[]> {
    const conversation = await this.dataSource
      .getRepository(ChatConversation)
      .findOne({ where: { id: conversationId }, select: ["id", "type"] });
    if (!conversation) throw chatErrors.conversationNotFound();
    const { actor } = await this.authz.requireStaff(
      ctx.user,
      conversationId,
      conversation.type === ChatConversationType.INTERNAL_SUPERVISOR
        ? [ChatPermission.CONVERSATION_VIEW_ANY, ChatPermission.CONVERSATION_VIEW_RESTRICTED]
        : [ChatPermission.CONVERSATION_VIEW_ANY],
    );
    return this.dataSource.transaction(async (manager) => {
      const rows = await manager.getRepository(ChatAttachment).find({
        where: { conversationId },
        order: { createdAt: "DESC" },
        take: CONVERSATION_ATTACHMENTS_LIMIT,
      });
      await this.audit.record(manager, {
        action: ChatAuditAction.ADMIN_CONVERSATION_VIEWED,
        actorUserId: actor.userId,
        actorRole: actor.role,
        conversationId,
        targetType: "conversation",
        targetId: conversationId,
        reason,
        requestId: ctx.requestId,
        metadata: { scope: "attachments", count: rows.length },
      });
      return this.toItems(manager, rows);
    });
  }

  async queue(
    ctx: ChatRequestContext,
    query: AdminChatAttachmentQueueQuery,
  ): Promise<ChatAdminAttachmentPage> {
    const actor = await this.authz.requirePlatformStaff(
      ctx.user,
      ChatPermission.ATTACHMENT_RESTRICTED_ACCESS,
    );
    const cursor = query.cursor ? decodeCursor(query.cursor) : null;
    return this.dataSource.transaction(async (manager) => {
      const qb = manager
        .getRepository(ChatAttachment)
        .createQueryBuilder("a")
        .addSelect(`a."createdAt"::text`, "created_at_key")
        .orderBy("a.createdAt", "DESC")
        .addOrderBy("a.id", "DESC")
        .limit(query.limit + 1);
      if (query.scanStatus) {
        qb.andWhere("a.scanStatus = :scan", { scan: query.scanStatus });
        if (query.scanStatus === ChatAttachmentScanStatus.PENDING) {
          qb.andWhere("a.status = :uploaded", { uploaded: ChatAttachmentStatus.UPLOADED });
        }
      } else {
        qb.andWhere("a.scanStatus IN (:...blocked)", {
          blocked: [ChatAttachmentScanStatus.INFECTED, ChatAttachmentScanStatus.FAILED],
        });
      }
      if (cursor) {
        qb.andWhere(`(a."createdAt", a."id") < (:t::timestamptz, :id::uuid)`, cursor);
      }
      const { entities, raw } = await qb.getRawAndEntities<{ created_at_key: string }>();
      const hasMore = entities.length > query.limit;
      const page = entities.slice(0, query.limit);
      await this.record(
        manager,
        ctx,
        actor,
        ChatAuditAction.ATTACHMENT_RESTRICTED_ACCESSED,
        null,
        null,
        {
          view: "queue",
          scanStatus: query.scanStatus ?? "BLOCKED",
          count: page.length,
        },
      );
      const lastKey = raw[page.length - 1]?.created_at_key;
      const last = page[page.length - 1];
      return {
        items: await this.toItems(manager, page),
        hasMore,
        nextCursor: hasMore && last && lastKey ? encodeCursor({ t: lastKey, id: last.id }) : null,
      };
    });
  }

  /**
   * Staff download of restricted content (blocked, pending, deleted-message
   * evidence or a conversation the staff member is not in). Requires the
   * grant + reason; audited BEFORE the URL is issued; always a download
   * (never rendered inline). Purged or never-verified objects cannot be served.
   */
  async restrictedDownload(
    ctx: ChatRequestContext,
    attachmentId: string,
    reason: string,
  ): Promise<ChatAttachmentDownload> {
    const storage = this.holder.storage;
    if (!storage) throw chatErrors.storageUnavailable();
    const { actor, row } = await this.requireAttachmentStaff(
      ctx,
      attachmentId,
      ChatPermission.ATTACHMENT_RESTRICTED_ACCESS,
    );
    if (
      row.status !== ChatAttachmentStatus.UPLOADED ||
      row.objectPurgedAt !== null ||
      !isChatAttachmentMimeType(row.mimeType)
    ) {
      throw chatErrors.attachmentNotFound();
    }
    await this.dataSource.transaction((manager) =>
      this.record(
        manager,
        ctx,
        actor,
        ChatAuditAction.ATTACHMENT_RESTRICTED_ACCESSED,
        row,
        reason,
        {
          view: "download",
          scanStatus: row.scanStatus,
        },
      ),
    );
    const expiresAt = new Date(Date.now() + this.tunables.downloadUrlTtlSeconds * 1000);
    try {
      const url = await storage.presignGet(row.storageKey, {
        expiresInSeconds: this.tunables.downloadUrlTtlSeconds,
        // Unscanned/blocked content is served as opaque bytes, never as a renderable type.
        contentType:
          row.scanStatus === ChatAttachmentScanStatus.CLEAN
            ? row.mimeType
            : "application/octet-stream",
        disposition: "attachment",
        filename: row.originalFilename,
      });
      return { url, expiresAt: expiresAt.toISOString(), disposition: "attachment" };
    } catch (error) {
      this.logger.error(
        `chat.attachment.storage_error operation=presign_get error=${error instanceof Error ? error.name : "unknown"}`,
      );
      throw chatErrors.storageUnavailable();
    }
  }

  /**
   * RESCAN: any scan state except CLEAN → PENDING with a fresh retry budget.
   * RELEASE: INFECTED/FAILED → CLEAN as a documented human decision (e.g. a
   * confirmed false positive). Integrity failures (object missing / bytes
   * changed) can never be released — only rescanned. Both are idempotent
   * under a row lock and audited with the reason.
   */
  async decide(
    ctx: ChatRequestContext,
    attachmentId: string,
    req: AdminChatAttachmentDecisionRequest,
  ): Promise<ChatAdminAttachmentItem> {
    const { actor } = await this.requireAttachmentStaff(
      ctx,
      attachmentId,
      ChatPermission.ATTACHMENT_QUARANTINE_MANAGE,
    );
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(ChatAttachment);
      const row = await repo.findOne({
        where: { id: attachmentId },
        lock: { mode: "pessimistic_write" },
      });
      if (!row) throw chatErrors.attachmentNotFound();
      if (row.status !== ChatAttachmentStatus.UPLOADED || row.objectPurgedAt !== null) {
        throw chatErrors.attachmentInvalid("Only stored, verified attachments can be reviewed");
      }
      const from = row.scanStatus;
      if (req.action === "RESCAN") {
        if (from === ChatAttachmentScanStatus.CLEAN) {
          throw chatErrors.attachmentInvalid("The attachment is already clean");
        }
        if (from === ChatAttachmentScanStatus.PENDING && row.scanAttempts === 0) {
          return this.toItem(manager, row);
        }
        await repo.update(
          { id: row.id },
          {
            scanStatus: ChatAttachmentScanStatus.PENDING,
            scanAttempts: 0,
            scanNextAttemptAt: null,
            scanError: null,
          },
        );
        await this.record(
          manager,
          ctx,
          actor,
          ChatAuditAction.ATTACHMENT_RESCAN_REQUESTED,
          row,
          req.reason,
          {
            from,
          },
        );
      } else {
        if (from === ChatAttachmentScanStatus.CLEAN) {
          return this.toItem(manager, row);
        }
        if (from === ChatAttachmentScanStatus.PENDING) {
          throw chatErrors.attachmentInvalid("Pending attachments must be scanned, not released");
        }
        if (row.scanError && INTEGRITY_SCAN_ERRORS.includes(row.scanError)) {
          throw chatErrors.attachmentInvalid(
            "Integrity failures cannot be released; request a rescan",
          );
        }
        await repo.update(
          { id: row.id },
          {
            scanStatus: ChatAttachmentScanStatus.CLEAN,
            scannedAt: new Date(),
            scanEngine: "manual-release",
            scannedSha256: null,
            scanNextAttemptAt: null,
          },
        );
        await this.record(
          manager,
          ctx,
          actor,
          ChatAuditAction.ATTACHMENT_RELEASED,
          row,
          req.reason,
          {
            from,
            threat: row.scanThreat,
            error: row.scanError,
          },
        );
      }
      const updated = await repo.findOneByOrFail({ id: row.id });
      return this.toItem(manager, updated);
    });
  }

  async retentionStatus(ctx: ChatRequestContext): Promise<ChatRetentionStatus> {
    await this.authz.requirePlatformStaff(ctx.user, ChatPermission.RETENTION_MANAGE);
    const t = this.cleanup.retentionTunables;
    const now = Date.now();
    const ago = (seconds: number) => new Date(now - seconds * 1000);
    const [deleted, quarantined] = await Promise.all([
      t.deletedMessageObjectRetentionSeconds === null
        ? Promise.resolve(null)
        : this.cleanup.countEligible(
            "deleted_message_objects",
            ago(t.deletedMessageObjectRetentionSeconds),
          ),
      t.quarantinedObjectRetentionSeconds === null
        ? Promise.resolve(null)
        : this.cleanup.countEligible(
            "quarantined_objects",
            ago(t.quarantinedObjectRetentionSeconds),
          ),
    ]);
    return {
      scannerConfigured: this.scan.scannerEngine !== null,
      scannerEngine: this.scan.scannerEngine,
      policies: [
        { category: "expired_pending", retentionSeconds: t.pendingTtlSeconds, eligibleCount: null },
        { category: "unsent", retentionSeconds: t.unsentTtlSeconds, eligibleCount: null },
        { category: "rejected", retentionSeconds: t.rejectedRetentionSeconds, eligibleCount: null },
        { category: "orphan_objects", retentionSeconds: t.pendingTtlSeconds, eligibleCount: null },
        {
          category: "deleted_message_objects",
          retentionSeconds: t.deletedMessageObjectRetentionSeconds,
          eligibleCount: deleted,
        },
        {
          category: "quarantined_objects",
          retentionSeconds: t.quarantinedObjectRetentionSeconds,
          eligibleCount: quarantined,
        },
      ],
      evidenceHold:
        "Objects are never purged while the message has an open or under-review report or the conversation has an active escalation; attachment rows and audit records are never purged.",
    };
  }

  /* ---------------------------------------------------------------- */

  private async toItem(
    manager: EntityManager,
    row: ChatAttachment,
  ): Promise<ChatAdminAttachmentItem> {
    const [item] = await this.toItems(manager, [row]);
    if (!item) throw chatErrors.attachmentNotFound();
    return item;
  }

  private async toItems(
    manager: EntityManager,
    rows: readonly ChatAttachment[],
  ): Promise<ChatAdminAttachmentItem[]> {
    const messageIds = rows.map((r) => r.messageId).filter((id): id is string => id !== null);
    const deleted = new Set(
      messageIds.length
        ? (
            await manager.getRepository(ChatMessage).find({
              where: { id: In(messageIds) },
              select: ["id", "deletedAt"],
            })
          )
            .filter((m) => m.deletedAt !== null)
            .map((m) => m.id)
        : [],
    );
    return rows.map((a) => ({
      id: a.id,
      conversationId: a.conversationId,
      messageId: a.messageId,
      uploaderUserId: a.uploaderUserId,
      originalFilename: a.originalFilename,
      mimeType: a.mimeType,
      kind: chatAttachmentKind(a.mimeType),
      sizeBytes: a.sizeBytes,
      status: a.status,
      scanStatus: a.scanStatus,
      scanAttempts: a.scanAttempts,
      scannedAt: a.scannedAt?.toISOString() ?? null,
      scanEngine: a.scanEngine,
      scanThreat: a.scanThreat,
      scanError: a.scanError,
      quarantinedAt: a.quarantinedAt?.toISOString() ?? null,
      objectPurgedAt: a.objectPurgedAt?.toISOString() ?? null,
      messageDeleted: a.messageId !== null && deleted.has(a.messageId),
      createdAt: a.createdAt.toISOString(),
    }));
  }
}

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
