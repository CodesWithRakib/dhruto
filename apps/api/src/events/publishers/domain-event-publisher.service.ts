import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { EntityManager } from "typeorm";
import { OutboxService } from "../../integrations/outbox.service.js";
import { DomainEvent } from "../base/domain-event.base.js";
import { EventOutbox } from "../../database/entities/index.js";
import { DomainEventType } from "@dhruto/contracts";

/**
 * Enterprise Event Publisher (EDA Best Practice).
 *
 * Unifies:
 * 1. Transactional Outbox persistence (for zero-data-loss cross-process delivery)
 * 2. In-Process Domain Event emission (via EventEmitter2 for decoupled subscribers)
 */
@Injectable()
export class DomainEventPublisher {
  private readonly logger = new Logger(DomainEventPublisher.name);

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly outboxService: OutboxService,
  ) {}

  /**
   * Publishes a domain event within an active TypeORM transaction.
   * Atomically records the event in the outbox table and dispatches it
   * to in-memory event listeners.
   */
  async publish<T extends DomainEvent<unknown>>(
    manager: EntityManager,
    event: T,
  ): Promise<EventOutbox> {
    // 1. Transactional Outbox persistence
    const outboxRow = await this.outboxService.append(manager, {
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      eventType: event.eventType as DomainEventType,
      actorId: event.merchantId,
      payload: (event.payload && typeof event.payload === "object" ? event.payload : {}) as Record<string, unknown>,
    });

    this.logger.debug(
      `DOMAIN_EVENT_PUBLISHED event=${event.eventName} type=${event.eventType} id=${event.eventId} aggregate=${event.aggregateType}/${event.aggregateId}`,
    );

    // 2. In-process domain event dispatch
    try {
      this.eventEmitter.emit(event.eventName, event);
      this.eventEmitter.emit("domain.*", event);
    } catch (err) {
      this.logger.warn(`In-process event listener error for ${event.eventName}: ${(err as Error).message}`);
    }

    return outboxRow;
  }

  /**
   * Publishes an in-memory domain event directly without outbox persistence.
   */
  publishLocal<T extends DomainEvent<unknown>>(event: T): void {
    this.logger.debug(`LOCAL_EVENT_PUBLISHED event=${event.eventName} id=${event.eventId}`);
    this.eventEmitter.emit(event.eventName, event);
    this.eventEmitter.emit("domain.*", event);
  }
}
