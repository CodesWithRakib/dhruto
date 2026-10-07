import { Entity, Column, Index, Unique } from 'typeorm';
import { BaseEntity } from './Base.entity.js';

/**
 * Lightweight scoring-model registry.
 *
 * Only one ACTIVE row per `name` is allowed (enforced at the service layer so
 * controlled experimentation stays explicit). Parsers, risk scorers and RTO
 * predictors all register here with their configuration snapshot.
 */
@Entity('scoring_models')
@Unique(['name', 'version'])
@Index(['name', 'status'])
export class ScoringModel extends BaseEntity {
  @Column({ type: 'varchar', length: 64 })
  name: string;

  @Column({ type: 'varchar', length: 64 })
  version: string;

  @Column({ type: 'varchar', length: 32 })
  type: string;

  @Column({ type: 'varchar', length: 16, default: 'DRAFT' })
  status: string;

  @Column({ type: 'jsonb', default: {} })
  configuration: Record<string, unknown>;

  @Column({ name: 'activated_at', type: 'timestamptz', nullable: true })
  activatedAt: Date | null;

  @Column({ name: 'retired_at', type: 'timestamptz', nullable: true })
  retiredAt: Date | null;
}
