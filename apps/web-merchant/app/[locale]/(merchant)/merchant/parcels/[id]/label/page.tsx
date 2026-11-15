import React from "react";
import { ShippingLabelView } from "@/features/parcels/components/shipping-label-view";
import { DashboardCanvasBg } from "@/features/dashboard/components/dashboard-canvas-bg";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Shipping Label | Dhruto Express",
  description: "Print standard 4x6 thermal shipping label with barcode.",
};

export default async function ShippingLabelPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;

  return (
    <div className="relative min-h-[calc(100vh-4rem)] w-full py-4">
      {/* Canvas background hidden on print */}
      <div className="dhruto-print-hidden">
        <DashboardCanvasBg />
      </div>

      <div className="relative z-10 w-full">
        <ShippingLabelView parcelId={id} />
      </div>
    </div>
  );
}
