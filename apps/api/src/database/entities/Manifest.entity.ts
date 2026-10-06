import { Entity, Column, ManyToOne, JoinColumn, OneToMany, Index } from 'typeorm';
import { BaseEntity } from './Base.entity.js';
import { Hub } from './Hub.entity.js';
import { ManifestItem } from './ManifestItem.entity.js';
import { ManifestStatus } from '@dhruto/contracts';

export { ManifestStatus };

/**
 * Operational shipment document representing one vehicle movement between two
 * hubs. Membership is stored in `manifest_items` (foreign-keyed), not a jsonb
 * array, so bag/parcel integrity and immutability-after-dispatch are enforced
 * by the database.
 */
@Entity('manifests')
@Index(['originHubId', 'status'])
@Index(['destinationHubId', 'status'])
@Index(['createdAt'])
export class Manifest extends BaseEntity {
  @Column({ name: 'manifest_code', type: 'varchar', length: 50, unique: true })
  manifestCode: string;

  @Column({ name: 'origin_hub_id', type: 'uuid' })
  originHubId: string;

  @ManyToOne(() => Hub)
  @JoinColumn({ name: 'origin_hub_id' })
  originHub: Hub;

  @Column({ name: 'destination_hub_id', type: 'uuid' })
  destinationHubId: string;

  @ManyToOne(() => Hub)
  @JoinColumn({ name: 'destination_hub_id' })
  destinationHub: Hub;

  @Column({ type: 'enum', enum: ManifestStatus, default: ManifestStatus.CREATED })
  status: ManifestStatus;

  @Column({ name: 'vehicle_number', type: 'varchar', length: 100 })
  vehicleNumber: string;

  @Column({ name: 'driver_name', type: 'varchar', length: 150, nullable: true })
  driverName: string | null;

  @Column({ name: 'driver_phone', type: 'varchar', length: 20, nullable: true })
  driverPhone: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @Column({ name: 'dispatched_by', type: 'uuid', nullable: true })
  dispatchedBy: string | null;

  @Column({ name: 'received_by', type: 'uuid', nullable: true })
  receivedBy: string | null;

  @Column({ name: 'dispatched_at', type: 'timestamptz', nullable: true })
  dispatchedAt: Date | null;

  @Column({ name: 'received_at', type: 'timestamptz', nullable: true })
  receivedAt: Date | null;

  @OneToMany(() => ManifestItem, (item) => item.manifest)
  items: ManifestItem[];
}
