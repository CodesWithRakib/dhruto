import React from "react";
import { CustomerDashboardView } from "@/features/customer/components/customer-dashboard-view";

export const metadata = {
  title: "My Deliveries | Customer Portal | Dhruto",
  description: "Track incoming packages, view doorstep OTPs, and manage delivery instructions.",
};

export default function CustomerDashboardPage() {
  return <CustomerDashboardView />;
}
