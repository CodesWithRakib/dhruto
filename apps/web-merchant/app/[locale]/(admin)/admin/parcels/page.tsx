import React from "react";
import type { Metadata } from "next";
import { ParcelList } from "@/features/parcels/components/parcel-list";
import { DashboardCanvasBg } from "@/features/dashboard/components/dashboard-canvas-bg";

export const metadata: Metadata = {
  title: "Parcels — Admin",
  description: "Review parcel operations across the network.",
};

export default function AdminParcelsPage() {
  return (
    <div className="relative w-full">
      <DashboardCanvasBg />
      <ParcelList />
    </div>
  );
}
