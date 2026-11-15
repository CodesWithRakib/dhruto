import React from "react";
import { RiderDashboard } from "@/features/riders/components/rider-dashboard";
import { DashboardCanvasBg } from "@/features/dashboard/components/dashboard-canvas-bg";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Rider Delivery Terminal | Dhruto Express",
  description:
    "Last-mile courier task queues, OTP delivery verification, and cash collection ledger.",
};

export default function RiderPage() {
  return (
    <div className="relative min-h-screen">
      <DashboardCanvasBg />
      <RiderDashboard />
    </div>
  );
}
