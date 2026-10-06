import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './Base.entity';
import { Merchant } from './Merchant.entity';
import { Wallet } from './Wallet.entity';
import { PayoutMethod, PayoutStatus } from '@dhruto/contracts';

@Entity('payout_requests')
export class PayoutRequest extends BaseEntity {
  @Column({ name: 'payout_code', type: 'varchar', length: 20, unique: true, nullable: true })
  payoutCode: string | null;

  /** Idempotency scope key: duplicate submissions replay instead of double-spend. */
  @Column({ name: 'idempotency_key', type: 'varchar', length: 128, nullable: true })
  idempotencyKey: string | null;

  @Column({ name: 'merchant_id', type: 'uuid' })
  merchantId: string;

  @ManyToOne(() => Merchant)
  @JoinColumn({ name: 'merchant_id' })
  merchant: Merchant;

  @Column({ name: 'wallet_id', type: 'uuid' })
  walletId: string;

  @ManyToOne(() => Wallet)
  @JoinColumn({ name: 'wallet_id' })
  wallet: Wallet;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({
    name: 'payout_method',
    type: 'enum',
    enum: PayoutMethod,
  })
  payoutMethod: PayoutMethod;

  @Column({ name: 'account_details', type: 'jsonb' })
  accountDetails: Record<string, unknown>;

  @Column({
    type: 'enum',
    enum: PayoutStatus,
    default: PayoutStatus.REQUESTED,
  })
  status: PayoutStatus;

  @Column({ name: 'processed_by', type: 'uuid', nullable: true })
  processedBy: string | null;

  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
  processedAt: Date | null;

  @Column({ name: 'transaction_reference', type: 'varchar', length: 100, nullable: true })
  transactionReference: string | null;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason: string | null;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy: string | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
