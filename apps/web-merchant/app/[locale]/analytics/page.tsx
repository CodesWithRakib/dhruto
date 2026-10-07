"use client";

import React from "react";
import { useAppSelector } from "../../../store/hooks";
import { MerchantAnalyticsDashboard } from "../../../features/analytics/components/merchant-analytics-dashboard";
import { AdminOverviewDashboard } from "../../../features/analytics/components/admin-overview-dashboard";

/**
 * Role-aware analytics entry: merchants see their tenant-isolated dashboard,
 * staff see the platform overview. Section depth lives under role layouts.
 */
export default function AnalyticsPage() {
  const role = useAppSelector((s) => s.auth.user?.role);
  if (role === "MERCHANT") return <MerchantAnalyticsDashboard />;
  return <AdminOverviewDashboard />;
}
