export interface SeedWalletData {
  merchantEmail: string;
  balance: number;
  pendingBalance: number;
  withdrawnTotal: number;
  currency: string;
  status: string;
}

export const SEED_WALLETS: SeedWalletData[] = [
  {
    merchantEmail: "merchant@dhruto.com",
    balance: 48500.0,
    pendingBalance: 12400.0,
    withdrawnTotal: 185000.0,
    currency: "BDT",
    status: "ACTIVE",
  },
  {
    merchantEmail: "merchant2@dhruto.com",
    balance: 15200.0,
    pendingBalance: 6800.0,
    withdrawnTotal: 62000.0,
    currency: "BDT",
    status: "ACTIVE",
  },
  {
    merchantEmail: "merchant3@dhruto.com",
    balance: 93400.0,
    pendingBalance: 24500.0,
    withdrawnTotal: 410000.0,
    currency: "BDT",
    status: "ACTIVE",
  },
];
