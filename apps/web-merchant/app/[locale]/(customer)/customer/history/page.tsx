import React from "react";
import { CustomerHistoryView } from "@/features/customer/components/customer-history-view";
import { DashboardCanvasBg } from "@/features/dashboard/components/dashboard-canvas-bg";

export const metadata = {
  title: "Delivery History | Customer Portal | Dhruto",
  description: "View past delivered shipments and digital Proof of Delivery records.",
};

export default function CustomerHistoryPage() {
  return (
    <div className="relative min-h-screen">
      <DashboardCanvasBg />
      <CustomerHistoryView />
    </div>
  );
}
