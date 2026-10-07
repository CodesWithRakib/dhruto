import { Entity, Column, ManyToOne, JoinColumn, Index } from "typeorm";
import { BaseEntity } from "./Base.entity.js";
import { CashLedger } from "./CashLedger.entity.js";
import { CashHandIn } from "./CashHandIn.entity.js";
import { CashDiscrepancyType, CashDiscrepancyStatus } from "@dhruto/contracts";

export { CashDiscrepancyType, CashDiscrepancyStatus };

/**
 * Cash variance record — created automatically when hub-counted cash differs
 * from the expected collection. Never silently absorbed: the shortfall or
 * overage stays OPEN until an authorized operator resolves it with an
 * explicit reason (and optional recovery posting).
 */
@Entity("cash_discrepancies")
@Index(["status", "createdAt"])
@Index(["cashLedgerId"])
export class CashDiscrepancy extends BaseEntity {
  @Column({ name: "cash_ledger_id", type: "uuid" })
  cashLedgerId: string;

  @ManyToOne(() => CashLedger)
  @JoinColumn({ name: "cash_ledger_id" })
  cashLedger: CashLedger;

  @Column({ name: "handin_id", type: "uuid", nullable: true })
  handInId: string | null;

  @ManyToOne(() => CashHandIn, { nullable: true })
  @JoinColumn({ name: "handin_id" })
  handIn: CashHandIn | null;

  @Column({ type: "enum", enum: CashDiscrepancyType })
  type: CashDiscrepancyType;

  @Column({ type: "enum", enum: CashDiscrepancyStatus, default: CashDiscrepancyStatus.OPEN })
  status: CashDiscrepancyStatus;

  /** Integer minor units. */
  @Column({ name: "expected_minor", type: "bigint" })
  expectedMinor: number;

  @Column({ name: "actual_minor", type: "bigint" })
  actualMinor: number;

  /** actual - expected (negative for SHORT). Integer minor units. */
  @Column({ name: "difference_minor", type: "bigint" })
  differenceMinor: number;

  @Column({ type: "varchar", length: 10, default: "BDT" })
  currency: string;

  @Column({ type: "text", nullable: true })
  reason: string | null;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @Column({ name: "reported_by", type: "uuid", nullable: true })
  reportedBy: string | null;

  @Column({ name: "resolved_by", type: "uuid", nullable: true })
  resolvedBy: string | null;

  @Column({ name: "resolved_at", type: "timestamptz", nullable: true })
  resolvedAt: Date | null;
}
