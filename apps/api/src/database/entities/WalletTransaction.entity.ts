import { Entity, Column, ManyToOne, JoinColumn, Index } from "typeorm";
import { BaseEntity } from "./Base.entity";
import { Wallet } from "./Wallet.entity";
import { WalletTransactionType } from "@dhruto/contracts";

@Entity("wallet_transactions")
@Index(["walletId", "createdAt"])
@Index(["referenceType", "referenceId"])
export class WalletTransaction extends BaseEntity {
  @Column({ name: "wallet_id", type: "uuid" })
  walletId: string;

  @ManyToOne(() => Wallet)
  @JoinColumn({ name: "wallet_id" })
  wallet: Wallet;

  @Column({
    type: "enum",
    enum: WalletTransactionType,
  })
  type: WalletTransactionType;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  amount: number;

  @Column({ name: "balance_after", type: "decimal", precision: 12, scale: 2 })
  balanceAfter: number;

  @Column({ name: "reference_type", type: "varchar", length: 50, nullable: true })
  referenceType: string | null;

  @Column({ name: "reference_id", type: "varchar", length: 100, nullable: true })
  referenceId: string | null;

  @Column({ type: "text", nullable: true })
  description: string;
}
