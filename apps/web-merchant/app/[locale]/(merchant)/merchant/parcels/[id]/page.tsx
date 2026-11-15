import React from "react";
import { ParcelDetailsView } from "@/features/parcels/components/parcel-details-view";
import { DashboardCanvasBg } from "@/features/dashboard/components/dashboard-canvas-bg";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Shipment Details | Dhruto Express",
  description:
    "View real-time parcel delivery status, recipient information, financial summary, and milestone history.",
};

export default async function ParcelDetailsPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;

  return (
    <div className="relative min-h-[calc(100vh-4rem)] w-full space-y-6 py-2">
      {/* Tactical Canvas Background with dot matrix & ambient glows */}
      <DashboardCanvasBg />

      {/* Main Details Content */}
      <div className="relative z-10 w-full">
        <ParcelDetailsView parcelId={id} />
      </div>
    </div>
  );
}
