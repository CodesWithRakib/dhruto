import React from "react";
import type { Metadata } from "next";
import { FinanceDashboard } from "@/features/finance/components/finance-dashboard";

export const metadata: Metadata = {
  title: "Finance — Admin",
  description: "Settlements, payouts and cash reconciliation across the network.",
};

export default function AdminFinancePage() {
  return <FinanceDashboard />;
}
