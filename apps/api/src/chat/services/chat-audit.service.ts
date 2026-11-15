import { Injectable } from "@nestjs/common";
import { type EntityManager } from "typeorm";
import { type ChatAuditAction } from "@dhruto/contracts";
import { ChatAuditLog, type UserRole } from "../../database/entities/index.js";

export interface ChatAuditEntry {
  action: ChatAuditAction;
  actorUserId: string | null;
  actorRole: UserRole | null;
  conversationId?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  reason?: string | null;
  requestId?: string | null;
  /** Secret-free, PII-minimal context (ids, statuses, counts). Never message content. */
  metadata?: Record<string, unknown> | null;
}

/**
 * Writes append-only `chat_audit_logs` rows. Always called with the business
 * transaction's EntityManager, so an audited action and its audit record
 * commit (or roll back) together.
 */
@Injectable()
export class ChatAuditService {
  async record(manager: EntityManager, entry: ChatAuditEntry): Promise<void> {
    const repo = manager.getRepository(ChatAuditLog);
    // `save` (INSERT ... RETURNING) accepts jsonb Record columns; `insert`'s
    // QueryDeepPartial typing does not. Rows are never updated (trigger).
    await repo.save(
      repo.create({
        action: entry.action,
        actorUserId: entry.actorUserId,
        actorRole: entry.actorRole,
        conversationId: entry.conversationId ?? null,
        targetType: entry.targetType ?? null,
        targetId: entry.targetId ?? null,
        reason: entry.reason?.trim() || null,
        requestId: entry.requestId ?? null,
        metadata: entry.metadata ?? null,
      }),
    );
  }
}
