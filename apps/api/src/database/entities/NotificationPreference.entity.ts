import { Entity, Column, Index } from "typeorm";
import { BaseEntity } from "./Base.entity.js";
import { NotificationCategory, PreferenceChannel } from "@dhruto/contracts";

export { NotificationCategory, PreferenceChannel };

/**
 * Per-recipient channel preferences. Absence of a row means "enabled".
 * Financial and security categories are locked on at the service layer.
 */
@Entity("notification_preferences")
@Index(["userId", "channel", "category"], { unique: true })
@Index(["merchantId", "channel", "category"], { unique: true })
export class NotificationPreference extends BaseEntity {
  @Column({ name: "user_id", type: "uuid", nullable: true })
  userId: string | null;

  @Column({ name: "merchant_id", type: "uuid", nullable: true })
  merchantId: string | null;

  @Column({ type: "enum", enum: NotificationCategory })
  category: NotificationCategory;

  @Column({ type: "enum", enum: PreferenceChannel })
  channel: PreferenceChannel;

  @Column({ type: "boolean", default: true })
  enabled: boolean;

  /**
   * Recipient locale for template rendering. Stored denormalized on every
   * preference row and set through the preferences endpoint; defaults to
   * English with English fallback for missing templates.
   */
  @Column({ type: "varchar", length: 5, default: "en" })
  locale: string;
}
