import { Entity, Column, ManyToOne, JoinColumn, OneToMany, Index } from 'typeorm';
import { BaseEntity } from './Base.entity.js';
import { Rider } from './Rider.entity.js';
import { Hub } from './Hub.entity.js';
import { CashHandInStatus } from '@dhruto/contracts';
import { CashHandInItem } from './CashHandInItem.entity.js';

// NOTE: intentionally NOT re-exported — `CashLedger.entity.ts` already
// exports a different `CashHandInStatus`. Import the batch lifecycle from
// `@dhruto/contracts` instead (see entities/index.ts).

/**
 * Rider cash hand-in batch — Phase 4 custody record.
 *
 * The server-computed expected total is authoritative; the rider never
 * declares an amount. Hub verification happens per cash ledger; the batch
 * status is derived (all VERIFIED -> VERIFIED, any mismatch -> DISCREPANCY).
 */
@Entity('cash_handins')
@Index(['riderId', 'status'])
@Index(['hubId', 'status'])
export class CashHandIn extends BaseEntity {
  @Column({ name: 'handin_code', type: 'varchar', length: 20, unique: true })
  handinCode: string;

  @Column({ name: 'rider_id', type: 'uuid' })
  riderId: string;

  @ManyToOne(() => Rider)
  @JoinColumn({ name: 'rider_id' })
  rider: Rider;

  @Column({ name: 'hub_id', type: 'uuid', nullable: true })
  hubId: string | null;

  @ManyToOne(() => Hub, { nullable: true })
  @JoinColumn({ name: 'hub_id' })
  hub: Hub | null;

  @Column({ type: 'enum', enum: CashHandInStatus, default: CashHandInStatus.SUBMITTED })
  status: CashHandInStatus;

  /** Server-computed sum of included collections, integer minor units. */
  @Column({ name: 'expected_minor', type: 'bigint' })
  expectedMinor: number;

  /** Hub-counted total once verified, integer minor units. */
  @Column({ name: 'verified_minor', type: 'bigint', default: 0 })
  verifiedMinor: number;

  @Column({ type: 'varchar', length: 10, default: 'BDT' })
  currency: string;

  @Column({ name: 'submitted_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  submittedAt: Date;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt: Date | null;

  @Column({ name: 'verified_by', type: 'uuid', nullable: true })
  verifiedBy: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @OneToMany(() => CashHandInItem, (item) => item.handIn)
  items: CashHandInItem[];
}
