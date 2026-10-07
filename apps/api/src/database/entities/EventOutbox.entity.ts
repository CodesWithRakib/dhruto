import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from './Base.entity.js';
import { DomainEventType, OutboxStatus } from '@dhruto/contracts';

export { DomainEventType, OutboxStatus };

/**
 * Transactional outbox — Phase 5 reliability core.
 *
 * Domain services append rows inside their business transaction, so a
 * committed state change always has its event stored atomically. A poller
 * claims PENDING rows (SKIP LOCKED), fans out to notifications/webhooks,
 * and marks PUBLISHED. Failures back off and eventually land in FAILED for
 * the DLQ view. The poller never mutates domain state — only this table.
 */
@Entity('event_outbox')
@Index(['status', 'availableAt'])
@Index(['aggregateType', 'aggregateId'])
export class EventOutbox extends BaseEntity {
  @Column({ name: 'event_id', type: 'uuid', unique: true })
  eventId: string;

  @Column({ name: 'event_type', type: 'varchar', length: 100 })
  eventType: string;

  @Column({ name: 'aggregate_type', type: 'varchar', length: 64 })
  aggregateType: string;

  @Column({ name: 'aggregate_id', type: 'uuid' })
  aggregateId: string;

  @Column({ name: 'request_id', type: 'varchar', length: 128, nullable: true })
  requestId: string | null;

  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId: string | null;

  /** Secret-free event payload (validated against the versioned contract). */
  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;

  @Column({ type: 'enum', enum: OutboxStatus, default: OutboxStatus.PENDING })
  status: OutboxStatus;

  @Column({ name: 'attempt_count', type: 'int', default: 0 })
  attemptCount: number;

  @Column({ name: 'available_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  availableAt: Date;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError: string | null;
}
