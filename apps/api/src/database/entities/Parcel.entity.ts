import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './Base.entity';
import { Merchant } from './Merchant.entity';
import { Rider } from './Rider.entity';
import { Hub } from './Hub.entity';
import { ParcelStatus } from '@dhruto/contracts';

export { ParcelStatus };

@Entity('parcels')
@Index(['merchantId', 'status'])
// Serves the paginated merchant list: WHERE merchant_id = ? ORDER BY created_at DESC.
@Index(['merchantId', 'createdAt'])
// Serves destination filtering on the merchant parcel list.
@Index(['merchantId', 'district'])
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

  @Column({ name: 'parcel_description', type: 'varchar', length: 500, nullable: true })
  parcelDescription: string | null;

  @Column({ name: 'recipient_phone', type: 'varchar', length: 20 })
  recipientPhone: string;

  @Column({ name: 'raw_address', type: 'text' })
  rawAddress: string;

  /** Destination district (first-class so it can be filtered and indexed). */
  @Column({ type: 'varchar', length: 100, nullable: true })
  district: string | null;

  /** Destination thana / upazila. */
  @Column({ type: 'varchar', length: 100, nullable: true })
  thana: string | null;

  /**
   * Reserved for Phase 6 address intelligence (parse confidence, normalized
   * components, risk metadata). Never used as the source of truth for district
   * or thana, which are first-class columns above.
   */
  @Column({ name: 'normalized_address', type: 'jsonb', nullable: true })
  normalizedAddress: Record<string, unknown> | null;

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
