import React from "react";
import type { Metadata } from "next";
import { MerchantAnalyticsDashboard } from "@/features/analytics/components/merchant-analytics-dashboard";
import { DashboardCanvasBg } from "@/features/dashboard/components/dashboard-canvas-bg";

export const metadata: Metadata = {
  title: "Merchant Analytics | Dhruto Express",
  description: "Orders, delivery velocity, RTO, and automated COD analytics for your store.",
  robots: { index: false, follow: false },
};

export default function MerchantAnalyticsPage() {
  return (
    <div className="relative min-h-[calc(100vh-4rem)] w-full space-y-6 py-2">
      {/* Tactical Canvas Background with dot matrix & ambient glows */}
      <DashboardCanvasBg />

      {/* Analytics Cockpit */}
      <div className="relative z-10 w-full">
        <MerchantAnalyticsDashboard />
      </div>
    </div>
  );
}
