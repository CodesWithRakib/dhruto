import React from "react";
import { BulkShippingLabelsView } from "@/features/parcels/components/bulk-shipping-labels-view";
import { DashboardCanvasBg } from "@/features/dashboard/components/dashboard-canvas-bg";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Bulk Shipping Labels | Dhruto Express",
  description: "Continuous roll batch thermal printing for multiple shipments.",
};

export default async function MerchantBulkLabelsPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const { ids } = await searchParams;
  const parcelIds = ids
    ? ids
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  return (
    <div className="relative min-h-[calc(100vh-4rem)] w-full py-4">
      <div className="dhruto-print-hidden">
        <DashboardCanvasBg />
      </div>

      <div className="relative z-10 w-full">
        <BulkShippingLabelsView parcelIds={parcelIds} />
      </div>
    </div>
  );
}
