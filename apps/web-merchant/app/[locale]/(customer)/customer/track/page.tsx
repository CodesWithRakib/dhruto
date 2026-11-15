import React from "react";
import { CustomerTrackingView } from "@/features/customer/components/customer-tracking-view";
import { DashboardCanvasBg } from "@/features/dashboard/components/dashboard-canvas-bg";

export const metadata = {
  title: "Live Tracking | Customer Portal | Dhruto",
  description: "Real-time delivery progress and timeline for your Dhruto shipments.",
};

export default function CustomerTrackingPage() {
  return (
    <div className="relative min-h-screen">
      <DashboardCanvasBg />
      <CustomerTrackingView />
    </div>
  );
}
