import { createHash } from "node:crypto";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { ChatAttachmentScanStatus, ChatAuditAction } from "@dhruto/contracts";
import { ChatAuditService } from "../services/chat-audit.service.js";
import { loadChatAttachmentTunables, type ChatAttachmentTunables } from "./attachment.config.js";
import { ChatAttachmentMetrics } from "./chat-attachment-metrics.js";
import { ChatStorageHolder } from "./chat-attachment.service.js";
import {
  CHAT_MALWARE_SCANNER,
  ChatMalwareScannerHolder,
  type MalwareScanVerdict,
} from "./malware-scanner.port.js";
import { CHAT_OBJECT_STORAGE } from "./object-storage.port.js";

interface ClaimedRow {
  id: string;
  conversation_id: string;
  storage_key: string;
  checksum_sha256: string;
  scan_attempts: number;
}

export interface ScanRunResult {
  claimed: number;
  clean: number;
  infected: number;
  retried: number;
  failed: number;
  /** True when no scanner is configured (nothing claimed; files stay pending). */
  scannerMissing: boolean;
}

/** Integrity failures are never retried and never releasable. */
export const INTEGRITY_SCAN_ERRORS: readonly string[] = ["checksum_mismatch", "object_missing"];

const MAX_BACKOFF_SECONDS = 3600;

/**
 * Asynchronous malware-scan gate (Phase 7). Policy:
 * `PHASE-7-ATTACHMENT-RETENTION.md` §2.
 *
 *  - Picks `UPLOADED` + scan `PENDING` rows that are due, claiming each with
 *    a lease (`scan_next_attempt_at = now + lease`, attempts + 1) under
 *    `FOR UPDATE SKIP LOCKED`, so concurrent workers never scan one file
 *    twice and a crashed worker's claim expires.
 *  - Streams the object ONCE: bytes go to the scanner while being hashed.
 *    A verdict counts only if the hash equals the verified `checksum_sha256`
 *    (the DB CHECK `CHK_chat_attachments_scan_binding` enforces the same):
 *    the result is bound to the exact stored object version.
 *  - Clean → CLEAN. Infected → INFECTED + quarantined + audit. Scanner error
 *    → retry with exponential backoff, then FAILED (blocked) + audit.
 *    Missing object or hash mismatch → FAILED immediately (integrity).
 *  - Without a configured scanner nothing is claimed: files stay PENDING and
 *    are never served (fail closed). Logged once per process.
 *
 * Verdict writes are conditional on the claim (`scan_status = 'PENDING' AND
 * scan_attempts = claimed attempts`), so a staff rescan/release that happened
 * meanwhile is never overwritten by a stale worker.
 */
@Injectable()
export class ChatAttachmentScanService {
  private readonly logger = new Logger(ChatAttachmentScanService.name);
  private readonly tunables: ChatAttachmentTunables;
  private warnedMissing = false;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly audit: ChatAuditService,
    private readonly metrics: ChatAttachmentMetrics,
    @Inject(CHAT_OBJECT_STORAGE) private readonly storageHolder: ChatStorageHolder,
    @Inject(CHAT_MALWARE_SCANNER) private readonly scannerHolder: ChatMalwareScannerHolder,
  ) {
    this.tunables = loadChatAttachmentTunables();
  }

  get scannerEngine(): string | null {
    return this.scannerHolder.scanner?.engine ?? null;
  }

  async runOnce(now: Date = new Date()): Promise<ScanRunResult> {
    const result: ScanRunResult = {
      claimed: 0,
      clean: 0,
      infected: 0,
      retried: 0,
      failed: 0,
      scannerMissing: false,
    };
    const scanner = this.scannerHolder.scanner;
    const storage = this.storageHolder.storage;
    if (!scanner || !storage) {
      result.scannerMissing = !scanner;
      if (!scanner && !this.warnedMissing) {
        this.warnedMissing = true;
        this.logger.warn(
          "chat.attachment.scan_unconfigured: no malware scanner (CHAT_CLAMAV_HOST); attachments stay pending and are not downloadable",
        );
      }
      return result;
    }
    this.metrics.increment("scanRuns");

    const lease = new Date(now.getTime() + this.tunables.scanLeaseSeconds * 1000);
    const raw: unknown[] = await this.dataSource.query(
      `UPDATE "chat_attachments" a
          SET "scan_attempts" = a."scan_attempts" + 1, "scan_next_attempt_at" = $2
        WHERE a."id" IN (
          SELECT "id" FROM "chat_attachments"
           WHERE "status" = 'UPLOADED' AND "scan_status" = 'PENDING'
             AND ("scan_next_attempt_at" IS NULL OR "scan_next_attempt_at" <= $1)
           ORDER BY "createdAt"
           LIMIT $3
           FOR UPDATE SKIP LOCKED
        )
        RETURNING a."id", a."conversation_id", a."storage_key", a."checksum_sha256", a."scan_attempts"`,
      [now, lease, this.tunables.scanBatchSize],
    );
    // TypeORM returns [rows, count] for UPDATE … RETURNING on postgres.
    const rows = (Array.isArray(raw[0]) ? raw[0] : raw) as ClaimedRow[];
    result.claimed = rows.length;

    for (const row of rows) {
      const outcome = await this.scanOne(row, now);
      result[outcome] += 1;
    }
    if (rows.length > 0) {
      this.logger.log(
        `chat.attachment.scan claimed=${result.claimed} clean=${result.clean} infected=${result.infected} retried=${result.retried} failed=${result.failed}`,
      );
    }
    return result;
  }

  private async scanOne(
    row: ClaimedRow,
    now: Date,
  ): Promise<"clean" | "infected" | "retried" | "failed"> {
    const scanner = this.scannerHolder.scanner;
    const storage = this.storageHolder.storage;
    if (!scanner || !storage) return "retried";

    let body: AsyncIterable<Uint8Array> | null;
    try {
      body = await storage.read(row.storage_key);
    } catch {
      this.metrics.increment("storageErrors");
      return this.retryOrFail(row, now, "storage_unavailable", scanner.engine);
    }
    if (!body) return this.fail(row, "object_missing", scanner.engine);

    const hash = createHash("sha256");
    const source = body;
    async function* hashed(): AsyncIterable<Uint8Array> {
      for await (const chunk of source) {
        hash.update(chunk);
        yield chunk;
      }
    }
    let verdict: MalwareScanVerdict;
    try {
      verdict = await scanner.scan(hashed());
    } catch {
      verdict = { result: "error", code: "scanner_exception" };
    }
    if (verdict.result === "error") {
      this.metrics.increment("scanErrors");
      return this.retryOrFail(row, now, verdict.code, scanner.engine);
    }
    // The scanner must have consumed the whole object for the hash to match.
    const digest = hash.digest("hex");
    if (digest !== row.checksum_sha256) return this.fail(row, "checksum_mismatch", scanner.engine);

    if (verdict.result === "infected") {
      const changed = await this.writeVerdict(row, {
        status: ChatAttachmentScanStatus.INFECTED,
        engine: scanner.engine,
        sha256: digest,
        threat: verdict.threat,
        error: null,
        quarantine: true,
      });
      if (changed) {
        this.metrics.increment("scanInfected");
        this.logger.warn(`chat.attachment.scan_infected attachment=${row.id}`);
      }
      return "infected";
    }
    const changed = await this.writeVerdict(row, {
      status: ChatAttachmentScanStatus.CLEAN,
      engine: scanner.engine,
      sha256: digest,
      threat: null,
      error: null,
      quarantine: false,
    });
    if (changed) this.metrics.increment("scanClean");
    return "clean";
  }

  private async retryOrFail(
    row: ClaimedRow,
    now: Date,
    code: string,
    engine: string,
  ): Promise<"retried" | "failed"> {
    if (row.scan_attempts >= this.tunables.scanMaxAttempts) return this.fail(row, code, engine);
    const backoff = Math.min(
      this.tunables.scanRetryBaseSeconds * 2 ** (row.scan_attempts - 1),
      MAX_BACKOFF_SECONDS,
    );
    await this.dataSource.query(
      `UPDATE "chat_attachments" SET "scan_next_attempt_at" = $2, "scan_error" = $3
        WHERE "id" = $1 AND "scan_status" = 'PENDING' AND "scan_attempts" = $4`,
      [row.id, new Date(now.getTime() + backoff * 1000), code, row.scan_attempts],
    );
    this.logger.warn(
      `chat.attachment.scan_retry attachment=${row.id} attempt=${row.scan_attempts} code=${code}`,
    );
    return "retried";
  }

  private async fail(row: ClaimedRow, code: string, engine: string): Promise<"failed"> {
    const changed = await this.writeVerdict(row, {
      status: ChatAttachmentScanStatus.FAILED,
      engine,
      sha256: null,
      threat: null,
      error: code,
      quarantine: true,
    });
    if (changed) {
      this.metrics.increment("scanFailed");
      this.logger.warn(`chat.attachment.scan_failed attachment=${row.id} code=${code}`);
    }
    return "failed";
  }

  /** Conditional verdict write + (for blocked files) a system audit row, in one transaction. */
  private async writeVerdict(
    row: ClaimedRow,
    verdict: {
      status: ChatAttachmentScanStatus;
      engine: string;
      sha256: string | null;
      threat: string | null;
      error: string | null;
      quarantine: boolean;
    },
  ): Promise<boolean> {
    return this.dataSource.transaction(async (manager) => {
      const raw: unknown[] = await manager.query(
        `UPDATE "chat_attachments"
            SET "scan_status" = $2, "scanned_at" = now(), "scan_engine" = $3, "scanned_sha256" = $4,
                "scan_threat" = $5, "scan_error" = $6, "scan_next_attempt_at" = NULL,
                "quarantined_at" = CASE WHEN $7::boolean THEN now() ELSE "quarantined_at" END
          WHERE "id" = $1 AND "scan_status" = 'PENDING' AND "scan_attempts" = $8
          RETURNING "id"`,
        [
          row.id,
          verdict.status,
          verdict.engine,
          verdict.sha256,
          verdict.threat,
          verdict.error,
          verdict.quarantine,
          row.scan_attempts,
        ],
      );
      const updated = (Array.isArray(raw[0]) ? raw[0] : raw).length > 0;
      if (updated && verdict.quarantine) {
        await this.audit.record(manager, {
          action: ChatAuditAction.ATTACHMENT_QUARANTINED,
          actorUserId: null,
          actorRole: null,
          conversationId: row.conversation_id,
          targetType: "attachment",
          targetId: row.id,
          requestId: null,
          metadata: {
            scanStatus: verdict.status,
            engine: verdict.engine,
            threat: verdict.threat,
            error: verdict.error,
          },
        });
      }
      return updated;
    });
  }
}
