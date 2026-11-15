import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource, In } from "typeorm";
import {
  type ChatMessageType,
  type ChatSearchQuery,
  type ChatSearchResponse,
} from "@dhruto/contracts";
import { ChatConversation } from "../../database/entities/index.js";
import { type ChatRequestContext } from "../chat.context.js";
import { ChatAuthorizationService } from "./chat-authorization.service.js";

interface SearchRow {
  id: string;
  conversation_id: string;
  sequence: string;
  sender_user_id: string | null;
  type: ChatMessageType;
  snippet: string;
  created_at: Date;
}

const SNIPPET_LENGTH = 200;

/**
 * Authorized message search (PostgreSQL full-text, no external engine).
 *
 * The query is anchored on the caller's ACTIVE memberships (join), uses the
 * partial GIN index `IDX_chat_messages_content_fts` (identical expression and
 * `deleted_at IS NULL` predicate), is bounded by LIMIT, and results are then
 * re-checked for live eligibility (e.g. a reassigned rider). Internal notes
 * live in a separate table and are never searched here.
 */
@Injectable()
export class ChatSearchService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly authz: ChatAuthorizationService,
  ) {}

  async search(ctx: ChatRequestContext, query: ChatSearchQuery): Promise<ChatSearchResponse> {
    const actor = await this.authz.loadActorScope(ctx.user);
    if (query.conversationId) {
      await this.authz.requireMember(ctx.user, query.conversationId);
    }

    const params: unknown[] = [ctx.user.id, query.q];
    const where: string[] = [
      `m."deleted_at" IS NULL`,
      `to_tsvector('simple'::regconfig, coalesce(m."content", '')) @@ plainto_tsquery('simple'::regconfig, $2)`,
    ];
    if (query.conversationId) {
      params.push(query.conversationId);
      where.push(`m."conversation_id" = $${params.length}`);
    }
    if (query.from) {
      params.push(query.from);
      where.push(`m."createdAt" >= $${params.length}::timestamptz`);
    }
    if (query.to) {
      params.push(query.to);
      where.push(`m."createdAt" <= $${params.length}::timestamptz`);
    }
    params.push(query.limit);

    const rows: SearchRow[] = await this.dataSource.query(
      `SELECT m."id", m."conversation_id", m."sequence"::text AS "sequence", m."sender_user_id",
              m."type", left(m."content", ${SNIPPET_LENGTH}) AS "snippet", m."createdAt" AS "created_at"
         FROM "chat_messages" m
         JOIN "chat_participants" p
           ON p."conversation_id" = m."conversation_id" AND p."user_id" = $1 AND p."status" = 'ACTIVE'
        WHERE ${where.join(" AND ")}
        ORDER BY m."createdAt" DESC
        LIMIT $${params.length}`,
      params,
    );
    if (rows.length === 0) return { items: [] };

    const conversations = await this.dataSource.getRepository(ChatConversation).find({
      where: { id: In([...new Set(rows.map((r) => r.conversation_id))]) },
    });
    const eligible = new Set(
      (await this.authz.filterEligible(actor, conversations)).map((c) => c.id),
    );

    return {
      items: rows
        .filter((r) => eligible.has(r.conversation_id))
        .map((r) => ({
          messageId: r.id,
          conversationId: r.conversation_id,
          sequence: r.sequence,
          senderId: r.sender_user_id,
          type: r.type,
          snippet: r.snippet,
          createdAt: new Date(r.created_at).toISOString(),
        })),
    };
  }
}
