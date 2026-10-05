import React from "react";
import type { Metadata } from "next";
import { ShippingLabelView } from "@/features/parcels/components/shipping-label-view";

export const metadata: Metadata = {
  title: "Shipping Label — Admin",
  description: "Print a standard 4x6 thermal shipping label with barcode.",
};

export default async function AdminShippingLabelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ShippingLabelView parcelId={id} />;
}
