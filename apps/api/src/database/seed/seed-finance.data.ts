import { CashHandInStatus } from "../entities/CashLedger.entity.js";
import { WalletTransactionType, PayoutMethod, PayoutStatus } from "@dhruto/contracts";

export interface SeedCashLedgerData {
  trackingCode: string;
  riderEmail: string;
  hubCode: string;
  amount: number;
  handInStatus: CashHandInStatus;
  hoursAgo: number;
}

export interface SeedWalletTransactionData {
  merchantEmail: string;
  type: WalletTransactionType;
  amount: number;
  balanceAfter: number;
  referenceType: string;
  referenceId: string;
  description: string;
  hoursAgo: number;
}

export interface SeedPayoutRequestData {
  merchantEmail: string;
  amount: number;
  payoutMethod: PayoutMethod;
  accountDetails: Record<string, unknown>;
  status: PayoutStatus;
  hoursAgo: number;
}

export const SEED_CASH_LEDGERS: SeedCashLedgerData[] = [
  {
    trackingCode: "DHR-2610-00101",
    riderEmail: "rider@dhruto.com",
    hubCode: "HUB-DHK-01",
    amount: 1850,
    handInStatus: CashHandInStatus.VERIFIED,
    hoursAgo: 40,
  },
  {
    trackingCode: "DHR-2610-00102",
    riderEmail: "rider@dhruto.com",
    hubCode: "HUB-DHK-01",
    amount: 2450,
    handInStatus: CashHandInStatus.VERIFIED,
    hoursAgo: 38,
  },
  {
    trackingCode: "DHR-2610-00103",
    riderEmail: "rider2@dhruto.com",
    hubCode: "HUB-DHK-01",
    amount: 3200,
    handInStatus: CashHandInStatus.VERIFIED,
    hoursAgo: 32,
  },
  {
    trackingCode: "DHR-2610-00104",
    riderEmail: "rider@dhruto.com",
    hubCode: "HUB-DHK-01",
    amount: 1450,
    handInStatus: CashHandInStatus.HANDED_IN,
    hoursAgo: 26,
  },
  {
    trackingCode: "DHR-2610-00105",
    riderEmail: "rider3@dhruto.com",
    hubCode: "HUB-CTG-01",
    amount: 5600,
    handInStatus: CashHandInStatus.VERIFIED,
    hoursAgo: 24,
  },
  {
    trackingCode: "DHR-2610-00106",
    riderEmail: "rider2@dhruto.com",
    hubCode: "HUB-DHK-01",
    amount: 950,
    handInStatus: CashHandInStatus.PENDING,
    hoursAgo: 20,
  },
];

export const SEED_WALLET_TRANSACTIONS: SeedWalletTransactionData[] = [
  {
    merchantEmail: "merchant@dhruto.com",
    type: WalletTransactionType.COD_CREDIT,
    amount: 1850,
    balanceAfter: 48500,
    referenceType: "PARCEL",
    referenceId: "DHR-2610-00101",
    description: "COD collected for parcel DHR-2610-00101",
    hoursAgo: 40,
  },
  {
    merchantEmail: "merchant@dhruto.com",
    type: WalletTransactionType.DELIVERY_FEE,
    amount: -70,
    balanceAfter: 48430,
    referenceType: "PARCEL",
    referenceId: "DHR-2610-00101",
    description: "Delivery fee deducted for parcel DHR-2610-00101",
    hoursAgo: 40,
  },
  {
    merchantEmail: "merchant@dhruto.com",
    type: WalletTransactionType.COD_CREDIT,
    amount: 2450,
    balanceAfter: 50880,
    referenceType: "PARCEL",
    referenceId: "DHR-2610-00102",
    description: "COD collected for parcel DHR-2610-00102",
    hoursAgo: 38,
  },
  {
    merchantEmail: "merchant@dhruto.com",
    type: WalletTransactionType.DELIVERY_FEE,
    amount: -60,
    balanceAfter: 50820,
    referenceType: "PARCEL",
    referenceId: "DHR-2610-00102",
    description: "Delivery fee deducted for parcel DHR-2610-00102",
    hoursAgo: 38,
  },
  {
    merchantEmail: "merchant@dhruto.com",
    type: WalletTransactionType.PAYOUT_DEBIT,
    amount: -25000,
    balanceAfter: 25820,
    referenceType: "PAYOUT_REQUEST",
    referenceId: "PO-202610-001",
    description: "Weekly merchant payout to bKash Merchant Account",
    hoursAgo: 30,
  },
  {
    merchantEmail: "merchant2@dhruto.com",
    type: WalletTransactionType.COD_CREDIT,
    amount: 1450,
    balanceAfter: 15200,
    referenceType: "PARCEL",
    referenceId: "DHR-2610-00104",
    description: "COD collected for parcel DHR-2610-00104",
    hoursAgo: 26,
  },
];

export const SEED_PAYOUT_REQUESTS: SeedPayoutRequestData[] = [
  {
    merchantEmail: "merchant@dhruto.com",
    amount: 25000,
    payoutMethod: PayoutMethod.BKASH,
    accountDetails: {
      accountNumber: "01700000002",
      accountType: "MERCHANT",
    },
    status: PayoutStatus.COMPLETED,
    hoursAgo: 30,
  },
  {
    merchantEmail: "merchant@dhruto.com",
    amount: 15000,
    payoutMethod: PayoutMethod.BANK_TRANSFER,
    accountDetails: {
      bankName: "BRAC Bank PLC",
      accountName: "Rahim Enterprise BD",
      accountNumber: "1501203498120001",
      branch: "Uttara Branch",
    },
    status: PayoutStatus.REQUESTED,
    hoursAgo: 4,
  },
  {
    merchantEmail: "merchant2@dhruto.com",
    amount: 8000,
    payoutMethod: PayoutMethod.NAGAD,
    accountDetails: {
      accountNumber: "01700000012",
      accountType: "PERSONAL",
    },
    status: PayoutStatus.APPROVED,
    hoursAgo: 6,
  },
];
