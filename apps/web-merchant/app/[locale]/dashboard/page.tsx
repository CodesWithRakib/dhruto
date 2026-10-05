import React from "react";
import type { Metadata } from "next";
import { MerchantDashboard } from "../../../features/dashboard/components/merchant-dashboard";

export const metadata: Metadata = {
  title: "Merchant Dashboard",
  description: "Live parcel movements, COD collections and express fulfilment tracking.",
  robots: { index: false, follow: false },
};

export default function DashboardPage() {
  return <MerchantDashboard />;
}
