import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from './Base.entity.js';

/**
 * RTO prediction with tracked outcome.
 *
 * Created at parcel/order time with features computed strictly from data
 * available at `predictedAt`. `outcome` is filled later when the parcel
 * reaches a terminal state (DELIVERED vs RTO ladder) — never backfilled into
 * the feature set.
 */
@Entity('rto_predictions')
@Index(['parcelId'], { unique: true })
@Index(['phoneHash', 'predictedAt'])
@Index(['modelVersion'])
export class RtoPrediction extends BaseEntity {
  @Column({ name: 'parcel_id', type: 'uuid', unique: true })
  parcelId: string;

  @Column({ name: 'phone_hash', type: 'varchar', length: 128 })
  phoneHash: string;

  @Column({ name: 'merchant_id', type: 'uuid', nullable: true })
  merchantId: string | null;

  @Column({ type: 'int' })
  score: number;

  @Column({ type: 'varchar', length: 16 })
  level: string;

  @Column({ type: 'jsonb', default: [] })
  reasons: Record<string, unknown>[];

  @Column({ name: 'model_type', type: 'varchar', length: 16 })
  modelType: string;

  @Column({ name: 'model_version', type: 'varchar', length: 64 })
  modelVersion: string;

  @Column({ type: 'jsonb' })
  features: Record<string, unknown>;

  @Column({ name: 'predicted_at', type: 'timestamptz' })
  predictedAt: Date;

  @Column({ type: 'varchar', length: 16, nullable: true })
  outcome: string | null;

  @Column({ name: 'outcome_at', type: 'timestamptz', nullable: true })
  outcomeAt: Date | null;
}
