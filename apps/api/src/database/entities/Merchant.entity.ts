import { Entity, Column, OneToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "./Base.entity";
import { User } from "./User.entity";

export enum MerchantStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  PENDING_VERIFICATION = "PENDING_VERIFICATION",
}

@Entity("merchants")
export class Merchant extends BaseEntity {
  @Column({ name: "user_id", type: "uuid" })
  userId: string;

  @OneToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ type: "varchar", length: 255, name: "business_name" })
  businessName: string;

  @Column({ type: "varchar", length: 20, name: "contact_phone" })
  contactPhone: string;

  @Column({ type: "enum", enum: MerchantStatus, default: MerchantStatus.PENDING_VERIFICATION })
  status: MerchantStatus;

  @Column({ type: "text", name: "pickup_address" })
  pickupAddress: string;

  /** Routing key for first-mile pickups: the hub serving this district collects. */
  @Column({ type: "varchar", length: 100, name: "pickup_district", nullable: true })
  pickupDistrict: string | null;

  @Column({ type: "varchar", length: 100, name: "pickup_thana", nullable: true })
  pickupThana: string | null;
}
