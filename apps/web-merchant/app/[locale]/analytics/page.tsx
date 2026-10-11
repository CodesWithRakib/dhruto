"use client";

import React, { useEffect } from "react";
import { useAppSelector } from "../../../store/hooks";
import { useRouter } from "@/lib/navigation";
import { AUTH_ROUTES } from "@/config/routes";
import { MerchantAnalyticsDashboard } from "../../../features/analytics/components/merchant-analytics-dashboard";
import { AdminOverviewDashboard } from "../../../features/analytics/components/admin-overview-dashboard";

/**
 * Role-aware analytics entry: merchants see their tenant-isolated dashboard,
 * staff see the platform overview. Unauthenticated users are redirected to login.
 */
export default function AnalyticsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAppSelector((s) => s.auth);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace(AUTH_ROUTES.login);
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  if (user?.role === "MERCHANT") return <MerchantAnalyticsDashboard />;
  return <AdminOverviewDashboard />;
}
