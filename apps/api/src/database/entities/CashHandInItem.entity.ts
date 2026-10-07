import { Entity, Column, ManyToOne, JoinColumn, Index } from "typeorm";
import { BaseEntity } from "./Base.entity.js";
import { CashHandIn } from "./CashHandIn.entity.js";
import { CashLedger } from "./CashLedger.entity.js";

/** One COD collection inside a hand-in batch. A ledger belongs to at most one batch. */
@Entity("cash_handin_items")
@Index(["handInId"])
export class CashHandInItem extends BaseEntity {
  @Column({ name: "handin_id", type: "uuid" })
  handInId: string;

  @ManyToOne(() => CashHandIn, (handIn) => handIn.items, { onDelete: "CASCADE" })
  @JoinColumn({ name: "handin_id" })
  handIn: CashHandIn;

  @Column({ name: "cash_ledger_id", type: "uuid", unique: true })
  cashLedgerId: string;

  @ManyToOne(() => CashLedger)
  @JoinColumn({ name: "cash_ledger_id" })
  cashLedger: CashLedger;

  /** Collection snapshot at submit time, integer minor units. */
  @Column({ name: "amount_minor", type: "bigint" })
  amountMinor: number;
}
