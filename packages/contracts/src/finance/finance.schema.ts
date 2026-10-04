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
  REJECTED = "REJECTED",
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
  status: z.enum([PayoutStatus.COMPLETED, PayoutStatus.REJECTED]),
  transactionReference: z.string().trim().optional(),
  rejectionReason: z.string().trim().optional(),
});

export type ProcessPayoutDto = z.infer<typeof processPayoutSchema>;

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
  createdAt: string;
  processedAt?: string;
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
