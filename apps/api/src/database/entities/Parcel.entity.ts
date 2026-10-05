import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './Base.entity';
import { Merchant } from './Merchant.entity';
import { Rider } from './Rider.entity';
import { Hub } from './Hub.entity';
import { ParcelStatus } from '@dhruto/contracts';

export { ParcelStatus };

@Entity('parcels')
@Index(['merchantId', 'status'])
@Index(['currentHubId', 'status'])
@Index(['currentRiderId', 'status'])
@Index(['recipientPhone'])
@Index(['status'])
@Index(['createdAt'])
export class Parcel extends BaseEntity {
  @Column({ name: 'tracking_code', type: 'varchar', length: 50, unique: true })
  trackingCode: string;

  @Column({ name: 'merchant_id', type: 'uuid' })
  merchantId: string;

  @ManyToOne(() => Merchant)
  @JoinColumn({ name: 'merchant_id' })
  merchant: Merchant;

  @Column({ name: 'current_rider_id', type: 'uuid', nullable: true })
  currentRiderId: string | null;

  @ManyToOne(() => Rider, { nullable: true })
  @JoinColumn({ name: 'current_rider_id' })
  currentRider: Rider | null;

  @Column({ name: 'current_hub_id', type: 'uuid', nullable: true })
  currentHubId: string | null;

  @ManyToOne(() => Hub, { nullable: true })
  @JoinColumn({ name: 'current_hub_id' })
  currentHub: Hub | null;

  @Column({ name: 'recipient_name', type: 'varchar', length: 255 })
  recipientName: string;

  @Column({ name: 'recipient_phone', type: 'varchar', length: 20 })
  recipientPhone: string;

  @Column({ name: 'raw_address', type: 'text' })
  rawAddress: string;

  @Column({ name: 'normalized_address', type: 'jsonb', nullable: true })
  normalizedAddress: Record<string, unknown>;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  weight: number;

  @Column({ name: 'cod_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  codAmount: number;

  @Column({ name: 'delivery_fee', type: 'decimal', precision: 12, scale: 2, default: 0 })
  deliveryFee: number;

  @Column({ name: 'delivery_otp', type: 'varchar', length: 10, nullable: true })
  deliveryOtp: string | null;

  @Column({ type: 'enum', enum: ParcelStatus, default: ParcelStatus.CREATED })
  status: ParcelStatus;
}
