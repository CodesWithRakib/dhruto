import { type DomainEventType } from "@dhruto/contracts";

/**
 * Port between the transactional outbox relay and the communication
 * platform's logistics sync (Phase 5). Same shape as the realtime port: the
 * relay (IntegrationsModule) cannot import ChatModule, so the chat side
 * registers an implementation under this token from a global module and the
 * relay injects it optionally.
 *
 * Contract:
 *  - called only for COMMITTED parcel lifecycle outbox rows, so a rolled-back
 *    business transaction can never produce a chat effect;
 *  - the handler writes chat state (membership reconciliation, SYSTEM_EVENT
 *    messages, chat outbox events) in ITS OWN transaction — all or nothing
 *    per event;
 *  - must be idempotent per `eventId`: the relay may deliver the same event
 *    more than once (retries, crash between handling and markPublished);
 *  - throwing marks the outbox attempt failed, so the existing backoff/DLQ
 *    machinery retries it.
 */
export const CHAT_LOGISTICS_HANDLER = Symbol("CHAT_LOGISTICS_HANDLER");

export interface ChatLogisticsOutboxEvent {
  eventId: string;
  eventType: DomainEventType;
  aggregateId: string;
  requestId: string | null;
  payload: Record<string, unknown>;
}

export interface ChatLogisticsHandler {
  handle(event: ChatLogisticsOutboxEvent): Promise<void>;
}
