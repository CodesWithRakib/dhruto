import React from "react";
import { PublicTrackingView } from "@/features/tracking/components/public-tracking-view";
import { DashboardCanvasBg } from "@/features/dashboard/components/dashboard-canvas-bg";

export const metadata = {
  title: "Track Shipment — Admin Operations",
  description: "Track shipment milestones and delivery progress in admin console.",
};

export default function AdminTrackPage() {
  return (
    <div className="relative w-full">
      <DashboardCanvasBg />
      <PublicTrackingView />
    </div>
  );
}
