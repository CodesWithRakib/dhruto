import { Entity, Column, ManyToOne, JoinColumn, Index } from "typeorm";
import { BaseEntity } from "./Base.entity.js";
import { FinancialAccount, EntryDirection } from "@dhruto/contracts";
import { FinancialTransaction } from "./FinancialTransaction.entity.js";

export { FinancialAccount, EntryDirection };

/**
 * One leg of a double-entry posting. Amounts are integer minor units
 * (poisha) — never floats. Rows are insert-only.
 */
@Entity("financial_entries")
@Index(["transactionId"])
@Index(["account", "createdAt"])
@Index(["merchantId", "account"])
export class FinancialEntry extends BaseEntity {
  @Column({ name: "transaction_id", type: "uuid" })
  transactionId: string;

  @ManyToOne(() => FinancialTransaction, (transaction) => transaction.entries, {
    onDelete: "RESTRICT",
  })
  @JoinColumn({ name: "transaction_id" })
  transaction: FinancialTransaction;

  @Column({ type: "enum", enum: FinancialAccount })
  account: FinancialAccount;

  @Column({ type: "enum", enum: EntryDirection })
  direction: EntryDirection;

  /** Integer minor units, always > 0 (enforced by migration CHECK). */
  @Column({ name: "amount_minor", type: "bigint" })
  amountMinor: number;

  /**
   * Owning merchant for merchant-scoped accounts (MERCHANT_AVAILABLE). Lets
   * ledger-derived wallet balances be computed without joining references.
   */
  @Column({ name: "merchant_id", type: "uuid", nullable: true })
  merchantId: string | null;

  @Column({ type: "varchar", length: 10, default: "BDT" })
  currency: string;

  @Column({ type: "text", nullable: true })
  memo: string | null;
}
