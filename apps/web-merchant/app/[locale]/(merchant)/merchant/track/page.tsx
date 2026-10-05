import React from "react";
import { PublicTrackingView } from "@/features/tracking/components/public-tracking-view";

export const metadata = {
  title: "Track Shipment — Merchant Hub",
  description: "Track shipment milestones and delivery progress within the merchant console.",
};

export default function MerchantTrackPage() {
  return (
    <div className="w-full">
      <PublicTrackingView />
    </div>
  );
}
