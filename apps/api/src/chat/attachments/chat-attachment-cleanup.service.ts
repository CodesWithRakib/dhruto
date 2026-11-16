import { Inject, Injectable, Logger } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource, In } from "typeorm";
import { ChatAttachment } from "../../database/entities/index.js";
import {
  CHAT_STORAGE_KEY_PREFIX,
  loadChatAttachmentTunables,
  type ChatAttachmentTunables,
} from "./attachment.config.js";
import { ChatAttachmentMetrics } from "./chat-attachment-metrics.js";
import { ChatStorageHolder } from "./chat-attachment.service.js";
import { CHAT_OBJECT_STORAGE } from "./object-storage.port.js";

export interface CleanupResult {
  expiredPending: number;
  unsent: number;
  rejected: number;
  orphanObjects: number;
  storageErrors: number;
}

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
  ) {
    this.tunables = loadChatAttachmentTunables();
  }

  async runOnce(now: Date = new Date()): Promise<CleanupResult> {
    const result: CleanupResult = {
      expiredPending: 0,
      unsent: 0,
      rejected: 0,
      orphanObjects: 0,
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

    this.metrics.increment("cleanupRuns");
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
        result.storageErrors >
      0
    ) {
      this.logger.log(
        `chat.attachment.cleanup expired_pending=${result.expiredPending} unsent=${result.unsent} rejected=${result.rejected} orphans=${result.orphanObjects} storage_errors=${result.storageErrors}`,
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
