import { Entity, Column, ManyToOne, JoinColumn, Index } from "typeorm";
import { BaseEntity } from "./Base.entity";
import { Merchant } from "./Merchant.entity";

@Entity("webhook_subscriptions")
@Index(["merchantId"])
export class WebhookSubscription extends BaseEntity {
  @Column({ name: "merchant_id", type: "uuid" })
  merchantId: string;

  @ManyToOne(() => Merchant, { onDelete: "CASCADE" })
  @JoinColumn({ name: "merchant_id" })
  merchant: Merchant;

  @Column({ type: "varchar", length: 500 })
  url: string;

  @Column({ type: "varchar", length: 255 })
  secret: string;

  @Column({ type: "jsonb" })
  events: string[];

  @Column({ type: "varchar", length: 20, default: "ACTIVE" })
  status: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  description: string | null;

  @Column({ name: "failure_count", type: "int", default: 0 })
  failureCount: number;
}
