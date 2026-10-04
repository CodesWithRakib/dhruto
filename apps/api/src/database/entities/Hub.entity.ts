import { Entity, Column } from 'typeorm';
import { BaseEntity } from './Base.entity';

export enum HubStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

@Entity('hubs')
export class Hub extends BaseEntity {
  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'district_id', type: 'uuid', nullable: true })
  districtId: string;

  @Column({ name: 'thana_id', type: 'uuid', nullable: true })
  thanaId: string;

  @Column({ type: 'text' })
  address: string;

  @Column({ type: 'enum', enum: HubStatus, default: HubStatus.ACTIVE })
  status: HubStatus;
}
