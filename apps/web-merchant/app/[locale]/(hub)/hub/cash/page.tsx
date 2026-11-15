import React from "react";
import { HubCashDesk } from "@/features/finance/components/hub-cash-desk";
import { DashboardCanvasBg } from "@/features/dashboard/components/dashboard-canvas-bg";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Hub Cash Desk | Dhruto Hub",
  description: "Verify rider cash hand-ins and review discrepancies.",
};

export default function HubCashRoutePage() {
  return (
    <div className="relative min-h-[calc(100vh-4rem)] w-full overflow-hidden">
      <DashboardCanvasBg />
      <div className="relative z-10">
        <HubCashDesk />
      </div>
    </div>
  );
}
