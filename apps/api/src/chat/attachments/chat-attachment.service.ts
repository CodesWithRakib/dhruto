import { createHash, randomUUID } from "node:crypto";
import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import {
  CHAT_UPLOAD_POLICY,
  ChatAttachmentStatus,
  ChatAuditAction,
  ChatParticipantCapability,
  checkChatUploadPolicy,
  isChatAttachmentMimeType,
  type ChatAttachmentDownload,
  type ChatAttachmentItem,
  type ChatAttachmentUploadTicket,
  type CreateChatAttachmentRequest,
} from "@dhruto/contracts";
import { ChatAttachment, ChatMessage, type UserRole } from "../../database/entities/index.js";
import { chatErrors } from "../chat.errors.js";
import { type ChatRequestContext } from "../chat.context.js";
import { toAttachmentItem } from "../chat.mapper.js";
import {
  ChatAuthorizationService,
  type ChatMemberAccess,
} from "../services/chat-authorization.service.js";
import { ChatAuditService } from "../services/chat-audit.service.js";
import {
  attachmentStorageKey,
  loadChatAttachmentTunables,
  type ChatAttachmentTunables,
} from "./attachment.config.js";
import { ChatAttachmentMetrics } from "./chat-attachment-metrics.js";
import { SIGNATURE_BYTES, matchesSignature } from "./file-signature.js";
import { CHAT_OBJECT_STORAGE, type ChatObjectStorage } from "./object-storage.port.js";

/** Why a stored object was rejected (audit metadata + metrics; never shown raw to clients). */
export type AttachmentRejectReason = "missing" | "size" | "checksum" | "signature" | "type";

/** Holder so the storage port can be absent (bucket not configured → 503). */
export class ChatStorageHolder {
  constructor(readonly storage: ChatObjectStorage | null) {}
}

interface VerifiedObject {
  sizeBytes: number;
  sha256: string;
  head: Uint8Array;
}

/**
 * Secure attachment lifecycle (Phase 6):
 *
 *   reserve  → PENDING row + presigned PUT for a server-generated key
 *   upload   → client PUTs bytes directly to private object storage
 *   complete → server streams the object: exact size, SHA-256 and magic
 *              bytes must match → UPLOADED, otherwise REJECTED (+ audit,
 *              object deleted after commit)
 *   send     → existing message send links UPLOADED, unused, own,
 *              same-conversation attachments (ChatMessageService)
 *   download → short-lived presigned GET for current, eligible participants
 *
 * Nothing the client declares (type, size, name, key, ownership, status) is
 * trusted: declarations are only compared with what the server measured.
 */
@Injectable()
export class ChatAttachmentService {
  private readonly logger = new Logger(ChatAttachmentService.name);
  private readonly tunables: ChatAttachmentTunables;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly authz: ChatAuthorizationService,
    private readonly audit: ChatAuditService,
    private readonly metrics: ChatAttachmentMetrics,
    @Inject(CHAT_OBJECT_STORAGE) private readonly holder: ChatStorageHolder,
  ) {
    this.tunables = loadChatAttachmentTunables();
  }

  private storage(): ChatObjectStorage {
    if (!this.holder.storage) throw chatErrors.storageUnavailable();
    return this.holder.storage;
  }

  /** Wraps a storage call: provider errors become 503 and are counted, never leaked. */
  private async storageCall<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      this.metrics.increment("storageErrors");
      const name = error instanceof Error ? error.name : "unknown";
      this.logger.error(`chat.attachment.storage_error operation=${operation} error=${name}`);
      throw chatErrors.storageUnavailable();
    }
  }

  /* ---------------------------------------------------------------- */
  /* Reserve                                                           */
  /* ---------------------------------------------------------------- */

  async reserve(
    ctx: ChatRequestContext,
    conversationId: string,
    req: CreateChatAttachmentRequest,
  ): Promise<ChatAttachmentUploadTicket> {
    const storage = this.storage();
    // Same gate as sending a message: ACTIVE, eligible, SEND_MESSAGE, writable.
    await this.authz.requireMember(ctx.user, conversationId, {
      capability: ChatParticipantCapability.SEND_MESSAGE,
      requireWritable: true,
    });
    if (checkChatUploadPolicy(req) !== null) {
      throw chatErrors.attachmentInvalid("File type, extension or size is not allowed");
    }

    const pending = await this.dataSource.getRepository(ChatAttachment).count({
      where: { uploaderUserId: ctx.user.id, status: ChatAttachmentStatus.PENDING },
    });
    if (pending >= this.tunables.maxPendingPerUser) {
      throw chatErrors.limitExceeded("Too many unfinished uploads. Finish or cancel some first.");
    }

    const id = randomUUID();
    const storageKey = attachmentStorageKey(conversationId, id);
    await this.dataSource.getRepository(ChatAttachment).insert({
      id,
      conversationId,
      uploaderUserId: ctx.user.id,
      storageKey,
      originalFilename: req.originalFilename,
      mimeType: req.mimeType,
      sizeBytes: req.sizeBytes,
      checksumSha256: req.checksumSha256,
      status: ChatAttachmentStatus.PENDING,
    });
    const row = await this.dataSource.getRepository(ChatAttachment).findOneByOrFail({ id });

    const expiresAt = new Date(Date.now() + this.tunables.uploadUrlTtlSeconds * 1000);
    const upload = await this.storageCall("presign_put", () =>
      storage.presignPut(storageKey, {
        contentType: req.mimeType,
        expiresInSeconds: this.tunables.uploadUrlTtlSeconds,
      }),
    );
    this.metrics.increment("reserved");
    this.logger.log(
      `chat.attachment.reserved attachment=${id} conversation=${conversationId} mime=${req.mimeType} size=${req.sizeBytes}`,
    );
    return {
      attachment: toAttachmentItem(row),
      upload: {
        method: "PUT",
        url: upload.url,
        headers: upload.headers,
        expiresAt: expiresAt.toISOString(),
      },
    };
  }

  /* ---------------------------------------------------------------- */
  /* Complete                                                          */
  /* ---------------------------------------------------------------- */

  /** Loads an attachment the caller uploaded; anything else is indistinguishable from missing. */
  private async ownAttachment(
    ctx: ChatRequestContext,
    attachmentId: string,
  ): Promise<ChatAttachment> {
    const row = await this.dataSource.getRepository(ChatAttachment).findOneBy({ id: attachmentId });
    if (!row || row.uploaderUserId !== ctx.user.id) throw chatErrors.attachmentNotFound();
    return row;
  }

  private async requireMemberOrNotFound(
    ctx: ChatRequestContext,
    conversationId: string,
    capability?: ChatParticipantCapability,
  ): Promise<ChatMemberAccess> {
    try {
      return await this.authz.requireMember(
        ctx.user,
        conversationId,
        capability ? { capability } : {},
      );
    } catch (error) {
      if (error instanceof NotFoundException) throw chatErrors.attachmentNotFound();
      throw error;
    }
  }

  /**
   * Idempotent: an already-UPLOADED attachment is returned as is; a REJECTED
   * one stays rejected. Concurrent completions race on a conditional update.
   */
  async complete(ctx: ChatRequestContext, attachmentId: string): Promise<ChatAttachmentItem> {
    const storage = this.storage();
    const row = await this.ownAttachment(ctx, attachmentId);
    const { actor } = await this.requireMemberOrNotFound(
      ctx,
      row.conversationId,
      ChatParticipantCapability.SEND_MESSAGE,
    );
    const reject = (reason: AttachmentRejectReason) => this.reject(ctx, actor.role, row, reason);

    if (row.status === ChatAttachmentStatus.UPLOADED) return toAttachmentItem(row);
    if (row.status === ChatAttachmentStatus.REJECTED) {
      throw chatErrors.attachmentInvalid("The uploaded file was rejected");
    }
    if (row.createdAt.getTime() + this.tunables.pendingTtlSeconds * 1000 < Date.now()) {
      throw chatErrors.attachmentInvalid("The upload has expired. Please upload the file again.");
    }

    const info = await this.storageCall("head", () => storage.head(row.storageKey));
    if (!info) {
      // Not uploaded (yet): the client may still finish the PUT and retry.
      throw chatErrors.attachmentInvalid("The file has not been uploaded yet");
    }
    if (!isChatAttachmentMimeType(row.mimeType)) return reject("type");
    const limit = CHAT_UPLOAD_POLICY[row.mimeType].maxBytes;
    if (info.sizeBytes !== row.sizeBytes || info.sizeBytes > limit) return reject("size");

    const verified = await this.storageCall("read", () =>
      this.measure(storage, row.storageKey, limit),
    );
    if (!verified) return reject("missing");
    if (verified.sizeBytes !== row.sizeBytes) return reject("size");
    if (!matchesSignature(row.mimeType, verified.head)) return reject("signature");
    if (verified.sha256 !== row.checksumSha256) return reject("checksum");

    const updated = await this.dataSource
      .getRepository(ChatAttachment)
      .update(
        { id: row.id, status: ChatAttachmentStatus.PENDING },
        { status: ChatAttachmentStatus.UPLOADED, uploadedAt: new Date() },
      );
    const current = await this.dataSource
      .getRepository(ChatAttachment)
      .findOneByOrFail({ id: row.id });
    if (updated.affected) {
      this.metrics.increment("completed");
      this.logger.log(`chat.attachment.completed attachment=${row.id} size=${verified.sizeBytes}`);
    }
    if (current.status !== ChatAttachmentStatus.UPLOADED) {
      throw chatErrors.attachmentInvalid("The uploaded file was rejected");
    }
    return toAttachmentItem(current);
  }

  /**
   * Streams the object once: byte count, SHA-256 and the first bytes. Stops
   * early (as a size mismatch) when the stream exceeds `limit`, so an object
   * replaced after HEAD cannot make the server read unbounded data.
   */
  private async measure(
    storage: ChatObjectStorage,
    key: string,
    limit: number,
  ): Promise<VerifiedObject | null> {
    const body = await storage.read(key);
    if (!body) return null;
    const hash = createHash("sha256");
    const head = new Uint8Array(SIGNATURE_BYTES);
    let headLength = 0;
    let sizeBytes = 0;
    for await (const chunk of body) {
      sizeBytes += chunk.byteLength;
      if (sizeBytes > limit) return { sizeBytes, sha256: "", head: head.subarray(0, headLength) };
      if (headLength < SIGNATURE_BYTES) {
        const take = Math.min(SIGNATURE_BYTES - headLength, chunk.byteLength);
        head.set(chunk.subarray(0, take), headLength);
        headLength += take;
      }
      hash.update(chunk);
    }
    return { sizeBytes, sha256: hash.digest("hex"), head: head.subarray(0, headLength) };
  }

  private async reject(
    ctx: ChatRequestContext,
    actorRole: UserRole,
    row: ChatAttachment,
    reason: AttachmentRejectReason,
  ): Promise<never> {
    const changed = await this.dataSource.transaction(async (manager) => {
      const result = await manager
        .getRepository(ChatAttachment)
        .update(
          { id: row.id, status: ChatAttachmentStatus.PENDING },
          { status: ChatAttachmentStatus.REJECTED },
        );
      if (!result.affected) return false;
      await this.audit.record(manager, {
        action: ChatAuditAction.ATTACHMENT_REJECTED,
        actorUserId: ctx.user.id,
        actorRole,
        conversationId: row.conversationId,
        targetType: "attachment",
        targetId: row.id,
        requestId: ctx.requestId,
        metadata: { reason, mimeType: row.mimeType, declaredSize: row.sizeBytes },
      });
      return true;
    });
    if (changed) {
      this.metrics.rejected(reason);
      this.logger.warn(`chat.attachment.rejected attachment=${row.id} reason=${reason}`);
      // After commit; a failure here is retried by the cleanup job (REJECTED rows).
      await this.holder.storage
        ?.delete(row.storageKey)
        .catch(() => this.metrics.increment("storageErrors"));
    }
    throw chatErrors.attachmentInvalid(
      reason === "signature"
        ? "The file content does not match its type"
        : reason === "checksum"
          ? "The uploaded file is corrupted. Please try again."
          : "The uploaded file does not match what was declared",
    );
  }

  /* ---------------------------------------------------------------- */
  /* Cancel (unsent only)                                              */
  /* ---------------------------------------------------------------- */

  async cancel(
    ctx: ChatRequestContext,
    attachmentId: string,
  ): Promise<{ id: string; deleted: true }> {
    const row = await this.ownAttachment(ctx, attachmentId);
    if (row.messageId !== null) {
      throw chatErrors.attachmentInvalid("Sent attachments are removed by deleting the message");
    }
    // Claim the row first (committed) so a concurrent send cannot link it;
    // only then delete the object.
    const result = await this.dataSource
      .createQueryBuilder()
      .delete()
      .from(ChatAttachment)
      .where(`"id" = :id AND "message_id" IS NULL AND "uploader_user_id" = :uploader`, {
        id: row.id,
        uploader: ctx.user.id,
      })
      .execute();
    if (!result.affected) {
      throw chatErrors.attachmentInvalid("Sent attachments are removed by deleting the message");
    }
    this.metrics.increment("cancelled");
    await this.holder.storage
      ?.delete(row.storageKey)
      .catch(() => this.metrics.increment("storageErrors"));
    return { id: row.id, deleted: true };
  }

  /* ---------------------------------------------------------------- */
  /* Download                                                          */
  /* ---------------------------------------------------------------- */

  /**
   * Short-lived presigned GET. Requires: current, eligible membership of the
   * attachment's conversation (live check, like every chat read), status
   * UPLOADED, and either a non-deleted message or — before sending — the
   * uploader. Everything else is a 404.
   */
  async download(
    ctx: ChatRequestContext,
    attachmentId: string,
    options: { forceDownload?: boolean } = {},
  ): Promise<ChatAttachmentDownload> {
    const storage = this.storage();
    const row = await this.dataSource.getRepository(ChatAttachment).findOneBy({ id: attachmentId });
    const deny = (why: string): never => {
      this.metrics.increment("downloadDenied");
      this.logger.warn(`chat.attachment.download_denied attachment=${attachmentId} reason=${why}`);
      throw chatErrors.attachmentNotFound();
    };
    if (!row) return deny("unknown");
    try {
      await this.authz.requireMember(ctx.user, row.conversationId);
    } catch (error) {
      if (error instanceof NotFoundException) return deny("not_member");
      throw error;
    }
    if (row.status !== ChatAttachmentStatus.UPLOADED || !isChatAttachmentMimeType(row.mimeType)) {
      return deny("not_ready");
    }
    if (row.messageId === null) {
      if (row.uploaderUserId !== ctx.user.id) return deny("unsent");
    } else {
      const message = await this.dataSource
        .getRepository(ChatMessage)
        .findOne({ where: { id: row.messageId }, select: ["id", "deletedAt"] });
      if (!message || message.deletedAt) return deny("message_deleted");
    }

    const kind = CHAT_UPLOAD_POLICY[row.mimeType].kind;
    // Documents always download; images/audio render inline unless a download is requested.
    const disposition = kind === "document" || options.forceDownload ? "attachment" : "inline";
    const expiresAt = new Date(Date.now() + this.tunables.downloadUrlTtlSeconds * 1000);
    const url = await this.storageCall("presign_get", () =>
      storage.presignGet(row.storageKey, {
        expiresInSeconds: this.tunables.downloadUrlTtlSeconds,
        contentType: row.mimeType,
        disposition,
        filename: row.originalFilename,
      }),
    );
    this.metrics.increment("downloadAuthorized");
    return { url, expiresAt: expiresAt.toISOString(), disposition };
  }
}
