import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './Base.entity';
import { Parcel, ParcelStatus } from './Parcel.entity';

/**
 * Append-only parcel lifecycle audit trail.
 *
 * History rows are never updated or deleted. The parcel's `status` column is the
 * current state; this table is the immutable record of how it got there
 * (docs/08-STATE-MACHINE.md §4).
 */
@Entity('parcel_status_histories')
@Index(['parcelId', 'createdAt'])
@Index(['toStatus'])
export class ParcelStatusHistory extends BaseEntity {
  @Column({ name: 'parcel_id', type: 'uuid' })
  parcelId: string;

  @ManyToOne(() => Parcel)
  @JoinColumn({ name: 'parcel_id' })
  parcel: Parcel;

  @Column({ name: 'from_status', type: 'enum', enum: ParcelStatus, nullable: true })
  fromStatus: ParcelStatus | null;

  @Column({ name: 'to_status', type: 'enum', enum: ParcelStatus })
  toStatus: ParcelStatus;

  /** Machine-readable lifecycle event, e.g. PARCEL_CREATED, STATUS_CHANGED. */
  @Column({ name: 'event_type', type: 'varchar', length: 50, default: 'STATUS_CHANGED' })
  eventType: string;

  /** Actor that caused the transition (user id). Null for system-generated events. */
  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId: string | null;

  /** Role of the actor at the time of the transition. */
  @Column({ name: 'actor_role', type: 'varchar', length: 50 })
  actorRole: string;

  /** Human-readable explanation of the transition. */
  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;
}
