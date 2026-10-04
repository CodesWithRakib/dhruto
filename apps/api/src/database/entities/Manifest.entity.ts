import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "./Base.entity.js";
import { Hub } from "./Hub.entity.js";
import { ManifestStatus } from "@dhruto/contracts";

export { ManifestStatus };

@Entity("manifests")
export class Manifest extends BaseEntity {
  @Column({ name: "manifest_code", type: "varchar", length: 50, unique: true })
  manifestCode: string;

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

  @Column({ type: "enum", enum: ManifestStatus, default: ManifestStatus.CREATED })
  status: ManifestStatus;

  @Column({ name: "vehicle_number", type: "varchar", length: 100 })
  vehicleNumber: string;

  @Column({ name: "driver_name", type: "varchar", length: 150 })
  driverName: string;

  @Column({ name: "driver_phone", type: "varchar", length: 20 })
  driverPhone: string;

  @Column({ name: "bag_ids", type: "jsonb", default: [] })
  bagIds: string[];

  @Column({ name: "dispatched_at", type: "timestamptz", nullable: true })
  dispatchedAt: Date | null;

  @Column({ name: "received_at", type: "timestamptz", nullable: true })
  receivedAt: Date | null;
}
