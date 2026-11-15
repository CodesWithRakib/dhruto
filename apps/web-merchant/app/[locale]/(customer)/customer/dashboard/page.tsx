import React from "react";
import { CustomerDashboardView } from "@/features/customer/components/customer-dashboard-view";
import { DashboardCanvasBg } from "@/features/dashboard/components/dashboard-canvas-bg";

export const metadata = {
  title: "My Deliveries | Customer Portal | Dhruto",
  description: "Track incoming packages, view doorstep OTPs, and manage delivery instructions.",
};

export default function CustomerDashboardPage() {
  return (
    <div className="relative min-h-screen">
      <DashboardCanvasBg />
      <CustomerDashboardView />
    </div>
  );
}
