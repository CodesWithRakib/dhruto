import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from './Base.entity.js';
import { HubStatus, HubType } from '@dhruto/contracts';

// Single source of truth for hub enums is `@dhruto/contracts`; re-exported here
// so existing imports from the entity layer keep working.
export { HubStatus, HubType };

/**
 * A physical logistics facility.
 *
 * `status` is a soft lifecycle: an INACTIVE or MAINTENANCE hub is never deleted
 * (it owns historical operational data) but must not accept new scans, bagging
 * or dispatch operations.
 */
@Entity('hubs')
@Index(['status'])
export class Hub extends BaseEntity {
  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'enum', enum: HubType, default: HubType.SORTING })
  type: HubType;

  /** Destination district name, matching `parcels.district` (no master-data duplication). */
  @Column({ type: 'varchar', length: 100, nullable: true })
  district: string | null;

  /** Destination thana / upazila name, matching `parcels.thana`. */
  @Column({ type: 'varchar', length: 100, nullable: true })
  thana: string | null;

  @Column({ name: 'district_id', type: 'uuid', nullable: true })
  districtId: string | null;

  @Column({ name: 'thana_id', type: 'uuid', nullable: true })
  thanaId: string | null;

  @Column({ type: 'text' })
  address: string;

  @Column({ type: 'enum', enum: HubStatus, default: HubStatus.ACTIVE })
  status: HubStatus;
}
