import React from "react";
import { ReturnsListView } from "@/features/parcels/components/returns-list-view";
import { DashboardCanvasBg } from "@/features/dashboard/components/dashboard-canvas-bg";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Returns & RTO Operations | Dhruto Express",
  description: "Monitor and manage returned parcels, failed delivery legs, and warehouse restocking.",
};

export default function MerchantReturnsPage() {
  return (
    <div className="relative min-h-[calc(100vh-4rem)] w-full space-y-6 py-2">
      {/* Tactical Canvas Background with dot matrix & ambient glows */}
      <DashboardCanvasBg />

      {/* Returns Cockpit */}
      <div className="relative z-10 w-full">
        <ReturnsListView />
      </div>
    </div>
  );
}
