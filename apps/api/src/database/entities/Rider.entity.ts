import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './Base.entity';
import { User } from './User.entity';
import { Hub } from './Hub.entity';

export enum RiderStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ON_DUTY = 'ON_DUTY',
  OFF_DUTY = 'OFF_DUTY',
}

@Entity('riders')
export class Rider extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'hub_id', type: 'uuid' })
  hubId: string;

  @ManyToOne(() => Hub)
  @JoinColumn({ name: 'hub_id' })
  hub: Hub;

  @Column({ type: 'enum', enum: RiderStatus, default: RiderStatus.ACTIVE })
  status: RiderStatus;

  @Column({ name: 'joined_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  joinedAt: Date;
}
