import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { DomainEventType, computeChatUnreadCount, type ChatCursorState } from "@dhruto/contracts";
import { ChatConversation, ChatParticipant } from "../../database/entities/index.js";
import { chatErrors } from "../chat.errors.js";
import { type ChatRequestContext } from "../chat.context.js";
import { ChatAuthorizationService } from "./chat-authorization.service.js";
import { ChatEventsService } from "./chat-events.service.js";

type CursorKind = "read" | "delivered";

interface CursorRow {
  last_read_sequence: string;
  last_delivered_sequence: string;
}

/**
 * Read / delivered cursors (ADR-004). One UPDATE per call, no per-message
 * receipt rows:
 *
 *   - monotonic: the WHERE clause only matches when the new value is
 *     strictly greater, so a cursor can never move backwards;
 *   - bounded: the new value must be <= the conversation's
 *     last_message_sequence (validated in the same statement);
 *   - read implies delivered (GREATEST keeps delivered >= read, which the
 *     CHK_chat_participants_cursors constraint also enforces).
 *
 * An outbox event is appended only when the cursor actually advanced.
 */
@Injectable()
export class ChatCursorService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly authz: ChatAuthorizationService,
    private readonly events: ChatEventsService,
  ) {}

  markRead(
    ctx: ChatRequestContext,
    conversationId: string,
    sequence: string,
  ): Promise<ChatCursorState> {
    return this.advance(ctx, conversationId, sequence, "read");
  }

  markDelivered(
    ctx: ChatRequestContext,
    conversationId: string,
    sequence: string,
  ): Promise<ChatCursorState> {
    return this.advance(ctx, conversationId, sequence, "delivered");
  }

  private async advance(
    ctx: ChatRequestContext,
    conversationId: string,
    sequence: string,
    kind: CursorKind,
  ): Promise<ChatCursorState> {
    const { conversation } = await this.authz.requireMember(ctx.user, conversationId);
    if (BigInt(sequence) > BigInt(conversation.lastMessageSequence))
      throw chatErrors.invalidSequence();

    const setClause =
      kind === "read"
        ? `"last_read_sequence" = $3::bigint,
           "last_delivered_sequence" = GREATEST("last_delivered_sequence", $3::bigint)`
        : `"last_delivered_sequence" = $3::bigint`;
    const guardColumn = kind === "read" ? "last_read_sequence" : "last_delivered_sequence";

    return this.dataSource.transaction(async (manager) => {
      const [rows] = (await manager.query(
        `UPDATE "chat_participants"
            SET ${setClause}, "updatedAt" = now()
          WHERE "conversation_id" = $1
            AND "user_id" = $2
            AND "status" = 'ACTIVE'
            AND "${guardColumn}" < $3::bigint
            AND $3::bigint <= (SELECT "last_message_sequence" FROM "chat_conversations" WHERE "id" = $1)
          RETURNING "last_read_sequence", "last_delivered_sequence"`,
        [conversationId, ctx.user.id, sequence],
      )) as [CursorRow[], number];

      let state: CursorRow;
      const advanced = rows[0];
      if (advanced) {
        state = advanced;
        await this.events.append(
          manager,
          ctx,
          kind === "read"
            ? DomainEventType.CHAT_MESSAGE_READ
            : DomainEventType.CHAT_MESSAGE_DELIVERED,
          conversationId,
          {
            userId: ctx.user.id,
            lastReadSequence: state.last_read_sequence,
            lastDeliveredSequence: state.last_delivered_sequence,
          },
        );
      } else {
        // No-op (already at/after `sequence`): report the current state.
        const current = await manager.getRepository(ChatParticipant).findOneOrFail({
          where: { conversationId, userId: ctx.user.id },
          select: ["lastReadSequence", "lastDeliveredSequence"],
        });
        state = {
          last_read_sequence: current.lastReadSequence,
          last_delivered_sequence: current.lastDeliveredSequence,
        };
      }
      const head = await manager
        .getRepository(ChatConversation)
        .findOneOrFail({ where: { id: conversationId }, select: ["lastMessageSequence"] });
      return {
        conversationId,
        lastReadSequence: state.last_read_sequence,
        lastDeliveredSequence: state.last_delivered_sequence,
        unreadCount: computeChatUnreadCount(head.lastMessageSequence, state.last_read_sequence),
      };
    });
  }
}
