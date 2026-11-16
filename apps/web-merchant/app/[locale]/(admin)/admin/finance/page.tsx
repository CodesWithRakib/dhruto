import React from "react";
import type { Metadata } from "next";
import { AdminFinanceDashboard } from "@/features/finance/components/admin-finance-dashboard";
import { DashboardCanvasBg } from "@/features/dashboard/components/dashboard-canvas-bg";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Finance Operations — Admin",
  description: "Ledger, settlements, payouts, adjustments and reconciliation.",
};

export default function AdminFinancePage() {
  return (
    <div className="relative w-full">
      <DashboardCanvasBg />
      <AdminFinanceDashboard />
    </div>
  );
}
