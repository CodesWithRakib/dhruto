import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { randomUUID } from "node:crypto";
import { EntityManager, Repository } from "typeorm";
import {
  ApiErrorCode,
  DOMAIN_EVENT_VERSION,
  DomainEventType,
  OutboxStatus,
  domainEventSchema,
  type DomainEvent,
} from "@dhruto/contracts";
import { EventOutbox } from "../database/entities/index.js";

export interface AppendEventInput {
  eventType: DomainEventType;
  aggregateType: string;
  aggregateId: string;
  requestId?: string | null;
  actorId?: string | null;
  payload: Record<string, unknown>;
}

/**
 * Transactional outbox — Phase 5 reliability core.
 * ------------------------------------------------------------------
 * Domain services append inside their business transaction, so a committed
 * state change always has its event stored atomically. The relay poller
 * fans out afterwards; slow providers or a down Redis can delay
 * communication but never lose or roll back the business fact.
 */
@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  constructor(
    @InjectRepository(EventOutbox)
    private readonly outboxRepo: Repository<EventOutbox>,
  ) {}

  async append(manager: EntityManager, input: AppendEventInput): Promise<EventOutbox> {
    const event: DomainEvent = {
      eventId: randomUUID(),
      eventType: input.eventType,
      version: DOMAIN_EVENT_VERSION,
      occurredAt: new Date().toISOString(),
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      requestId: input.requestId ?? randomUUID(),
      ...(input.actorId ? { actorId: input.actorId } : {}),
      payload: input.payload,
    };

    const parsed = domainEventSchema.safeParse(event);
    if (!parsed.success) {
      throw new BadRequestException({
        message: `Invalid domain event payload for ${input.eventType}`,
        error: ApiErrorCode.EVENT_INVALID,
      });
    }

    const row = await manager.getRepository(EventOutbox).save(
      manager.getRepository(EventOutbox).create({
        eventId: event.eventId,
        eventType: event.eventType,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        requestId: event.requestId,
        actorId: input.actorId ?? null,
        payload: event.payload as Record<string, unknown>,
        status: OutboxStatus.PENDING,
        attemptCount: 0,
        availableAt: new Date(),
      }),
    );

    this.logger.log(
      `OUTBOX_APPEND event=${event.eventType} id=${event.eventId} aggregate=${event.aggregateType}/${event.aggregateId}`,
    );
    return row;
  }

  async claimDueBatch(manager: EntityManager, limit: number): Promise<EventOutbox[]> {
    const rows = await manager
      .createQueryBuilder(EventOutbox, "outbox")
      .setLock("pessimistic_write")
      .setOnLocked("skip_locked")
      .where("outbox.status = :pending", { pending: OutboxStatus.PENDING })
      .andWhere("outbox.availableAt <= :now", { now: new Date() })
      .orderBy("outbox.availableAt", "ASC")
      .take(limit)
      .getMany();

    for (const row of rows) {
      row.status = OutboxStatus.PROCESSING;
      await manager.getRepository(EventOutbox).save(row);
    }
    return rows;
  }

  async markPublished(manager: EntityManager, id: string): Promise<void> {
    await manager.update(
      EventOutbox,
      { id },
      { status: OutboxStatus.PUBLISHED, publishedAt: new Date(), lastError: null },
    );
  }

  /**
   * Schedules the next attempt with exponential backoff (5s, 10s, 20s, ...
   * capped at 5 minutes). After 8 attempts the row is terminally FAILED for
   * the admin outbox view — the relay never loops forever.
   */
  async markAttemptFailed(manager: EntityManager, id: string, error: string): Promise<void> {
    const row = await manager.findOne(EventOutbox, { where: { id } });
    if (!row) return;
    const attempts = row.attemptCount + 1;
    if (attempts >= 8) {
      row.status = OutboxStatus.FAILED;
      row.attemptCount = attempts;
      row.lastError = error.slice(0, 1000);
    } else {
      const delayMs = Math.min(2 ** Math.min(attempts, 6) * 5000, 5 * 60 * 1000);
      row.status = OutboxStatus.PENDING;
      row.attemptCount = attempts;
      row.availableAt = new Date(Date.now() + delayMs);
      row.lastError = error.slice(0, 1000);
    }
    await manager.getRepository(EventOutbox).save(row);
  }

  async replay(id: string): Promise<EventOutbox | null> {
    const row = await this.outboxRepo.findOne({ where: { id } });
    if (!row || row.status !== OutboxStatus.FAILED) return null;
    row.status = OutboxStatus.PENDING;
    row.availableAt = new Date();
    row.lastError = null;
    return this.outboxRepo.save(row);
  }

  async stats(): Promise<{
    pending: number;
    failed: number;
    publishedLastHour: number;
    oldestPendingAgeMs: number | null;
  }> {
    const [pending, failed] = await Promise.all([
      this.outboxRepo.count({ where: { status: OutboxStatus.PENDING } }),
      this.outboxRepo.count({ where: { status: OutboxStatus.FAILED } }),
    ]);
    const oldest = await this.outboxRepo.findOne({
      where: { status: OutboxStatus.PENDING },
      order: { availableAt: "ASC" },
      select: ["availableAt"],
    });
    const publishedLastHour = await this.outboxRepo
      .createQueryBuilder("o")
      .where("o.status = :status", { status: OutboxStatus.PUBLISHED })
      .andWhere("o.publishedAt >= :since", { since: new Date(Date.now() - 3600_1000) })
      .getCount();
    return {
      pending,
      failed,
      publishedLastHour,
      oldestPendingAgeMs: oldest ? Math.max(0, Date.now() - oldest.availableAt.getTime()) : null,
    };
  }

  async failedRows(limit = 50): Promise<EventOutbox[]> {
    return this.outboxRepo.find({
      where: { status: OutboxStatus.FAILED },
      order: { createdAt: "DESC" },
      take: Math.min(limit, 200),
    });
  }
}
