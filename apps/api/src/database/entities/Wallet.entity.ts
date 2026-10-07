import { Entity, Column, OneToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "./Base.entity";
import { Merchant } from "./Merchant.entity";

@Entity("wallets")
export class Wallet extends BaseEntity {
  @Column({ name: "merchant_id", type: "uuid", unique: true })
  merchantId: string;

  @OneToOne(() => Merchant)
  @JoinColumn({ name: "merchant_id" })
  merchant: Merchant;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  balance: number;

  @Column({ name: "pending_balance", type: "decimal", precision: 12, scale: 2, default: 0 })
  pendingBalance: number;

  @Column({ name: "withdrawn_total", type: "decimal", precision: 12, scale: 2, default: 0 })
  withdrawnTotal: number;

  @Column({ type: "varchar", length: 10, default: "BDT" })
  currency: string;

  @Column({ type: "varchar", length: 20, default: "ACTIVE" })
  status: string;
}
