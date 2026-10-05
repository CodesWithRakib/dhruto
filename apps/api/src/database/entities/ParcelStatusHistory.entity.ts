import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './Base.entity';
import { Parcel, ParcelStatus } from './Parcel.entity';

@Entity('parcel_status_histories')
@Index(['parcelId', 'createdAt'])
@Index(['toStatus'])
export class ParcelStatusHistory extends BaseEntity {
  @Column({ name: 'parcel_id', type: 'uuid' })
  parcelId: string;

  @ManyToOne(() => Parcel)
  @JoinColumn({ name: 'parcel_id' })
  parcel: Parcel;

  @Column({ name: 'from_status', type: 'enum', enum: ParcelStatus, nullable: true })
  fromStatus: ParcelStatus;

  @Column({ name: 'to_status', type: 'enum', enum: ParcelStatus })
  toStatus: ParcelStatus;

  @Column({ name: 'changed_by', type: 'uuid' })
  changedBy: string;

  @Column({ name: 'changed_by_role', type: 'varchar', length: 50 })
  changedByRole: string;

  @Column({ name: 'reason', type: 'text', nullable: true })
  reason: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>;
}
