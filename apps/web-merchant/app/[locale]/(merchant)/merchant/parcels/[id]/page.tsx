import React from "react";
import { ParcelDetailsView } from "@/features/parcels/components/parcel-details-view";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Shipment Details — Dhruto",
  description:
    "View real-time parcel delivery status, recipient information, and milestone history.",
};

export default async function ParcelDetailsPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;

  return <ParcelDetailsView parcelId={id} />;
}
