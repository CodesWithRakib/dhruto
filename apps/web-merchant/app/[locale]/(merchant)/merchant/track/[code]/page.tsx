import React from "react";
import { PublicTrackingView } from "@/features/tracking/components/public-tracking-view";
import { DashboardCanvasBg } from "@/features/dashboard/components/dashboard-canvas-bg";

export const metadata = {
  title: "Shipment Tracking — Merchant Hub",
  description: "View real-time delivery milestones and rider dispatch location.",
};

export default async function MerchantTrackCodePage({
  params,
}: {
  params: Promise<{ code: string; locale: string }>;
}) {
  const { code } = await params;

  return (
    <div className="relative min-h-[calc(100vh-4rem)] w-full overflow-hidden">
      <DashboardCanvasBg />
      <div className="relative z-10">
        <PublicTrackingView initialCode={code} />
      </div>
    </div>
  );
}
