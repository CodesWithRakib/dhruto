import { Entity, Column, OneToMany, Index } from 'typeorm';
import { BaseEntity } from './Base.entity.js';
import { FinancialTransactionType, FinancialTransactionStatus } from '@dhruto/contracts';
import { FinancialEntry } from './FinancialEntry.entity.js';

export { FinancialTransactionType, FinancialTransactionStatus };

/**
 * Immutable double-entry journal header — Phase 4 financial source of truth.
 *
 * A posted transaction is never updated or deleted. Corrections are new
 * transactions (adjustments or reversals) linked through `reversalOfId`.
 * Materialized balances (e.g. `wallets.balance`) are caches updated in the
 * same database transaction, never the source of truth.
 */
@Entity('financial_transactions')
@Index(['type', 'createdAt'])
@Index(['referenceType', 'referenceId'])
@Index(['status'])
export class FinancialTransaction extends BaseEntity {
  @Column({ name: 'transaction_code', type: 'varchar', length: 20, unique: true })
  transactionCode: string;

  @Column({ type: 'enum', enum: FinancialTransactionType })
  type: FinancialTransactionType;

  @Column({ type: 'enum', enum: FinancialTransactionStatus, default: FinancialTransactionStatus.POSTED })
  status: FinancialTransactionStatus;

  @Column({ name: 'reference_type', type: 'varchar', length: 50, nullable: true })
  referenceType: string | null;

  @Column({ name: 'reference_id', type: 'varchar', length: 100, nullable: true })
  referenceId: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** Transaction this entry reverses (set on REVERSAL postings). */
  @Column({ name: 'reversal_of_id', type: 'uuid', nullable: true })
  reversalOfId: string | null;

  /** Reversal that voided this transaction (set on the original). */
  @Column({ name: 'reversed_by_id', type: 'uuid', nullable: true })
  reversedById: string | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @OneToMany(() => FinancialEntry, (entry) => entry.transaction)
  entries: FinancialEntry[];
}
