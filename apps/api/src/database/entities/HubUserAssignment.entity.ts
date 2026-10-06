import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './Base.entity.js';
import { Hub } from './Hub.entity.js';
import { User } from './User.entity.js';
import { HubPermission } from '@dhruto/contracts';

/**
 * Grants a user operational access to a specific hub.
 *
 * Hub authorization is always resolved from these rows — the `hubId` a client
 * sends is never trusted on its own (docs/10-SECURITY.md). A user with no
 * assignment for a hub cannot perform any hub operation on it, regardless of
 * role. `permissions` narrows what the user may do inside that hub; an empty
 * array means "no hub permissions".
 */
@Entity('hub_user_assignments')
@Index(['userId', 'hubId'], { unique: true })
@Index(['hubId'])
export class HubUserAssignment extends BaseEntity {
  @Column({ name: 'hub_id', type: 'uuid' })
  hubId: string;

  @ManyToOne(() => Hub, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hub_id' })
  hub: Hub;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  /** Permission codes granted inside this hub (`HubPermission` values). */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  permissions: HubPermission[];

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}
