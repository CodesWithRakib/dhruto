import { type DomainEventType } from "@dhruto/contracts";

/**
 * Port between the transactional outbox relay and realtime delivery.
 *
 * The relay (IntegrationsModule) must not import the chat realtime module
 * (ChatModule already imports IntegrationsModule for OutboxService), so the
 * realtime side registers an implementation under this token from a global
 * module and the relay injects it optionally.
 *
 * Contract:
 *  - called only for COMMITTED outbox rows (the relay runs after commit);
 *  - must be idempotent: the relay may deliver the same event more than once
 *    (retries, crash between emit and markPublished);
 *  - throwing marks the outbox attempt failed, so the existing backoff/DLQ
 *    machinery retries it — throw when distribution is known to be broken;
 *  - must never write domain state.
 */
export const REALTIME_FANOUT_HANDLER = Symbol("REALTIME_FANOUT_HANDLER");

export interface RealtimeOutboxEvent {
  eventId: string;
  eventType: DomainEventType;
  aggregateType: string;
  aggregateId: string;
  actorId: string | null;
  payload: Record<string, unknown>;
  createdAt: Date;
}

export interface RealtimeFanoutHandler {
  handle(event: RealtimeOutboxEvent): Promise<void>;
}
