import React from "react";
import { CustomerTrackingView } from "@/features/customer/components/customer-tracking-view";

export const metadata = {
  title: "Live Tracking | Customer Portal | Dhruto",
  description: "Real-time delivery progress and timeline for your Dhruto shipments.",
};

export default function CustomerTrackingPage() {
  return <CustomerTrackingView />;
}
