import React from "react";
import type { Metadata } from "next";
import { MerchantAnalyticsDashboard } from "@/features/analytics/components/merchant-analytics-dashboard";

export const metadata: Metadata = {
  title: "Merchant Analytics",
  description: "Orders, delivery, RTO and COD analytics for your store.",
  robots: { index: false, follow: false },
};

export default function MerchantAnalyticsPage() {
  return <MerchantAnalyticsDashboard />;
}
