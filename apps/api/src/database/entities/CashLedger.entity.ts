import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './Base.entity';
import { Parcel } from './Parcel.entity';
import { Rider } from './Rider.entity';
import { Hub } from './Hub.entity';

export enum CashHandInStatus {
  PENDING = 'PENDING',
  HANDED_IN = 'HANDED_IN',
  VERIFIED = 'VERIFIED',
  DISCREPANCY = 'DISCREPANCY',
}

@Entity('cash_ledgers')
export class CashLedger extends BaseEntity {
  @Column({ name: 'parcel_id', type: 'uuid', unique: true })
  parcelId: string;

  @ManyToOne(() => Parcel)
  @JoinColumn({ name: 'parcel_id' })
  parcel: Parcel;

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

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ name: 'collected_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  collectedAt: Date;

  @Column({
    name: 'hand_in_status',
    type: 'enum',
    enum: CashHandInStatus,
    default: CashHandInStatus.PENDING,
  })
  handInStatus: CashHandInStatus;

  @Column({ name: 'verified_by', type: 'uuid', nullable: true })
  verifiedBy: string | null;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt: Date | null;
}
