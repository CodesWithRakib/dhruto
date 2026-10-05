import React from "react";
import { PublicTrackingView } from "@/features/tracking/components/public-tracking-view";

export const metadata = {
  title: "Track Shipment — Admin Operations",
  description: "Track shipment milestones and delivery progress in admin console.",
};

export default function AdminTrackPage() {
  return (
    <div className="w-full">
      <PublicTrackingView />
    </div>
  );
}
