import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from "typeorm";
import { BaseEntity } from "./Base.entity.js";
import { Hub } from "./Hub.entity.js";
import { BagParcel } from "./BagParcel.entity.js";
import { BagStatus } from "@dhruto/contracts";

export { BagStatus };

@Entity("bags")
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

  @Column({ name: "seal_tag", type: "varchar", length: 100, nullable: true })
  sealTag: string | null;

  @Column({ name: "sealed_at", type: "timestamptz", nullable: true })
  sealedAt: Date | null;

  @Column({ name: "dispatched_at", type: "timestamptz", nullable: true })
  dispatchedAt: Date | null;

  @Column({ name: "received_at", type: "timestamptz", nullable: true })
  receivedAt: Date | null;

  @OneToMany(() => BagParcel, (bagParcel) => bagParcel.bag)
  bagParcels: BagParcel[];
}
