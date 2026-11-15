import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource, In, type EntityManager } from "typeorm";
import {
  ChatParticipantStatus,
  type ChatMessageItem,
  type ChatMessagePage,
  type ChatPageSender,
  type ChatParticipantItem,
  type ChatReactionSummary,
} from "@dhruto/contracts";
import { ChatAttachment, ChatMessage } from "../../database/entities/index.js";
import { toMessageItem } from "../chat.mapper.js";

export interface HistoryWindow {
  beforeSequence?: string;
  afterSequence?: string;
  limit: number;
}

interface ReactionRow {
  message_id: string;
  reaction: string;
  count: number;
  reacted_by_me: boolean;
}

interface ParticipantRow {
  user_id: string;
  name: string;
  platform_role: string;
  role: ChatParticipantItem["role"];
  status: ChatParticipantItem["status"];
  joined_at: Date;
  left_at: Date | null;
  last_read_sequence: string;
  last_delivered_sequence: string;
}

/**
 * Read model for messages and participants. Authorization is the caller's
 * responsibility (participant or audited staff path); this service only
 * builds bounded, N+1-free pages:
 *
 *   history page = 1 keyset query on UQ_chat_messages_conversation_sequence
 *                + 1 attachments query + 1 reactions aggregate + 1 senders query
 */
@Injectable()
export class ChatMessageReaderService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  private em(manager?: EntityManager): EntityManager {
    return manager ?? this.dataSource.manager;
  }

  /**
   * Keyset page in chronological order. `beforeSequence` (or none) scans the
   * index backwards for the newest N; `afterSequence` scans forwards.
   */
  async history(
    conversationId: string,
    viewerUserId: string | null,
    window: HistoryWindow,
    manager?: EntityManager,
  ): Promise<ChatMessagePage> {
    const forward = window.afterSequence !== undefined;
    const qb = this.em(manager)
      .getRepository(ChatMessage)
      .createQueryBuilder("m")
      .where("m.conversationId = :conversationId", { conversationId });
    if (window.beforeSequence !== undefined) {
      qb.andWhere("m.sequence < :before", { before: window.beforeSequence });
    }
    if (forward) {
      qb.andWhere("m.sequence > :after", { after: window.afterSequence });
    }
    const rows = await qb
      .orderBy("m.sequence", forward ? "ASC" : "DESC")
      .limit(window.limit + 1)
      .getMany();

    const hasMore = rows.length > window.limit;
    const page = rows.slice(0, window.limit);
    if (!forward) page.reverse(); // chronological for clients

    const items = await this.hydrate(page, viewerUserId, manager);
    return {
      items,
      hasMore,
      nextBeforeSequence: !forward && hasMore ? (page[0]?.sequence ?? null) : null,
      nextAfterSequence: page[page.length - 1]?.sequence ?? window.afterSequence ?? null,
      senders: await this.senders(page, manager),
    };
  }

  async getMessageItem(
    message: ChatMessage,
    viewerUserId: string | null,
    manager?: EntityManager,
  ): Promise<ChatMessageItem> {
    const [item] = await this.hydrate([message], viewerUserId, manager);
    if (!item) throw new Error("hydrate() must return one item per message");
    return item;
  }

  /** Attaches attachments + reaction summaries to messages (2 queries per batch). */
  async hydrate(
    messages: readonly ChatMessage[],
    viewerUserId: string | null,
    manager?: EntityManager,
  ): Promise<ChatMessageItem[]> {
    const live = messages.filter((m) => m.deletedAt === null).map((m) => m.id);
    if (live.length === 0) return messages.map((m) => toMessageItem(m));
    const em = this.em(manager);

    const [attachments, reactionRows] = await Promise.all([
      em.getRepository(ChatAttachment).find({
        where: { messageId: In(live) },
        order: { createdAt: "ASC" },
      }),
      em.query(
        `SELECT "message_id", "reaction", count(*)::int AS "count",
                coalesce(bool_or("user_id" = $2), false) AS "reacted_by_me"
           FROM "chat_message_reactions"
          WHERE "message_id" = ANY($1::uuid[])
          GROUP BY "message_id", "reaction"
          ORDER BY min("createdAt")`,
        [live, viewerUserId],
      ) as Promise<ReactionRow[]>,
    ]);

    return messages.map((m) => {
      const reactions: ChatReactionSummary[] = reactionRows
        .filter((r) => r.message_id === m.id)
        .map((r) => ({ reaction: r.reaction, count: r.count, reactedByMe: r.reacted_by_me }));
      return toMessageItem(
        m,
        attachments.filter((a) => a.messageId === m.id),
        reactions,
      );
    });
  }

  private async senders(
    messages: readonly ChatMessage[],
    manager?: EntityManager,
  ): Promise<ChatPageSender[]> {
    const ids = [
      ...new Set(messages.map((m) => m.senderUserId).filter((id): id is string => id !== null)),
    ];
    if (ids.length === 0) return [];
    const rows: Array<{ id: string; name: string; role: string }> = await this.em(manager).query(
      `SELECT "id", "name", "role"::text AS "role" FROM "users" WHERE "id" = ANY($1::uuid[])`,
      [ids],
    );
    return rows.map((r) => ({ userId: r.id, displayName: r.name, platformRole: r.role }));
  }

  /** Active participants with display info (no phone/email). */
  async activeParticipants(
    conversationId: string,
    manager?: EntityManager,
  ): Promise<ChatParticipantItem[]> {
    const rows: ParticipantRow[] = await this.em(manager).query(
      `SELECT p."user_id", u."name", u."role"::text AS "platform_role", p."role", p."status",
              p."joined_at", p."left_at", p."last_read_sequence", p."last_delivered_sequence"
         FROM "chat_participants" p
         JOIN "users" u ON u."id" = p."user_id"
        WHERE p."conversation_id" = $1 AND p."status" = $2
        ORDER BY p."joined_at" ASC
        LIMIT 200`,
      [conversationId, ChatParticipantStatus.ACTIVE],
    );
    return rows.map((r) => ({
      userId: r.user_id,
      displayName: r.name,
      platformRole: r.platform_role,
      role: r.role,
      status: r.status,
      joinedAt: new Date(r.joined_at).toISOString(),
      leftAt: r.left_at ? new Date(r.left_at).toISOString() : null,
      lastReadSequence: r.last_read_sequence,
      lastDeliveredSequence: r.last_delivered_sequence,
    }));
  }
}
