import { randomInt } from 'node:crypto';
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

/** Rider statuses allowed to operate (receive tasks, start, complete). */
export const OPERABLE_RIDER_STATUSES: readonly RiderStatus[] = [
  RiderStatus.ACTIVE,
  RiderStatus.ON_DUTY,
];

@Entity('riders')
export class Rider extends BaseEntity {
  /**
   * Human-readable rider code (e.g. RDR-000123), generated centrally and
   * unique across all riders.
   */
  @Column({ name: 'rider_code', type: 'varchar', length: 20, unique: true, nullable: true })
  riderCode: string | null;

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

  /**
   * Central rider-code generator (e.g. RDR-482913). Callers must handle the
   * unique constraint on `rider_code` by regenerating on conflict.
   */
  static generateCode(): string {
    return `RDR-${String(randomInt(100000, 1000000)).padStart(6, '0')}`;
  }
}
