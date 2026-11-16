import { Inject, Injectable, Logger } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource, In } from "typeorm";
import { CHAT_ESCALATION_ACTIVE_STATUSES, ChatAuditAction } from "@dhruto/contracts";
import { ChatAttachment } from "../../database/entities/index.js";
import { ChatAuditService } from "../services/chat-audit.service.js";
import {
  CHAT_STORAGE_KEY_PREFIX,
  loadChatAttachmentTunables,
  type ChatAttachmentTunables,
} from "./attachment.config.js";
import { ChatAttachmentMetrics } from "./chat-attachment-metrics.js";
import { ChatStorageHolder } from "./chat-attachment.service.js";
import { CHAT_OBJECT_STORAGE } from "./object-storage.port.js";

interface PurgedRow {
  id: string;
  conversation_id: string;
  storage_key: string;
}

export interface CleanupResult {
  expiredPending: number;
  unsent: number;
  rejected: number;
  orphanObjects: number;
  /** Phase 7 retention: objects of deleted messages purged (rows kept). */
  deletedMessageObjects: number;
  /** Phase 7 retention: quarantined (INFECTED/FAILED) objects purged (rows kept). */
  quarantinedObjects: number;
  storageErrors: number;
}

export type RetentionCategory = "deleted_message_objects" | "quarantined_objects";

const ACTIVE_ESCALATIONS = `(${CHAT_ESCALATION_ACTIVE_STATUSES.map((s) => `'${s}'`).join(", ")})`;

/**
 * Evidence hold (Phase 7): an object is never purged while its message has
 * an OPEN/UNDER_REVIEW report or its conversation has an active escalation.
 */
const EVIDENCE_HOLD = `
  NOT EXISTS (SELECT 1 FROM "chat_reports" r
               WHERE r."message_id" = a."message_id" AND r."status" IN ('OPEN', 'UNDER_REVIEW'))
  AND NOT EXISTS (SELECT 1 FROM "chat_conversations" c
                   WHERE c."id" = a."conversation_id" AND c."escalation_status" IN ${ACTIVE_ESCALATIONS})`;

/** Row predicates (alias a) per Phase 7 retention category; $1 is the cutoff. */
export const RETENTION_PREDICATES: Readonly<Record<RetentionCategory, string>> = {
  deleted_message_objects: `a."object_purged_at" IS NULL AND a."message_id" IS NOT NULL
    AND EXISTS (SELECT 1 FROM "chat_messages" m
                 WHERE m."id" = a."message_id" AND m."deleted_at" IS NOT NULL AND m."deleted_at" < $1)
    AND ${EVIDENCE_HOLD}`,
  quarantined_objects: `a."object_purged_at" IS NULL AND a."message_id" IS NOT NULL
    AND a."scan_status" IN ('INFECTED', 'FAILED') AND a."quarantined_at" < $1
    AND ${EVIDENCE_HOLD}`,
};

/**
 * Storage lifecycle cleanup (Phase 6). Safe by construction:
 *
 *  - Only rows with `message_id IS NULL` are ever deleted (a sent
 *    attachment is never touched; deleted messages keep theirs for
 *    moderation, ADR-019).
 *  - A row is CLAIMED first (`DELETE … RETURNING storage_key`, committed),
 *    then its object is deleted. A concurrent send holding the row lock
 *    either links it first (the DELETE matches nothing) or finds it gone.
 *    A failed object delete leaves an orphan that the orphan sweep removes.
 *  - Bounded batches; every step is idempotent and can run concurrently on
 *    several instances (conditional deletes, idempotent object deletes).
 *
 * Categories: expired PENDING reservations (older than the pending TTL,
 * which always outlives the presigned PUT), UPLOADED-but-never-sent
 * attachments (unsent TTL), REJECTED rows (retention), and objects under
 * `chat/` with no attachment row (orphans, older than the pending TTL).
 */
@Injectable()
export class ChatAttachmentCleanupService {
  private readonly logger = new Logger(ChatAttachmentCleanupService.name);
  private readonly tunables: ChatAttachmentTunables;
  /** Orphan sweep cursor (per instance; wraps around at the end of the bucket). */
  private orphanCursor: string | undefined;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly metrics: ChatAttachmentMetrics,
    @Inject(CHAT_OBJECT_STORAGE) private readonly holder: ChatStorageHolder,
    private readonly audit: ChatAuditService,
  ) {
    this.tunables = loadChatAttachmentTunables();
  }

  async runOnce(now: Date = new Date()): Promise<CleanupResult> {
    const result: CleanupResult = {
      expiredPending: 0,
      unsent: 0,
      rejected: 0,
      orphanObjects: 0,
      deletedMessageObjects: 0,
      quarantinedObjects: 0,
      storageErrors: 0,
    };
    const storage = this.holder.storage;
    if (!storage) return result;
    const batch = this.tunables.cleanupBatchSize;
    const ago = (seconds: number) => new Date(now.getTime() - seconds * 1000);

    result.expiredPending = await this.claimAndDelete(
      `"status" = 'PENDING' AND "createdAt" < $1`,
      ago(this.tunables.pendingTtlSeconds),
      batch,
      result,
    );
    result.unsent = await this.claimAndDelete(
      `"status" = 'UPLOADED' AND "uploaded_at" < $1`,
      ago(this.tunables.unsentTtlSeconds),
      batch,
      result,
    );
    result.rejected = await this.claimAndDelete(
      `"status" = 'REJECTED' AND "updatedAt" < $1`,
      ago(this.tunables.rejectedRetentionSeconds),
      batch,
      result,
    );
    result.orphanObjects = await this.sweepOrphans(
      ago(this.tunables.pendingTtlSeconds),
      batch,
      result,
    );

    // Phase 7 retention (disabled unless a duration is configured; see
    // PHASE-7-ATTACHMENT-RETENTION.md). Unsent quarantined files are already
    // covered by the unsent/rejected rules above (message_id IS NULL).
    const { deletedMessageObjectRetentionSeconds: dm, quarantinedObjectRetentionSeconds: qo } =
      this.tunables;
    if (dm !== null) {
      result.deletedMessageObjects = await this.purgeObjects(
        "deleted_message_objects",
        ago(dm),
        batch,
        result,
      );
    }
    if (qo !== null) {
      result.quarantinedObjects = await this.purgeObjects(
        "quarantined_objects",
        ago(qo),
        batch,
        result,
      );
    }

    this.metrics.increment("cleanupRuns");
    this.metrics.increment(
      "retentionPurged",
      result.deletedMessageObjects + result.quarantinedObjects,
    );
    this.metrics.increment(
      "cleanupDeleted",
      result.expiredPending + result.unsent + result.rejected,
    );
    this.metrics.increment("cleanupOrphansDeleted", result.orphanObjects);
    if (
      result.expiredPending +
        result.unsent +
        result.rejected +
        result.orphanObjects +
        result.deletedMessageObjects +
        result.quarantinedObjects +
        result.storageErrors >
      0
    ) {
      this.logger.log(
        `chat.attachment.cleanup expired_pending=${result.expiredPending} unsent=${result.unsent} rejected=${result.rejected} orphans=${result.orphanObjects} deleted_message_objects=${result.deletedMessageObjects} quarantined_objects=${result.quarantinedObjects} storage_errors=${result.storageErrors}`,
      );
    }
    return result;
  }

  /** Claims up to `limit` unsent rows matching `condition` (committed delete), then deletes their objects. */
  private async claimAndDelete(
    condition: string,
    cutoff: Date,
    limit: number,
    result: CleanupResult,
  ): Promise<number> {
    const claimed: Array<{ storage_key: string }> = await this.dataSource.query(
      `DELETE FROM "chat_attachments"
        WHERE "id" IN (
          SELECT "id" FROM "chat_attachments"
           WHERE "message_id" IS NULL AND ${condition}
           ORDER BY "createdAt"
           LIMIT $2
           FOR UPDATE SKIP LOCKED
        )
          AND "message_id" IS NULL
        RETURNING "storage_key"`,
      [cutoff, limit],
    );
    // TypeORM returns [rows, count] for DELETE … RETURNING on postgres.
    const rows = Array.isArray(claimed[0])
      ? (claimed[0] as Array<{ storage_key: string }>)
      : claimed;
    for (const row of rows) await this.deleteObject(row.storage_key, result);
    return rows.length;
  }

  /**
   * Retention purge of LINKED attachments' objects (Phase 7). The row is never
   * deleted (message history, evidence metadata and audit stay intact); it is
   * claimed by setting `object_purged_at` together with a system audit row in
   * one committed transaction, then the object is deleted. If the delete
   * fails, the claim is undone so the next run retries (the row still owns
   * the key, so the orphan sweep would never remove it).
   */
  private async purgeObjects(
    category: RetentionCategory,
    cutoff: Date,
    limit: number,
    result: CleanupResult,
  ): Promise<number> {
    const claimed = await this.dataSource.transaction(async (manager) => {
      const raw: unknown[] = await manager.query(
        `UPDATE "chat_attachments" SET "object_purged_at" = now()
          WHERE "id" IN (
            SELECT a."id" FROM "chat_attachments" a
             WHERE ${RETENTION_PREDICATES[category]}
             ORDER BY a."createdAt"
             LIMIT $2
             FOR UPDATE OF a SKIP LOCKED
          )
          RETURNING "id", "conversation_id", "storage_key"`,
        [cutoff, limit],
      );
      const rows = (Array.isArray(raw[0]) ? raw[0] : raw) as PurgedRow[];
      for (const row of rows) {
        await this.audit.record(manager, {
          action: ChatAuditAction.ATTACHMENT_OBJECT_PURGED,
          actorUserId: null,
          actorRole: null,
          conversationId: row.conversation_id,
          targetType: "attachment",
          targetId: row.id,
          metadata: { category, cutoff: cutoff.toISOString() },
        });
      }
      return rows;
    });
    let purged = 0;
    for (const row of claimed) {
      try {
        await this.holder.storage?.delete(row.storage_key);
        purged += 1;
      } catch {
        result.storageErrors += 1;
        this.metrics.increment("storageErrors");
        await this.dataSource.query(
          `UPDATE "chat_attachments" SET "object_purged_at" = NULL WHERE "id" = $1`,
          [row.id],
        );
      }
    }
    return purged;
  }

  /** Bounded count of rows currently eligible for a retention category (status view). */
  async countEligible(category: RetentionCategory, cutoff: Date, cap = 10_000): Promise<number> {
    const rows: Array<{ count: number }> = await this.dataSource.query(
      `SELECT count(*)::int AS "count" FROM (
         SELECT 1 FROM "chat_attachments" a WHERE ${RETENTION_PREDICATES[category]} LIMIT $2
       ) x`,
      [cutoff, cap],
    );
    return rows[0]?.count ?? 0;
  }

  get retentionTunables(): ChatAttachmentTunables {
    return this.tunables;
  }

  private async deleteObject(key: string, result: CleanupResult): Promise<void> {
    try {
      await this.holder.storage?.delete(key);
    } catch {
      result.storageErrors += 1;
      this.metrics.increment("storageErrors");
    }
  }

  /** One bounded page of the bucket: delete old objects that have no attachment row. */
  private async sweepOrphans(
    olderThan: Date,
    limit: number,
    result: CleanupResult,
  ): Promise<number> {
    const storage = this.holder.storage;
    if (!storage) return 0;
    let page;
    try {
      page = await storage.list(CHAT_STORAGE_KEY_PREFIX, {
        startAfter: this.orphanCursor,
        maxKeys: limit,
      });
    } catch {
      result.storageErrors += 1;
      this.metrics.increment("storageErrors");
      return 0;
    }
    this.orphanCursor = page.nextStartAfter ?? undefined;
    const candidates = page.objects.filter(
      (o) => o.lastModified !== null && o.lastModified < olderThan,
    );
    if (candidates.length === 0) return 0;
    const known = await this.dataSource.getRepository(ChatAttachment).find({
      where: { storageKey: In(candidates.map((o) => o.key)) },
      select: ["id", "storageKey"],
    });
    const knownKeys = new Set(known.map((row) => row.storageKey));
    let deleted = 0;
    for (const object of candidates) {
      if (knownKeys.has(object.key)) continue;
      await this.deleteObject(object.key, result);
      deleted += 1;
    }
    return deleted;
  }
}
