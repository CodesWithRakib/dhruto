import React from "react";
import { CustomerSettingsView } from "@/features/customer/components/customer-settings-view";
import { DashboardCanvasBg } from "@/features/dashboard/components/dashboard-canvas-bg";

export const metadata = {
  title: "Delivery Settings | Customer Portal | Dhruto",
  description: "Manage saved delivery destinations, contact numbers, and alert channels.",
};

export default function CustomerSettingsPage() {
  return (
    <div className="relative min-h-screen">
      <DashboardCanvasBg />
      <CustomerSettingsView />
    </div>
  );
}
