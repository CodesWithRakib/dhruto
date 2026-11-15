import React from "react";
import { FinanceDashboard } from "@/features/finance/components/finance-dashboard";
import { DashboardCanvasBg } from "@/features/dashboard/components/dashboard-canvas-bg";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Merchant Finance & Wallet | Dhruto Express",
  description:
    "Real-time earnings, automated COD settlements, payout withdrawals, and cash reconciliation audit.",
};

export default function FinancePage() {
  return (
    <div className="relative min-h-[calc(100vh-4rem)] w-full space-y-6 py-2">
      {/* Tactical Canvas Background with dot matrix & ambient glows */}
      <DashboardCanvasBg />

      {/* Finance Terminal Cockpit */}
      <div className="relative z-10 w-full">
        <FinanceDashboard />
      </div>
    </div>
  );
}
