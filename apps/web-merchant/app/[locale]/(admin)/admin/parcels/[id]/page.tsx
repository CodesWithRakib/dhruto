import React from "react";
import type { Metadata } from "next";
import { ParcelDetailsView } from "@/features/parcels/components/parcel-details-view";

export const metadata: Metadata = {
  title: "Shipment Details — Admin",
  description: "Inspect a shipment's status and milestone history.",
};

export default async function AdminParcelDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ParcelDetailsView parcelId={id} />;
}
