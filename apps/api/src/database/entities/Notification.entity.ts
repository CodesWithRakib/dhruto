import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './Base.entity';
import { Merchant } from './Merchant.entity';
import { User } from './User.entity';
import {
  NotificationChannel,
  NotificationType,
  NotificationStatus,
} from '@dhruto/contracts';

export { NotificationChannel, NotificationType, NotificationStatus };

@Entity('notifications')
@Index(['merchantId', 'createdAt'])
@Index(['userId', 'createdAt'])
export class Notification extends BaseEntity {
  @Column({ name: 'merchant_id', type: 'uuid', nullable: true })
  merchantId: string | null;

  @ManyToOne(() => Merchant, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'merchant_id' })
  merchant: Merchant | null;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({
    type: 'enum',
    enum: NotificationChannel,
    default: NotificationChannel.IN_APP,
  })
  channel: NotificationChannel;

  @Column({
    type: 'enum',
    enum: NotificationType,
    default: NotificationType.PARCEL_STATUS_UPDATE,
  })
  type: NotificationType;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ name: 'recipient_target', type: 'varchar', length: 255, nullable: true })
  recipientTarget: string | null;

  @Column({
    type: 'enum',
    enum: NotificationStatus,
    default: NotificationStatus.SENT,
  })
  status: NotificationStatus;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({ name: 'sent_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  sentAt: Date;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt: Date | null;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason: string | null;

  /**
   * Source domain event for fan-out deduplication. Null for ad-hoc sends
   * (e.g. test SMS), which are never deduplicated.
   */
  @Column({ name: 'event_id', type: 'uuid', nullable: true })
  eventId: string | null;

  /**
   * Stable dedup key `${eventId}:${channel}:${recipient}`. The migration
   * enforces uniqueness where event_id is present, so event replays never
   * duplicate a recipient's notification.
   */
  @Column({ name: 'dedupe_key', type: 'varchar', length: 255, nullable: true })
  dedupeKey: string | null;

  @Column({ name: 'provider_message_id', type: 'varchar', length: 128, nullable: true })
  providerMessageId: string | null;

  @Column({ name: 'attempt_count', type: 'int', default: 0 })
  attemptCount: number;

  @Column({ name: 'template_key', type: 'varchar', length: 100, nullable: true })
  templateKey: string | null;

  @Column({ type: 'varchar', length: 5, default: 'en' })
  locale: string;
}
