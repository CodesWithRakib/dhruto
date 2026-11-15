import React from "react";
import { ParcelList } from "@/features/parcels/components/parcel-list";
import { DashboardCanvasBg } from "@/features/dashboard/components/dashboard-canvas-bg";

export const metadata = {
  robots: { index: false, follow: false },
  title: "My Parcels | Dhruto Express",
  description: "View and manage your parcel bookings, filter by status, search, and track deliveries.",
};

export default function ParcelsPage() {
  return (
    <div className="relative min-h-[calc(100vh-4rem)] w-full space-y-6 py-2">
      {/* Tactical Canvas Background with dot matrix & ambient glows */}
      <DashboardCanvasBg />

      {/* Main Cockpit Content */}
      <div className="relative z-10 w-full">
        <ParcelList />
      </div>
    </div>
  );
}
