import React from "react";
import { ShippingLabelView } from "../../../../../features/parcels/components/shipping-label-view";

export const metadata = {
  title: "Shipping Label — Dhruto",
  description: "Print standard 4x6 thermal shipping label with barcode.",
};

export default async function ShippingLabelPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;

  return <ShippingLabelView parcelId={id} />;
}
