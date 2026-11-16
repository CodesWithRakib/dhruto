import { Injectable } from "@nestjs/common";
import { type EntityManager } from "typeorm";
import { type DomainEventType } from "@dhruto/contracts";
import { OutboxService } from "../../integrations/outbox.service.js";
import { CHAT_AGGREGATE_TYPE } from "../chat.config.js";
import { type ChatRequestContext } from "../chat.context.js";

/** Scalar-only payload: chat events carry identifiers and state, never message content. */
export type ChatEventPayload = Record<string, string | number | boolean | null | readonly string[]>;

/**
 * Appends chat domain events to the existing transactional outbox
 * (`event_outbox`) inside the caller's transaction, so a rolled-back write can
 * never publish an event. Every chat event type is registered in the relay's
 * FANOUT table (currently with no notification targets; Phase 3 adds the
 * realtime fan-out).
 */
@Injectable()
export class ChatEventsService {
  constructor(private readonly outbox: OutboxService) {}

  async append(
    manager: EntityManager,
    ctx: ChatRequestContext,
    eventType: DomainEventType,
    conversationId: string,
    payload: ChatEventPayload,
  ): Promise<void> {
    await this.outbox.append(manager, {
      eventType,
      aggregateType: CHAT_AGGREGATE_TYPE,
      aggregateId: conversationId,
      requestId: ctx.requestId,
      actorId: ctx.user.id,
      payload: { conversationId, ...payload },
    });
  }

  /**
   * Workflow-originated chat event (Phase 5 logistics sync): no acting user —
   * the cause is a committed domain event, referenced by `requestId`.
   */
  async appendWorkflow(
    manager: EntityManager,
    requestId: string | null,
    eventType: DomainEventType,
    conversationId: string,
    payload: ChatEventPayload,
  ): Promise<void> {
    await this.outbox.append(manager, {
      eventType,
      aggregateType: CHAT_AGGREGATE_TYPE,
      aggregateId: conversationId,
      requestId,
      payload: { conversationId, ...payload },
    });
  }
}
