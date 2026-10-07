import { Entity, Column, ManyToOne, JoinColumn, OneToMany, Index } from "typeorm";
import { BaseEntity } from "./Base.entity.js";
import { Hub } from "./Hub.entity.js";
import { BagParcel } from "./BagParcel.entity.js";
import { BagStatus } from "@dhruto/contracts";

export { BagStatus };

/**
 * A physical container grouping parcels travelling together to one destination
 * hub. Distinct from a Manifest (the operational shipment document): a bag is
 * the box, a manifest is the trip.
 */
@Entity("bags")
@Index(["originHubId", "status"])
@Index(["destinationHubId", "status"])
@Index(["createdAt"])
export class Bag extends BaseEntity {
  @Column({ name: "bag_code", type: "varchar", length: 50, unique: true })
  bagCode: string;

  @Column({ name: "origin_hub_id", type: "uuid" })
  originHubId: string;

  @ManyToOne(() => Hub)
  @JoinColumn({ name: "origin_hub_id" })
  originHub: Hub;

  @Column({ name: "destination_hub_id", type: "uuid" })
  destinationHubId: string;

  @ManyToOne(() => Hub)
  @JoinColumn({ name: "destination_hub_id" })
  destinationHub: Hub;

  @Column({ type: "enum", enum: BagStatus, default: BagStatus.OPEN })
  status: BagStatus;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @Column({ name: "seal_tag", type: "varchar", length: 100, nullable: true })
  sealTag: string | null;

  @Column({ name: "created_by", type: "uuid", nullable: true })
  createdBy: string | null;

  @Column({ name: "sealed_by", type: "uuid", nullable: true })
  sealedBy: string | null;

  @Column({ name: "sealed_at", type: "timestamptz", nullable: true })
  sealedAt: Date | null;

  @Column({ name: "dispatched_at", type: "timestamptz", nullable: true })
  dispatchedAt: Date | null;

  @Column({ name: "received_at", type: "timestamptz", nullable: true })
  receivedAt: Date | null;

  @Column({ name: "cancelled_at", type: "timestamptz", nullable: true })
  cancelledAt: Date | null;

  @OneToMany(() => BagParcel, (bagParcel) => bagParcel.bag)
  bagParcels: BagParcel[];
}
