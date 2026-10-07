import { Entity, Column, ManyToOne, JoinColumn, Index } from "typeorm";
import { BaseEntity } from "./Base.entity.js";
import { Merchant } from "./Merchant.entity.js";
import { Parcel } from "./Parcel.entity.js";
import { CashLedger } from "./CashLedger.entity.js";
import { SettlementStatus } from "@dhruto/contracts";

export { SettlementStatus };

/**
 * Parcel-level financial close — Phase 4 traceability record.
 *
 * Created exactly once per verified COD collection: gross COD, delivery fee
 * snapshot (never recomputed from live pricing), net payable, and the ledger
 * transaction that moved the money. Reversals create a linked record rather
 * than mutating this one.
 */
@Entity("settlements")
@Index(["merchantId", "status"])
@Index(["parcelId"], { unique: true })
@Index(["batchId"])
export class Settlement extends BaseEntity {
  @Column({ name: "settlement_code", type: "varchar", length: 20, unique: true })
  settlementCode: string;

  @Column({ name: "merchant_id", type: "uuid" })
  merchantId: string;

  @ManyToOne(() => Merchant)
  @JoinColumn({ name: "merchant_id" })
  merchant: Merchant;

  @Column({ name: "parcel_id", type: "uuid", unique: true })
  parcelId: string;

  @ManyToOne(() => Parcel)
  @JoinColumn({ name: "parcel_id" })
  parcel: Parcel;

  @Column({ name: "cash_ledger_id", type: "uuid", unique: true })
  cashLedgerId: string;

  @ManyToOne(() => CashLedger)
  @JoinColumn({ name: "cash_ledger_id" })
  cashLedger: CashLedger;

  /** Integer minor units. */
  @Column({ name: "gross_minor", type: "bigint" })
  grossMinor: number;

  @Column({ name: "fee_minor", type: "bigint" })
  feeMinor: number;

  @Column({ name: "net_minor", type: "bigint" })
  netMinor: number;

  @Column({ type: "varchar", length: 10, default: "BDT" })
  currency: string;

  @Column({ type: "enum", enum: SettlementStatus, default: SettlementStatus.SETTLED })
  status: SettlementStatus;

  @Column({ name: "transaction_id", type: "uuid" })
  transactionId: string;

  @Column({ name: "batch_id", type: "uuid", nullable: true })
  batchId: string | null;

  @Column({ name: "settled_at", type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })
  settledAt: Date;
}
