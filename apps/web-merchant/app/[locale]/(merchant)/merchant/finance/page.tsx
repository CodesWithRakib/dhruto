import React from "react";
import { FinanceDashboard } from "@/features/finance/components/finance-dashboard";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Merchant Finance & Wallet | Dhruto Express",
  description:
    "Real-time earnings, automated COD settlements, payout withdrawals, and cash reconciliation audit.",
};

export default function FinancePage() {
  return <FinanceDashboard />;
}
