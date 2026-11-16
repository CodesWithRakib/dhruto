import React from "react";
import type { Metadata } from "next";
import { AdminOverviewDashboard } from "@/features/analytics/components/admin-overview-dashboard";
import { DashboardCanvasBg } from "@/features/dashboard/components/dashboard-canvas-bg";

export const metadata: Metadata = {
  title: "Analytics Overview — Admin",
  description: "Platform KPIs, trends and operational alerts.",
  robots: { index: false, follow: false },
};

export default function AdminAnalyticsPage() {
  return (
    <div className="relative w-full">
      <DashboardCanvasBg />
      <AdminOverviewDashboard />
    </div>
  );
}
