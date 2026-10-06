import { z } from "zod";

export enum WalletTransactionType {
  COD_CREDIT = "COD_CREDIT",
  DELIVERY_FEE = "DELIVERY_FEE",
  RETURN_FEE = "RETURN_FEE",
  PAYOUT_DEBIT = "PAYOUT_DEBIT",
  ADJUSTMENT_CREDIT = "ADJUSTMENT_CREDIT",
  ADJUSTMENT_DEBIT = "ADJUSTMENT_DEBIT",
}

export enum PayoutMethod {
  BKASH = "BKASH",
  NAGAD = "NAGAD",
  ROCKET = "ROCKET",
  BANK_TRANSFER = "BANK_TRANSFER",
}

export enum PayoutStatus {
  REQUESTED = "REQUESTED",
  APPROVED = "APPROVED",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  REJECTED = "REJECTED",
  CANCELLED = "CANCELLED",
}

/* ------------------------------------------------------------------ */
/* Money: centralized currency + minor-unit representation              */
/* ------------------------------------------------------------------ */

/** MVP currency. Never scatter currency literals; import this instead. */
export const CURRENCY_BDT = "BDT" as const;

/** Minor units per major unit (poisha per taka). */
export const BDT_MINOR_UNITS = 100;

/**
 * Money over the wire: integer minor units + explicit currency. Frontend
 * formats; backend computes. Never floats.
 */
export const moneySchema = z.object({
  amountMinor: z.number().int(),
  currency: z.string().default(CURRENCY_BDT),
});

export type Money = z.infer<typeof moneySchema>;

/**
 * Masks a payout destination for display: `01******789`. The full value
 * stays server-side; UIs must render this form.
 */
export function maskAccountNumber(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 5) return "*****";
  return `${digits.slice(0, 2)}******${digits.slice(-3)}`;
}

/* ------------------------------------------------------------------ */
/* Double-entry ledger                                                 */
/* ------------------------------------------------------------------ */

/** Chart of accounts. Balances are derived from entries; wallets cache. */
export enum FinancialAccount {
  PLATFORM_CASH = "PLATFORM_CASH",
  RIDER_CASH_IN_HAND = "RIDER_CASH_IN_HAND",
  HUB_CASH = "HUB_CASH",
  COD_RECEIVABLE = "COD_RECEIVABLE",
  MERCHANT_AVAILABLE = "MERCHANT_AVAILABLE",
  MERCHANT_PAYOUT_IN_TRANSIT = "MERCHANT_PAYOUT_IN_TRANSIT",
  FEE_REVENUE = "FEE_REVENUE",
  ADJUSTMENT = "ADJUSTMENT",
}

export enum EntryDirection {
  DEBIT = "DEBIT",
  CREDIT = "CREDIT",
}

export enum FinancialTransactionType {
  COD_COLLECTED = "COD_COLLECTED",
  CASH_HANDED_IN = "CASH_HANDED_IN",
  COD_SETTLEMENT = "COD_SETTLEMENT",
  PAYOUT_RESERVATION = "PAYOUT_RESERVATION",
  PAYOUT_COMPLETION = "PAYOUT_COMPLETION",
  PAYOUT_RELEASE = "PAYOUT_RELEASE",
  ADJUSTMENT = "ADJUSTMENT",
  REVERSAL = "REVERSAL",
}

export enum FinancialTransactionStatus {
  POSTED = "POSTED",
  REVERSED = "REVERSED",
}

export interface FinancialEntryInput {
  account: FinancialAccount;
  direction: EntryDirection;
  /** Integer minor units (poisha). Must be > 0. */
  amountMinor: number;
  memo?: string;
}

export interface FinancialTransactionItem {
  id: string;
  transactionCode: string;
  type: FinancialTransactionType;
  status: FinancialTransactionStatus;
  referenceType: string | null;
  referenceId: string | null;
  description: string | null;
  reversalOfId: string | null;
  reversedById: string | null;
  createdBy: string | null;
  createdAt: string;
  entries: {
    account: FinancialAccount;
    direction: EntryDirection;
    amountMinor: number;
    currency: string;
  }[];
}

/* ------------------------------------------------------------------ */
/* Settlement                                                          */
/* ------------------------------------------------------------------ */

export enum SettlementStatus {
  SETTLED = "SETTLED",
  REVERSED = "REVERSED",
}

export enum SettlementBatchStatus {
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export interface SettlementItem {
  id: string;
  settlementCode: string;
  merchantId: string;
  parcelId: string;
  trackingCode: string;
  cashLedgerId: string;
  grossMinor: number;
  feeMinor: number;
  netMinor: number;
  currency: string;
  status: SettlementStatus;
  transactionId: string;
  batchId: string | null;
  settledAt: string;
}

export interface SettlementBatchItem {
  id: string;
  settlementCode: string;
  merchantId: string;
  status: SettlementBatchStatus;
  grossMinor: number;
  feeMinor: number;
  netMinor: number;
  settlementCount: number;
  createdAt: string;
  completedAt: string | null;
}

/* ------------------------------------------------------------------ */
/* Cash hand-in batches + discrepancies                                */
/* ------------------------------------------------------------------ */

export enum CashHandInStatus {
  SUBMITTED = "SUBMITTED",
  VERIFIED = "VERIFIED",
  DISCREPANCY = "DISCREPANCY",
  RESOLVED = "RESOLVED",
}

export enum CashDiscrepancyType {
  SHORT = "SHORT",
  OVER = "OVER",
}

export enum CashDiscrepancyStatus {
  OPEN = "OPEN",
  RESOLVED = "RESOLVED",
}

export interface CashHandInBatchItem {
  id: string;
  handinCode: string;
  riderId: string;
  riderName: string | null;
  hubId: string | null;
  hubCode: string | null;
  hubName: string | null;
  status: CashHandInStatus;
  expectedMinor: number;
  verifiedMinor: number;
  itemCount: number;
  submittedAt: string;
  verifiedAt: string | null;
}

export interface CashDiscrepancyItem {
  id: string;
  cashLedgerId: string;
  trackingCode: string | null;
  handinId: string | null;
  type: CashDiscrepancyType;
  status: CashDiscrepancyStatus;
  expectedMinor: number;
  actualMinor: number;
  differenceMinor: number;
  reason: string | null;
  notes: string | null;
  reportedBy: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export const requestPayoutSchema = z.object({
  amount: z.coerce
    .number({ invalid_type_error: "Amount must be a number" })
    .positive("Withdrawal amount must be greater than 0")
    .min(100, "Minimum payout request amount is ৳100"),
  payoutMethod: z.nativeEnum(PayoutMethod),
  accountDetails: z.object({
    accountNumber: z.string().trim().min(8, "Account or mobile number required"),
    accountType: z.enum(["PERSONAL", "MERCHANT"]).default("PERSONAL"),
    bankName: z.string().trim().optional(),
    branchName: z.string().trim().optional(),
    accountHolderName: z.string().trim().optional(),
  }),
  notes: z.string().trim().optional(),
});

export type RequestPayoutDto = z.infer<typeof requestPayoutSchema>;

export const verifyCashLedgerSchema = z.object({
  cashLedgerId: z.string().uuid("Invalid cash ledger ID"),
  actualAmount: z.coerce.number().positive().optional(),
  notes: z.string().trim().optional(),
});

export type VerifyCashLedgerDto = z.infer<typeof verifyCashLedgerSchema>;

export const processPayoutSchema = z.object({
  status: z.enum([PayoutStatus.COMPLETED, PayoutStatus.FAILED, PayoutStatus.REJECTED]),
  transactionReference: z.string().trim().max(100).optional(),
  rejectionReason: z.string().trim().max(500).optional(),
  failureReason: z.string().trim().max(500).optional(),
});

export type ProcessPayoutDto = z.infer<typeof processPayoutSchema>;

export const approvePayoutSchema = z.object({
  notes: z.string().trim().max(500).optional(),
});

export type ApprovePayoutDto = z.infer<typeof approvePayoutSchema>;

export const createAdjustmentSchema = z.object({
  merchantId: z.string().uuid("Invalid merchant ID"),
  direction: z.enum(["CREDIT", "DEBIT"]),
  /** Major units (taka); converted to minor units server-side. */
  amount: z.coerce.number().positive().max(100_000_000),
  reason: z.string().trim().min(5).max(500),
  referenceType: z.string().trim().max(50).optional(),
  referenceId: z.string().trim().max(100).optional(),
});

export type CreateAdjustmentDto = z.infer<typeof createAdjustmentSchema>;

export const reverseTransactionSchema = z.object({
  reason: z.string().trim().min(5).max(500),
});

export type ReverseTransactionDto = z.infer<typeof reverseTransactionSchema>;

export const createSettlementBatchSchema = z.object({
  merchantId: z.string().uuid("Invalid merchant ID"),
  settlementIds: z.array(z.string().uuid()).min(1).max(500),
  notes: z.string().trim().max(500).optional(),
});

export type CreateSettlementBatchDto = z.infer<typeof createSettlementBatchSchema>;

export const resolveDiscrepancySchema = z.object({
  /** Major units the rider actually made good (0 when written off). */
  recoveredAmount: z.coerce.number().min(0).max(100_000_000).default(0),
  reason: z.string().trim().min(5).max(500),
});

export type ResolveDiscrepancyDto = z.infer<typeof resolveDiscrepancySchema>;

export const financeReportQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  merchantId: z.string().uuid().optional(),
  hubId: z.string().uuid().optional(),
  riderId: z.string().uuid().optional(),
  status: z.string().max(50).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  format: z.enum(["json", "csv"]).default("json"),
});

export type FinanceReportQuery = z.infer<typeof financeReportQuerySchema>;

export interface MerchantWalletData {
  id: string;
  merchantId: string;
  balance: number;
  pendingBalance: number;
  withdrawnTotal: number;
  currency: string;
  updatedAt: string;
}

export interface WalletTransactionItem {
  id: string;
  type: WalletTransactionType;
  amount: number;
  balanceAfter: number;
  referenceType?: string;
  referenceId?: string;
  description: string;
  createdAt: string;
}

export interface PayoutRequestItem {
  id: string;
  payoutCode: string;
  amount: number;
  payoutMethod: PayoutMethod;
  accountDetails: {
    accountNumber: string;
    accountType?: string;
    bankName?: string;
    branchName?: string;
    accountHolderName?: string;
  };
  status: PayoutStatus;
  transactionReference?: string;
  rejectionReason?: string;
  failureReason?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  processedAt?: string;
  notes?: string;
}

export interface ReconciliationCheckResult {
  checkedAt: string;
  merchants: {
    merchantId: string;
    walletBalanceMinor: number;
    ledgerDerivedMinor: number;
    balanced: boolean;
  }[];
  riders: {
    riderId: string;
    expectedMinor: number;
    handedInMinor: number;
    verifiedMinor: number;
    outstandingMinor: number;
  }[];
  settlements: {
    settlementId: string;
    balanced: boolean;
    detail: string;
  }[];
  transactions: {
    transactionId: string;
    balanced: boolean;
  }[];
  ok: boolean;
}

export interface PendingReconciliationItem {
  id: string;
  parcelId: string;
  trackingCode: string;
  recipientName: string;
  merchantName: string;
  riderName: string;
  hubName: string;
  amount: number;
  deliveryFee: number;
  netPayable: number;
  collectedAt: string;
  handInStatus: string;
}
