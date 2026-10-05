import React from "react";
import { RiderDashboard } from "@/features/riders/components/rider-dashboard";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Rider Delivery Terminal | Dhruto Express",
  description: "Last-mile courier task queues, OTP delivery verification, and cash collection ledger.",
};

export default function RiderPage() {
  return (
    <div className="max-w-5xl mx-auto py-6 px-4">
      <RiderDashboard />
    </div>
  );
}
