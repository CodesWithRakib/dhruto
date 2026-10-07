import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from './Base.entity.js';

/**
 * Clean feedback events for future model improvement.
 *
 * Stored, never auto-trained on. Deduplicated per (subjectType, subjectId,
 * signal, actor) within a single insert guard at the service layer.
 */
@Entity('intelligence_feedback')
@Index(['subjectType', 'subjectId'])
@Index(['signal'])
export class IntelligenceFeedback extends BaseEntity {
  @Column({ name: 'subject_type', type: 'varchar', length: 32 })
  subjectType: string;

  @Column({ name: 'subject_id', type: 'varchar', length: 128 })
  subjectId: string;

  @Column({ type: 'varchar', length: 32 })
  signal: string;

  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  detail: string | null;
}
