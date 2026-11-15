import React from "react";
import { PublicTrackingView } from "@/features/tracking/components/public-tracking-view";
import { DashboardCanvasBg } from "@/features/dashboard/components/dashboard-canvas-bg";

export const metadata = {
  title: "Track Shipment — Merchant Hub",
  description: "Track shipment milestones and delivery progress within the merchant console.",
};

export default function MerchantTrackPage() {
  return (
    <div className="relative min-h-[calc(100vh-4rem)] w-full overflow-hidden">
      <DashboardCanvasBg />
      <div className="relative z-10">
        <PublicTrackingView />
      </div>
    </div>
  );
}
