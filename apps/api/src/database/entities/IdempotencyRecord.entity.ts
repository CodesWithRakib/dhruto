import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from './Base.entity.js';

@Entity('idempotency_records')
@Index(['key', 'scope'], { unique: true })
export class IdempotencyRecord extends BaseEntity {
  @Column({ type: 'varchar', length: 128 })
  key: string;

  @Column({ type: 'varchar', length: 64, default: 'DEFAULT' })
  scope: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ name: 'status_code', type: 'int' })
  statusCode: number;

  @Column({ type: 'jsonb' })
  response: Record<string, unknown>;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null;
}
