import { Entity, Column, Index, Unique } from 'typeorm';
import { BaseEntity } from './Base.entity.js';

/**
 * Operational analytics alert instance.
 *
 * One OPEN row per dedupKey (alertKey + scope + period bucket). Evaluation is
 * deterministic and rule-based; notifications fan out through the Phase 5
 * notification system (no second engine). Acknowledgement and resolution are
 * audited with actor + timestamp.
 */
@Entity('analytics_alerts')
@Unique(['dedupKey'])
@Index(['status', 'triggeredAt'])
@Index(['alertKey', 'status'])
export class AnalyticsAlert extends BaseEntity {
  @Column({ name: 'alert_key', type: 'varchar', length: 64 })
  alertKey: string;

  @Column({ type: 'varchar', length: 16 })
  severity: string;

  @Column({ type: 'varchar', length: 16, default: 'OPEN' })
  status: string;

  @Column({ type: 'varchar', length: 64, default: 'platform' })
  scope: string;

  @Column({ name: 'scope_id', type: 'uuid', nullable: true })
  scopeId: string | null;

  @Column({ name: 'metric_value', type: 'float' })
  metricValue: number;

  @Column({ type: 'float' })
  threshold: number;

  @Column({ name: 'dedup_key', type: 'varchar', length: 192 })
  dedupKey: string;

  @Column({ name: 'triggered_at', type: 'timestamptz' })
  triggeredAt: Date;

  @Column({ name: 'acknowledged_by', type: 'uuid', nullable: true })
  acknowledgedBy: string | null;

  @Column({ name: 'acknowledged_at', type: 'timestamptz', nullable: true })
  acknowledgedAt: Date | null;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt: Date | null;
}
