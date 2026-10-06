import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './Base.entity.js';
import { Merchant } from './Merchant.entity.js';
import { SettlementBatchStatus } from '@dhruto/contracts';

export { SettlementBatchStatus };

/**
 * Admin reporting/payout-reference grouping over settled parcels.
 *
 * Funds are released to the merchant wallet at hub verification (business
 * rule), so a batch never moves money itself — it groups settled parcels for
 * review and payout referencing. Transitions: PENDING -> COMPLETED|CANCELLED.
 */
@Entity('settlement_batches')
@Index(['merchantId', 'status'])
export class SettlementBatch extends BaseEntity {
  @Column({ name: 'settlement_code', type: 'varchar', length: 20, unique: true })
  settlementCode: string;

  @Column({ name: 'merchant_id', type: 'uuid' })
  merchantId: string;

  @ManyToOne(() => Merchant)
  @JoinColumn({ name: 'merchant_id' })
  merchant: Merchant;

  @Column({ type: 'enum', enum: SettlementBatchStatus, default: SettlementBatchStatus.PENDING })
  status: SettlementBatchStatus;

  @Column({ name: 'gross_minor', type: 'bigint', default: 0 })
  grossMinor: number;

  @Column({ name: 'fee_minor', type: 'bigint', default: 0 })
  feeMinor: number;

  @Column({ name: 'net_minor', type: 'bigint', default: 0 })
  netMinor: number;

  @Column({ name: 'settlement_count', type: 'int', default: 0 })
  settlementCount: number;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;
}
