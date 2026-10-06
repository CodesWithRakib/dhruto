import { Entity, Column, ManyToOne, JoinColumn, Index } from "typeorm";
import { BaseEntity } from "./Base.entity.js";
import { Bag } from "./Bag.entity.js";
import { Parcel } from "./Parcel.entity.js";

@Entity("bag_parcels")
@Index(["bagId", "parcelId"], { unique: true })
// Partial unique index (created in the Phase 2 migration) enforces the business
// rule "one active transport bag per parcel" at the database level, so two
// concurrent operators cannot bag the same parcel twice (spec §28, §76).
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

  /**
   * False once the bag is received/closed and the parcel is released, allowing
   * the parcel to be bagged again later in its lifecycle.
   */
  @Column({ name: "is_active", type: "boolean", default: true })
  isActive: boolean;
}
