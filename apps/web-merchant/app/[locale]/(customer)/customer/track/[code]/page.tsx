import React from "react";
import { CustomerTrackingView } from "@/features/customer/components/customer-tracking-view";
import { DashboardCanvasBg } from "@/features/dashboard/components/dashboard-canvas-bg";

interface PageProps {
  params: Promise<{
    code: string;
  }>;
}

export const metadata = {
  title: "Shipment Tracking | Customer Portal | Dhruto",
  description: "Live package status, courier timeline, and expected delivery time.",
};

export default async function CustomerTrackCodePage({ params }: PageProps) {
  const { code } = await params;
  return (
    <div className="relative min-h-screen">
      <DashboardCanvasBg />
      <CustomerTrackingView initialCode={code} />
    </div>
  );
}
