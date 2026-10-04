import { Entity, Column, ManyToOne, JoinColumn, Index } from "typeorm";
import { BaseEntity } from "./Base.entity.js";
import { Bag } from "./Bag.entity.js";
import { Parcel } from "./Parcel.entity.js";

@Entity("bag_parcels")
@Index(["bagId", "parcelId"], { unique: true })
export class BagParcel extends BaseEntity {
  @Column({ name: "bag_id", type: "uuid" })
  bagId: string;

  @ManyToOne(() => Bag, (bag) => bag.bagParcels)
  @JoinColumn({ name: "bag_id" })
  bag: Bag;

  @Column({ name: "parcel_id", type: "uuid" })
  parcelId: string;

  @ManyToOne(() => Parcel)
  @JoinColumn({ name: "parcel_id" })
  parcel: Parcel;
}
